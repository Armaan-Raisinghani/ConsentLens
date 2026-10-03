/**
 * Tests for FallbackHeuristics - Purpose and Permission fallback methods
 */

import { describe, it, expect } from 'vitest';
import { FallbackHeuristics } from '../../src/ai/fallback-heuristics.js';
import type { PageContext } from '../../src/ai/types.js';
import { createOAuthCapability, createBrowserPermissionCapability, createCookieCapability, createPolicyCapability, createTermsCapability } from '../../src/ir/capability.js';

describe('FallbackHeuristics - Purpose & Permission', () => {
  describe('inferPurpose', () => {
    it('should return confidence <= 0.6 for all fallback inferences', () => {
      const contexts: PageContext[] = [
        { url: 'https://example.com', title: 'Dashboard', metaTags: {}, headings: ['Dashboard'], mainContent: 'Manage projects' },
        { url: 'https://example.com', title: 'Feed', metaTags: {}, headings: ['Feed'], mainContent: 'Social posts' },
        { url: 'https://example.com', title: 'Cart', metaTags: {}, headings: ['Cart'], mainContent: 'Shopping cart' },
        { url: 'https://example.com', title: 'Watch', metaTags: {}, headings: ['Watch'], mainContent: 'Video content' },
        { url: 'https://example.com', title: 'Login', metaTags: {}, headings: ['Login'], mainContent: 'Sign in' },
        { url: 'https://example.com', title: 'Random', metaTags: {}, headings: [], mainContent: 'Generic page' },
      ];

      for (const context of contexts) {
        const result = FallbackHeuristics.inferPurpose(context);
        expect(result.confidence).toBeLessThanOrEqual(0.6);
        expect(result.inferred).toBeDefined();
        expect(result.evidence).toBeDefined();
        expect(result.evidence.length).toBeGreaterThan(0);
        expect(result.evidence[0].source).toBe('openjev');
      }
    });

    it('should classify productivity from keywords', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'Code Editor',
        metaTags: { description: 'IDE for developers' },
        headings: ['Editor', 'Workspace'],
        mainContent: 'Edit code, debug, manage projects in your workspace',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('productivity');
    });

    it('should classify social from keywords', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'Twitter Feed',
        metaTags: {},
        headings: ['Home', 'Notifications'],
        mainContent: 'Follow friends, share posts, like and comment',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('social');
    });

    it('should classify ecommerce from keywords', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'Shopping Cart',
        metaTags: {},
        headings: ['Cart', 'Checkout'],
        mainContent: 'Your cart has 3 items. Proceed to payment and checkout.',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('ecommerce');
    });

    it('should classify content from keywords', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'YouTube Video',
        metaTags: {},
        headings: ['Watch Video'],
        mainContent: 'Watch this movie, stream music, read articles',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('content');
    });

    it('should classify auth from keywords', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'Sign In',
        metaTags: {},
        headings: ['Login'],
        mainContent: 'Enter password to access your account',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('auth');
    });

    it('should default to other when no keywords match', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'Random Page',
        metaTags: {},
        headings: ['Welcome'],
        mainContent: 'This is a generic page with no specific keywords.',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('other');
    });

    it('should be case-insensitive', () => {
      const context: PageContext = {
        url: 'https://example.com',
        title: 'DASHBOARD',
        metaTags: {},
        headings: ['PROJECT MANAGEMENT'],
        mainContent: 'EDIT DOCUMENTS AND MANAGE TASKS',
      };
      const result = FallbackHeuristics.inferPurpose(context);
      expect(result.inferred).toBe('productivity');
    });
  });

  describe('interpretPermission', () => {
    it('should return confidence <= 0.6 for all fallback interpretations', () => {
      const capabilities = [
        createOAuthCapability('google', ['drive']),
        createOAuthCapability('github', ['repo']),
        createBrowserPermissionCapability('geolocation'),
        createBrowserPermissionCapability('camera'),
        createBrowserPermissionCapability('notifications'),
        createCookieCapability('advertising', 'ad_id', 'ads.com'),
        createCookieCapability('analytics', '_ga', 'example.com'),
        createCookieCapability('essential', 'session', 'example.com'),
        createPolicyCapability('data-collection'),
        createTermsCapability('arbitration'),
      ];

      for (const capability of capabilities) {
        const result = FallbackHeuristics.interpretPermission(capability);
        expect(result.confidence).toBeLessThanOrEqual(0.6);
        expect(result.capability).toEqual(capability);
        expect(result.description).toBeDefined();
        expect(result.sensitivity).toMatch(/^(high|medium|low)$/);
        expect(result.evidence).toBeDefined();
        expect(result.evidence.length).toBeGreaterThan(0);
      }
    });

    describe('OAuth capabilities', () => {
      it('should describe Google Drive as high sensitivity', () => {
        const cap = createOAuthCapability('google', ['drive', 'drive.file']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('Google Drive');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe Google Calendar as high sensitivity', () => {
        const cap = createOAuthCapability('google', ['calendar']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('Calendar');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe Gmail as high sensitivity', () => {
        const cap = createOAuthCapability('google', ['mail', 'gmail']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('Gmail');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe Google profile/email as low sensitivity', () => {
        const cap = createOAuthCapability('google', ['profile', 'email']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('profile');
        expect(result.sensitivity).toBe('low');
      });

      it('should describe GitHub with admin as high sensitivity', () => {
        const cap = createOAuthCapability('github', ['admin:repo_hook', 'delete_repo']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('GitHub');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe GitHub without admin as medium sensitivity', () => {
        const cap = createOAuthCapability('github', ['repo', 'user:email']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.sensitivity).toBe('medium');
      });

      it('should describe Microsoft as high sensitivity', () => {
        const cap = createOAuthCapability('microsoft', ['mail.read']);
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('Microsoft');
        expect(result.sensitivity).toBe('high');
      });
    });

    describe('Browser permissions', () => {
      it('should describe geolocation as high sensitivity', () => {
        const cap = createBrowserPermissionCapability('geolocation');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('location');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe camera as high sensitivity', () => {
        const cap = createBrowserPermissionCapability('camera');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('camera');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe microphone as high sensitivity', () => {
        const cap = createBrowserPermissionCapability('microphone');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('microphone');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe notifications as low sensitivity', () => {
        const cap = createBrowserPermissionCapability('notifications');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('notification');
        expect(result.sensitivity).toBe('low');
      });

      it('should describe clipboard as medium sensitivity', () => {
        const cap = createBrowserPermissionCapability('clipboard-read');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('clipboard');
        expect(result.sensitivity).toBe('medium');
      });
    });

    describe('Cookie capabilities', () => {
      it('should describe advertising/tracking as high sensitivity', () => {
        const cap = createCookieCapability('advertising', '_fbp', 'facebook.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('advertising');
        expect(result.description).toContain('analytics');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe tracking as high sensitivity', () => {
        const cap = createCookieCapability('tracking', '_gid', 'google.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.sensitivity).toBe('high');
      });

      it('should describe analytics as low sensitivity', () => {
        const cap = createCookieCapability('analytics', '_ga', 'example.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description.toLowerCase()).toContain('analytics');
        expect(result.sensitivity).toBe('low');
      });

      it('should describe essential as low sensitivity', () => {
        const cap = createCookieCapability('essential', 'session_id', 'example.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description.toLowerCase()).toContain('essential');
        expect(result.sensitivity).toBe('low');
      });

      it('should describe preferences as low sensitivity', () => {
        const cap = createCookieCapability('preferences', 'theme', 'example.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description.toLowerCase()).toContain('preference');
        expect(result.sensitivity).toBe('low');
      });

      it('should include cookie name and domain in evidence', () => {
        const cap = createCookieCapability('analytics', '_ga', 'example.com');
        const result = FallbackHeuristics.interpretPermission(cap);
        // Evidence is OpenJev-based in fallback, but description includes the info
        expect(result.description).toContain('_ga');
      });
    });

    describe('Policy capabilities', () => {
      it('should describe data practices with medium sensitivity', () => {
        const cap = createPolicyCapability('data-collection');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('data-collection');
        expect(result.sensitivity).toBe('medium');
      });

      it('should describe AI training as high sensitivity', () => {
        const cap = createPolicyCapability('ai-training');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('ai-training');
        expect(result.sensitivity).toBe('high');
      });
    });

    describe('Terms capabilities', () => {
      it('should describe arbitration as high sensitivity', () => {
        const cap = createTermsCapability('arbitration');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('arbitration');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe content-license as high sensitivity', () => {
        const cap = createTermsCapability('content-license');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('content-license');
        expect(result.sensitivity).toBe('high');
      });

      it('should describe liability as medium sensitivity', () => {
        const cap = createTermsCapability('liability');
        const result = FallbackHeuristics.interpretPermission(cap);
        expect(result.description).toContain('liability');
        expect(result.sensitivity).toBe('medium');
      });
    });
  });

  describe('Evidence structure', () => {
    it('should include openjev source evidence for all fallback results', () => {
      const purposeResult = FallbackHeuristics.inferPurpose({
        url: 'https://example.com',
        title: 'Test',
        metaTags: {},
        headings: [],
        mainContent: 'test',
      });
      expect(purposeResult.evidence[0].source).toBe('openjev');
      expect(purposeResult.evidence[0].confidence).toBeLessThanOrEqual(0.6);

      const permResult = FallbackHeuristics.interpretPermission(createOAuthCapability('google', ['drive']));
      expect(permResult.evidence[0].source).toBe('openjev');
      expect(permResult.evidence[0].confidence).toBeLessThanOrEqual(0.6);
    });
  });
});