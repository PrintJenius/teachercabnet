import { loginRequiredMenus } from '../../../constants/menu'
import { hasAccessToken } from '../../../lib/auth'
import HomePage from '../../../pages/HomePage/HomePage'
import ChildRegisterPage from '../../../pages/ChildRegisterPage/ChildRegisterPage'
import ChildManagePage from '../../../pages/ChildManagePage/ChildManagePage'
import JournalPage from '../../../pages/JournalPage/JournalPage'
import JournalViewPage from '../../../pages/JournalPage/JournalViewPage'
import { addPendingLessonMaterial } from '../../../lib/lessonJournalPending'
import { logLessonMaterialSelect } from '../../../lib/lessonActivity'
import AdminDashboardPage from '../../../pages/AdminDashboardPage/AdminDashboardPage'
import LessonGuidePage from '../../../pages/LessonGuidePage/LessonGuidePage'
import LessonJournalPage from '../../../pages/LessonJournalPage/LessonJournalPage'
import styles from './MainPanel.module.css'

function LoginRequiredPanel({ menuLabel, onLoginClick }) {
  return (
    <div className={styles.loginRequired}>
      <h2 className={styles.loginRequiredTitle}>{menuLabel}</h2>
      <p className={styles.loginRequiredText}>
        이 기능은 로그인한 교사만 이용할 수 있습니다.
      </p>
      <button type="button" className={styles.loginRequiredBtn} onClick={onLoginClick}>
        로그인하기
      </button>
    </div>
  )
}

function MainPanel({
  showHome = false,
  activeMenu,
  activeSubMenu,
  onSubMenuChange,
  onNavigate,
  isLoggedIn,
  onLoginClick,
  isAdmin = false,
}) {
  if (showHome) {
    return (
      <HomePage isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} />
    )
  }

  if (loginRequiredMenus.includes(activeMenu) && (!isLoggedIn || !hasAccessToken())) {
    return <LoginRequiredPanel menuLabel={activeMenu} onLoginClick={onLoginClick} />
  }

  const goToLessonJournalWithMaterial = async (material) => {
    try {
      await logLessonMaterialSelect(material)
    } catch {
      // 기록 실패해도 수업 일지 이동은 허용
    }
    addPendingLessonMaterial(material)
    onSubMenuChange?.('수업 일지')
  }

  if (activeMenu === '관리' && activeSubMenu === '운영 대시보드') {
    if (!isAdmin) {
      return (
        <div className={styles.mainPlaceholder}>
          <p>관리자만 접근할 수 있습니다.</p>
        </div>
      )
    }
    return <AdminDashboardPage />
  }

  if (activeMenu === '수업자료' && activeSubMenu === '자료 찾기') {
    return <LessonGuidePage onSelectForLesson={goToLessonJournalWithMaterial} />
  }
  if (activeMenu === '수업자료' && activeSubMenu === '수업 일지') {
    return <LessonJournalPage />
  }
  if (activeMenu === '수업자료') {
    return <LessonGuidePage />
  }
  if (activeMenu === '아이일지' && activeSubMenu === '일지작성') {
    return <JournalPage />
  }
  if (activeMenu === '아이일지' && activeSubMenu === '일지보기') {
    return <JournalViewPage />
  }
  if (activeMenu === '아이일지' && activeSubMenu === '아이등록') {
    return <ChildRegisterPage />
  }
  if (activeMenu === '관리' && activeSubMenu === '아이관리') {
    return <ChildManagePage />
  }

  return (
    <div className={styles.mainPlaceholder}>
      <p>{activeSubMenu || activeMenu} 콘텐츠 영역</p>
    </div>
  )
}

export default MainPanel
