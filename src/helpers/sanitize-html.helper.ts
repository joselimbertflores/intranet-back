import sanitize from 'sanitize-html';

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
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
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
  });
}
