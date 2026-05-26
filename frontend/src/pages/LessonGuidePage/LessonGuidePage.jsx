import { useState } from 'react'
import { askLessonGuide } from '../../lib/lessonGuide'
import { publicDataType } from '../../lib/materialMeta'
import styles from './LessonGuidePage.module.css'

const EXAMPLE_QUESTIONS = [
  '공기의 힘을 체험하는 놀이 자료를 찾고 싶어요',
  '폐품으로 할 수 있는 실내 과학놀이 자료를 찾고 싶어요',
  '신체운동 놀이를 찾고 싶어요',
]

function formatAnswerText(text) {
  if (!text) {
    return ''
  }
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*\*/g, '')
}

function shouldShowReferences(answer, references) {
  if (!references?.length || !answer?.trim()) {
    return false
  }
  const denied =
    answer.includes('제공된 자료에서 확인되지 않습니다') ||
    answer.includes('관련 놀이 자료를 찾지 못했습니다') ||
    answer.includes('관련 자료를 찾지 못했습니다')
  return !denied
}

function hasDisplayPage(page) {
  const n = Number(page)
  return Number.isFinite(n) && n > 0
}

function ReferenceCard({ item, onSelectForLesson }) {
  const dataTypeLabel = publicDataType(item.dataType)
  const showPage = hasDisplayPage(item.page)
  return (
    <article className={styles.refCard}>
      <header className={styles.refHeader}>
        <h3 className={styles.refTitle}>{item.title}</h3>
        {(item.domain || dataTypeLabel || showPage) && (
          <div className={styles.refMeta}>
            {item.domain ? <span className={styles.badge}>{item.domain}</span> : null}
            {showPage ? <span className={styles.badgePage}>p.{item.page}</span> : null}
            {dataTypeLabel ? <span className={styles.badgeMuted}>{dataTypeLabel}</span> : null}
          </div>
        )}
      </header>
      <p className={styles.refDescription}>{item.description}</p>
      {item.source ? <p className={styles.refSource}>{item.source}</p> : null}
      <footer className={styles.refFooter}>
        {item.url ? (
          <a
            className={styles.refLink}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            i누리 자료 보기
          </a>
        ) : (
          <span className={styles.refLinkDisabled}>링크 없음</span>
        )}
        {item.score != null ? (
          <span className={styles.refScore}>유사도 {(item.score * 100).toFixed(0)}%</span>
        ) : null}
      </footer>
      <button
        type="button"
        className={styles.selectLessonBtn}
        onClick={() => onSelectForLesson(item)}
      >
        수업으로 선택
      </button>
    </article>
  )
}

function LessonGuidePage({ onSelectForLesson }) {
  const [question, setQuestion] = useState('')
  const [phase, setPhase] = useState('idle')
  const [answer, setAnswer] = useState('')
  const [references, setReferences] = useState([])
  const [error, setError] = useState('')
  const [lastSearchLogId, setLastSearchLogId] = useState(null)

  const handleSearch = async (text) => {
    const q = (text ?? question).trim()
    if (!q) {
      return
    }
    setQuestion(q)
    setPhase('loading')
    setAnswer('')
    setReferences([])
    setError('')
    setLastSearchLogId(null)

    try {
      const result = await askLessonGuide(q)
      setAnswer(result.answer)
      setReferences(result.references)
      setLastSearchLogId(result.searchLogId ?? null)
      setPhase('done')
    } catch (err) {
      setPhase('error')
      setError(err.message || '자료 검색 중 오류가 발생했습니다.')
    }
  }

  const handleExampleClick = (example) => {
    setQuestion(example)
    handleSearch(example)
  }

  const handleReset = () => {
    setQuestion('')
    setPhase('idle')
    setAnswer('')
    setReferences([])
    setError('')
    setLastSearchLogId(null)
  }

  const handleSelectForLesson = (item) => {
    if (!onSelectForLesson) {
      return
    }
    onSelectForLesson({
      title: item.title,
      description: item.description,
      url: item.url,
      source: item.source,
      topic: item.topic,
      domain: item.domain,
      dataType: item.dataType,
      page: item.page ?? null,
      searchLogId: lastSearchLogId,
    })
  }

  const showReferences = shouldShowReferences(answer, references)

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>수업자료 · RAG 검색</p>
          <h2>원하는 놀이·수업 자료를 찾아 보세요</h2>
          <p className={styles.heroDesc}>
            i누리 놀이 자료에서 활동·준비물·진행 방법을 검색해 드립니다.
            마음에 드는 자료는 「수업으로 선택」으로 수업 일지에 담을 수 있어요.
          </p>
        </div>
      </header>

      <div className={styles.searchCard}>
        <label className={styles.searchLabel} htmlFor="guide-question">
          어떤 놀이·수업 자료를 찾으시나요?
        </label>
        <textarea
          id="guide-question"
          className={styles.searchInput}
          rows={4}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 신체운동 놀이를 찾고 싶어요"
          disabled={phase === 'loading'}
        />

        <div className={styles.chips}>
          <span className={styles.chipsLabel}>예시 질문</span>
          <div className={styles.chipRow}>
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                type="button"
                className={styles.chip}
                onClick={() => handleExampleClick(example)}
                disabled={phase === 'loading'}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => handleSearch()}
            disabled={!question.trim() || phase === 'loading'}
          >
            {phase === 'loading' ? '자료 검색 중…' : '자료 찾기'}
          </button>
          {phase === 'done' || phase === 'error' ? (
            <button type="button" className={styles.ghostBtn} onClick={handleReset}>
              다시 질문하기
            </button>
          ) : null}
        </div>
      </div>

      {phase === 'idle' ? (
        <div className={styles.emptyState}>
          <p>질문을 입력하고 「자료 찾기」를 눌러 주세요.</p>
          <p className={styles.emptyHint}>관련 놀이가 있을 때만 참고 자료 카드가 표시됩니다.</p>
        </div>
      ) : null}

      {phase === 'loading' ? (
        <div className={styles.loadingState} aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <p>관련 자료를 찾고 답변을 준비하고 있어요…</p>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className={styles.results}>
          <section className={styles.answerCard} aria-labelledby="guide-answer-title">
            <h3 id="guide-answer-title" className={styles.sectionTitle}>
              AI 요약 답변
            </h3>
            <p className={styles.answerText}>{formatAnswerText(answer)}</p>
          </section>

          {showReferences ? (
            <section className={styles.refsSection} aria-labelledby="guide-refs-title">
              <div className={styles.refsHeader}>
                <h3 id="guide-refs-title" className={styles.sectionTitle}>
                  참고 자료
                </h3>
                <span className={styles.refsCount}>{references.length}건</span>
              </div>
              <p className={styles.refsHint}>
                영역(자연탐구, 신체운동·건강 등)이 표시된 자료를 「수업으로 선택」하면 수업 일지로
                이동합니다.
              </p>
              <div className={styles.refGrid}>
                {references.map((item) => (
                  <ReferenceCard
                    key={item.id}
                    item={item}
                    onSelectForLesson={handleSelectForLesson}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default LessonGuidePage
