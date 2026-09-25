import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import TopNavbar from './TopNavbar'
import thiroraLogo from '../assets/thirora-logo.jpeg'

const careerLinks = [
  { label: 'Dashboard', route: '/' },
  { label: 'Academic Profile', route: '/academic-profile' },
  { label: 'Weekly Quiz', route: '/weekly-quiz' },
  { label: 'Skill Analysis', route: '/skill-analysis' },
  { label: 'Career Recommendations', route: '/career-recommendations' },
  { label: 'Career Roadmap', route: '/career-roadmap' },
  { label: 'Resume Builder', route: '/resume-builder' },
  { label: 'Job Matching', route: '/job-matching' },
  { label: 'Overall Progress', route: '/overall-progress' },
  { label: 'Placement Preparation', route: '/placement-preparation' },
  { label: 'Mind Relax', route: '/mind-relax' },
]

function AppLayout() {
  const { currentUser, careerContext } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  const initials = (currentUser?.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const displayRole = careerContext?.track || currentUser?.careerGoal || currentUser?.targetRole || currentUser?.department || 'Engineering Student'

  return (
    <div className="app-layout">
      {/* Sidebar navigation */}
      <aside className={`app-sidebar${isMenuOpen ? ' app-sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img src={thiroraLogo} alt="Thirora Logo" className="sidebar-brand-logo" />
          <div>
            <strong>Thirora</strong>
            <span>Student workspace</span>
          </div>
        </div>

        {/* User Mini Profile in Sidebar */}
        <div className="sidebar-user-card">
          <div
            className="sidebar-user-avatar"
            style={{ backgroundColor: currentUser?.avatarColor || '#173f70' }}
          >
            {initials}
          </div>
          <div className="sidebar-user-details">
            <strong>{currentUser?.name || 'Student'}</strong>
            <small>{displayRole}</small>
          </div>
        </div>

        <nav id="main-navigation" className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-nav-label">Career journey</p>
          {careerLinks.map((link) => (
            <NavLink
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
              end={link.route === '/'}
              key={link.route}
              onClick={closeMenu}
              to={link.route}
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Build your next chapter</span>
        </div>
      </aside>

      {/* Main app content with TopNavbar */}
      <div className="app-content">
        <TopNavbar onToggleMobileMenu={() => setIsMenuOpen((prev) => !prev)} />

        <div className="app-page">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppLayout
