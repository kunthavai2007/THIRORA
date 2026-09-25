import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { readStorage } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import {
  resolveCareerContext,
} from '../utils/careerContext'
import { fetchStudentSkills } from '../services/skillService'

const roles = [
  { title: 'Front-End Developer', skills: ['HTML', 'CSS', 'JavaScript'], learning: ['JavaScript', 'React', 'Accessibility'], task: 'Build a responsive portfolio page with keyboard navigation.', reason: 'Your web-facing skills and projects can be extended into interface development.' },
  { title: 'Full-Stack Developer', skills: ['JavaScript', 'SQL', 'Git'], learning: ['APIs', 'Node.js', 'Database design'], task: 'Build a small CRUD app with a documented API and database schema.', reason: 'This path connects programming, data, and version-control evidence.' },
  { title: 'Python Developer', skills: ['Python', 'Git'], learning: ['Testing', 'Object-oriented design', 'Automation'], task: 'Create a Python utility that reads a file, validates input, and includes tests.', reason: 'A Python skill can grow through automation and maintainable application work.' },
  { title: 'Data Analyst', skills: ['SQL', 'Python'], learning: ['Statistics', 'Data visualization', 'Exploratory analysis'], task: 'Analyze a small public dataset and present three evidence-backed findings.', reason: 'SQL or Python evidence provides a starting point for structured analysis.' },
  { title: 'Software Developer', skills: ['JavaScript', 'Python', 'Git'], learning: ['Data structures', 'Testing', 'System design'], task: 'Implement a small feature with tests, clear commits, and a short design note.', reason: 'Broad programming evidence supports a general software-building path.' },
]

function normalizeEvidenceName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : ''
}

function classifyEvidence(skills, topicPerformance) {
  const classifications = new Map()

  function addClassification(name, category) {
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const key = normalizeEvidenceName(trimmedName)
    if (!key) return

    const existing = classifications.get(key)
    if (!existing || category === 'strong' || existing.category !== 'strong') {
      classifications.set(key, { name: existing?.name || trimmedName, category })
    }
  }

  skills.forEach((skill) => {
    if (['Intermediate', 'Advanced'].includes(skill.level)) {
      addClassification(skill.name, 'strong')
    }
  })

  topicPerformance.forEach((topic) => {
    if (topic.total >= 2 && topic.percentage >= 70) {
      addClassification(topic.topic, 'strong')
    }
  })

  skills.forEach((skill) => {
    if (skill.level === 'Beginner') {
      addClassification(skill.name, 'weak')
    }
  })

  topicPerformance.forEach((topic) => {
    if (topic.total >= 2 && topic.percentage <= 49) {
      addClassification(topic.topic, 'weak')
    }
  })

  const strong = []
  const weak = []
  const strongKeys = []
  const weakKeys = []
  classifications.forEach(({ name, category }) => {
    if (category === 'strong') {
      strong.push(name)
      strongKeys.push(normalizeEvidenceName(name))
    } else {
      weak.push(name)
      weakKeys.push(normalizeEvidenceName(name))
    }
  })

  return { strong, weak, strongKeys, weakKeys }
}

function uniqueClassifiedNames(items, keys) {
  const keySet = new Set(keys)
  const names = new Map()
  items.forEach((item) => {
    const name = typeof item === 'string' ? item : item.name
    const key = normalizeEvidenceName(name)
    if (keySet.has(key) && !names.has(key)) {
      names.set(key, name.trim())
    }
  })
  return [...names.values()]
}

function loadLocalRecommendationData() {
  const profile = readStorage('academicProfile', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
  const skills = readStorage('skills', [], Array.isArray)
  const certificates = readStorage('certificates', [], Array.isArray)
  const projects = readStorage('projects', [], Array.isArray)
  const experiences = readStorage('experiences', [], Array.isArray)
  const attempts = readStorage('quizAttempts', [], Array.isArray)
  const quizScore = readStorage('quizScore', null, (value) => Number.isInteger(value) && value >= 0 && value <= 5)
  const preference = readStorage('placementConsent', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
  const topicTotals = {}

  attempts.forEach((attempt) => attempt.topicPerformance?.forEach((topic) => {
    const key = normalizeEvidenceName(topic.topic)
    if (!key) return
    if (!topicTotals[key]) topicTotals[key] = { topic: topic.topic.trim(), correct: 0, total: 0 }
    topicTotals[key].correct += Number(topic.correct) || 0
    topicTotals[key].total += Number(topic.total) || 0
  }))

  const topicPerformance = Object.values(topicTotals).map((values) => ({ ...values, percentage: values.total ? Math.round((values.correct / values.total) * 100) : 0 }))
  const classifications = classifyEvidence(skills, topicPerformance)
  const strongSkills = uniqueClassifiedNames(skills, classifications.strongKeys)
  const weakSkills = uniqueClassifiedNames(skills, classifications.weakKeys)
  const strongTopics = uniqueClassifiedNames(topicPerformance, classifications.strongKeys)
  const weakTopics = uniqueClassifiedNames(topicPerformance, classifications.weakKeys)
  const evidenceCount = skills.length + projects.length + certificates.length + experiences.length + attempts.length

  return { profile, skills, certificates, projects, experiences, attempts, quizScore, preference, strongSkills, weakSkills, strongTopics, weakTopics, topicPerformance, hasEnoughData: evidenceCount > 0 }
}

function computeRecommendationData({
  profile = {},
  skills = [],
  certificates = [],
  projects = [],
  experiences = [],
  attempts = [],
  topicData = [],
  preference = {},
  fallbackQuizScore = null,
}) {
  let quizScore = null
  if (attempts.length > 0) {
    const latestAttempt = attempts[0]
    const latestTotal = Number(latestAttempt.total_questions) || Number(latestAttempt.total) || 0
    const latestScore = Number(latestAttempt.correct_answers ?? latestAttempt.score) || 0
    quizScore = latestTotal > 0 ? Math.round((latestScore / latestTotal) * 5) : 0
  } else if (fallbackQuizScore !== null) {
    quizScore = fallbackQuizScore
  }

  const topicTotals = {}

  if (topicData.length > 0) {
    topicData.forEach((item) => {
      const key = normalizeEvidenceName(item.topic)
      if (!key) return
      if (!topicTotals[key]) topicTotals[key] = { topic: item.topic.trim(), correct: 0, total: 0 }
      topicTotals[key].correct += Number(item.correct_answers ?? item.correct) || 0
      topicTotals[key].total += Number(item.total_questions ?? item.total) || 0
    })
  } else {
    attempts.forEach((attempt) => attempt.topicPerformance?.forEach((topic) => {
      const key = normalizeEvidenceName(topic.topic)
      if (!key) return
      if (!topicTotals[key]) topicTotals[key] = { topic: topic.topic.trim(), correct: 0, total: 0 }
      topicTotals[key].correct += Number(topic.correct) || 0
      topicTotals[key].total += Number(topic.total) || 0
    }))
  }

  const topicPerformance = Object.values(topicTotals).map((values) => ({
    ...values,
    percentage: values.total ? Math.round((values.correct / values.total) * 100) : 0,
  }))

  const classifications = classifyEvidence(skills, topicPerformance)
  const strongSkills = uniqueClassifiedNames(skills, classifications.strongKeys)
  const weakSkills = uniqueClassifiedNames(skills, classifications.weakKeys)
  const strongTopics = uniqueClassifiedNames(topicPerformance, classifications.strongKeys)
  const weakTopics = uniqueClassifiedNames(topicPerformance, classifications.weakKeys)
  const evidenceCount = skills.length + projects.length + certificates.length + experiences.length + attempts.length

  return {
    profile,
    skills,
    certificates,
    projects,
    experiences,
    attempts,
    quizScore,
    preference,
    strongSkills,
    weakSkills,
    strongTopics,
    weakTopics,
    topicPerformance,
    hasEnoughData: evidenceCount > 0,
  }
}

function CareerRecommendations() {
  const {
    careerContext: sharedCareerContext,
  } = useAuth()
  const [data, setData] = useState(() => loadLocalRecommendationData())
  const [showRecommendations, setShowRecommendations] = useState(false)

  const loadRecommendationData = useCallback(async () => {
    const localProfile = readStorage('academicProfile', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
    const localSkills = readStorage('skills', [], Array.isArray)
    const localCertificates = readStorage('certificates', [], Array.isArray)
    const localProjects = readStorage('projects', [], Array.isArray)
    const localExperiences = readStorage('experiences', [], Array.isArray)
    const localPreference = readStorage('placementConsent', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        setData(loadLocalRecommendationData())
        return
      }

      const user = session.user

      const [
        profileRes,
        skillsLoaded,
        certsRes,
        projectsRes,
        experiencesRes,
        attemptsRes,
        topicsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('department, target_role, name').eq('id', user.id).maybeSingle(),
        fetchStudentSkills(user.id),
        supabase.from('certificates').select('*').eq('student_id', user.id),
        supabase.from('projects').select('*').eq('student_id', user.id),
        supabase.from('experiences').select('*').eq('student_id', user.id),
        supabase.from('quiz_attempts').select('*').eq('student_id', user.id).order('completed_at', { ascending: false }),
        supabase.from('quiz_topic_performance').select('*').eq('student_id', user.id),
      ])

      // Formatted profile
      const profileData = profileRes.data || {}
      const mergedProfile = {
        ...localProfile,
        department: profileData.department || localProfile.department || '',
        target_role: profileData.target_role || localProfile.target_role || '',
        name: profileData.name || localProfile.name || '',
      }

      // Preference
      const mergedPreference = {
        ...localPreference,
        preferredRole: profileData.target_role || localPreference.preferredRole || '',
      }

      const formattedSkills = Array.isArray(skillsLoaded)
        ? skillsLoaded
        : localSkills

      const formattedCerts = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const formattedProjects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const formattedExperiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const attemptsData = attemptsRes.data || []
      const topicData = topicsRes.data || []

      const computed = computeRecommendationData({
        profile: mergedProfile,
        skills: formattedSkills,
        certificates: formattedCerts,
        projects: formattedProjects,
        experiences: formattedExperiences,
        attempts: attemptsData,
        topicData,
        preference: mergedPreference,
      })

      setData(computed)
    } catch (err) {
      console.error('Unexpected error loading career recommendation data:', err)
      setData(loadLocalRecommendationData())
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refreshData = () => {
      if (isMounted) {
        loadRecommendationData()
      }
    }

    refreshData()

    window.addEventListener('storage', refreshData)
    window.addEventListener('careerflow:data-update', refreshData)
    window.addEventListener('focus', refreshData)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshData()
    })

    return () => {
      isMounted = false
      window.removeEventListener('storage', refreshData)
      window.removeEventListener('careerflow:data-update', refreshData)
      window.removeEventListener('focus', refreshData)
      subscription?.unsubscribe()
    }
  }, [loadRecommendationData])

  // Unified Career Context
  const localCareerContext = useMemo(() => {
    return resolveCareerContext({
      profile: data.profile,
      skills: data.skills,
      certificates: data.certificates,
      projects: data.projects,
      experiences: data.experiences,
      quizAttempts: data.attempts,
      topicPerformance: data.topicPerformance,
      explicitGoal: data.profile?.careerGoal || data.profile?.career_goal,
    })
  }, [data])
  const careerContext = sharedCareerContext || localCareerContext

  const recommendations = useMemo(() => {
    return roles.map((role) => {
      const savedSkillText = data.skills.map((skill) => (skill.name || '').toLowerCase())
      const matchedSkills = role.skills.filter((skill) => savedSkillText.includes(skill.toLowerCase()) || data.strongTopics.some((topic) => normalizeEvidenceName(topic) === normalizeEvidenceName(skill)))
      const matchedTopics = role.skills.filter((skill) => data.topicPerformance.some((topic) => topic.topic.toLowerCase() === skill.toLowerCase() && topic.percentage >= 70))
      const portfolioEvidence = data.projects.length + data.certificates.length + data.experiences.length
      const isTarget = careerContext.track === role.title
      const baseScore = (isTarget ? 100 : 0) + matchedSkills.length + matchedTopics.length + Math.min(portfolioEvidence, 2)

      return {
        ...role,
        matchedSkills: [...new Set([...matchedSkills, ...matchedTopics])],
        score: baseScore,
        portfolioEvidence,
        isTargetRole: isTarget,
      }
    }).sort((first, second) => second.score - first.score).slice(0, 3)
  }, [data, careerContext])

  const confidence = data.attempts.length > 1 && data.skills.length && data.projects.length ? 'Stronger evidence' : data.hasEnoughData ? 'Developing evidence' : 'Limited evidence'

  return (
    <main className="recommendations-page">
      <div className="recommendations-shell">
        <Link className="back-link" to="/"><span aria-hidden="true">&lt;-</span> Back to Dashboard</Link>
        <header className="recommendations-header">
          <p className="eyebrow">Transparent learning guidance</p>
          <h1>Career Recommendations</h1>
          <p>These are evidence-based learning directions, not guaranteed career predictions. They use saved skills, repeated topic results, portfolio records, and available student context.</p>
        </header>

        {!careerContext.hasContext ? (
          <section className="recommendation-results recommendation-empty-state">
            <p className="recommendation-label">Limited evidence</p>
            <h2>Career guidance will become available after you add a career goal or more profile data.</h2>
            <p>Add your skills, academic department, certificates, or projects to receive personalized career recommendations.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
              <Link to="/academic-profile" className="roadmap-btn roadmap-btn-primary">Set Career Goal</Link>
              <Link to="/academic-profile?tab=skills" className="roadmap-btn roadmap-btn-secondary">Add Skills</Link>
            </div>
          </section>
        ) : (
          <>
            <section className="recommendations-intro" aria-labelledby="recommendation-heading">
              <div>
                <p className="recommendation-label">Current evidence</p>
                <h2 id="recommendation-heading">Understand your starting point</h2>
                <p>
                  Confidence: <strong>{confidence}</strong>. {careerContext.hasContext ? `Primary context: ${careerContext.sourceLabel} (${careerContext.track}).` : 'No explicit career goal recorded.'}
                </p>
              </div>
              <button className="generate-recommendations-button" type="button" onClick={() => setShowRecommendations(true)}>
                Generate Learning Guidance
              </button>
            </section>
            <section className="recommendation-evidence-grid" aria-label="Saved evidence summary">
              <div><span>Current skill level</span><strong>{data.skills.length ? data.skills.map((skill) => `${skill.name}: ${skill.level}`).join(', ') : 'No skills added'}</strong></div>
              <div><span>Strong skills/topics</span><strong>{[...data.strongSkills, ...data.strongTopics].length ? [...new Set([...data.strongSkills, ...data.strongTopics])].join(', ') : 'Not confirmed yet'}</strong></div>
              <div><span>Weak skills/topics</span><strong>{[...data.weakSkills, ...data.weakTopics].length ? [...new Set([...data.weakSkills, ...data.weakTopics])].join(', ') : 'Not confirmed yet'}</strong></div>
              <div><span>Portfolio evidence</span><strong>{data.projects.length} projects, {data.certificates.length} certificates, {data.experiences.length} experiences</strong></div>
            </section>
            {showRecommendations && (
              <section className="recommendation-results" aria-labelledby="recommendation-results-heading">
                <div className="recommendation-results-heading">
                  <div>
                    <p className="recommendation-label">Ranked from saved evidence</p>
                    <h2 id="recommendation-results-heading">Recommended roles to explore</h2>
                  </div>
                  <span className="recommendations-status">Learning guidance</span>
                </div>
                <div className="recommendations-grid">
                  {recommendations.map((recommendation, index) => (
                    <article className="recommendation-card" key={recommendation.title}>
                      <div className="recommendation-card-mark" aria-hidden="true">0{index + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <h3>{recommendation.title}</h3>
                        {recommendation.isTargetRole && (
                          <span className="roadmap-tag-pill" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            Your Goal
                          </span>
                        )}
                      </div>
                      <div className="recommendation-detail"><span>Evidence level</span><p>{confidence}. Matched skills/topics: {recommendation.matchedSkills.length ? recommendation.matchedSkills.join(', ') : 'No direct match yet'}.</p></div>
                      <div className="recommendation-detail"><span>Reason for this recommendation</span><p>{recommendation.reason} Portfolio records currently include {recommendation.portfolioEvidence} relevant item(s).</p></div>
                      <div className="recommendation-detail"><span>Skills to learn next</span><p>{recommendation.learning.join(' -> ')}</p></div>
                      <div className="recommendation-detail"><span>Practical mini-project</span><p>{recommendation.task}</p></div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default CareerRecommendations
