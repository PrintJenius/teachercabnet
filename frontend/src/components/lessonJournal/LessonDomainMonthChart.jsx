import { useEffect, useMemo, useState } from 'react'
import {
  LESSON_DOMAIN_CHART_LABELS,
  LESSON_DOMAIN_VALUES,
} from '../../constants/lessonJournalDomains'
import { fetchLessonJournalDomainStats } from '../../lib/lessonJournal'
import styles from './LessonDomainMonthChart.module.css'

const DOMAIN_COLORS = {
  '신체운동·건강': '#2d5a87',
  의사소통: '#047857',
  사회관계: '#7c3aed',
  예술경험: '#c2410c',
  자연탐구: '#0e7490',
}

export default function LessonDomainMonthChart({ year, month, refreshKey = 0 }) {
  const [stats, setStats] = useState(null)
  const [phase, setPhase] = useState('idle')

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    fetchLessonJournalDomainStats({ year, month })
      .then((data) => {
        if (!cancelled) {
          setStats(data)
          setPhase('done')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null)
          setPhase('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [year, month, refreshKey])

  const maxCount = useMemo(() => {
    if (!stats?.byDomain?.length) {
      return 0
    }
    return Math.max(...stats.byDomain.map((item) => item.count), 0)
  }, [stats])

  const hasDomainCounts = maxCount > 0

  const monthLabel = `${year}년 ${month}월`

  return (
    <section className={styles.chartSection} aria-labelledby="domain-chart-title">
      <h3 id="domain-chart-title" className={styles.chartTitle}>
        누리과정 영역
      </h3>
      <p className={styles.chartSubtitle}>{monthLabel} 수업 기록</p>

      {phase === 'loading' ? <p className={styles.loadingText}>불러오는 중…</p> : null}

      {phase === 'error' ? (
        <p className={styles.errorText} role="alert">
          통계를 불러오지 못했습니다.
        </p>
      ) : null}

      {phase === 'done' && stats ? (
        <div className={styles.chartBody}>
          {!hasDomainCounts ? (
            <p className={styles.emptyText}>이번 달 영역별 수업 기록이 없습니다.</p>
          ) : (
            <div className={styles.bars} role="img" aria-label={`${monthLabel} 누리과정 영역별 수업 횟수`}>
              {LESSON_DOMAIN_VALUES.map((domain) => {
                  const row = stats.byDomain.find((item) => item.domain === domain) ?? { count: 0 }
                  const heightPct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0
                  const barHeight = row.count > 0 ? `${Math.max(heightPct, 8)}%` : '4px'
                  const color = DOMAIN_COLORS[domain] ?? '#6b7280'
                  const shortLabel = LESSON_DOMAIN_CHART_LABELS[domain] ?? domain
                  return (
                    <div key={domain} className={styles.barCol}>
                      <span className={styles.barCount}>{row.count}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={row.count > 0 ? styles.barFill : styles.barFillEmpty}
                          style={{
                            height: barHeight,
                            background: row.count > 0 ? color : undefined,
                          }}
                          title={`${domain} ${row.count}건`}
                        />
                      </div>
                      <span className={styles.barLabel} title={domain}>
                        {shortLabel}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
