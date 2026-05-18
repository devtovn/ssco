/**
 * AI Service
 * OpenAI / Claude integration for Vietnamese product article generation
 */

import axios, { AxiosError } from 'axios';

export interface AIGenerationOptions {
  keyword: string;
  targetLength?: number;
  tone?: 'professional' | 'casual' | 'technical';
  includeComparison?: boolean;
  productName?: string;
}

export interface AIGeneratedContent {
  title: string;
  content: string;
  excerpt: string;
}

type AIProvider = 'openai' | 'claude';

export class AIService {
  private provider: AIProvider;
  private maxRetries: number;

  constructor() {
    const configured = (process.env.AI_SERVICE_PROVIDER || 'openai').toLowerCase();
    this.provider = configured === 'claude' ? 'claude' : 'openai';
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3', 10);
  }

  async generateArticleContent(options: AIGenerationOptions): Promise<AIGeneratedContent> {
    const prompt = this.buildPrompt(options);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const raw =
          this.provider === 'claude'
            ? await this.callClaude(prompt)
            : await this.callOpenAI(prompt);

        return this.parseGeneratedContent(raw, options.keyword);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`[AIService] Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('AI content generation failed');
  }

  buildPrompt(options: AIGenerationOptions): string {
    const length = options.targetLength || 1200;
    const tone = options.tone || 'professional';
    const comparisonNote = options.includeComparison
      ? 'Bao gồm phần so sánh giá từ các sàn Tiki, Lazada, Shopee khi phù hợp.'
      : '';

    return `Bạn là chuyên gia viết nội dung thương mại điện tử cho thị trường Việt Nam.

Viết bài review/hướng dẫn mua hàng về từ khóa: "${options.keyword}"
${options.productName ? `Sản phẩm tham chiếu: ${options.productName}` : ''}

Yêu cầu:
- Giọng văn: ${tone}, dễ đọc, phù hợp người Việt
- Độ dài khoảng ${length} từ
- Cấu trúc: mở bài, đặc điểm nổi bật, ưu/nhược điểm, gợi ý mua, kết luận
- Dùng tiêu đề H2/H3 bằng markdown
- Không bịa thông số kỹ thuật; nếu không chắc, ghi "cần xác minh"
- ${comparisonNote}

Trả về JSON hợp lệ (không markdown bọc ngoài) với format:
{
  "title": "tiêu đề SEO",
  "excerpt": "mô tả ngắn 1-2 câu",
  "content": "nội dung bài viết markdown"
}`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a Vietnamese e-commerce content writer. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  private async callClaude(prompt: string): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        system:
          'You are a Vietnamese e-commerce content writer. Always respond with valid JSON only.',
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const block = response.data.content?.[0];
    return block?.type === 'text' ? block.text : '';
  }

  private parseGeneratedContent(raw: string, keyword: string): AIGeneratedContent {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      const title = String(parsed.title || `Review ${keyword}`).trim();
      const content = String(parsed.content || '').trim();
      const excerpt = String(parsed.excerpt || '').trim();

      if (!content) {
        throw new Error('AI returned empty content');
      }

      return {
        title,
        content,
        excerpt: excerpt || content.slice(0, 200) + '...',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        throw new Error(axiosError.response?.data?.error?.message || axiosError.message);
      }
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConfigured(): boolean {
    if (this.provider === 'claude') {
      return !!process.env.CLAUDE_API_KEY;
    }
    return !!process.env.OPENAI_API_KEY;
  }
}

export const aiService = new AIService();
