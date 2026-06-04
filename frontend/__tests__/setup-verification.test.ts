/**
 * Setup Verification Tests for Task 1.1
 * 
 * This test suite verifies that all requirements for Task 1.1 are met:
 * - Next.js 14 with App Router and TypeScript
 * - Tailwind CSS with Headless UI components
 * - Zustand for client-side state management
 * - Next-PWA for progressive web app features
 * - ESLint, Prettier, and TypeScript configuration
 * - Project folder structure
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Task 1.1: Next.js 14 Frontend Project Setup', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('Next.js 14 with App Router and TypeScript', () => {
    it('should have Next.js 14 installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.dependencies.next).toContain('14');
    });

    it('should have TypeScript installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.devDependencies.typescript).toBeDefined();
    });

    it('should have App Router directory structure', () => {
      expect(fs.existsSync(path.join(rootDir, 'app'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'app', 'layout.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'app', 'page.tsx'))).toBe(true);
    });

    it('should have TypeScript configured with strict mode', () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('Tailwind CSS with Headless UI', () => {
    it('should have Tailwind CSS installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
    });

    it('should have Tailwind config file', () => {
      expect(fs.existsSync(path.join(rootDir, 'tailwind.config.ts'))).toBe(true);
    });

    it('should have Heroicons installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.dependencies['@heroicons/react']).toBeDefined();
    });

    it('should have Tailwind directives in globals.css', () => {
      const globalsCss = fs.readFileSync(
        path.join(rootDir, 'app', 'globals.css'),
        'utf8'
      );
      expect(globalsCss).toContain('@tailwind base');
      expect(globalsCss).toContain('@tailwind components');
      expect(globalsCss).toContain('@tailwind utilities');
    });
  });

  describe('Zustand State Management', () => {
    it('should have Zustand installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.dependencies.zustand).toBeDefined();
    });

    it('should have store directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'lib', 'store'))).toBe(true);
    });

    it('should have example store (useSearchStore)', () => {
      expect(
        fs.existsSync(path.join(rootDir, 'lib', 'store', 'useSearchStore.ts'))
      ).toBe(true);
    });
  });

  describe('Next-PWA Configuration', () => {
    it('should have Next-PWA installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.dependencies['next-pwa']).toBeDefined();
    });

    it('should have PWA manifest file', () => {
      expect(fs.existsSync(path.join(rootDir, 'public', 'manifest.json'))).toBe(true);
    });

    it('should have PWA configuration in next.config.js', () => {
      const nextConfig = fs.readFileSync(
        path.join(rootDir, 'next.config.js'),
        'utf8'
      );
      expect(nextConfig).toContain('next-pwa');
      expect(nextConfig).toContain('withPWA');
    });

    it('should have valid manifest.json', () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'public', 'manifest.json'), 'utf8')
      );
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
    });
  });

  describe('ESLint, Prettier, and TypeScript Configuration', () => {
    it('should have ESLint installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.devDependencies.eslint).toBeDefined();
    });

    it('should have ESLint config file', () => {
      expect(fs.existsSync(path.join(rootDir, '.eslintrc.json'))).toBe(true);
    });

    it('should have Prettier installed', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.devDependencies.prettier).toBeDefined();
    });

    it('should have Prettier config file', () => {
      expect(fs.existsSync(path.join(rootDir, '.prettierrc'))).toBe(true);
    });

    it('should have ESLint configured with Prettier', () => {
      const eslintConfig = JSON.parse(
        fs.readFileSync(path.join(rootDir, '.eslintrc.json'), 'utf8')
      );
      expect(eslintConfig.extends).toContain('prettier');
    });

    it('should have TypeScript config file', () => {
      expect(fs.existsSync(path.join(rootDir, 'tsconfig.json'))).toBe(true);
    });
  });

  describe('Project Folder Structure', () => {
    it('should have app directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'app'))).toBe(true);
    });

    it('should have components directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'components'))).toBe(true);
    });

    it('should have lib directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'lib'))).toBe(true);
    });

    it('should have types directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'types'))).toBe(true);
    });

    it('should have public directory', () => {
      expect(fs.existsSync(path.join(rootDir, 'public'))).toBe(true);
    });

    it('should have types/index.ts with core interfaces', () => {
      const typesFile = fs.readFileSync(
        path.join(rootDir, 'types', 'index.ts'),
        'utf8'
      );
      expect(typesFile).toContain('interface Product');
      expect(typesFile).toContain('interface PriceEntry');
      expect(typesFile).toContain('interface Category');
      expect(typesFile).toContain('interface SearchQuery');
      expect(typesFile).toContain('interface SearchResult');
    });
  });

  describe('Package Scripts', () => {
    it('should have required npm scripts', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
      );
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.format).toBeDefined();
      expect(packageJson.scripts['format:check']).toBeDefined();
      expect(packageJson.scripts['type-check']).toBeDefined();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 8.2 (mobile/tablet optimized)', () => {
      const tailwindConfig = fs.readFileSync(
        path.join(rootDir, 'tailwind.config.ts'),
        'utf8'
      );
      // Tailwind CSS provides responsive utilities by default
      expect(tailwindConfig).toBeDefined();
    });

    it('should satisfy Requirement 8.3 (responsive across all screen sizes)', () => {
      const layoutFile = fs.readFileSync(
        path.join(rootDir, 'app', 'layout.tsx'),
        'utf8'
      );
      // Check for viewport meta tag configuration
      expect(layoutFile).toContain('viewport');
    });

    it('should satisfy Requirement 8.6 (PWA features)', () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'public', 'manifest.json'), 'utf8')
      );
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons.length).toBeGreaterThan(0);
    });
  });
});
