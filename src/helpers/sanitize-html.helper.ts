import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },

    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'code',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['onerror', 'onclick'],
  });
}
