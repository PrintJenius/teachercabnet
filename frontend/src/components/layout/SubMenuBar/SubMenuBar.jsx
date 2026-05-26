import { subMenus } from '../../../constants/menu'
import styles from './SubMenuBar.module.css'

function SubMenuBar({ activeMenu, activeSubMenu, onSubMenuClick, isAdmin = false }) {
  const menuItems = (subMenus[activeMenu] ?? ['', '', '', '']).map((label) =>
    label === '운영 대시보드' && !isAdmin ? '' : label,
  )

  return (
    <div className={styles.subMenuBar}>
      <div className={styles.subMenuInner}>
        {menuItems.map((label, index) =>
          label ? (
            <button
              key={`${activeMenu}-${label}`}
              type="button"
              className={`${styles.subMenuItem} ${activeSubMenu === label ? styles.subMenuItemActive : ''}`}
              onClick={() => onSubMenuClick(label)}
            >
              {label}
            </button>
          ) : (
            <button
              key={`${activeMenu}-placeholder-${index}`}
              type="button"
              className={styles.subMenuPlaceholder}
              aria-label={`${activeMenu} 소메뉴 ${index + 1}`}
            />
          ),
        )}
      </div>
    </div>
  )
}

export default SubMenuBar
