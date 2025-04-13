import DOMPurify from 'dompurify';

// Configure DOMPurify to only allow img tags with specific attributes
const config = {
  ALLOWED_TAGS: ['img'],
  ALLOWED_ATTRS: ['src', 'alt'],
  ALLOW_DATA_ATTR: false,
};

export const extractFirstImage = (html: string): string | null => {
  const sanitized = DOMPurify.sanitize(html, config);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.outerHTML : null;
};