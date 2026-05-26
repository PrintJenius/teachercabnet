import { useCallback, useEffect, useMemo, useState } from 'react'
import LessonJournalWriteModal from '../../components/lessonJournal/LessonJournalWriteModal'
import LessonDomainMonthChart from '../../components/lessonJournal/LessonDomainMonthChart'
import { MANUAL_LESSON_SOURCE, isManualLessonEntry } from '../../constants/lessonJournalDomains'
import { buildCalendarCells, parseDateInputValue, shiftMonth } from '../../lib/calendar'
import {
  deleteLessonJournalMaterial,
  fetchLessonJournal,
  fetchLessonJournalDates,
  saveLessonJournalMaterials,
  todayIsoDate,
} from '../../lib/lessonJournal'
import {
  clearPendingLessonMaterials,
  getPendingLessonMaterials,
  removePendingLessonMaterial,
} from '../../lib/lessonJournalPending'
import { publicDataType } from '../../lib/materialMeta'
import styles from './LessonJournalPage.module.css'

function hasDisplayPage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0
}

function MaterialCard({ item, onDelete, deleting }) {
  const dataTypeLabel = publicDataType(item.dataType)
  const manual = isManualLessonEntry(item)
  const showPage = hasDisplayPage(item.page)
  return (
    <article className={styles.materialCard}>
      <header className={styles.materialHeader}>
        <h3 className={styles.materialTitle}>{item.title}</h3>
        <div className={styles.materialHeaderMeta}>
          {manual ? <span className={styles.manualTag}>{MANUAL_LESSON_SOURCE}</span> : null}
          {item.domain ? <span className={styles.domainTag}>{item.domain}</span> : null}
          {showPage ? <span className={styles.pageTag}>p.{item.page}</span> : null}
          {dataTypeLabel ? <span className={styles.badgeMuted}>{dataTypeLabel}</span> : null}
        </div>
      </header>
      {item.description ? <p className={styles.materialDesc}>{item.description}</p> : null}
      {!manual && item.source ? <p className={styles.materialSource}>{item.source}</p> : null}
      <footer className={styles.materialFooter}>
        {item.url ? (
          <a
            className={styles.materialLink}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            i누리 자료 보기
          </a>
        ) : manual ? (
          <span className={styles.manualFootnote}>직접 기록한 수업</span>
        ) : (
          <span className={styles.linkDisabled}>링크 없음</span>
        )}
        {item.materialId ? (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(item.materialId)}
            disabled={deleting}
          >
            삭제
          </button>
        ) : null}
      </footer>
    </article>
  )
}

function PendingMaterialRow({ item, index, onRemove }) {
  const dataTypeLabel = publicDataType(item.dataType)
  const showPage = hasDisplayPage(item.page)
  return (
    <li className={styles.pendingItem}>
      <div className={styles.pendingItemMain}>
        <p className={styles.pendingTitle}>{item.title}</p>
        {item.domain ? <span className={styles.domainTag}>{item.domain}</span> : null}
        {showPage ? <span className={styles.pageTag}>p.{item.page}</span> : null}
        {dataTypeLabel ? <span className={styles.badgeMuted}>{dataTypeLabel}</span> : null}
      </div>
      <button type="button" className={styles.pendingRemoveBtn} onClick={() => onRemove(index)}>
        빼기
      </button>
    </li>
  )
}

function LessonJournalPage() {
  const [targetDate, setTargetDate] = useState(todayIsoDate)
  const [journal, setJournal] = useState(null)
  const [loggedDates, setLoggedDates] = useState([])
  const [pending, setPending] = useState(() => getPendingLessonMaterials())
  const [phase, setPhase] = useState('idle')
  const [savePhase, setSavePhase] = useState('idle')
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [writeModalOpen, setWriteModalOpen] = useState(false)
  const [pageNotice, setPageNotice] = useState('')
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)

  const loggedDateSet = useMemo(() => new Set(loggedDates), [loggedDates])
  const visibleMonthDate = useMemo(() => {
    const { year, month } = parseDateInputValue(targetDate)
    return new Date(year, month - 1, 1)
  }, [targetDate])
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonthDate), [visibleMonthDate])
  const monthLabel = `${visibleMonthDate.getFullYear()}년 ${visibleMonthDate.getMonth() + 1}월`
  const chartYear = visibleMonthDate.getFullYear()
  const chartMonth = visibleMonthDate.getMonth() + 1

  const refreshPending = () => {
    setPending(getPendingLessonMaterials())
  }

  const loadJournal = useCallback(async (date) => {
    setPhase('loading')
    setError('')
    try {
      const [data, dates] = await Promise.all([
        fetchLessonJournal(date),
        fetchLessonJournalDates(),
      ])
      setJournal(data)
      setLoggedDates(dates)
      setPhase('done')
    } catch (err) {
      setPhase('error')
      setError(err.message || '수업 일지를 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    loadJournal(targetDate)
  }, [targetDate, loadJournal])

  useEffect(() => {
    setWriteModalOpen(false)
    setPageNotice('')
  }, [targetDate])

  useEffect(() => {
    refreshPending()
  }, [])

  const handleRemovePending = (index) => {
    removePendingLessonMaterial(index)
    refreshPending()
  }

  const handleClearPending = () => {
    clearPendingLessonMaterials()
    refreshPending()
  }

  const handleSavePending = async () => {
    if (pending.length === 0) {
      return
    }
    setSavePhase('loading')
    setSaveMessage('')
    setError('')
    try {
      await saveLessonJournalMaterials({
        targetDate,
        materials: pending,
      })
      clearPendingLessonMaterials()
      refreshPending()
      setSavePhase('done')
      setSaveMessage(`${targetDate} 수업 일지에 ${pending.length}건을 저장했어요.`)
      setStatsRefreshKey((k) => k + 1)
      await loadJournal(targetDate)
    } catch (err) {
      setSavePhase('error')
      setSaveMessage(err.message || '저장에 실패했습니다.')
    }
  }

  const handleManualSaved = async () => {
    setPageNotice(`${targetDate}에 수업 기록을 저장했어요.`)
    setStatsRefreshKey((k) => k + 1)
    await loadJournal(targetDate)
  }

  const handleDelete = async (materialId) => {
    if (!window.confirm('이 자료를 수업 일지에서 삭제할까요?')) {
      return
    }
    setDeletingId(materialId)
    try {
      await deleteLessonJournalMaterial(materialId)
      await loadJournal(targetDate)
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const savedMaterials = journal?.materials ?? []
  const hasMaterials = savedMaterials.length > 0
  const hasPending = pending.length > 0

  return (
    <section className={styles.page}>
      <aside className={styles.calendarPane}>
        <h2>조회할 수업 날짜</h2>
        <p className={styles.selectedDateLabel}>{targetDate}</p>
        <div className={styles.monthNav}>
          <button
            type="button"
            onClick={() => setTargetDate((prev) => shiftMonth(prev, -1))}
            aria-label="이전 달"
          >
            &lt;
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            onClick={() => setTargetDate((prev) => shiftMonth(prev, 1))}
            aria-label="다음 달"
          >
            &gt;
          </button>
        </div>
        <div className={styles.weekdays}>
          <span>일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
        </div>
        <div className={styles.calendarGrid}>
          {calendarCells.map((cell) => (
            <button
              key={cell.date}
              type="button"
              className={`${styles.dayCell} ${cell.inCurrentMonth ? '' : styles.outsideMonth} ${
                targetDate === cell.date ? styles.selectedDay : ''
              } ${loggedDateSet.has(cell.date) ? styles.loggedDay : ''}`}
              onClick={() => setTargetDate(cell.date)}
            >
              {cell.dayNumber}
            </button>
          ))}
        </div>
        <p className={styles.calendarLegend}>
          <span className={styles.legendDot} /> 기록 있는 날
        </p>
        <LessonDomainMonthChart
          year={chartYear}
          month={chartMonth}
          refreshKey={statsRefreshKey}
        />
      </aside>

      <div className={styles.contentPane}>
        <header className={styles.contentHead}>
          <div className={styles.contentHeadRow}>
            <div>
              <h2>{targetDate} 수업 일지</h2>
              <p>달력 날짜별로 저장한 수업 기록을 확인합니다.</p>
            </div>
            <button
              type="button"
              className={styles.writeBtn}
              onClick={() => {
                setPageNotice('')
                setWriteModalOpen(true)
              }}
            >
              수업일지 작성하기
            </button>
          </div>
        </header>

        {pageNotice ? (
          <p className={styles.pageNotice} role="status">
            {pageNotice}
          </p>
        ) : null}

        <LessonJournalWriteModal
          open={writeModalOpen}
          targetDate={targetDate}
          onClose={() => setWriteModalOpen(false)}
          onSaved={handleManualSaved}
        />

        {hasPending ? (
          <section className={styles.pendingPanel} aria-labelledby="pending-panel-title">
            <div className={styles.pendingPanelHead}>
              <h3 id="pending-panel-title" className={styles.pendingPanelTitle}>
                선택한 수업 자료 ({pending.length}건)
              </h3>
              <button type="button" className={styles.textBtn} onClick={handleClearPending}>
                전체 취소
              </button>
            </div>
            <ul className={styles.pendingList}>
              {pending.map((item, index) => (
                <PendingMaterialRow
                  key={`${item.url ?? ''}|${item.page ?? ''}|${item.title}-${index}`}
                  item={item}
                  index={index}
                  onRemove={handleRemovePending}
                />
              ))}
            </ul>
            <div className={styles.saveForm}>
              <p className={styles.saveDateHint}>
                왼쪽 달력에서 고른 <strong>{targetDate}</strong>에 저장됩니다.
              </p>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSavePending}
                disabled={savePhase === 'loading'}
              >
                {savePhase === 'loading' ? '저장 중…' : `${targetDate}에 저장`}
              </button>
            </div>
            {saveMessage ? (
              <p
                className={savePhase === 'error' ? styles.saveMessageError : styles.saveMessage}
                role={savePhase === 'error' ? 'alert' : 'status'}
              >
                {saveMessage}
              </p>
            ) : null}
          </section>
        ) : null}

        {phase === 'loading' ? (
          <div className={styles.loadingState} aria-live="polite">
            <div className={styles.spinner} aria-hidden="true" />
            <p>수업 일지를 불러오는 중…</p>
          </div>
        ) : null}

        {error ? (
          <div className={styles.errorState} role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        {phase === 'done' && !hasMaterials && !error && !hasPending ? (
          <div className={styles.emptyState}>
            <p>이 날짜에 저장된 기록이 없습니다.</p>
            <p className={styles.emptyHint}>
              「수업일지 작성하기」로 기록하거나, 「자료 찾기」에서 「수업으로 선택」해 주세요.
            </p>
          </div>
        ) : null}

        {phase === 'done' && hasMaterials ? (
          <section className={styles.listSection} aria-labelledby="lesson-journal-list-title">
            <div className={styles.listHeader}>
              <h3 id="lesson-journal-list-title" className={styles.sectionTitle}>
                저장된 기록
              </h3>
              <span className={styles.count}>{savedMaterials.length}건</span>
            </div>
            <div className={styles.grid}>
              {savedMaterials.map((item) => (
                <MaterialCard
                  key={item.materialId ?? item.title}
                  item={item}
                  onDelete={handleDelete}
                  deleting={deletingId === item.materialId}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}

export default LessonJournalPage
