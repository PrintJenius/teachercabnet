import MainMenu from '../MainMenu/MainMenu'
import SubMenuBar from '../SubMenuBar/SubMenuBar'
import styles from './Header.module.css'

function Header({
  menus,
  activeMenu,
  onMenuClick,
  activeSubMenu,
  onSubMenuClick,
  isLoggedIn,
  onLoginClick,
  onLogout,
  isAdmin = false,
  showHome = false,
  onLogoClick,
}) {
  return (
    <header className={styles.topHeader}>
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.logoButton}
            onClick={onLogoClick}
            aria-label="홈으로 이동"
          >
            티처캐비닛
          </button>
          <MainMenu
            menus={menus}
            activeMenu={showHome ? '' : activeMenu}
            onMenuClick={onMenuClick}
          />
        </div>

        <div className={styles.authActions}>
          {isLoggedIn ? (
            <button type="button" className={styles.filledAction} onClick={onLogout}>
              로그아웃
            </button>
          ) : (
            <button type="button" className={styles.filledAction} onClick={onLoginClick}>
              로그인
            </button>
          )}
        </div>
      </div>

      {!showHome ? (
        <SubMenuBar
          activeMenu={activeMenu}
          activeSubMenu={activeSubMenu}
          onSubMenuClick={onSubMenuClick}
          isAdmin={isAdmin}
        />
      ) : null}
    </header>
  )
}

export default Header
