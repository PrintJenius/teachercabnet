import styles from './MainMenu.module.css'

function MainMenu({ menus, activeMenu, onMenuClick }) {
  return (
    <nav className={styles.mainMenu} aria-label="메인 메뉴">
      {menus.map((menu) => (
        <button
          key={menu}
          type="button"
          className={`${styles.menuItem} ${activeMenu === menu ? styles.menuItemActive : ''}`}
          onClick={() => onMenuClick(menu)}
        >
          {menu}
        </button>
      ))}
    </nav>
  )
}

export default MainMenu
