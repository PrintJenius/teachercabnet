import { useMemo, useState } from 'react'
import styles from './LessonFlowPage.module.css'

const GUIDE_TEXT = [
  '도입(5분): 지난 시간 회상 질문으로 참여를 유도합니다.',
  '전개(15분): 카드/교구를 활용해 짝 활동을 진행합니다.',
  '정리(10분): 발표 후 오늘의 배움 1문장으로 마무리합니다.',
]

const CHECK_ITEMS = [
  { key: 'focus', label: '집중해서 활동에 참여했어요' },
  { key: 'communication', label: '친구/교사와 의사소통했어요' },
  { key: 'cooperation', label: '규칙을 지키며 협력했어요' },
  { key: 'expression', label: '생각/감정을 표현했어요' },
  { key: 'exploration', label: '새로운 시도를 해보았어요' },
]

const STUDENTS = [
  { id: 's1', name: '다람이' },
  { id: 's2', name: '해님이' },
  { id: 's3', name: '초롱이' },
  { id: 's4', name: '별님이' },
  { id: 's5', name: '하늘이' },
]

function LessonFlowPage() {
  const [step, setStep] = useState(1)
  const [className, setClassName] = useState('햇살반')
  const [lessonTitle, setLessonTitle] = useState('시장놀이로 배우는 경제')
  const [lessonDone, setLessonDone] = useState(false)
  const [checks, setChecks] = useState(() =>
    CHECK_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: false }), {}),
  )
  const [selectedStudentId, setSelectedStudentId] = useState(STUDENTS[0].id)
  const [overrides, setOverrides] = useState({})

  const selectedStudent = useMemo(
    () => STUDENTS.find((student) => student.id === selectedStudentId) ?? STUDENTS[0],
    [selectedStudentId],
  )

  const selectedChecklist = useMemo(
    () => overrides[selectedStudentId]?.checks ?? checks,
    [overrides, selectedStudentId, checks],
  )

  const selectedMemo = useMemo(
    () => overrides[selectedStudentId]?.memo ?? '',
    [overrides, selectedStudentId],
  )

  const checkedCount = useMemo(
    () => Object.values(checks).filter(Boolean).length,
    [checks],
  )

  const pseudoScore = useMemo(() => {
    const ratio = CHECK_ITEMS.length === 0 ? 0 : checkedCount / CHECK_ITEMS.length
    const score = Math.round(ratio * 5)
    return Math.max(1, Math.min(5, score))
  }, [checkedCount])

  const studentScores = useMemo(
    () =>
      STUDENTS.map((student) => {
        const sChecks = overrides[student.id]?.checks ?? checks
        const count = Object.values(sChecks).filter(Boolean).length
        const ratio = CHECK_ITEMS.length === 0 ? 0 : count / CHECK_ITEMS.length
        const score = Math.max(1, Math.min(5, Math.round(ratio * 5)))
        return { studentId: student.id, studentName: student.name, checked: count, score }
      }),
    [overrides, checks],
  )

  const handleStudentCheck = (key, value) => {
    setOverrides((prev) => {
      const base = prev[selectedStudentId]?.checks ?? checks
      const nextChecks = { ...base, [key]: value }
      return {
        ...prev,
        [selectedStudentId]: {
          checks: nextChecks,
          memo: prev[selectedStudentId]?.memo ?? '',
        },
      }
    })
  }

  const handleStudentMemo = (value) => {
    setOverrides((prev) => ({
      ...prev,
      [selectedStudentId]: {
        checks: prev[selectedStudentId]?.checks ?? checks,
        memo: value,
      },
    }))
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h2>수업 중심 일지 플로우 (시안)</h2>
        <p>RAG 미연동 상태에서 화면 흐름만 먼저 구성한 버전입니다.</p>
      </header>

      <ol className={styles.steps}>
        <li className={step >= 1 ? styles.active : ''}>1. 수업 가이드라인</li>
        <li className={step >= 2 ? styles.active : ''}>2. 수업 마침</li>
        <li className={step >= 3 ? styles.active : ''}>3. 전반 평가</li>
        <li className={step >= 4 ? styles.active : ''}>4. 개별 평가</li>
        <li className={step >= 5 ? styles.active : ''}>5. AI 일지 초안</li>
      </ol>

      <div className={styles.card}>
        <label className={styles.field}>
          <span>반 이름</span>
          <input value={className} onChange={(event) => setClassName(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>수업 주제</span>
          <input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} />
        </label>
      </div>

      {step === 1 ? (
        <div className={styles.card}>
          <h3>수업 가이드라인 (임시)</h3>
          <ul className={styles.guideList}>
            {GUIDE_TEXT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setStep(2)}>
            수업 시작/진행 후 다음 단계
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.card}>
          <h3>수업 마침</h3>
          <p>수업 진행이 끝났다면 완료 처리하고 체크리스트 단계로 이동합니다.</p>
          <label className={styles.checkline}>
            <input
              type="checkbox"
              checked={lessonDone}
              onChange={(event) => setLessonDone(event.target.checked)}
            />
            <span>수업을 마쳤습니다.</span>
          </label>
          <button type="button" onClick={() => setStep(3)} disabled={!lessonDone}>
            전반 평가로 이동
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.card}>
          <h3>전반 평가 (전체 공통)</h3>
          <p>반 전체 기준으로 공통 체크를 먼저 입력합니다.</p>
          <div className={styles.checkGrid}>
            {CHECK_ITEMS.map((item) => (
              <label key={item.key} className={styles.checkline}>
                <input
                  type="checkbox"
                  checked={checks[item.key]}
                  onChange={(event) =>
                    setChecks((prev) => ({ ...prev, [item.key]: event.target.checked }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(2)}>
              수업 마침으로 돌아가기
            </button>
            <button type="button" onClick={() => setStep(4)}>
              개별 평가로 이동
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className={styles.card}>
          <h3>개별 평가 (아이별 수정)</h3>
          <p>전반 평가를 기본값으로 사용하고, 필요한 아동만 수정합니다.</p>
          <div className={styles.overrideWrap}>
            <div className={styles.studentPane}>
              <h4 className={styles.subTitle}>아이 목록</h4>
              <ul className={styles.studentList}>
                {STUDENTS.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className={`${styles.studentButton} ${
                        selectedStudentId === student.id ? styles.activeStudentButton : ''
                      }`}
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      {student.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.overridePane}>
              <h4 className={styles.subTitle}>개별 평가: {selectedStudent.name}</h4>
              <div className={styles.checkGrid}>
                {CHECK_ITEMS.map((item) => (
                  <label key={item.key} className={styles.checkline}>
                    <input
                      type="checkbox"
                      checked={selectedChecklist[item.key]}
                      onChange={(event) => handleStudentCheck(item.key, event.target.checked)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <label className={styles.field}>
                <span>개별 메모</span>
                <textarea
                  rows={3}
                  value={selectedMemo}
                  onChange={(event) => handleStudentMemo(event.target.value)}
                  placeholder="해당 아동에 대해서만 수정할 메모"
                />
              </label>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(3)}>
              전반 평가로 돌아가기
            </button>
            <button type="button" onClick={() => setStep(5)}>
              AI 초안 생성 화면 보기
            </button>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className={styles.card}>
          <h3>AI 일지 초안 (임시 렌더)</h3>
          <p>
            <strong>{className}</strong> · <strong>{lessonTitle}</strong>
          </p>
          <p>전반 평가 체크 {checkedCount}/{CHECK_ITEMS.length}개, 기본 점수(임시): {pseudoScore}/5</p>
          <ul className={styles.scoreList}>
            {studentScores.map((item) => (
              <li key={item.studentId}>
                {item.studentName}: {item.checked}/{CHECK_ITEMS.length} 체크 · 신의사예자 점수(임시) {item.score}/5
              </li>
            ))}
          </ul>
          <div className={styles.preview}>
            오늘 수업에서 아동은 활동 참여와 의사표현을 중심으로 관찰되었습니다.
            체크리스트와 메모를 바탕으로 생성된 일지 초안/점수가 여기에 표시됩니다.
            (현재는 연동 전 임시 문구)
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(4)}>
              개별 평가로 돌아가기
            </button>
            <button type="button" onClick={() => setStep(1)}>
              처음부터 다시
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default LessonFlowPage
