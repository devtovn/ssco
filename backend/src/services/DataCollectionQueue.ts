/**
 * Data Collection Job Queue
 * Bull Queue with Redis for background API collection and web scraping jobs
 */

import Bull, { Job, Queue } from 'bull';

export enum CollectionJobType {
  API_COLLECTION = 'api-collection',
  WEB_SCRAPING = 'web-scraping',
  FULL_COLLECTION = 'full-collection',
}

export interface ApiCollectionJobData {
  keywords: string[];
}

export interface WebScrapingJobData {
  urls: string[];
}

export interface FullCollectionJobData {
  keywords: string[];
  urls?: string[];
}

export type CollectionJobData =
  | ApiCollectionJobData
  | WebScrapingJobData
  | FullCollectionJobData;

export interface JobProcessingResult {
  jobId: string | number;
  type: CollectionJobType;
  success: boolean;
  message?: string;
}

type JobProcessor = (job: Job<CollectionJobData>) => Promise<JobProcessingResult>;

const DEFAULT_CRON = '0 */6 * * *'; // Every 6 hours

export class DataCollectionQueue {
  private queue: Queue<CollectionJobData>;
  private processor?: JobProcessor;
  private scheduledJobId?: string;

  constructor(queueName = 'data-collection') {
    this.queue = new Bull<CollectionJobData>(queueName, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Register job processor (call once at app startup)
   */
  registerProcessor(processor: JobProcessor): void {
    if (this.processor) {
      console.warn('[DataCollectionQueue] Processor already registered, skipping');
      return;
    }

    this.processor = processor;

    this.queue.process(CollectionJobType.API_COLLECTION, async (job) => processor(job));
    this.queue.process(CollectionJobType.WEB_SCRAPING, async (job) => processor(job));
    this.queue.process(CollectionJobType.FULL_COLLECTION, async (job) => processor(job));

    console.log('[DataCollectionQueue] Job processor registered');
  }

  async addApiCollectionJob(
    keywords: string[],
    options?: Bull.JobOptions
  ): Promise<Job<ApiCollectionJobData>> {
    return this.queue.add(
      CollectionJobType.API_COLLECTION,
      { keywords },
      { priority: 2, ...options }
    );
  }

  async addWebScrapingJob(
    urls: string[],
    options?: Bull.JobOptions
  ): Promise<Job<WebScrapingJobData>> {
    return this.queue.add(
      CollectionJobType.WEB_SCRAPING,
      { urls },
      { priority: 3, ...options }
    );
  }

  async addFullCollectionJob(
    data: FullCollectionJobData,
    options?: Bull.JobOptions
  ): Promise<Job<FullCollectionJobData>> {
    return this.queue.add(CollectionJobType.FULL_COLLECTION, data, {
      priority: 1,
      ...options,
    });
  }

  /**
   * Schedule periodic collection (default: every 6 hours)
   */
  async scheduleCollection(
    cron: string = process.env.COLLECTION_SCHEDULE_CRON || DEFAULT_CRON,
    defaultKeywords: string[] = []
  ): Promise<void> {
    const keywords =
      defaultKeywords.length > 0
        ? defaultKeywords
        : (process.env.COLLECTION_DEFAULT_KEYWORDS || 'điện thoại,laptop,tivi')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);

    await this.queue.add(
      CollectionJobType.FULL_COLLECTION,
      { keywords },
      {
        repeat: { cron },
        jobId: 'scheduled-full-collection',
      }
    );

    this.scheduledJobId = 'scheduled-full-collection';
    console.log(`[DataCollectionQueue] Scheduled full collection: ${cron}`);
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  getQueue(): Queue<CollectionJobData> {
    return this.queue;
  }

  async close(): Promise<void> {
    if (this.scheduledJobId) {
      await this.queue.removeRepeatableByKey(this.scheduledJobId).catch(() => undefined);
    }
    await this.queue.close();
  }

  private setupEventHandlers(): void {
    this.queue.on('completed', (job, result) => {
      console.log(`[DataCollectionQueue] Job ${job.id} (${job.name}) completed:`, result);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`[DataCollectionQueue] Job ${job?.id} (${job?.name}) failed:`, err.message);
    });

    this.queue.on('stalled', (job) => {
      console.warn(`[DataCollectionQueue] Job ${job.id} stalled`);
    });

    this.queue.on('error', (err) => {
      console.error('[DataCollectionQueue] Queue error:', err.message);
    });
  }
}

let queueInstance: DataCollectionQueue | null = null;

export function getDataCollectionQueue(): DataCollectionQueue {
  if (!queueInstance) {
    queueInstance = new DataCollectionQueue();
  }
  return queueInstance;
}
