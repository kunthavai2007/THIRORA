import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { readStorage } from '../utils/storage'
import { useAuth } from '../context/useAuth'

const dashboardCards = [
  {
    title: 'Weekly Quiz',
    description: 'Build momentum with an indicative check-in on your technical progress.',
    label: 'Start quiz',
    route: '/weekly-quiz',
  },
  {
    title: 'Career Recommendations',
    description: 'Discover opportunities aligned with your goals and portfolio evidence.',
    label: 'Explore careers',
    route: '/career-recommendations',
  },
  {
    title: 'Career Roadmap',
    description: 'Follow a structured 6-stage milestone tracker calibrated to your target role.',
    label: 'View roadmap',
    route: '/career-roadmap',
  },
  {
    title: 'AI Skill Gap Analysis',
    description: 'Turn your current skills and quiz results into a focused learning plan.',
    label: 'Analyze skills',
    route: '/skill-analysis',
  },
  {
    title: 'Resume Builder',
    description: 'Shape your profile, projects, and credentials into a polished ATS resume.',
    label: 'Build resume',
    route: '/resume-builder',
  },
  {
    title: 'Job Matching',
    description: 'Explore requirement profiles matched to your verified skills.',
    label: 'Find jobs',
    route: '/job-matching',
  },
  {
    title: 'Overall Progress',
    description: 'See your milestones across the four-year career roadmap.',
    label: 'View progress',
    route: '/overall-progress',
  },
  {
    title: 'Placement Preparation',
    description: 'Track placement readiness and manage your campus recruitment drive applications.',
    label: 'Prepare placement',
    route: '/placement-preparation',
  },
]

const initialStats = {
  skills: 0,
  certificates: 0,
  projects: 0,
  experiences: 0,
  quizScore: null,
}

const quickActions = [
  { label: 'Academic Profile', description: 'Manage foundation & portfolio', route: '/academic-profile' },
  { label: 'Career Roadmap', description: 'Track 6-stage milestone progress', route: '/career-roadmap' },
  { label: 'Weekly Quiz', description: 'Check your knowledge', route: '/weekly-quiz' },
  { label: 'Skill Gap Analysis', description: 'Identify growth areas', route: '/skill-analysis' },
  { label: 'Career Recommendations', description: 'Explore career directions', route: '/career-recommendations' },
  { label: 'Resume Builder', description: 'Shape your professional story', route: '/resume-builder' },
  { label: 'Placement Preparation', description: 'Prepare for campus hiring', route: '/placement-preparation' },
]

function Dashboard() {
  const { skills: sharedSkills, careerData: sharedCareerData } = useAuth()
  const sharedSkillsRef = useRef(sharedSkills)
  const sharedCareerDataRef = useRef(sharedCareerData)
  useEffect(() => {
    sharedSkillsRef.current = sharedSkills
    sharedCareerDataRef.current = sharedCareerData
  }, [sharedSkills, sharedCareerData])

  const [stats, setStats] = useState(initialStats)

  useEffect(() => {
    function refreshStats() {
      const quizScore = readStorage('quizScore', null, (value) => (
        Number.isInteger(value) && value >= 0 && value <= 5
      ))

      const liveSkills = sharedSkillsRef.current.length > 0 ? sharedSkillsRef.current : readStorage('skills', [], Array.isArray)
      const liveCerts = sharedCareerDataRef.current.certificates.length > 0 ? sharedCareerDataRef.current.certificates : readStorage('certificates', [], Array.isArray)
      const liveProjects = sharedCareerDataRef.current.projects.length > 0 ? sharedCareerDataRef.current.projects : readStorage('projects', [], Array.isArray)
      const liveExperiences = sharedCareerDataRef.current.experiences.length > 0 ? sharedCareerDataRef.current.experiences : readStorage('experiences', [], Array.isArray)

      const latestAttempt = sharedCareerDataRef.current.attempts.length > 0 ? sharedCareerDataRef.current.attempts[0] : null
      let scorePct = null
      if (latestAttempt) {
        scorePct = Number(latestAttempt.percentage) || Math.round(((latestAttempt.correct_answers || latestAttempt.score || 0) / (latestAttempt.total_questions || 5)) * 100)
      } else if (quizScore !== null) {
        scorePct = Math.round((quizScore / 5) * 100)
      }

      setStats({
        skills: liveSkills.length,
        certificates: liveCerts.length,
        projects: liveProjects.length,
        experiences: liveExperiences.length,
        quizScore: scorePct,
      })
    }

    refreshStats()
    const timeoutId = window.setTimeout(refreshStats, 0)
    window.addEventListener('storage', refreshStats)
    window.addEventListener('careerflow:data-update', refreshStats)
    window.addEventListener('focus', refreshStats)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('storage', refreshStats)
      window.removeEventListener('careerflow:data-update', refreshStats)
      window.removeEventListener('focus', refreshStats)
    }
  }, [])

  const dashboardStats = [
    { label: 'Skills', value: stats.skills, route: '/academic-profile?tab=skills' },
    { label: 'Certificates', value: stats.certificates, route: '/academic-profile?tab=certificates' },
    { label: 'Projects', value: stats.projects, route: '/academic-profile?tab=projects' },
    { label: 'Experiences', value: stats.experiences, route: '/academic-profile?tab=experience' },
    { label: 'Quiz score', value: stats.quizScore === null ? 'Not attempted' : `${stats.quizScore}%`, route: '/weekly-quiz' },
  ]

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Thirora</p>
          <h1>Track your journey. Discover your future.</h1>
          <p className="dashboard-intro">
            Thirora brings your academic profile, skills, achievements, and experiences
            together so you can build a clearer path toward your next opportunity.
          </p>
        </div>
        <div className="journey-status" aria-label="Journey progress">
          <span className="status-dot" />
          <span>Journey in progress</span>
        </div>
      </header>

      <section className="dashboard-stats" aria-labelledby="dashboard-stats-heading">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-label">Your snapshot</p>
            <h2 id="dashboard-stats-heading">Progress at a glance</h2>
          </div>
          <span>Verified records</span>
        </div>
        <div className="dashboard-stats-grid">
          {dashboardStats.map((stat) => (
            <Link className="dashboard-stat-card" to={stat.route} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-quick-actions" aria-labelledby="quick-actions-heading">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-label">Keep moving</p>
            <h2 id="quick-actions-heading">Quick actions</h2>
          </div>
        </div>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <Link className="quick-action" to={action.route} key={action.route}>
              <span className="quick-action-number">0{index + 1}</span>
              <span>
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </span>
              <span className="quick-action-arrow" aria-hidden="true">-&gt;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Career journey tools">
        <article className="dashboard-card dashboard-card-featured">
          <div className="card-icon">01</div>
          <div className="card-content">
            <h2>Academic Profile</h2>
            <p>
              Manage your academic foundation, skills, certificates, projects, and internships
              in one unified workspace.
            </p>
            <Link className="card-link" to="/academic-profile">
              Manage profile &amp; portfolio <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </article>

        {dashboardCards.map((card, index) => (
          <article className="dashboard-card" key={card.title}>
            <div className="card-icon">{String(index + 2).padStart(2, '0')}</div>
            <div className="card-content">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              {card.route ? (
                <Link className="card-action" to={card.route}>
                  {card.label} <span aria-hidden="true">-&gt;</span>
                </Link>
              ) : (
                <span className="card-action">{card.label} <span aria-hidden="true">-&gt;</span></span>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default Dashboard
