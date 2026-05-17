/**
 * AdminService Usage Examples
 * 
 * This file demonstrates how to use the AdminService for system management.
 */

import { Pool } from 'pg';
import { AdminService } from './AdminService';

// Initialize the service
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adminService = new AdminService(pool);

/**
 * Example 1: Get Website Configuration
 */
async function getWebsiteConfigExample() {
  try {
    const config = await adminService.getWebsiteConfig();
    console.log('Website Configuration:', config);
    /*
    Output:
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      logoUrl: 'https://example.com/logo.png',
      siteName: 'Product Price Comparison',
      tagline: 'So sánh giá sản phẩm từ nhiều nguồn',
      theme: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        fontFamily: 'Inter'
      },
      branding: {},
      metadata: {},
      createdAt: 2024-01-01T00:00:00.000Z,
      updatedAt: 2024-01-01T00:00:00.000Z
    }
    */
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Update Website Configuration
 */
async function updateWebsiteConfigExample() {
  try {
    const updatedConfig = await adminService.updateWebsiteConfig({
      siteName: 'My Price Comparison Site',
      tagline: 'Find the best deals online',
      logoUrl: 'https://example.com/new-logo.png',
      theme: {
        primaryColor: '#FF0000', // Will merge with existing theme
      },
    });
    console.log('Updated Configuration:', updatedConfig);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 3: Create a New Reviewer
 */
async function createReviewerExample() {
  try {
    const newReviewer = await adminService.createReviewer({
      email: 'reviewer@example.com',
      password: 'SecurePassword123',
      permissions: {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
        canRejectArticles: true,
        canViewAnalytics: false,
      },
    });
    console.log('Created Reviewer:', newReviewer);
    /*
    Output:
    {
      id: '456e7890-e89b-12d3-a456-426614174001',
      email: 'reviewer@example.com',
      role: 'Reviewer',
      permissions: {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
        canRejectArticles: true,
        canViewAnalytics: false
      },
      isActive: true,
      createdAt: 2024-01-01T00:00:00.000Z,
      updatedAt: 2024-01-01T00:00:00.000Z,
      lastLogin: undefined
    }
    */
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 4: Update Reviewer Permissions
 */
async function updateReviewerExample() {
  try {
    const reviewerId = '456e7890-e89b-12d3-a456-426614174001';
    const updatedReviewer = await adminService.updateReviewer(reviewerId, {
      permissions: {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
        canRejectArticles: true,
        canViewAnalytics: true, // Grant analytics access
      },
    });
    console.log('Updated Reviewer:', updatedReviewer);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 5: Update Reviewer Password
 */
async function updateReviewerPasswordExample() {
  try {
    const reviewerId = '456e7890-e89b-12d3-a456-426614174001';
    const updatedReviewer = await adminService.updateReviewer(reviewerId, {
      password: 'NewSecurePassword456',
    });
    console.log('Password updated for reviewer:', updatedReviewer.email);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 6: Deactivate Reviewer
 */
async function deactivateReviewerExample() {
  try {
    const reviewerId = '456e7890-e89b-12d3-a456-426614174001';
    const updatedReviewer = await adminService.updateReviewer(reviewerId, {
      isActive: false,
    });
    console.log('Deactivated Reviewer:', updatedReviewer.email);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 7: Get All Reviewers
 */
async function getAllReviewersExample() {
  try {
    const reviewers = await adminService.getReviewers();
    console.log('All Reviewers:', reviewers);
    console.log(`Total: ${reviewers.length} reviewers`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 8: Get Active Reviewers Only
 */
async function getActiveReviewersExample() {
  try {
    const activeReviewers = await adminService.getReviewers({ isActive: true });
    console.log('Active Reviewers:', activeReviewers);
    console.log(`Total: ${activeReviewers.length} active reviewers`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 9: Search Reviewers by Email
 */
async function searchReviewersByEmailExample() {
  try {
    const reviewers = await adminService.getReviewers({ email: 'example.com' });
    console.log('Reviewers matching search:', reviewers);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 10: Get Reviewer by ID
 */
async function getReviewerByIdExample() {
  try {
    const reviewerId = '456e7890-e89b-12d3-a456-426614174001';
    const reviewer = await adminService.getReviewerById(reviewerId);
    if (reviewer) {
      console.log('Found Reviewer:', reviewer);
    } else {
      console.log('Reviewer not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 11: Delete Reviewer
 */
async function deleteReviewerExample() {
  try {
    const reviewerId = '456e7890-e89b-12d3-a456-426614174001';
    await adminService.deleteReviewer(reviewerId);
    console.log('Reviewer deleted successfully');
  } catch (error) {
    console.error('Error:', error);
    // Will throw error if reviewer has associated articles
  }
}

/**
 * Example 12: Error Handling - Invalid Email
 */
async function invalidEmailExample() {
  try {
    await adminService.createReviewer({
      email: 'invalid-email', // Invalid format
      password: 'SecurePassword123',
    });
  } catch (error) {
    console.error('Expected Error:', error.message);
    // Output: "Invalid email format"
  }
}

/**
 * Example 13: Error Handling - Weak Password
 */
async function weakPasswordExample() {
  try {
    await adminService.createReviewer({
      email: 'reviewer@example.com',
      password: 'weak', // Too short, no uppercase, no number
    });
  } catch (error) {
    console.error('Expected Error:', error.message);
    // Output: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number"
  }
}

/**
 * Example 14: Error Handling - Duplicate Email
 */
async function duplicateEmailExample() {
  try {
    await adminService.createReviewer({
      email: 'existing@example.com',
      password: 'SecurePassword123',
    });
    // Try to create another reviewer with the same email
    await adminService.createReviewer({
      email: 'existing@example.com',
      password: 'AnotherPassword456',
    });
  } catch (error) {
    console.error('Expected Error:', error.message);
    // Output: "User with email 'existing@example.com' already exists"
  }
}

// Export examples for testing
export {
  getWebsiteConfigExample,
  updateWebsiteConfigExample,
  createReviewerExample,
  updateReviewerExample,
  updateReviewerPasswordExample,
  deactivateReviewerExample,
  getAllReviewersExample,
  getActiveReviewersExample,
  searchReviewersByEmailExample,
  getReviewerByIdExample,
  deleteReviewerExample,
  invalidEmailExample,
  weakPasswordExample,
  duplicateEmailExample,
};
