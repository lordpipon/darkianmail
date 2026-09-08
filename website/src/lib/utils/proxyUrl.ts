export function proxyUrl(url: string): string {
  if (!url) return '';
  
  try {
    if (url.startsWith('/api/')) return url;
    
    const encodedUrl = encodeURIComponent(url);
    return `/api/proxy?url=${encodedUrl}`;
  } catch (error) {
    console.error('Failed to proxy URL:', error);
    return '';
  }
}
