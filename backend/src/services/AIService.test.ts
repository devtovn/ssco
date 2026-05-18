/**
 * Unit tests for AI Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { AIService } from './AIService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    service = new AIService();
  });

  it('should build Vietnamese market prompt', () => {
    const prompt = service.buildPrompt({
      keyword: 'iphone 15',
      tone: 'professional',
      includeComparison: true,
    });

    expect(prompt).toContain('iphone 15');
    expect(prompt).toContain('Việt Nam');
    expect(prompt).toContain('Tiki');
  });

  it('should parse OpenAI JSON response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Review iPhone 15',
                excerpt: 'Tổng quan iPhone 15',
                content: '# iPhone 15\nNội dung bài viết đủ dài để test.',
              }),
            },
          },
        ],
      },
    });

    const result = await service.generateArticleContent({ keyword: 'iphone 15' });

    expect(result.title).toBe('Review iPhone 15');
    expect(result.content).toContain('iPhone 15');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      })
    );
  });

  it('should report not configured without API key', () => {
    delete process.env.OPENAI_API_KEY;
    const noKeyService = new AIService();
    expect(noKeyService.isConfigured()).toBe(false);
  });
});
