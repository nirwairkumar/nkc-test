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
  const domainFlag = isProdDomain ? `; domain=${DOMAIN}` : '';
  document.cookie = `${name}=; path=/${domainFlag}; max-age=-99999999; Secure; SameSite=Lax`;
};

export const tokenStorage = {
  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('testoza_token', accessToken);
    setCookie('testoza_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('testoza_refresh_token', refreshToken);
      setCookie('testoza_refresh_token', refreshToken);
    }
  },
  clearTokens: () => {
    localStorage.removeItem('testoza_token');
    localStorage.removeItem('testoza_refresh_token');
    deleteCookie('testoza_token');
    deleteCookie('testoza_refresh_token');
  },
  getTokens: (): { token: string | null; refreshToken: string | null } => {
    let token = localStorage.getItem('testoza_token');
    let refreshToken = localStorage.getItem('testoza_refresh_token');

    // Sync from cookies if localStorage is empty (e.g. crossing subdomains)
    if (!token) {
      token = getCookie('testoza_token');
      if (token) {
        localStorage.setItem('testoza_token', token);
      }
    }
    if (!refreshToken) {
      refreshToken = getCookie('testoza_refresh_token');
      if (refreshToken) {
        localStorage.setItem('testoza_refresh_token', refreshToken);
      }
    }

    return { token, refreshToken };
  }
};
