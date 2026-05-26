export function toDateInputValue(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function parseDateInputValue(value) {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day }
}

export function shiftMonth(value, delta) {
  const { year, month, day } = parseDateInputValue(value)
  const targetFirst = new Date(year, month - 1 + delta, 1)
  const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate()
  return toDateInputValue(
    new Date(targetFirst.getFullYear(), targetFirst.getMonth(), Math.min(day, lastDay)),
  )
}

export function buildCalendarCells(baseDate) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayOffset = i - startWeekday + 1
    let cellDate
    let inCurrentMonth = true

    if (dayOffset < 1) {
      cellDate = new Date(year, month - 1, prevMonthDays + dayOffset)
      inCurrentMonth = false
    } else if (dayOffset > daysInMonth) {
      cellDate = new Date(year, month + 1, dayOffset - daysInMonth)
      inCurrentMonth = false
    } else {
      cellDate = new Date(year, month, dayOffset)
    }

    cells.push({
      date: toDateInputValue(cellDate),
      dayNumber: cellDate.getDate(),
      inCurrentMonth,
    })
  }

  return cells
}
