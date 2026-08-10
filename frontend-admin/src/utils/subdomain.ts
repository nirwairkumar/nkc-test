/**
 * Subdomain and cross-port routing utility for Admin -> User App navigation
 */

export const getUserAppUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // In local dev, admin runs on 5174/5175, user app runs on 5173
    return `${protocol}//${hostname}:5173${normalizedPath}`;
  }
  
  // Production / Staging: target main user platform domain
  return `https://testoza.com${normalizedPath}`;
};

export const getAppUrl = getUserAppUrl;

export const getMarketingUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const isAppDomain = hostname === 'app.testoza.com';
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  if (isAppDomain) {
    return `https://testoza.com${normalizedPath}`;
  }
  
  return normalizedPath;
};

