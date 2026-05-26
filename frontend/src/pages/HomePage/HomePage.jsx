import styles from './HomePage.module.css'

function HomePage({ isLoggedIn, onLoginClick }) {
  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>유치원 교사용 개인 업무 도구</p>
        <h1 className={styles.title}>티처캐비닛</h1>
        <p className={styles.lead}>
          수업 자료 검색, 수업 일지, 아이별 사진 일기를 한곳에서 관리합니다.
          <br />
          전용 계정으로 로그인해 이용합니다.
        </p>
        {!isLoggedIn ? (
          <button type="button" className={styles.primaryBtn} onClick={onLoginClick}>
            로그인하기
          </button>
        ) : (
          <p className={styles.loggedInHint}>상단 메뉴에서 원하는 기능을 선택하세요.</p>
        )}
      </header>
    </section>
  )
}

export default HomePage
