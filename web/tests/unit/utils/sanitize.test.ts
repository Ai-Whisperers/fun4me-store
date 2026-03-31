import { describe, it, expect } from 'vitest'
import { sanitizeHtml, createSanitizedHtml, SANITIZE_PRESETS } from '@/lib/utils/sanitize'

describe('sanitizeHtml', () => {
  describe('XSS prevention', () => {
    it('removes script tags', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('<p>Hello</p>')
    })

    it('removes onerror event handlers', () => {
      const malicious = '<img src="x" onerror="alert(\'XSS\')">'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('alert')
    })

    it('removes onclick event handlers', () => {
      const malicious = '<button onclick="alert(\'XSS\')">Click</button>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('alert')
    })

    it('removes javascript: protocol in href', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('javascript:')
      expect(result).not.toContain('alert')
    })

    it('removes data: protocol in href', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('data:')
      expect(result).not.toContain('<script>')
    })

    it('removes iframe tags', () => {
      const malicious = '<p>Content</p><iframe src="https://evil.com"></iframe>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<iframe')
      expect(result).not.toContain('evil.com')
    })

    it('removes form tags', () => {
      const malicious = '<form action="https://evil.com"><input type="text"></form>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<form')
      expect(result).not.toContain('<input')
    })

    it('removes object and embed tags', () => {
      const malicious = '<object data="evil.swf"></object><embed src="evil.swf">'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<object')
      expect(result).not.toContain('<embed')
    })

    it('removes style tags', () => {
      const malicious = '<style>body { background: url("javascript:alert(1)"); }</style>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<style')
      expect(result).not.toContain('javascript:')
    })

    it('removes meta tags', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=https://evil.com">'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<meta')
      expect(result).not.toContain('evil.com')
    })

    it('removes link tags', () => {
      const malicious = '<link rel="stylesheet" href="https://evil.com/malicious.css">'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('<link')
    })

    it('removes base64 encoded script injection', () => {
      const malicious = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('base64')
    })

    it('removes SVG XSS vectors', () => {
      const malicious = '<svg onload="alert(1)"><circle r="10"></circle></svg>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('onload')
      expect(result).not.toContain('alert')
    })
  })

  describe('richText preset', () => {
    it('allows basic formatting tags', () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em></p>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
      expect(result).toContain('<p>')
    })

    it('allows headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('<h1>')
      expect(result).toContain('<h2>')
      expect(result).toContain('<h3>')
    })

    it('allows lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li></ol>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('<ul>')
      expect(result).toContain('<ol>')
      expect(result).toContain('<li>')
    })

    it('allows anchor tags with safe href', () => {
      const html = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
    })

    it('allows blockquotes', () => {
      const html = '<blockquote>A quote</blockquote>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('<blockquote>')
    })

    it('allows class attribute', () => {
      const html = '<p class="highlight">Styled text</p>'
      const result = sanitizeHtml(html, 'richText')
      expect(result).toContain('class="highlight"')
    })
  })

  describe('consent preset', () => {
    it('does not allow anchor tags', () => {
      const html = '<p>Please visit <a href="https://example.com">our site</a></p>'
      const result = sanitizeHtml(html, 'consent')
      expect(result).not.toContain('<a')
      expect(result).not.toContain('href')
    })

    it('allows tables for legal documents', () => {
      const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>'
      const result = sanitizeHtml(html, 'consent')
      expect(result).toContain('<table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<tbody>')
      expect(result).toContain('<th>')
      expect(result).toContain('<td>')
    })

    it('allows formatting tags', () => {
      const html = '<p><strong>Important:</strong> Read carefully</p>'
      const result = sanitizeHtml(html, 'consent')
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
    })

    it('removes href attribute entirely', () => {
      const html = '<p href="javascript:alert(1)">Text</p>'
      const result = sanitizeHtml(html, 'consent')
      expect(result).not.toContain('href')
    })
  })

  describe('basicText preset', () => {
    it('only allows minimal formatting', () => {
      const html = '<p><strong>Bold</strong> <em>italic</em> <br/> text</p>'
      const result = sanitizeHtml(html, 'basicText')
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
      expect(result).toContain('<br')
    })

    it('removes links', () => {
      const html = '<p>Visit <a href="https://example.com">here</a></p>'
      const result = sanitizeHtml(html, 'basicText')
      expect(result).not.toContain('<a')
      expect(result).not.toContain('href')
    })

    it('removes images', () => {
      const html = '<p>Image: <img src="photo.jpg" alt="test"></p>'
      const result = sanitizeHtml(html, 'basicText')
      expect(result).not.toContain('<img')
      expect(result).not.toContain('src')
    })

    it('removes class attributes', () => {
      const html = '<p class="danger">Text</p>'
      const result = sanitizeHtml(html, 'basicText')
      expect(result).not.toContain('class=')
    })

    it('removes style attributes', () => {
      const html = '<p style="color: red;">Text</p>'
      const result = sanitizeHtml(html, 'basicText')
      expect(result).not.toContain('style=')
    })
  })

  describe('edge cases', () => {
    it('handles null input', () => {
      const result = sanitizeHtml(null, 'richText')
      expect(result).toBe('')
    })

    it('handles undefined input', () => {
      const result = sanitizeHtml(undefined, 'richText')
      expect(result).toBe('')
    })

    it('handles empty string', () => {
      const result = sanitizeHtml('', 'richText')
      expect(result).toBe('')
    })

    it('handles plain text without HTML', () => {
      const text = 'Just plain text without any HTML'
      const result = sanitizeHtml(text, 'richText')
      expect(result).toBe(text)
    })

    it('handles nested malicious content', () => {
      const malicious = '<div><p><a href="javascript:alert(1)"><img src="x" onerror="alert(2)"></a></p></div>'
      const result = sanitizeHtml(malicious, 'richText')
      expect(result).not.toContain('javascript:')
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('alert')
    })

    it('handles mixed valid and invalid content', () => {
      const mixed = '<p>Valid</p><script>evil()</script><strong>Also valid</strong>'
      const result = sanitizeHtml(mixed, 'richText')
      expect(result).toContain('<p>Valid</p>')
      expect(result).toContain('<strong>Also valid</strong>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('evil')
    })
  })

  describe('custom config', () => {
    it('accepts custom DOMPurify configuration', () => {
      const html = '<p class="test"><strong>Bold</strong></p>'
      const result = sanitizeHtml(html, {
        ALLOWED_TAGS: ['p'],
        ALLOWED_ATTR: [],
      })
      expect(result).toContain('<p>')
      expect(result).not.toContain('<strong>')
      expect(result).not.toContain('class=')
    })
  })
})

describe('createSanitizedHtml', () => {
  it('returns object with __html property', () => {
    const result = createSanitizedHtml('<p>Test</p>', 'richText')
    expect(result).toHaveProperty('__html')
    expect(result.__html).toContain('<p>Test</p>')
  })

  it('sanitizes content before wrapping', () => {
    const result = createSanitizedHtml('<p>Safe</p><script>alert(1)</script>', 'richText')
    expect(result.__html).toContain('<p>Safe</p>')
    expect(result.__html).not.toContain('<script>')
  })

  it('handles null input', () => {
    const result = createSanitizedHtml(null, 'richText')
    expect(result.__html).toBe('')
  })

  it('handles undefined input', () => {
    const result = createSanitizedHtml(undefined, 'richText')
    expect(result.__html).toBe('')
  })
})

describe('SANITIZE_PRESETS', () => {
  it('has richText preset', () => {
    expect(SANITIZE_PRESETS).toHaveProperty('richText')
    expect(SANITIZE_PRESETS.richText.ALLOWED_TAGS).toContain('a')
  })

  it('has consent preset', () => {
    expect(SANITIZE_PRESETS).toHaveProperty('consent')
    expect(SANITIZE_PRESETS.consent.ALLOWED_TAGS).toContain('table')
    expect(SANITIZE_PRESETS.consent.FORBID_TAGS).toContain('a')
  })

  it('has basicText preset', () => {
    expect(SANITIZE_PRESETS).toHaveProperty('basicText')
    expect(SANITIZE_PRESETS.basicText.ALLOWED_TAGS).not.toContain('a')
    expect(SANITIZE_PRESETS.basicText.ALLOWED_TAGS).not.toContain('img')
  })
})
