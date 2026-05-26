import { useEffect, useState } from 'react'
import Header from './components/layout/Header/Header'
import MainPanel from './components/layout/MainPanel/MainPanel'
import {
  AUTH_SESSION_EXPIRED,
  authHeaders,
  clearAccessToken,
  getAccessToken,
  hasAccessToken,
} from './lib/auth'
import {
  defaultMenuForGuest,
  loginRequiredMenus,
  mainMenus,
  subMenus,
} from './constants/menu'
import LoginPage from './pages/LoginPage/LoginPage'
import styles from './App.module.css'

function App() {
  const [showHome, setShowHome] = useState(true)
  const [activeMenu, setActiveMenu] = useState(defaultMenuForGuest)
  const [activeSubMenu, setActiveSubMenu] = useState(subMenus[defaultMenuForGuest]?.[0] ?? '')
  const [authView, setAuthView] = useState('home')
  const [bootstrapping, setBootstrapping] = useState(() => Boolean(getAccessToken()))
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    localStorage.removeItem('teacherId')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const token = getAccessToken()
      if (!token) {
        if (!cancelled) {
          setIsLoggedIn(false)
          setBootstrapping(false)
        }
        return
      }

      try {
        const res = await fetch('/api/teachers/me', {
          headers: authHeaders(),
        })
        if (!res.ok) {
          clearAccessToken()
          if (!cancelled) {
            setIsLoggedIn(false)
            setIsAdmin(false)
          }
          throw new Error('me')
        }
        const data = await res.json()
        if (cancelled) {
          return
        }
        setIsLoggedIn(true)
        setIsAdmin(Boolean(data.admin))
        setAuthView('home')
      } catch {
        if (!cancelled) {
          setAuthView('home')
          setIsLoggedIn(false)
          setIsAdmin(false)
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false)
        }
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLoginSuccess = async () => {
    if (!hasAccessToken()) {
      setIsLoggedIn(false)
      setAuthView('login')
      return
    }
    try {
      const res = await fetch('/api/teachers/me', { headers: authHeaders() })
      if (!res.ok) {
        clearAccessToken()
        setIsLoggedIn(false)
        setIsAdmin(false)
        setAuthView('login')
        return
      }
      const data = await res.json()
      setIsLoggedIn(true)
      setIsAdmin(Boolean(data.admin))
      setAuthView('home')
      setShowHome(true)
    } catch {
      clearAccessToken()
      setIsLoggedIn(false)
      setAuthView('login')
    }
  }

  const handleLogout = () => {
    clearAccessToken()
    setIsLoggedIn(false)
    setIsAdmin(false)
    setShowHome(true)
    if (loginRequiredMenus.includes(activeMenu)) {
      setActiveMenu(defaultMenuForGuest)
      setActiveSubMenu(subMenus[defaultMenuForGuest]?.[0] ?? '')
    }
  }

  const requireAuthForMenu = () => {
    if (!hasAccessToken() || !isLoggedIn) {
      window.alert('로그인 후 이용해주세요.')
      setAuthView('login')
      return false
    }
    return true
  }

  const goHome = () => {
    setShowHome(true)
  }

  const navigateTo = (menu, subMenu) => {
    setShowHome(false)
    setActiveMenu(menu)
    setActiveSubMenu(subMenu ?? subMenus[menu]?.[0] ?? '')
  }

  const handleMenuClick = (menu) => {
    if (loginRequiredMenus.includes(menu) && !requireAuthForMenu()) {
      return
    }
    setShowHome(false)
    setActiveMenu(menu)
    setActiveSubMenu(subMenus[menu]?.[0] ?? '')
  }

  const handleSubMenuClick = (label) => {
    if (loginRequiredMenus.includes(activeMenu) && !requireAuthForMenu()) {
      return
    }
    if (label === '운영 대시보드' && !isAdmin) {
      window.alert('관리자만 접근할 수 있습니다.')
      return
    }
    setShowHome(false)
    setActiveSubMenu(label)
  }

  useEffect(() => {
    const onSessionExpired = () => {
      setIsLoggedIn(false)
      setIsAdmin(false)
      setShowHome(true)
      if (loginRequiredMenus.includes(activeMenu)) {
        setActiveMenu(defaultMenuForGuest)
        setActiveSubMenu(subMenus[defaultMenuForGuest]?.[0] ?? '')
      }
    }
    window.addEventListener(AUTH_SESSION_EXPIRED, onSessionExpired)
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED, onSessionExpired)
  }, [activeMenu])

  useEffect(() => {
    if (!bootstrapping && (!hasAccessToken() || !isLoggedIn) && loginRequiredMenus.includes(activeMenu)) {
      setActiveMenu(defaultMenuForGuest)
      setActiveSubMenu(subMenus[defaultMenuForGuest]?.[0] ?? '')
    }
  }, [bootstrapping, isLoggedIn, activeMenu])

  if (bootstrapping) {
    return (
      <div className={styles.bootWrap}>
        <p className={styles.bootText}>불러오는 중…</p>
      </div>
    )
  }

  if (authView === 'login') {
    return (
      <LoginPage
        onBack={() => {
          setAuthView('home')
          setShowHome(true)
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  }

  return (
    <div className={styles.appShell}>
      <Header
        menus={mainMenus}
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
        activeSubMenu={activeSubMenu}
        onSubMenuClick={handleSubMenuClick}
        isLoggedIn={isLoggedIn && hasAccessToken()}
        onLoginClick={() => setAuthView('login')}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        showHome={showHome}
        onLogoClick={goHome}
      />

      <main className={styles.contentArea}>
        <MainPanel
          showHome={showHome}
          activeMenu={activeMenu}
          activeSubMenu={activeSubMenu}
          onSubMenuChange={handleSubMenuClick}
          onNavigate={navigateTo}
          isLoggedIn={isLoggedIn && hasAccessToken()}
          onLoginClick={() => setAuthView('login')}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  )
}

export default App
