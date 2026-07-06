import sanitize from 'sanitize-html';

export function sanitizeBasicRichTextHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: {
      a: ['href'],
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
  });
}
