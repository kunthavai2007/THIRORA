import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'

export default function TopNavbar({ onToggleMobileMenu }) {
  const { currentUser, unreadCount, notifications, markNotificationRead, logout, careerContext } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  const notifRef = useRef(null)
  const userRef = useRef(null)

  // Map route to readable page title
  const pageTitles = {
    '/': 'Dashboard Overview',
    '/academic-profile': 'Academic Foundation & Portfolio',
    '/weekly-quiz': 'Weekly Knowledge Check-In',
    '/skill-analysis': 'AI Skill Gap Analysis',
    '/career-recommendations': 'Career Pathways & Roles',
    '/career-roadmap': 'Personalized Career Roadmap',
    '/resume-builder': 'AI Resume Builder',
    '/job-matching': 'Smart Opportunity Matching',
    '/overall-progress': 'Four-Year Milestones',
    '/placement-preparation': 'Campus Placement Readiness',
    '/profile': 'Student Account Profile',
    '/settings': 'System Settings & Security',
    '/notifications': 'Notifications & Alerts',
    '/help': 'Help & Support Center',
    '/feedback': 'User Feedback',
    '/mind-relax': 'Mind Relax – Memory Match',
  }

  const currentTitle = pageTitles[location.pathname] || 'Thirora'

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifDropdownOpen(false)
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = (currentUser?.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const recentNotifications = notifications.slice(0, 4)
  const displayRole = careerContext?.track || currentUser?.careerGoal || currentUser?.targetRole || currentUser?.department || 'Student'

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <button
          type="button"
          className="top-navbar-mobile-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="top-navbar-breadcrumb">
          <span className="breadcrumb-brand">Thirora</span>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">{currentTitle}</span>
        </div>
      </div>

      <div className="top-navbar-right">
        {/* Theme Switcher Button */}
        <button
          type="button"
          className="navbar-icon-btn theme-toggle-navbar"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          <span className="theme-icon" aria-hidden="true">
            {isDark ? '☀️' : '🌙'}
          </span>
        </button>

        {/* Notifications Dropdown Trigger */}
        <div className="navbar-dropdown-wrapper" ref={notifRef}>
          <button
            type="button"
            className="navbar-icon-btn notif-bell-btn"
            onClick={() => {
              setNotifDropdownOpen((prev) => !prev)
              setUserDropdownOpen(false)
            }}
            aria-label="View notifications"
            aria-expanded={notifDropdownOpen}
          >
            <span className="bell-icon" aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="navbar-badge-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="navbar-dropdown-panel notif-dropdown-panel">
              <div className="dropdown-panel-header">
                <strong>Notifications</strong>
                <span className="unread-count-pill">{unreadCount} unread</span>
              </div>

              <div className="dropdown-panel-list">
                {recentNotifications.length === 0 ? (
                  <div className="dropdown-empty-state">No notifications yet</div>
                ) : (
                  recentNotifications.map((notif) => (
                    <Link
                      to={notif.actionUrl || '/notifications'}
                      key={notif.id}
                      className={`dropdown-notif-item ${!notif.read ? 'dropdown-notif-unread' : ''}`}
                      onClick={() => markNotificationRead(notif.id)}
                    >
                      <div className="dropdown-notif-content">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                        <small>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="dropdown-panel-footer">
                <Link to="/notifications" className="dropdown-footer-link">
                  View All Notifications &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Trigger */}
        <div className="navbar-dropdown-wrapper" ref={userRef}>
          <button
            type="button"
            className="navbar-user-btn"
            onClick={() => {
              setUserDropdownOpen((prev) => !prev)
              setNotifDropdownOpen(false)
            }}
            aria-expanded={userDropdownOpen}
          >
            <div
              className="navbar-user-avatar"
              style={{ backgroundColor: currentUser?.avatarColor || '#173f70' }}
            >
              {initials}
            </div>
            <div className="navbar-user-text">
              <span className="navbar-user-name">{currentUser?.name || 'Student'}</span>
              <span className="navbar-user-dept">{displayRole}</span>
            </div>
            <span className="dropdown-caret" aria-hidden="true">▾</span>
          </button>

          {userDropdownOpen && (
            <div className="navbar-dropdown-panel user-dropdown-panel">
              <div className="user-dropdown-header">
                <div
                  className="user-dropdown-avatar"
                  style={{ backgroundColor: currentUser?.avatarColor || '#173f70' }}
                >
                  {initials}
                </div>
                <div>
                  <strong>{currentUser?.name || 'Student'}</strong>
                  <p>{currentUser?.email || 'Student Account'}</p>
                </div>
              </div>

              <div className="dropdown-links-list">
                <Link to="/profile" className="dropdown-menu-link">
                  <span>My Profile</span>
                </Link>

                <Link to="/settings" className="dropdown-menu-link">
                  <span>Account Settings</span>
                </Link>

                <Link to="/settings?tab=devices" className="dropdown-menu-link">
                  <span>Active Devices</span>
                </Link>

                <Link to="/help" className="dropdown-menu-link">
                  <span>Help &amp; Support</span>
                </Link>

                <Link to="/feedback" className="dropdown-menu-link">
                  <span>Feedback</span>
                </Link>
              </div>

              <div className="dropdown-panel-footer">
                <button
                  type="button"
                  className="logout-action-btn"
                  onClick={logout}
                >
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
