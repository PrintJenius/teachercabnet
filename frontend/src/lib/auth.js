const KEY = 'accessToken'
export const AUTH_SESSION_EXPIRED = 'auth:session-expired'

export function getAccessToken() {
  return localStorage.getItem(KEY)
}

export function hasAccessToken() {
  const token = getAccessToken()
  return Boolean(token && token.trim())
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(KEY, token.trim())
  } else {
    localStorage.removeItem(KEY)
  }
}

export function clearAccessToken() {
  localStorage.removeItem(KEY)
}

/** 401 등으로 세션이 끊겼을 때 호출 */
export function notifySessionExpired() {
  clearAccessToken()
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED))
}

export function authHeaders(base = {}) {
  const token = getAccessToken()
  if (!token?.trim()) {
    return { ...base }
  }
  return {
    ...base,
    Authorization: `Bearer ${token.trim()}`,
  }
}
