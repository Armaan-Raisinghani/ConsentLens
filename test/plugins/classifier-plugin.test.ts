/**
 * Classifier Plugin Tests - per PLUGIN-02
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PageContext } from '../../src/shared/errors.js';
import {
  registerClassifier,
  unregisterClassifier,
  getClassifier,
  getAllClassifiers,
  clearClassifiers,
  classifyCookie,
  ParsedCookie,
  CookieCategory,
  ClassificationResult,
} from '../../src/plugins/classifier-plugin.js';

describe('Classifier Plugin', () => {
  beforeEach(() => {
    clearClassifiers();
    vi.clearAllMocks();
  });

  const mockContext: PageContext = {
    document: {} as Document,
    url: 'https://example.com',
    origin: 'https://example.com',
  };

  const mockCookie: ParsedCookie = {
    name: 'test_cookie',
    value: 'test_value',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'lax',
    isSession: true,
  };

  describe('registerClassifier', () => {
    it('should register a classifier function', () => {
      const classifierFn = vi.fn((cookie: ParsedCookie) => ({
        category: CookieCategory.Analytics,
        confidence: 0.9,
        source: 'test-classifier',
      }));

      registerClassifier('test-classifier', classifierFn);
      expect(getClassifier('test-classifier')).toBe(classifierFn);
    });

    it('should throw if classifier name already exists', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      
      registerClassifier('duplicate', fn1);
      expect(() => registerClassifier('duplicate', fn2)).toThrow("Classifier 'duplicate' already registered");
    });
  });

  describe('unregisterClassifier', () => {
    it('should remove a registered classifier', () => {
      const fn = vi.fn();
      registerClassifier('to-remove', fn);
      expect(unregisterClassifier('to-remove')).toBe(true);
      expect(getClassifier('to-remove')).toBeUndefined();
    });

    it('should return false for non-existent classifier', () => {
      expect(unregisterClassifier('non-existent')).toBe(false);
    });
  });

  describe('getAllClassifiers', () => {
    it('should return all registered classifiers', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      
      registerClassifier('classifier-1', fn1);
      registerClassifier('classifier-2', fn2);
      
      const all = getAllClassifiers();
      expect(all).toHaveLength(2);
      expect(all).toContain(fn1);
      expect(all).toContain(fn2);
    });

    it('should return empty array when no classifiers registered', () => {
      expect(getAllClassifiers()).toHaveLength(0);
    });
  });

  describe('clearClassifiers', () => {
    it('should remove all classifiers', () => {
      registerClassifier('test-1', vi.fn());
      registerClassifier('test-2', vi.fn());
      
      clearClassifiers();
      expect(getAllClassifiers()).toHaveLength(0);
    });
  });

  describe('classifyCookie', () => {
    it('should return first matching classifier result', () => {
      const fn1 = vi.fn((cookie: ParsedCookie) => {
        if (cookie.name === 'special') {
          return { category: CookieCategory.Advertising, confidence: 0.95, source: 'fn1' };
        }
        return null;
      });
      
      const fn2 = vi.fn((cookie: ParsedCookie) => ({
        category: CookieCategory.Analytics,
        confidence: 0.8,
        source: 'fn2',
      }));

      registerClassifier('fn1', fn1);
      registerClassifier('fn2', fn2);

      // First classifier matches
      const result1 = classifyCookie({ ...mockCookie, name: 'special' }, mockContext);
      expect(result1).toEqual({
        category: CookieCategory.Advertising,
        confidence: 0.95,
        source: 'fn1',
      });

      // First returns null, second matches
      const result2 = classifyCookie(mockCookie, mockContext);
      expect(result2).toEqual({
        category: CookieCategory.Analytics,
        confidence: 0.8,
        source: 'fn2',
      });
    });

    it('should return null if no classifier matches', () => {
      const fn = vi.fn(() => null);
      registerClassifier('always-null', fn);
      
      const result = classifyCookie(mockCookie, mockContext);
      expect(result).toBeNull();
    });

    it('should call classifiers in registration order', () => {
      const callOrder: string[] = [];
      
      registerClassifier('first', (cookie) => {
        callOrder.push('first');
        return null;
      });
      
      registerClassifier('second', (cookie) => {
        callOrder.push('second');
        return { category: CookieCategory.Essential, confidence: 0.5, source: 'second' };
      });

      classifyCookie(mockCookie, mockContext);
      expect(callOrder).toEqual(['first', 'second']);
    });
  });

  describe('ParsedCookie type', () => {
    it('should have all required properties', () => {
      const cookie: ParsedCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        path: '/',
        expires: new Date(),
        maxAge: 3600,
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        isSession: false,
      };
      
      expect(cookie.name).toBe('test');
      expect(cookie.value).toBe('value');
      expect(cookie.domain).toBe('example.com');
      expect(cookie.path).toBe('/');
      expect(cookie.expires).toBeInstanceOf(Date);
      expect(cookie.maxAge).toBe(3600);
      expect(cookie.secure).toBe(true);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('strict');
      expect(cookie.isSession).toBe(false);
    });
  });

  describe('CookieCategory enum', () => {
    it('should have all expected categories', () => {
      expect(CookieCategory.Essential).toBe('essential');
      expect(CookieCategory.Analytics).toBe('analytics');
      expect(CookieCategory.Advertising).toBe('advertising');
      expect(CookieCategory.Personalization).toBe('personalization');
      expect(CookieCategory.Functional).toBe('functional');
      expect(CookieCategory.Security).toBe('security');
      expect(CookieCategory.Unknown).toBe('unknown');
    });
  });

  describe('ClassificationResult type', () => {
    it('should allow optional metadata', () => {
      const result: ClassificationResult = {
        category: CookieCategory.Analytics,
        confidence: 0.9,
        source: 'test',
        metadata: { customField: 'value' },
      };
      
      expect(result.metadata).toEqual({ customField: 'value' });
    });
  });
});