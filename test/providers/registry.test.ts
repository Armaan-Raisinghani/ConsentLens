/**
 * Provider Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderRegistry } from '../../src/plugins/provider-plugin.js';
import type { ProviderConfig } from '../../src/plugins/provider-plugin.js';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    vi.clearAllMocks();
  });

  const mockProvider: ProviderConfig = {
    id: 'test-provider',
    name: 'Test Provider',
    authUrl: 'https://auth.test.com/oauth/authorize',
    scopeMap: {
      read: ['read:data', 'read:profile'],
      write: ['write:data', 'write:profile'],
    },
    icon: '🔧',
    color: '#FF0000',
    detectionPatterns: {
      urlPatterns: [/auth\.test\.com/],
      buttonTextPatterns: [/sign in with test/i],
    },
  };

  describe('register', () => {
    it('should register multiple providers at once', () => {
      const provider1 = { ...mockProvider, id: 'provider-1', name: 'Provider 1' };
      const provider2 = { ...mockProvider, id: 'provider-2', name: 'Provider 2' };
      
      registry.register([provider1, provider2]);
      
      expect(registry.getProvider('provider-1')).toEqual(provider1);
      expect(registry.getProvider('provider-2')).toEqual(provider2);
    });

    it('should maintain insertion order', () => {
      const provider1 = { ...mockProvider, id: 'provider-1', name: 'Provider 1' };
      const provider2 = { ...mockProvider, id: 'provider-2', name: 'Provider 2' };
      
      registry.register([provider1, provider2]);
      
      // Should maintain insertion order
      const all = registry.getAllProviders();
      expect(all[0].id).toBe('provider-1');
      expect(all[1].id).toBe('provider-2');
    });
  });

  describe('add', () => {
    it('should add a single provider', () => {
      registry.add(mockProvider);
      expect(registry.getProvider('test-provider')).toEqual(mockProvider);
    });

    it('should maintain insertion order after add', () => {
      const provider1 = { ...mockProvider, id: 'provider-1', name: 'Provider 1' };
      registry.add(provider1);
      
      const provider2 = { ...mockProvider, id: 'provider-2', name: 'Provider 2' };
      registry.add(provider2);
      
      const all = registry.getAllProviders();
      expect(all[0].id).toBe('provider-1');
      expect(all[1].id).toBe('provider-2');
    });
  });

  describe('remove', () => {
    it('should remove provider by id', () => {
      registry.add(mockProvider);
      expect(registry.remove('test-provider')).toBe(true);
      expect(registry.getProvider('test-provider')).toBeUndefined();
    });

    it('should return false for non-existent provider', () => {
      expect(registry.remove('non-existent')).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return provider by id', () => {
      registry.add(mockProvider);
      const provider = registry.getProvider('test-provider');
      expect(provider).toEqual(mockProvider);
    });

    it('should return undefined for non-existent provider', () => {
      expect(registry.getProvider('non-existent')).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return all registered providers', () => {
      const provider1 = { ...mockProvider, id: 'provider-1', name: 'Provider 1' };
      const provider2 = { ...mockProvider, id: 'provider-2', name: 'Provider 2' };
      
      registry.register([provider1, provider2]);
      
      const all = registry.getAllProviders();
      expect(all).toHaveLength(2);
      expect(all.map(p => p.id)).toContain('provider-1');
      expect(all.map(p => p.id)).toContain('provider-2');
    });

    it('should return empty array when no providers', () => {
      expect(registry.getAllProviders()).toHaveLength(0);
    });

    it('should return copy not reference', () => {
      registry.add(mockProvider);
      const all = registry.getAllProviders();
      all.push({ ...mockProvider, id: 'extra' });
      
      expect(registry.getAllProviders()).toHaveLength(1);
    });
  });

  describe('findByAuthUrl', () => {
    it('should find provider by exact auth URL match', () => {
      registry.add(mockProvider);
      
      const found = registry.findByAuthUrl('https://auth.test.com/oauth/authorize');
      expect(found).toEqual(mockProvider);
    });

    it('should not find provider for different URL', () => {
      registry.add(mockProvider);
      
      const found = registry.findByAuthUrl('https://different.com/oauth/authorize');
      expect(found).toBeUndefined();
    });

    it('should handle invalid URLs gracefully', () => {
      registry.add(mockProvider);
      
      const found = registry.findByAuthUrl('not-a-valid-url');
      expect(found).toBeUndefined();
    });

    it('should match hostname and pathname', () => {
      registry.add(mockProvider);
      
      // URL with query params should still match
      const found = registry.findByAuthUrl('https://auth.test.com/oauth/authorize?client_id=123');
      expect(found).toEqual(mockProvider);
    });
  });

  describe('clear', () => {
    it('should remove all providers', () => {
      registry.register([
        { ...mockProvider, id: 'provider-1' },
        { ...mockProvider, id: 'provider-2' },
      ]);
      
      registry.clear();
      expect(registry.getAllProviders()).toHaveLength(0);
    });
  });

  describe('Core 5 providers integration', () => {
    it('should support Google provider config', () => {
      const googleConfig: typeof mockProvider = {
        id: 'google',
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        scopeMap: {
          'drive.read': ['drive.read', 'drive.file'],
          'calendar.read': ['calendar.readonly', 'calendar.events.readonly'],
          'mail.read': ['mail.google.com', 'gmail.readonly'],
          'profile': ['profile', 'email', 'openid'],
        },
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNDI4NUY0IiBkPSJNMjIuNTYgMTIuMDRjMCAxLjI1LS4xNSAyLjQ1LS40NCAzLjYyIGwtMS4yMSAxLjIxYzEuOTYtMS42IDMuNDQtMy45NCAzLjQ0LTYuNjFoNC44NFYxMmgtNC44NFptLTEuNjUtMi4yM2MtLjQ3LS4yOS0xLjA0LS40OC0xLjYzLS40OC0xLjMzIDAtMi41NC44OC0yLjk0IDEuODZhOS40NSA5LjQ1IDAgMCAwLTEuNjMgNS40M2MtLjA2IDEuNy44MyAzLjMzIDIuMjYgNC40OC0yLjY0LS4zNS01LjM2LTEuMzMtNy4xMi0zLjVBOS41NCA5LjQ1IDAgMCAwIDEyIDhjLTUuNTIgMC0xMCA0LjQ4LTEwIDEwczQuNDggMTAgMTAgMTBjNy44NCAwIDEwLjktNi4zNSA5Ljk2LTE0Ljc1em0tOS43NiA0Ljc0Yy0xLjE4IDAtMi4xNi0uOTYtMi4xNi0yLjE2czkuOTYtMi4xNiAyLjE2LTIuMTYgMi4xNi45NiAyLjE2IDIuMTZ6Ii8+PC9zdmc+',
        color: '#4285F4',
      };
      
      expect(() => registry.add(googleConfig)).not.toThrow();
    });

    it('should support GitHub provider config', () => {
      const githubConfig: typeof mockProvider = {
        id: 'github',
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        scopeMap: {
          'repo': ['repo', 'repo:status', 'repo_deployment'],
          'read:user': ['read:user', 'user:email'],
          'admin:org': ['admin:org', 'admin:org_hook'],
        },
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMjQyOTJlIiBkPSJNMTIgMGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMlMxOC42MjcgMCAxMiAwem01IDE3Yy0uNjcgMS4xOS0xLjc3IDEuNzctMy4yNyAxLjc3LTEuMyAwLTIuNjMtLjQzLTMuMzMtMS4yMy4xNC0uOTguNTctMS43IDEuMzUtMi43Mi0uNDctMS4xMy0xLjEzLTEuODctMS40My0yLjU3LS4xNi0uNDEtLjA2LTEuMy4wNS0xLjYzQzEzLjA2IDExLjM3IDEwLjM0IDEwLjMgOS41NyAxMC4zYy0uNjMgMC0xLjIyLjA5LTEuNzkuMjctLjU3LS4xOC0xLjIyLS4zOS0xLjc2LS42MiAwLS4xNS4wMy0uMjYuMDgtLjM4YzEuMTggLjM5IDIuMDcgMS4zMiAyLjA3IDIuOThhNy40OCA3LjQ4IDAgMCAxLS43NSAxLjM1Yy0xLjU2IDAtMy4yMi0uNzctNC4yMy0xLjktLjI5LS4xOC0uNTMtLjQyLS43Ni0uNjZhNS45MyA1LjkzIDAgMCAxLS4zLTEuOTljMC0xLjM4LjQ2LTIuNTMgMS4yMy0zLjQzQzYuMTUgNi42NyA1LjU1IDcuNjMgNS41NSA4Ljg5YzAgMS4yMi4yNiAyLjQyLjc2IDMuNTQtLjQyLjA3LS44Ni4xMS0xLjMuMTItMS45IDAtMS43Ny0xLjQzLTMuMTktMy4yMy0zLjE5LTEuNzMgMC0zLjE0IDEuMTctMy41NSAyLjczLS4yNi4xOC0uNTAuMzktLjcxLjU4LjE2LjA3LjMzLjEyLjUxLjEyIDEuMjEgMCAyLjE2LS44OCAyLjg2LTIuMTcgMi44NloiLz48L3N2Zz4=',
        color: '#24292E',
      };
      
      expect(() => registry.add(githubConfig)).not.toThrow();
    });

    it('should support Microsoft provider config', () => {
      const microsoftConfig: typeof mockProvider = {
        id: 'microsoft',
        name: 'Microsoft',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        scopeMap: {
          'Files.Read': ['Files.Read', 'Files.Read.All', 'Files.ReadWrite'],
          'Mail.Read': ['Mail.Read', 'Mail.ReadWrite', 'Mail.Send'],
          'Calendars.Read': ['Calendars.Read', 'Calendars.ReadWrite'],
        },
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjRjJGNUY2IiBkPSJNMTkgM0g1Yy0xLjEgMC0yIC45LTIgMnYxNGMwIDEuMS45IDIgMiAyaDE0YzEuMSAwIDItLjkgMi0yVjVjMC0xLjEtLjktMi0yLTJ6bS03IDBoNXYySDdoLTJjLjYgMCAxIC40IDEgMXYySDd2LTJjMC0uNi40LTEgMS0xek0xNyAxN2gtM3YtM2gzdjJjLS42IDAtMSAuNC0xIDF2MmgzdjJoLTN2LTJjMC0uNi40LTEgMS0xem0tNS04aDJ2MmgzYy42IDAgMSAuNCAxIDF2MmgtMnYtMmMwLS42LjQtMSAxLTF6bTAtNmgzdjNoLTJjLS42IDAtMS0uNC0xLTF2LTJoLTN2MmMtLjYgMC0xIC40LTEgMXoiLz48L3N2Zz4=',
        color: '#0078D4',
      };
      
      expect(() => registry.add(microsoftConfig)).not.toThrow();
    });

    it('should support Slack provider config', () => {
      const slackConfig: typeof mockProvider = {
        id: 'slack',
        name: 'Slack',
        authUrl: 'https://slack.com/oauth/v2/authorize',
        scopeMap: {
          'channels:read': ['channels:read', 'channels:write'],
          'files:read': ['files:read', 'files:write'],
          'chat:write': ['chat:write', 'chat:write.public'],
        },
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNEExNUE2IiBkPSJNMTkuMDIgMy45M2MtMS4zNi0uOTItMi45Mi0xLjM4LTQuNjMtMS4zOC0yLjM1IDAtNC42OS42Ni02LjA0IDEuOTgtMS4zMyAxLjMxLTIuMTQgMy4xMS0yLjE0IDQuOTQtLjAxIDEuMTUuMzMgMi4yNi45OCAzLjI3IDEuMzQgMS4yNiAyLjA4IDMuMDYgMi4wOCA0Ljc1IDAgMi4zNy0uODQgNC40Ni0yLjQ2IDYuMTMtMS41NyAxLjYyLTMuNjUgMi40My01LjkwIDIuNDMtMi40NSAwLTQuNzEtLjc4LTYuMjYtMi4zM3oiLz48L3N2Zz4=',
        color: '#4A154B',
      };
      
      expect(() => registry.add(slackConfig)).not.toThrow();
    });

    it('should support Discord provider config', () => {
      const discordConfig: typeof mockProvider = {
        id: 'discord',
        name: 'Discord',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        scopeMap: {
          'identify': ['identify'],
          'guilds': ['guilds', 'guilds.members.read'],
          'email': ['email'],
        },
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNTg2NUYyIiBkPSJNMjAuMzE3IDQuMzcxYTExLjcxNCAxMS43MTQgMCAwIDAtMS41NjMtMi41NjdjLS4yNjMtLjQ0Ni0uNTQ2LS44NjgtLjg1Ny0xLjI4M0ExMS4yNzYgMTEuMjc2IDAgMCAwIDEzLjM2LjA3N2ExMS4zMTcgMTEuMzE3IDAgMCAwLTEuMzU1IDMuMDFDOS42NjEgNy40MTYgOC4yNCA5LjQxOCA3LjM1NiAxMS43OWMuMzA0LjM0NC42MzQuNjczLjk0NSAxLjA2NmExMS43MTcgMTEuNzE3IDAgMCAwIDEuNTYzIDIuNTY3Yy4yNjIuNDQ3LjU0Ni44NjguODU3IDEuMjgzYTExLjI3NiAxMS4yNzYgMCAwIDAgMS4zNTUtMy4wMWMuOTM4LTIuMzUgMi4zNC00LjM1IDMuMjM0LTYuMzc4YTEyLjA2OCAxMi4wNjggMCAwIDEgMy4wMS0xLjA0NGMxLjA4NS4zMjMgMi4xOC43MTMgMy4yMiAxLjE4M3oiLz48L3N2Zz4=',
        color: '#5865F2',
      };
      
      expect(() => registry.add(discordConfig)).not.toThrow();
    });
  });
});