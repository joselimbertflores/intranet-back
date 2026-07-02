import DOMPurify from 'isomorphic-dompurify';

export function sanitizeLandingModalNoticeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'img', 'video', 'audio', 'table'],
    FORBID_ATTR: ['style', 'class'],
  });
}
