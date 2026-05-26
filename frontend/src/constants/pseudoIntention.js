export const PSEUDO_INTENTION_SCORES = [1, 2, 3, 4, 5]

export const PSEUDO_INTENTION_LABELS = {
  1: '1점',
  2: '2점',
  3: '3점',
  4: '4점',
  5: '5점',
}

export function isValidPseudoIntentionScore(score) {
  const n = Number(score)
  return Number.isInteger(n) && n >= 1 && n <= 5
}
