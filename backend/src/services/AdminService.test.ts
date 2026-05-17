import { Pool } from 'pg';
import { AdminService, ReviewerInput, ReviewerUpdate, WebsiteConfigUpdate } from './AdminService';
import * as bcrypt from 'bcrypt';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock bcrypt
jest.mock('bcrypt');

describe('AdminService', () => {
  let adminService: AdminService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = new Pool() as jest.Mocked<Pool>;
    mockPool.connect = jest.fn().mockResolvedValue(mockClient);
    mockPool.query = jest.fn();

    adminService = new AdminService(mockPool);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getWebsiteConfig', () => {
    it('should return website configuration', async () => {
      const mockConfig = {
        id: 1,
        config_data: {
          logo: 'https://example.com/logo.png',
          siteName: 'Test Site',
          tagline: 'Test Tagline',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          font: 'Inter',
          branding: {},
          metadata: {},
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockConfig] } as any);

      const result = await adminService.getWebsiteConfig();

      expect(result).toEqual({
        id: '1',
        logoUrl: 'https://example.com/logo.png',
        siteName: 'Test Site',
        tagline: 'Test Tagline',
        theme: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          fontFamily: 'Inter',
        },
        branding: {},
        metadata: {},
        createdAt: mockConfig.created_at,
        updatedAt: mockConfig.updated_at,
      });
    });

    it('should throw error if configuration not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await expect(adminService.getWebsiteConfig()).rejects.toThrow(
        'Website configuration not found'
      );
    });
  });

  describe('updateWebsiteConfig', () => {
    it('should update website configuration', async () => {
      const existingConfig = {
        id: 1,
        config_data: {
          logo: 'https://example.com/logo.png',
          siteName: 'Test Site',
          tagline: 'Test Tagline',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          font: 'Inter',
          branding: {},
          metadata: {},
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updates: WebsiteConfigUpdate = {
        siteName: 'Updated Site',
        theme: { primaryColor: '#FF0000' },
      };

      const updatedConfig = {
        ...existingConfig,
        config_data: {
          ...existingConfig.config_data,
          siteName: 'Updated Site',
          primaryColor: '#FF0000',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [existingConfig] } as any) // SELECT existing
        .mockResolvedValueOnce({ rows: [updatedConfig] } as any) // UPDATE
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      const result = await adminService.updateWebsiteConfig(updates);

      expect(result.siteName).toBe('Updated Site');
      expect(result.theme.primaryColor).toBe('#FF0000');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should merge theme updates with existing theme', async () => {
      const existingConfig = {
        id: 1,
        config_data: {
          logo: 'https://example.com/logo.png',
          siteName: 'Test Site',
          tagline: 'Test Tagline',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          font: 'Inter',
          branding: {},
          metadata: {},
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updates: WebsiteConfigUpdate = {
        theme: { primaryColor: '#FF0000' },
      };

      const updatedConfig = {
        ...existingConfig,
        config_data: {
          ...existingConfig.config_data,
          primaryColor: '#FF0000',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [existingConfig] } as any) // SELECT existing
        .mockResolvedValueOnce({ rows: [updatedConfig] } as any) // UPDATE
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      const result = await adminService.updateWebsiteConfig(updates);

      // Check that the theme was merged - primaryColor updated, secondaryColor preserved
      expect(result.theme.primaryColor).toBe('#FF0000');
      expect(result.theme.secondaryColor).toBe('#10B981');
      expect(result.theme.fontFamily).toBe('Inter');
    });
  });

  describe('createReviewer', () => {
    it('should create a new reviewer with hashed password', async () => {
      const input: ReviewerInput = {
        email: 'reviewer@example.com',
        password: 'Password123',
        permissions: { canCreateArticles: true },
      };

      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const mockReviewer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: input.email,
        password_hash: hashedPassword,
        role: 'Reviewer',
        permissions: input.permissions,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Check email exists
        .mockResolvedValueOnce({ rows: [mockReviewer] } as any) // INSERT
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      const result = await adminService.createReviewer(input);

      expect(result.email).toBe(input.email);
      expect(result.role).toBe('Reviewer');
      expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);
    });

    it('should throw error if email already exists', async () => {
      const input: ReviewerInput = {
        email: 'existing@example.com',
        password: 'Password123',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] } as any); // Check email exists

      await expect(adminService.createReviewer(input)).rejects.toThrow(
        "User with email 'existing@example.com' already exists"
      );
    });

    it('should throw error for invalid email format', async () => {
      const input: ReviewerInput = {
        email: 'invalid-email',
        password: 'Password123',
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] } as any); // BEGIN

      await expect(adminService.createReviewer(input)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const input: ReviewerInput = {
        email: 'reviewer@example.com',
        password: 'weak',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // Check email exists

      await expect(adminService.createReviewer(input)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should set default permissions if not provided', async () => {
      const input: ReviewerInput = {
        email: 'reviewer@example.com',
        password: 'Password123',
      };

      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const mockReviewer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: input.email,
        password_hash: hashedPassword,
        role: 'Reviewer',
        permissions: {
          canCreateArticles: true,
          canEditArticles: true,
          canApproveArticles: true,
          canRejectArticles: true,
          canViewAnalytics: false,
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Check email exists
        .mockResolvedValueOnce({ rows: [mockReviewer] } as any) // INSERT
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      const result = await adminService.createReviewer(input);

      expect(result.permissions).toEqual({
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
        canRejectArticles: true,
        canViewAnalytics: false,
      });
    });
  });

  describe('updateReviewer', () => {
    it('should update reviewer information', async () => {
      const reviewerId = '123e4567-e89b-12d3-a456-426614174000';
      const updates: ReviewerUpdate = {
        email: 'updated@example.com',
        permissions: { canCreateArticles: false },
      };

      const existingReviewer = {
        id: reviewerId,
        email: 'old@example.com',
        password_hash: 'hashed',
        role: 'Reviewer',
        permissions: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [existingReviewer] } as any) // Check exists
        .mockResolvedValueOnce({ rows: [] } as any) // Check email conflict
        .mockResolvedValueOnce({
          rows: [{ ...existingReviewer, email: updates.email }],
        } as any) // UPDATE
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      const result = await adminService.updateReviewer(reviewerId, updates);

      expect(result.email).toBe(updates.email);
    });

    it('should hash new password when updating', async () => {
      const reviewerId = '123e4567-e89b-12d3-a456-426614174000';
      const updates: ReviewerUpdate = {
        password: 'NewPassword123',
      };

      const hashedPassword = 'new_hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const existingReviewer = {
        id: reviewerId,
        email: 'reviewer@example.com',
        password_hash: 'old_hashed',
        role: 'Reviewer',
        permissions: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [existingReviewer] } as any) // Check exists
        .mockResolvedValueOnce({ rows: [existingReviewer] } as any) // UPDATE
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      await adminService.updateReviewer(reviewerId, updates);

      expect(bcrypt.hash).toHaveBeenCalledWith(updates.password, 10);
    });

    it('should throw error if reviewer not found', async () => {
      const reviewerId = 'non-existent-id';
      const updates: ReviewerUpdate = { email: 'new@example.com' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // Check exists

      await expect(adminService.updateReviewer(reviewerId, updates)).rejects.toThrow(
        `Reviewer with ID ${reviewerId} not found`
      );
    });
  });

  describe('deleteReviewer', () => {
    it('should delete reviewer without articles', async () => {
      const reviewerId = '123e4567-e89b-12d3-a456-426614174000';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: reviewerId }] } as any) // Check exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any) // Check articles
        .mockResolvedValueOnce({ rows: [] } as any) // DELETE
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      await adminService.deleteReviewer(reviewerId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if reviewer has articles', async () => {
      const reviewerId = '123e4567-e89b-12d3-a456-426614174000';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: reviewerId }] } as any) // Check exists
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any); // Check articles

      await expect(adminService.deleteReviewer(reviewerId)).rejects.toThrow(
        'Cannot delete reviewer with 5 associated articles'
      );
    });

    it('should throw error if reviewer not found', async () => {
      const reviewerId = 'non-existent-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // Check exists

      await expect(adminService.deleteReviewer(reviewerId)).rejects.toThrow(
        `Reviewer with ID ${reviewerId} not found`
      );
    });
  });

  describe('getReviewers', () => {
    it('should return all reviewers', async () => {
      const mockReviewers = [
        {
          id: '1',
          email: 'reviewer1@example.com',
          password_hash: 'hashed',
          role: 'Reviewer',
          permissions: {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login: null,
        },
        {
          id: '2',
          email: 'reviewer2@example.com',
          password_hash: 'hashed',
          role: 'Reviewer',
          permissions: {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login: null,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockReviewers } as any);

      const result = await adminService.getReviewers();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('reviewer1@example.com');
      expect(result[1].email).toBe('reviewer2@example.com');
    });

    it('should filter reviewers by active status', async () => {
      const mockReviewers = [
        {
          id: '1',
          email: 'active@example.com',
          password_hash: 'hashed',
          role: 'Reviewer',
          permissions: {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login: null,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockReviewers } as any);

      const result = await adminService.getReviewers({ isActive: true });

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should filter reviewers by email', async () => {
      const mockReviewers = [
        {
          id: '1',
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'Reviewer',
          permissions: {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_login: null,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockReviewers } as any);

      const result = await adminService.getReviewers({ email: 'test' });

      expect(result).toHaveLength(1);
      expect(result[0].email).toContain('test');
    });
  });

  describe('getReviewerById', () => {
    it('should return reviewer by ID', async () => {
      const reviewerId = '123e4567-e89b-12d3-a456-426614174000';
      const mockReviewer = {
        id: reviewerId,
        email: 'reviewer@example.com',
        password_hash: 'hashed',
        role: 'Reviewer',
        permissions: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockPool.query.mockResolvedValue({ rows: [mockReviewer] } as any);

      const result = await adminService.getReviewerById(reviewerId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(reviewerId);
      expect(result?.email).toBe('reviewer@example.com');
    });

    it('should return null if reviewer not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await adminService.getReviewerById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
