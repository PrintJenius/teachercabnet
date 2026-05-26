import { authHeaders, hasAccessToken } from './auth'
import { createApiError, parseResponseBody } from './apiError'
import { isValidLessonDomain } from '../constants/lessonJournalDomains'
import { publicDataType } from './materialMeta'

function ensureLoggedIn() {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
    err.status = 401
    throw err
  }
}

async function parseJsonResponse(res) {
  const raw = await res.text()
  const data = parseResponseBody(raw)
  if (!res.ok) {
    throw createApiError(res, data)
  }
  return data
}

function normalizeMaterialPage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0 ? n : null
}

function mapMaterial(ref) {
  return {
    materialId: ref.materialId ?? ref.material_id ?? null,
    title: ref.title ?? '제목 없음',
    description: ref.description ?? '',
    url: ref.url ?? null,
    source: ref.source ?? null,
    topic: ref.topic ?? null,
    domain: ref.domain ?? null,
    dataType: publicDataType(ref.dataType ?? ref.data_type ?? null),
    page: normalizeMaterialPage(ref.page),
  }
}

export function todayIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function fetchLessonJournal(date) {
  ensureLoggedIn()
  const params = new URLSearchParams({ date })
  const res = await fetch(`/api/lesson-journals?${params}`, {
    headers: authHeaders(),
  })
  const data = await parseJsonResponse(res)
  return {
    lessonJournalId: data.lessonJournalId ?? data.lesson_journal_id ?? null,
    targetDate: data.targetDate ?? data.target_date ?? date,
    materials: (data.materials ?? []).map(mapMaterial),
  }
}

export async function fetchLessonJournalDomainStats({ year, month }) {
  ensureLoggedIn()
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  const res = await fetch(`/api/lesson-journals/domain-stats?${params}`, {
    headers: authHeaders(),
  })
  const data = await parseJsonResponse(res)
  const byDomain = (data.byDomain ?? data.by_domain ?? []).map((row) => ({
    domain: row.domain,
    count: row.count ?? 0,
  }))
  return {
    year: data.year ?? year,
    month: data.month ?? month,
    totalCount: data.totalCount ?? data.total_count ?? 0,
    byDomain,
  }
}

export async function fetchPseudoIntentionStats({ year, month }) {
  ensureLoggedIn()
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  const res = await fetch(`/api/lesson-journals/pseudo-intention-stats?${params}`, {
    headers: authHeaders(),
  })
  const data = await parseJsonResponse(res)
  const byScore = (data.byScore ?? data.by_score ?? []).map((row) => ({
    score: row.score,
    count: row.count ?? 0,
  }))
  return {
    year: data.year ?? year,
    month: data.month ?? month,
    totalCount: data.totalCount ?? data.total_count ?? 0,
    byScore,
  }
}

export async function fetchLessonJournalDates() {
  ensureLoggedIn()
  const res = await fetch('/api/lesson-journals/dates', {
    headers: authHeaders(),
  })
  const data = await parseJsonResponse(res)
  return Array.isArray(data) ? data : []
}

export async function saveLessonJournalMaterials({ targetDate, materials, pseudoIntentionScore }) {
  ensureLoggedIn()
  const body = {
    targetDate,
    materials: materials.map((item) => ({
        title: item.title,
        description: item.description || null,
        url: item.url || null,
        source: item.source || null,
        topic: item.topic || null,
        domain: item.domain || null,
        dataType: publicDataType(item.dataType) || null,
        page: normalizeMaterialPage(item.page),
      })),
  }
  if (pseudoIntentionScore != null) {
    body.pseudoIntentionScore = pseudoIntentionScore
  }
  const res = await fetch('/api/lesson-journals', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const data = await parseJsonResponse(res)
  return {
    lessonJournalId: data.lessonJournalId ?? data.lesson_journal_id ?? null,
    targetDate: data.targetDate ?? data.target_date ?? targetDate,
    materials: (data.materials ?? []).map(mapMaterial),
  }
}

/** 자료 찾기 없이 교사가 직접 적은 수업 기록 */
export async function saveManualLessonEntry({ targetDate, title, description, domain }) {
  const trimmedDomain = domain?.trim() ?? ''
  if (!isValidLessonDomain(trimmedDomain)) {
    throw new Error('누리과정 영역을 선택해 주세요.')
  }
  return saveLessonJournalMaterials({
    targetDate,
    materials: [
      {
        title: title.trim(),
        description: description?.trim() || '',
        domain: trimmedDomain,
        source: '직접 입력',
        url: null,
        topic: null,
        dataType: null,
      },
    ],
  })
}

export async function deleteLessonJournalMaterial(materialId) {
  ensureLoggedIn()
  const res = await fetch(`/api/lesson-journals/materials/${materialId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await parseJsonResponse(res)
}
