import { safeLocalStorage } from './safeStorage';

const DOMAIN = '.testoza.com';

const setCookie = (name: string, value: string, maxAgeDays = 30) => {
  const hostname = window.location.hostname;
  const isProdDomain = hostname.endsWith('testoza.com');
  const domainFlag = isProdDomain ? `; domain=${DOMAIN}` : '';
  document.cookie = `${name}=${value}; path=/${domainFlag}; max-age=${maxAgeDays * 24 * 60 * 60}; Secure; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  const hostname = window.location.hostname;
  const isProdDomain = hostname.endsWith('testoza.com');
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  // 1. Delete host-only cookie
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}; SameSite=Lax`;
  document.cookie = `${name}=; path=/; max-age=-99999999; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}; SameSite=Lax`;

  // 2. Delete for current hostname
  document.cookie = `${name}=; path=/; domain=${hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}; SameSite=Lax`;

  // 3. Delete root wildcard domain cookie if on testoza.com
  if (isProdDomain) {
    document.cookie = `${name}=; path=/; domain=${DOMAIN}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}; SameSite=Lax`;
    document.cookie = `${name}=; path=/; domain=testoza.com; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}; SameSite=Lax`;
  }
};

export const tokenStorage = {
  setTokens: (accessToken: string, refreshToken?: string) => {
    safeLocalStorage.setItem('testoza_token', accessToken);
    setCookie('testoza_token', accessToken);
    if (refreshToken) {
      safeLocalStorage.setItem('testoza_refresh_token', refreshToken);
      setCookie('testoza_refresh_token', refreshToken);
    }
  },
  clearTokens: () => {
    safeLocalStorage.removeItem('testoza_token');
    safeLocalStorage.removeItem('testoza_refresh_token');
    try {
      sessionStorage.removeItem('testoza_token');
      sessionStorage.removeItem('testoza_refresh_token');
    } catch (e) {
      // ignore
    }
    deleteCookie('testoza_token');
    deleteCookie('testoza_refresh_token');
  },
  getTokens: (): { token: string | null; refreshToken: string | null } => {
    let token = safeLocalStorage.getItem('testoza_token');
    let refreshToken = safeLocalStorage.getItem('testoza_refresh_token');

    // Sync from cookies if localStorage is empty (e.g. crossing subdomains or storage cleared)
    if (!token) {
      token = getCookie('testoza_token');
      if (token) {
        safeLocalStorage.setItem('testoza_token', token);
      }
    }
    if (!refreshToken) {
      refreshToken = getCookie('testoza_refresh_token');
      if (refreshToken) {
        safeLocalStorage.setItem('testoza_refresh_token', refreshToken);
      }
    }

    return { token, refreshToken };
  }
};
