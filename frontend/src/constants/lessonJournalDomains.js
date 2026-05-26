/** 누리과정 영역 (직접 입력용) */
export const LESSON_DOMAIN_VALUES = [
  '신체운동·건강',
  '의사소통',
  '사회관계',
  '예술경험',
  '자연탐구',
]

/** 달력 그래프 축 라벨 (짧게) */
export const LESSON_DOMAIN_CHART_LABELS = {
  '신체운동·건강': '신체',
  의사소통: '의사',
  사회관계: '사회',
  예술경험: '예술',
  자연탐구: '자연',
}

export const MANUAL_LESSON_SOURCE = '직접 입력'

export function isValidLessonDomain(domain) {
  return LESSON_DOMAIN_VALUES.includes(domain)
}

export function isManualLessonEntry(item) {
  return item?.source === MANUAL_LESSON_SOURCE
}
