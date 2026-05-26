import { publicDataType } from './materialMeta'

const STORAGE_KEY = 'teachercabinet.lesson_journal_pending'

function normalizePendingPage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0 ? n : null
}

function readList() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(list) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function getPendingLessonMaterials() {
  return readList()
}

export function addPendingLessonMaterial(material) {
  const list = readList()
  const key = `${material.url ?? ''}|${material.page ?? ''}|${material.title ?? ''}`
  if (list.some((item) => `${item.url ?? ''}|${item.page ?? ''}|${item.title ?? ''}` === key)) {
    return list
  }
  const next = [
    ...list,
    {
      title: material.title ?? '제목 없음',
      description: material.description ?? '',
      url: material.url ?? null,
      source: material.source ?? null,
      topic: material.topic ?? null,
      domain: material.domain ?? null,
      dataType: publicDataType(material.dataType) ?? null,
      page: normalizePendingPage(material.page),
    },
  ]
  writeList(next)
  return next
}

export function clearPendingLessonMaterials() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function removePendingLessonMaterial(index) {
  const list = readList()
  list.splice(index, 1)
  writeList(list)
  return list
}
