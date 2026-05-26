import { authHeaders, hasAccessToken } from './auth'
import { createApiError, parseResponseBody } from './apiError'

export async function logLessonMaterialSelect(material) {
  if (!hasAccessToken()) {
    return
  }
  const res = await fetch('/api/lesson-activity/select-material', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      searchLogId: material.searchLogId ?? null,
      title: material.title,
      description: material.description || null,
      url: material.url || null,
      source: material.source || null,
      topic: material.topic || null,
      domain: material.domain || null,
      dataType: material.dataType || null,
      page: material.page ?? null,
    }),
  })
  if (!res.ok && res.status !== 204) {
    const data = parseResponseBody(await res.text())
    throw createApiError(res, data)
  }
}
