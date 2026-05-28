import { authHeaders, hasAccessToken } from './auth'
import { createApiError, parseResponseBody } from './apiError'
import { publicDataType } from './materialMeta'

const RAG_BASE_URL = (import.meta.env.VITE_RAG_BASE_URL || 'https://rag-96i6.onrender.com').replace(/\/+$/, '')

function normalizeReferencePage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0 ? n : null
}

function lessonGuideErrorMessage(status) {
  if (status === 401) {
    return '자료 찾기 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (status === 429) {
    return '요청이 많아 잠시 지연되고 있습니다. 10~20초 후 다시 시도해 주세요.'
  }
  if (status === 502 || status === 503 || status === 504) {
    return '자료 검색 서버를 깨우는 중입니다. 잠시 후 다시 시도해 주세요.'
  }
  if (status === 500) {
    return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return `자료 찾기 요청에 실패했습니다. (HTTP ${status})`
}

async function wakeRagServerOnce() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`${RAG_BASE_URL}/wake`, {
      method: 'GET',
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = new Error(lessonGuideErrorMessage(res.status))
      err.status = res.status
      throw err
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('자료 검색 서버를 깨우는 중입니다. 잠시 후 다시 시도해 주세요.')
      err.status = 504
      throw err
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function askLessonGuide(question) {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
    err.status = 401
    throw err
  }
  await wakeRagServerOnce()

  const res = await fetch('/api/lesson-guides/ask', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ question: question.trim() }),
  })

  const raw = await res.text()
  const data = parseResponseBody(raw)

  if (!res.ok) {
    // RAG 불안정(429/5xx/401) 시 로그아웃하지 않고, 고정 한국어 문구만 표시한다.
    const err = createApiError(res, data, { notifyOn401: false })
    err.message = lessonGuideErrorMessage(res.status)
    throw err
  }

  return {
    answer: data.answer ?? '',
    searchLogId: data.searchLogId ?? data.search_log_id ?? null,
    references: (data.references ?? []).map((ref, index) => ({
      id: `${index}-${ref.title ?? 'ref'}`,
      title: ref.title ?? '제목 없음',
      description: ref.description ?? '',
      url: ref.url ?? null,
      source: ref.source ?? null,
      topic: ref.topic ?? null,
      domain: ref.domain ?? null,
      dataType: publicDataType(ref.dataType ?? ref.data_type ?? null),
      page: normalizeReferencePage(ref.page),
      score: ref.score ?? null,
    })),
  }
}
