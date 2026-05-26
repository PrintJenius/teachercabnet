import { useMemo } from 'react'
import {
  buildCalendarCells,
  parseDateInputValue,
  shiftMonth,
} from '../../lib/journalDateUtils'
import styles from './JournalPage.module.css'

function JournalCalendar({ selectedDate, onDateChange }) {
  const visibleMonthDate = useMemo(() => {
    const { year, month } = parseDateInputValue(selectedDate)
    return new Date(year, month - 1, 1)
  }, [selectedDate])
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonthDate), [visibleMonthDate])
  const monthLabel = `${visibleMonthDate.getFullYear()}년 ${visibleMonthDate.getMonth() + 1}월`

  const handlePrevMonth = () => onDateChange((prev) => shiftMonth(prev, -1))
  const handleNextMonth = () => onDateChange((prev) => shiftMonth(prev, 1))

  return (
    <aside className={styles.calendarPane}>
      <h2>일지 날짜</h2>
      <div className={styles.monthNav}>
        <button type="button" onClick={handlePrevMonth} aria-label="이전 달">
          &lt;
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={handleNextMonth} aria-label="다음 달">
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
              selectedDate === cell.date ? styles.selectedDay : ''
            }`}
            onClick={() => onDateChange(cell.date)}
          >
            {cell.dayNumber}
          </button>
        ))}
      </div>
    </aside>
  )
}

export default JournalCalendar
