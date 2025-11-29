export async function authFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  const fetchOptions = {
    ...options,
    credentials: 'include' as const,
    headers
  };
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token && !headers.has('Authorization')) {
    console.log('[authFetch] Adding Bearer token from localStorage');
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, fetchOptions);
}


export function getUserIdFromToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('[authFetch] No authToken found in localStorage');
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const id = payload.id || payload.userId || payload.sub;
    if (!id) {
      console.warn('[authFetch] Token has no id/userId/sub field:', payload);
    }
    return id || null;
  } catch (err) {
    console.error('[authFetch] Token parse failed:', err, 'Token:', token?.substring(0, 20));
    return null;
  }
}


export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    console.log('[authFetch] Cleared development auth token');
  }
}
