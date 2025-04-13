import DOMPurify from 'dompurify';

// Configure DOMPurify to only allow specific tags and attributes
const config = {
  ALLOWED_TAGS: ['img', 'br', 'p', 'span'],
  ALLOWED_ATTRS: ['src', 'alt', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, config);
};