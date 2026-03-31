/**
 * XSS Prevention Tests
 * 
 * Verifies that HTML sanitization works correctly to prevent XSS attacks.
 * Tests all sanitization presets and common attack vectors.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, createSanitizedHtml } from '@/lib/utils/sanitize';

describe('XSS Prevention - HTML Sanitization', () => {
  describe('Script Tag Injection', () => {
    it('should remove <script> tags', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('<p>Hello</p>');
    });

    it('should remove script tags with attributes', () => {
      const malicious = '<script src="evil.js"></script><p>Content</p>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('evil.js');
    });

    it('should remove obfuscated script tags', () => {
      const vectors = [
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script >alert("XSS")</script>',
        '<script\n>alert("XSS")</script>',
      ];

      vectors.forEach((vector) => {
        const sanitized = sanitizeHtml(vector, 'richText');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('SCRIPT');
      });
      
      // Note: Nested script tags may be encoded rather than removed
      // This is also safe as encoded content cannot execute
      const nestedScripts = '<scr<script>ipt>alert("XSS")</scr</script>ipt>';
      const sanitized = sanitizeHtml(nestedScripts, 'richText');
      expect(sanitized).not.toContain('<script');
    });
  });

  describe('Event Handler Injection', () => {
    it('should remove onclick handlers', () => {
      const malicious = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Click me');
    });

    it('should remove all event handlers', () => {
      const handlers = [
        'onclick',
        'onerror',
        'onload',
        'onmouseover',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
      ];

      handlers.forEach((handler) => {
        const malicious = `<img ${handler}="alert('XSS')" src="test.jpg">`;
        const sanitized = sanitizeHtml(malicious, 'richText');
        
        expect(sanitized).not.toContain(handler);
        expect(sanitized).not.toContain('alert');
      });
    });
  });

  describe('JavaScript Protocol Injection', () => {
    it('should remove javascript: protocol in href', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove javascript: protocol in src', () => {
      const malicious = '<img src="javascript:alert(\'XSS\')">';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove data: protocol with JavaScript', () => {
      const malicious = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('data:');
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Iframe and Embed Injection', () => {
    it('should remove iframe tags', () => {
      const malicious = '<iframe src="http://evil.com"></iframe>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('evil.com');
    });

    it('should remove embed tags', () => {
      const malicious = '<embed src="http://evil.com">';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<embed');
    });

    it('should remove object tags', () => {
      const malicious = '<object data="http://evil.com"></object>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<object');
    });
  });

  describe('Form Injection', () => {
    it('should remove form tags', () => {
      const malicious = '<form action="http://evil.com"><input type="submit"></form>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<form');
      expect(sanitized).not.toContain('<input');
    });

    it('should remove form-related tags', () => {
      const tags = ['form', 'input', 'button', 'select', 'textarea'];
      
      tags.forEach((tag) => {
        const malicious = `<${tag}>Content</${tag}>`;
        const sanitized = sanitizeHtml(malicious, 'richText');
        
        expect(sanitized).not.toContain(`<${tag}`);
      });
    });
  });

  describe('Style and Link Injection', () => {
    it('should remove style tags', () => {
      const malicious = '<style>body { background: url("javascript:alert(\'XSS\')") }</style>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<style');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove link tags', () => {
      const malicious = '<link rel="stylesheet" href="http://evil.com/xss.css">';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<link');
    });

    it('should remove meta tags', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=http://evil.com">';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<meta');
    });
  });

  describe('SVG-based XSS', () => {
    it('should sanitize SVG with embedded scripts', () => {
      const malicious = '<svg><script>alert("XSS")</script></svg>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove SVG event handlers', () => {
      const malicious = '<svg onload="alert(\'XSS\')"></svg>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('Sanitization Presets', () => {
    const xssPayload = '<script>alert("XSS")</script><p onclick="hack()">Test</p>';

    it('richText preset should allow safe formatting', () => {
      const safe = '<p>Test</p><strong>Bold</strong><a href="https://example.com">Link</a>';
      const sanitized = sanitizeHtml(safe, 'richText');
      
      expect(sanitized).toContain('<p>Test</p>');
      expect(sanitized).toContain('<strong>Bold</strong>');
      expect(sanitized).toContain('<a');
      expect(sanitized).toContain('https://example.com');
    });

    it('richText preset should block scripts', () => {
      const sanitized = sanitizeHtml(xssPayload, 'richText');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('hack');
    });

    it('consent preset should not allow links', () => {
      const html = '<p>Terms</p><a href="http://evil.com">Click</a>';
      const sanitized = sanitizeHtml(html, 'consent');
      
      expect(sanitized).toContain('<p>Terms</p>');
      expect(sanitized).not.toContain('<a');
      expect(sanitized).not.toContain('href');
      expect(sanitized).toContain('Click'); // Text preserved
    });

    it('consent preset should allow tables', () => {
      const html = '<table><tr><td>Data</td></tr></table>';
      const sanitized = sanitizeHtml(html, 'consent');
      
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<tr>');
      expect(sanitized).toContain('<td>Data</td>');
    });

    it('basicText preset should be most restrictive', () => {
      const html = '<p>Text</p><a href="test.com">Link</a><img src="test.jpg">';
      const sanitized = sanitizeHtml(html, 'basicText');
      
      expect(sanitized).toContain('<p>Text</p>');
      expect(sanitized).not.toContain('<a');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('Link'); // Text preserved
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const sanitized = sanitizeHtml(null, 'richText');
      expect(sanitized).toBe('');
    });

    it('should handle undefined input', () => {
      const sanitized = sanitizeHtml(undefined, 'richText');
      expect(sanitized).toBe('');
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeHtml('', 'richText');
      expect(sanitized).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const text = 'Plain text without any HTML';
      const sanitized = sanitizeHtml(text, 'richText');
      expect(sanitized).toBe(text);
    });

    it('should handle nested malicious content', () => {
      const malicious = '<div><p><script>alert("XSS")</script></p></div>';
      const sanitized = sanitizeHtml(malicious, 'richText');
      
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('createSanitizedHtml helper', () => {
    it('should return object with __html property', () => {
      const result = createSanitizedHtml('<p>Test</p>', 'richText');
      
      expect(result).toHaveProperty('__html');
      expect(result.__html).toContain('<p>Test</p>');
    });

    it('should sanitize content in __html', () => {
      const result = createSanitizedHtml('<script>alert("XSS")</script><p>Safe</p>', 'richText');
      
      expect(result.__html).not.toContain('<script>');
      expect(result.__html).not.toContain('alert');
      expect(result.__html).toContain('<p>Safe</p>');
    });

    it('should handle null input', () => {
      const result = createSanitizedHtml(null, 'richText');
      expect(result.__html).toBe('');
    });
  });

  describe('Real-world XSS Vectors', () => {
    // Based on OWASP XSS Filter Evasion Cheat Sheet
    const realWorldVectors = [
      '<IMG SRC=javascript:alert("XSS")>',
      '<IMG SRC="javascript:alert(\'XSS\');">',
      '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
      '<IMG SRC=`javascript:alert("XSS")`>',
      '<IMG SRC=javascript:alert(String.fromCharCode(88,83,83))>',
      '<BODY ONLOAD=alert("XSS")>',
      '<BODY ONLOAD=alert(\'XSS\')>',
      '<iframe src=http://evil.com/xss.html>',
      '<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">',
      '<DIV STYLE="background-image: url(javascript:alert(\'XSS\'))">',
    ];

    realWorldVectors.forEach((vector, index) => {
      it(`should block real-world XSS vector ${index + 1}`, () => {
        const sanitized = sanitizeHtml(vector, 'richText');
        
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).not.toContain('XSS');
        expect(sanitized).not.toContain('evil.com');
      });
    });
  });
});
