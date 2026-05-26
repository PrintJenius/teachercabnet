import { authHeaders, hasAccessToken } from './auth'
import { createApiError, parseResponseBody } from './apiError'
import { publicDataType } from './materialMeta'

function normalizeReferencePage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function askLessonGuide(question) {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
    err.status = 401
    throw err
  }
  const res = await fetch('/api/lesson-guides/ask', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ question: question.trim() }),
  })

  const raw = await res.text()
  const data = parseResponseBody(raw)

  if (!res.ok) {
    throw createApiError(res, data)
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
