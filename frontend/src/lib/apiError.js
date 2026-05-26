import { notifySessionExpired } from './auth'

/** API 응답 본문 파싱 */
export function parseResponseBody(raw) {
  if (!raw?.trim()) {
    return {}
  }
  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw.trim() }
  }
}

/** Spring / FastAPI 등 다양한 오류 형식에서 사용자용 메시지 추출 */
export function extractErrorMessage(res, data) {
  const detail = data?.detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim()
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          return item.msg || item.message || ''
        }
        return ''
      })
      .filter(Boolean)
    if (parts.length > 0) {
      return parts.join(' ')
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }

  if (res.status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }
  if (res.status === 403) {
    return '이 기능을 사용할 권한이 없습니다.'
  }
  if (res.status === 502 || res.status === 503) {
    return '자료 검색 서버(rag-server)에 연결하지 못했습니다. 8001 포트에서 실행 중인지 확인해 주세요.'
  }
  if (res.status === 500) {
    return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (res.status >= 400) {
    return `요청에 실패했습니다. (HTTP ${res.status})`
  }
  return '요청에 실패했습니다.'
}

/** fetch 응답이 실패일 때 Error 생성 */
export function createApiError(res, data) {
  if (res.status === 401) {
    notifySessionExpired()
  }
  const err = new Error(extractErrorMessage(res, data))
  err.status = res.status
  err.data = data
  return err
}

export async function throwIfNotOk(res) {
  if (res.ok) {
    return
  }
  const raw = await res.text()
  const data = parseResponseBody(raw)
  throw createApiError(res, data)
}
