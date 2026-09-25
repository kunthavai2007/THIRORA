import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import thiroraLogo from '../assets/thirora-logo.jpeg'

export default function Auth() {
  const { login, signup, forgotPassword } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const isDirectAuthRoute = ['/login', '/signup', '/auth'].includes(location.pathname)
  const initialMode = location.pathname === '/signup' ? 'signup' : 'signin'

  const [authMode, setAuthMode] = useState(initialMode)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(isDirectAuthRoute)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sign In
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInRemember, setSignInRemember] = useState(true)
  const [showSignInPassword, setShowSignInPassword] = useState(false)

  // Sign Up
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState('')

  // General state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const from = location.state?.from?.pathname || '/'

  const [prevPathname, setPrevPathname] = useState(location.pathname)

  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname)

    if (location.pathname === '/signup') {
      setAuthMode('signup')
      setIsAuthModalOpen(true)
    } else if (
      location.pathname === '/login' ||
      location.pathname === '/auth'
    ) {
      setAuthMode('signin')
      setIsAuthModalOpen(true)
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isAuthModalOpen) {
        setIsAuthModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAuthModalOpen])

  function calculatePasswordStrength(pass) {
    if (!pass) {
      return {
        score: 0,
        label: 'None',
        color: '#9aabbc',
      }
    }

    let score = 0

    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) {
      return {
        score,
        label: 'Weak',
        color: '#ef4444',
      }
    }

    if (score <= 4) {
      return {
        score,
        label: 'Moderate',
        color: '#f59e0b',
      }
    }

    return {
      score,
      label: 'Strong',
      color: '#10b981',
    }
  }

  const signUpStrength = useMemo(
    () => calculatePasswordStrength(signUpPassword),
    [signUpPassword]
  )

  function openAuthModal(mode = 'signin') {
    setAuthMode(mode)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsAuthModalOpen(true)
    setMobileMenuOpen(false)
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  async function handleSignIn(event) {
    event.preventDefault()

    setErrorMsg(null)
    setSuccessMsg(null)

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMsg('Please enter both your email and password.')
      return
    }

    try {
      setLoading(true)

      await login(
        signInEmail.trim(),
        signInPassword,
        signInRemember
      )

      navigate(from, { replace: true })
    } catch (error) {
      setErrorMsg(
        error?.message ||
        'Login failed. Please verify your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()

    setErrorMsg(null)
    setSuccessMsg(null)

    if (
      !signUpName.trim() ||
      !signUpEmail.trim() ||
      !signUpPassword
    ) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.')
      return
    }

    if (signUpPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.')
      return
    }

    if (!agreeTerms) {
      setErrorMsg(
        'Please accept the Terms of Service to proceed.'
      )
      return
    }

    try {
      setLoading(true)

      const result = await signup({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
      })

      if (result?.session) {
        navigate(from, { replace: true })
      } else {
        setSuccessMsg(
          'Account created successfully. Please check your email and confirm your account before signing in.'
        )

        setAuthMode('signin')
        setSignInEmail(signUpEmail.trim())
        setSignInPassword('')
      }
    } catch (error) {
      setErrorMsg(
        error?.message || 'Registration failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault()

    setErrorMsg(null)
    setSuccessMsg(null)

    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your account email.')
      return
    }

    try {
      setLoading(true)

      const result = await forgotPassword(
        forgotEmail.trim()
      )

      setSuccessMsg(
        result?.message ||
        'Password reset email sent. Please check your inbox.'
      )
    } catch (error) {
      setErrorMsg(
        error?.message ||
        'Unable to send the password reset email.'
      )
    } finally {
      setLoading(false)
    }
  }

  function scrollToSection(id) {
    setMobileMenuOpen(false)

    const element = document.getElementById(id)

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="landing-page-root">

      {/* ================================================================ */}
      {/* 1. TOP NAVIGATION */}
      {/* ================================================================ */}

      <header className="landing-nav" role="banner">
        <div className="landing-nav-container">

          <div className="landing-nav-brand">
            <img
              src={thiroraLogo}
              alt="Thirora Logo"
              className="brand-logo-img"
            />

            <div className="brand-text-wrap">
              <span className="brand-title">
                Thirora
              </span>

              <span className="brand-edition-pill">
                Student OS
              </span>
            </div>
          </div>

          <nav
            className="landing-nav-links"
            aria-label="Main Navigation"
          >
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => scrollToSection('features')}
            >
              Platform Features
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() =>
                scrollToSection('academic-portfolio')
              }
            >
              Academic Portfolio
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() =>
                scrollToSection('skill-radar')
              }
            >
              Skill Radar
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() =>
                scrollToSection('placement-prep')
              }
            >
              Placement Prep
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() =>
                scrollToSection('security-trust')
              }
            >
              Security &amp; Sync
            </button>
          </nav>

          <div className="landing-nav-actions">

            <button
              type="button"
              className="theme-toggle-btn nav-theme-btn"
              onClick={toggleTheme}
              title={
                isDark
                  ? 'Switch to Light Mode'
                  : 'Switch to Dark Mode'
              }
              aria-label="Toggle visual theme"
            >
              <span aria-hidden="true">
                {isDark ? '☀️' : '🌙'}
              </span>

              <span className="theme-btn-label">
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              type="button"
              className="nav-signin-btn"
              onClick={() =>
                openAuthModal('signin')
              }
            >
              Sign In
            </button>

            <button
              type="button"
              className="nav-cta-btn"
              onClick={() =>
                openAuthModal('signup')
              }
            >
              Get Started Free
            </button>

            <button
              type="button"
              className="landing-mobile-toggle"
              onClick={() =>
                setMobileMenuOpen((prev) => !prev)
              }
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="landing-mobile-menu"
            role="menu"
          >
            <button
              type="button"
              className="mobile-nav-link"
              onClick={() =>
                scrollToSection('features')
              }
            >
              Platform Features
            </button>

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() =>
                scrollToSection('academic-portfolio')
              }
            >
              Academic Portfolio
            </button>

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() =>
                scrollToSection('skill-radar')
              }
            >
              Skill Radar
            </button>

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() =>
                scrollToSection('placement-prep')
              }
            >
              Placement Prep
            </button>

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() =>
                scrollToSection('security-trust')
              }
            >
              Security &amp; Sync
            </button>

            <div className="mobile-menu-actions">
              <button
                type="button"
                className="mobile-action-signin"
                onClick={() =>
                  openAuthModal('signin')
                }
              >
                Sign In
              </button>

              <button
                type="button"
                className="mobile-action-cta"
                onClick={() =>
                  openAuthModal('signup')
                }
              >
                Create Account
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================================================================ */}
      {/* 2. HERO */}
      {/* ================================================================ */}

      <section className="landing-hero-section">

        <div
          className="hero-ambient-shape hero-shape-left"
          aria-hidden="true"
        />

        <div
          className="hero-ambient-shape hero-shape-right"
          aria-hidden="true"
        />

        <div
          className="hero-ambient-shape hero-shape-center"
          aria-hidden="true"
        />

        <div
          className="hero-svg-backdrop"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1440 380"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0,160 C320,300 420,40 720,160 C1020,280 1180,60 1440,180 L1440,380 L0,380 Z"
              fill="currentColor"
              className="svg-wave-path"
            />
          </svg>
        </div>

        <div className="hero-content-container">

          <div className="hero-intro-pill">
            <span
              className="hero-pill-dot"
              aria-hidden="true"
            />

            <span className="hero-pill-text">
              Intelligent Career Readiness &amp;
              Placement Platform
            </span>
          </div>

          <h1 className="hero-main-title">
            Accelerate Your Tech Placement Journey
            <br />
            with{' '}
            <span className="hero-gradient-text">
              Precision AI Guidance
            </span>
          </h1>

          <p className="hero-subtitle">
            Consolidate your academic achievements,
            benchmark coding and technical skills against
            top tech roles, build ATS-tailored resumes,
            and prepare for interviews with structured
            roadmaps.
          </p>

          <div className="hero-checklist-row">

            <div className="hero-check-item">
              <span
                className="hero-check-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <span>
                AI Skill Gap Radar &amp; Analysis
              </span>
            </div>

            <div className="hero-check-item">
              <span
                className="hero-check-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <span>
                ATS-Optimized Resume Builder
              </span>
            </div>

            <div className="hero-check-item">
              <span
                className="hero-check-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <span>
                Placement Readiness &amp; Quizzes
              </span>
            </div>

          </div>

          <div className="hero-cta-group">

            <button
              type="button"
              className="hero-primary-cta"
              onClick={() =>
                openAuthModal('signup')
              }
            >
              <span>
                Launch Thirora Portal
              </span>

              <span
                className="btn-arrow-icon"
                aria-hidden="true"
              >
                →
              </span>
            </button>

            <button
              type="button"
              className="hero-secondary-cta"
              onClick={() =>
                openAuthModal('signin')
              }
            >
              <span>
                Sign In to Your Account
              </span>
            </button>

          </div>

          <button
            type="button"
            className="hero-scroll-hint"
            onClick={() =>
              scrollToSection('features')
            }
            aria-label="Scroll down to explore features"
          >
            <span>
              Explore Platform Architecture
            </span>

            <span
              className="scroll-arrow"
              aria-hidden="true"
            >
              ↓
            </span>
          </button>

        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. SECURITY / TRUST */}
      {/* ================================================================ */}

      <section
        className="product-trust-section"
        id="security-trust"
      >
        <div className="trust-inner-container">

          <div className="trust-intro-bar">
            <div className="trust-badge">
              Security &amp; Standards
            </div>

            <p className="trust-statement">
              Engineered specifically for engineering
              students and graduates with secure
              authentication, multi-device controls,
              and Supabase cloud synchronization.
            </p>
          </div>

          <div className="trust-metrics-grid">

            <div className="trust-metric-card">
              <div className="metric-info">
                <strong>
                  Supabase Authentication
                </strong>

                <p>
                  Authentication and password handling
                  are managed by Supabase Auth.
                </p>
              </div>
            </div>

            <div className="trust-metric-card">
              <div className="metric-info">
                <strong>
                  19+ Integrated Modules
                </strong>

                <p>
                  Complete student journey from
                  foundational skills to placement.
                </p>
              </div>
            </div>

            <div className="trust-metric-card">
              <div className="metric-info">
                <strong>
                  Multi-Device Security
                </strong>

                <p>
                  Device and session management can
                  be monitored from the platform.
                </p>
              </div>
            </div>

            <div className="trust-metric-card">
              <div className="metric-info">
                <strong>
                  Cloud Sync
                </strong>

                <p>
                  Student profile data can be stored
                  securely in Supabase PostgreSQL.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. FEATURES */}
      {/* ================================================================ */}

      <section
        className="landing-features-section"
        id="features"
      >
        <div className="features-inner-container">

          <div className="section-header-centered">

            <span className="section-tag-pill">
              End-to-End Capabilities
            </span>

            <h2 className="section-main-heading">
              Everything You Need To Ace Your
              Campus Placement
            </h2>

            <p className="section-subtitle">
              A single unified workstation replacing
              disconnected spreadsheets, resume templates,
              and coding practice trackers.
            </p>

          </div>

          <div className="feature-cards-grid">

            <div
              className="feature-spotlight-card"
              id="academic-portfolio"
            >
              <h3>
                Academic &amp; Portfolio Foundation
              </h3>

              <p>
                Consolidate your CGPA, certifications,
                internships, workshops, and projects
                into a structured engineering portfolio.
              </p>

              <ul className="feature-detail-points">
                <li>
                  Dynamic CGPA and semester tracking
                </li>

                <li>
                  Certification repository
                </li>

                <li>
                  Project showcase with tech stack tags
                </li>
              </ul>
            </div>

            <div
              className="feature-spotlight-card"
              id="skill-radar"
            >
              <h3>
                AI Skill Gap Radar &amp; Analysis
              </h3>

              <p>
                Analyze competencies against target
                technical roles and identify skill gaps.
              </p>

              <ul className="feature-detail-points">
                <li>
                  Skill proficiency breakdown
                </li>

                <li>
                  Target role gap identification
                </li>

                <li>
                  Learning milestones
                </li>
              </ul>
            </div>

            <div className="feature-spotlight-card">
              <h3>
                Career Pathways &amp; Job Matching
              </h3>

              <p>
                Match student skills against relevant
                entry-level engineering opportunities.
              </p>

              <ul className="feature-detail-points">
                <li>
                  Percentage-based job fit scoring
                </li>

                <li>
                  Required vs acquired skills
                </li>

                <li>
                  Application tracking
                </li>
              </ul>
            </div>

            <div
              className="feature-spotlight-card"
              id="placement-prep"
            >
              <h3>
                Placement Prep &amp; Interview Drills
              </h3>

              <p>
                Structured preparation for DSA, Core CS,
                aptitude, and HR interviews.
              </p>

              <ul className="feature-detail-points">
                <li>
                  DSA coding patterns
                </li>

                <li>
                  Core CS questionnaires
                </li>

                <li>
                  HR interview guides
                </li>
              </ul>
            </div>

            <div className="feature-spotlight-card">
              <h3>
                Weekly Knowledge Assessments
              </h3>

              <p>
                Test weekly technical progress and track
                performance over time.
              </p>

              <ul className="feature-detail-points">
                <li>
                  Multi-domain technical quizzes
                </li>

                <li>
                  Answer explanations
                </li>

                <li>
                  Historical score tracking
                </li>
              </ul>
            </div>

            <div className="feature-spotlight-card">
              <h3>
                AI Resume Builder &amp; Export
              </h3>

              <p>
                Transform stored portfolio information
                into ATS-friendly resume formats.
              </p>

              <ul className="feature-detail-points">
                <li>
                  ATS-friendly templates
                </li>

                <li>
                  Academic profile synchronization
                </li>

                <li>
                  PDF export
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. BOTTOM CTA */}
      {/* ================================================================ */}

      <section className="landing-bottom-cta">
        <div className="bottom-cta-card">

          <h2>
            Ready to Launch Your Engineering Career?
          </h2>

          <p>
            Join the student career platform built for
            structured academic tracking and placement
            preparation.
          </p>

          <div className="bottom-cta-buttons">

            <button
              type="button"
              className="bottom-cta-primary"
              onClick={() =>
                openAuthModal('signup')
              }
            >
              Create Your Free Account →
            </button>

            <button
              type="button"
              className="bottom-cta-secondary"
              onClick={() =>
                openAuthModal('signin')
              }
            >
              Sign In to Existing Profile
            </button>

          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. FOOTER */}
      {/* ================================================================ */}

      <footer
        className="landing-footer"
        role="contentinfo"
      >
        <div className="footer-container">

          <div className="footer-brand-col">

            <div className="footer-brand">

              <img
                src={thiroraLogo}
                alt="Thirora Logo"
                className="brand-logo-img small"
              />

              <strong>
                Thirora
              </strong>

            </div>

            <p className="footer-tagline">
              Comprehensive student career OS and
              placement preparation platform.
            </p>

          </div>

          <div className="footer-links-col">
            <strong>Platform</strong>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('features')
              }
            >
              Features
            </button>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('academic-portfolio')
              }
            >
              Portfolio Hub
            </button>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('placement-prep')
              }
            >
              Placement Readiness
            </button>
          </div>

          <div className="footer-links-col">
            <strong>
              Security &amp; Privacy
            </strong>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('security-trust')
              }
            >
              Authentication
            </button>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('security-trust')
              }
            >
              Multi-Device Control
            </button>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                scrollToSection('security-trust')
              }
            >
              Supabase Sync
            </button>
          </div>

          <div className="footer-links-col">
            <strong>
              Get Started
            </strong>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                openAuthModal('signin')
              }
            >
              Sign In
            </button>

            <button
              type="button"
              className="footer-link"
              onClick={() =>
                openAuthModal('signup')
              }
            >
              Register Student
            </button>
          </div>

        </div>

        <div className="footer-bottom-bar">

          <p>
            © {new Date().getFullYear()} Thirora.
            Built for ambitious engineers &amp;
            students.
          </p>

          <span className="footer-crypto-badge">
            Supabase Authentication Active
          </span>

        </div>
      </footer>

      {/* ================================================================ */}
      {/* 7. AUTH MODAL */}
      {/* ================================================================ */}

      {isAuthModalOpen && (
        <div
          className="auth-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthModal()
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="auth-modal-card">

            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={closeAuthModal}
              aria-label="Close dialog"
            >
              ✕
            </button>

            <div className="auth-modal-header">

              <div className="auth-modal-brand">

                <img
                  src={thiroraLogo}
                  alt="Thirora Logo"
                  className="brand-logo-img small"
                />

                <strong>
                  Thirora
                </strong>

              </div>

              <div
                className="auth-tabs"
                role="tablist"
              >

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    authMode === 'signin'
                  }
                  className={`auth-tab-btn ${authMode === 'signin'
                    ? 'auth-tab-btn-active'
                    : ''
                    }`}
                  onClick={() => {
                    setAuthMode('signin')
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    authMode === 'signup'
                  }
                  className={`auth-tab-btn ${authMode === 'signup'
                    ? 'auth-tab-btn-active'
                    : ''
                    }`}
                  onClick={() => {
                    setAuthMode('signup')
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                >
                  Create Account
                </button>

                {authMode === 'forgot' && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={true}
                    className="auth-tab-btn auth-tab-btn-active"
                  >
                    Reset Password
                  </button>
                )}

              </div>
            </div>

            {errorMsg && (
              <div
                className="auth-alert auth-alert-error"
                role="alert"
              >
                <span className="auth-alert-icon">
                  !
                </span>

                <span>
                  {errorMsg}
                </span>
              </div>
            )}

            {successMsg && (
              <div
                className="auth-alert auth-alert-success"
                role="status"
              >
                <span className="auth-alert-icon">
                  ✓
                </span>

                <span>
                  {successMsg}
                </span>
              </div>
            )}

            <div className="auth-security-card">

              <div className="security-card-header">
                <span className="security-card-pill">
                  Secure Account Security
                </span>

                <span className="security-card-sub">
                  Supabase Auth
                </span>
              </div>

              <p className="security-card-text">
                Account authentication and password
                management are handled securely through
                Supabase Auth.
              </p>

            </div>

            {/* ========================================================== */}
            {/* SIGN IN */}
            {/* ========================================================== */}

            {authMode === 'signin' && (
              <form
                onSubmit={handleSignIn}
                className="auth-form"
              >

                <div className="auth-header">

                  <h2 id="auth-modal-title">
                    Welcome back
                  </h2>

                  <p>
                    Sign in to access your student
                    portfolio and placement portal.
                  </p>

                </div>

                <div className="auth-field">

                  <label htmlFor="signin-email">
                    Email address
                  </label>

                  <div className="auth-input-wrap">

                    <input
                      id="signin-email"
                      type="email"
                      required
                      placeholder="e.g. yourname@university.edu"
                      value={signInEmail}
                      onChange={(event) =>
                        setSignInEmail(
                          event.target.value
                        )
                      }
                      autoComplete="email"
                    />

                  </div>

                </div>

                <div className="auth-field">

                  <div className="auth-field-row">

                    <label htmlFor="signin-password">
                      Password
                    </label>

                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => {
                        setAuthMode('forgot')
                        setForgotEmail(
                          signInEmail
                        )
                        setErrorMsg(null)
                        setSuccessMsg(null)
                      }}
                    >
                      Forgot password?
                    </button>

                  </div>

                  <div className="auth-input-wrap password-input-wrap">

                    <input
                      id="signin-password"
                      type={
                        showSignInPassword
                          ? 'text'
                          : 'password'
                      }
                      required
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(event) =>
                        setSignInPassword(
                          event.target.value
                        )
                      }
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() =>
                        setShowSignInPassword(
                          (prev) => !prev
                        )
                      }
                      title={
                        showSignInPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showSignInPassword
                        ? '👁️'
                        : '🔒'}
                    </button>

                  </div>

                </div>

                <div className="auth-form-extras">

                  <label className="auth-checkbox-label">

                    <input
                      type="checkbox"
                      checked={signInRemember}
                      onChange={(event) =>
                        setSignInRemember(
                          event.target.checked
                        )
                      }
                    />

                    <span>
                      Remember me on this device
                    </span>

                  </label>

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading
                    ? 'Signing in...'
                    : 'Sign In to Dashboard →'}
                </button>

                <div className="auth-footer-prompt">

                  <span>
                    Don&apos;t have an account?
                  </span>

                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setAuthMode('signup')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                  >
                    Sign up now
                  </button>

                </div>

              </form>
            )}

            {/* ========================================================== */}
            {/* SIGN UP */}
            {/* ========================================================== */}

            {authMode === 'signup' && (
              <form
                onSubmit={handleSignUp}
                className="auth-form"
              >

                <div className="auth-header">

                  <h2 id="auth-modal-title">
                    Create your account
                  </h2>

                  <p>
                    Create your THIRORA account to
                    begin your student journey.
                  </p>

                </div>

                <div className="auth-field">

                  <label htmlFor="signup-name">
                    Full name *
                  </label>

                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="e.g. Kunthavai R"
                    value={signUpName}
                    onChange={(event) =>
                      setSignUpName(
                        event.target.value
                      )
                    }
                    autoComplete="name"
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="signup-email">
                    Email *
                  </label>

                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={signUpEmail}
                    onChange={(event) =>
                      setSignUpEmail(
                        event.target.value
                      )
                    }
                    autoComplete="email"
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="signup-password">
                    Password (min. 8 chars) *
                  </label>

                  <div className="auth-input-wrap password-input-wrap">

                    <input
                      id="signup-password"
                      type={
                        showSignUpPassword
                          ? 'text'
                          : 'password'
                      }
                      required
                      placeholder="Create a strong password"
                      value={signUpPassword}
                      onChange={(event) =>
                        setSignUpPassword(
                          event.target.value
                        )
                      }
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() =>
                        setShowSignUpPassword(
                          (prev) => !prev
                        )
                      }
                      title={
                        showSignUpPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showSignUpPassword
                        ? '👁️'
                        : '🔒'}
                    </button>

                  </div>

                  {signUpPassword && (
                    <div className="password-strength-bar">

                      <div className="strength-indicators">

                        {[1, 2, 3, 4, 5].map(
                          (level) => (
                            <span
                              key={level}
                              className="strength-dot"
                              style={{
                                backgroundColor:
                                  level <=
                                    signUpStrength.score
                                    ? signUpStrength.color
                                    : '#e2e8f0',
                              }}
                            />
                          )
                        )}

                      </div>

                      <span
                        className="strength-text"
                        style={{
                          color:
                            signUpStrength.color,
                        }}
                      >
                        {signUpStrength.label}{' '}
                        password
                      </span>

                    </div>
                  )}

                </div>

                <div className="auth-field">

                  <label htmlFor="signup-confirm-password">
                    Confirm password *
                  </label>

                  <input
                    id="signup-confirm-password"
                    type={
                      showSignUpPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    placeholder="Repeat password"
                    value={signUpConfirmPassword}
                    onChange={(event) =>
                      setSignUpConfirmPassword(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                  />

                </div>

                <div className="auth-form-extras">

                  <label className="auth-checkbox-label">

                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(event) =>
                        setAgreeTerms(
                          event.target.checked
                        )
                      }
                      required
                    />

                    <span>
                      I agree to the THIRORA terms
                      and acknowledge secure
                      password storage.
                    </span>

                  </label>

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading
                    ? 'Creating Account...'
                    : 'Create Account →'}
                </button>

                <div className="auth-footer-prompt">

                  <span>
                    Already have an account?
                  </span>

                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setAuthMode('signin')
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                  >
                    Sign In
                  </button>

                </div>

              </form>
            )}

            {/* ========================================================== */}
            {/* FORGOT PASSWORD */}
            {/* ========================================================== */}

            {authMode === 'forgot' && (
              <div className="auth-form">

                <form onSubmit={handleForgotPassword}>

                  <div className="auth-header">

                    <h2 id="auth-modal-title">
                      Reset your password
                    </h2>

                    <p>
                      Enter your registered email.
                      We&apos;ll send you a secure
                      password reset link.
                    </p>

                  </div>

                  <div className="auth-field">

                    <label htmlFor="forgot-email">
                      Account email
                    </label>

                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="e.g. yourname@gmail.com"
                      value={forgotEmail}
                      onChange={(event) =>
                        setForgotEmail(
                          event.target.value
                        )
                      }
                      autoComplete="email"
                    />

                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-submit-btn"
                  >
                    {loading
                      ? 'Sending Reset Email...'
                      : 'Send Reset Link →'}
                  </button>

                  <div className="auth-footer-prompt">

                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => {
                        setAuthMode('signin')
                        setErrorMsg(null)
                        setSuccessMsg(null)
                      }}
                    >
                      ← Back to Sign In
                    </button>

                  </div>

                </form>

                {successMsg && (
                  <div
                    className="reset-success-box"
                    style={{
                      marginTop: '20px',
                    }}
                  >
                    <div className="success-icon-badge">
                      ✓
                    </div>

                    <h3>
                      Check Your Email
                    </h3>

                    <p>
                      {successMsg}
                    </p>

                    <p>
                      Open the email from Supabase
                      and click the password reset
                      link. You will be taken to the
                      secure Reset Password page.
                    </p>

                    <button
                      type="button"
                      className="auth-submit-btn"
                      onClick={() => {
                        setAuthMode('signin')
                        setSignInEmail(
                          forgotEmail
                        )
                        setErrorMsg(null)
                        setSuccessMsg(null)
                      }}
                    >
                      Back to Sign In
                    </button>

                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}