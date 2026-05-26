/** 화면·저장에서 숨길 data_type (i누리 메타) */
const HIDDEN_DATA_TYPES = new Set(['구체적놀이사례', '구체적 놀이사례'])

function normalizeDataType(value) {
  return (value ?? '').replace(/\s+/g, '').trim()
}

export function isHiddenDataType(dataType) {
  if (!dataType?.trim()) {
    return false
  }
  const compact = normalizeDataType(dataType)
  if (HIDDEN_DATA_TYPES.has(dataType.trim()) || HIDDEN_DATA_TYPES.has(compact)) {
    return true
  }
  return compact === '구체적놀이사례'
}

/** 표시·DB 저장용 — 구체적 놀이사례면 null */
export function publicDataType(dataType) {
  if (isHiddenDataType(dataType)) {
    return null
  }
  const trimmed = dataType?.trim()
  return trimmed || null
}
