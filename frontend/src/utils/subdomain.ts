/**
 * Subdomain routing utility
 */

export const getAppUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const isMainDomain = hostname === 'testoza.com' || hostname === 'www.testoza.com';
  
  if (isMainDomain) {
    // Return absolute path on the app subdomain
    return `https://app.testoza.com${path.startsWith('/') ? path : '/' + path}`;
  }
  
  // Return relative path for local development and staging
  return path.startsWith('/') ? path : '/' + path;
};

export const getMarketingUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const isAppDomain = hostname === 'app.testoza.com';
  
  if (isAppDomain) {
    // Return absolute path on the marketing domain
    return `https://testoza.com${path.startsWith('/') ? path : '/' + path}`;
  }
  
  // Return relative path for local development and staging
  return path.startsWith('/') ? path : '/' + path;
};
