import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { readStorage } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { fetchStudentSkills } from '../services/skillService'
import { BASE_ROLE_REQUIREMENTS, normalizeSkillName } from '../utils/careerContext'

const skillPercentages = { Beginner: 35, Intermediate: 65, Advanced: 90 }

function loadLocalStorageAssessment() {
  const academicProfile = readStorage('academicProfile', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
  const savedSkills = readStorage('skills', [], Array.isArray)
  const certificates = readStorage('certificates', [], Array.isArray)
  const projects = readStorage('projects', [], Array.isArray)
  const experiences = readStorage('experiences', [], Array.isArray)
  const attempts = readStorage('quizAttempts', [], Array.isArray)
  const quizScore = readStorage('quizScore', null, (value) => Number.isInteger(value) && value >= 0 && value <= 5)
  const topicTotals = {}

  attempts.forEach((attempt) => {
    attempt.topicPerformance?.forEach((topic) => {
      if (!topicTotals[topic.topic]) topicTotals[topic.topic] = { topic: topic.topic, correct: 0, total: 0 }
      topicTotals[topic.topic].correct += Number(topic.correct) || 0
      topicTotals[topic.topic].total += Number(topic.total) || 0
    })
  })

  const topicPerformance = Object.values(topicTotals).map((topic) => ({
    ...topic,
    percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
  }))
  const skillLevels = savedSkills.map((skill) => ({
    name: skill.name || skill.skill_name || '',
    level: skill.level || 'Beginner',
    percentage: skillPercentages[skill.level] || 50,
  }))
  const strongSkills = skillLevels.filter((skill) => skill.percentage >= 65).map((skill) => skill.name)
  const weakSkills = skillLevels.filter((skill) => skill.percentage < 65).map((skill) => skill.name)
  const strongTopics = topicPerformance.filter((topic) => topic.percentage >= 70).map((topic) => topic.topic)
  const weakTopics = topicPerformance.filter((topic) => topic.percentage < 70).map((topic) => topic.topic)

  return {
    academicProfile,
    skillLevels,
    topicPerformance,
    strongSkills,
    weakSkills,
    strongTopics,
    weakTopics,
    quizScore,
    attempts,
    certificates,
    projects,
    experiences,
    hasEnoughData: savedSkills.length + projects.length + attempts.length > 0,
  }
}

function computeAssessment({
  savedSkills = [],
  certificates = [],
  projects = [],
  experiences = [],
  academicProfile = {},
  attempts = [],
  topicData = [],
  fallbackQuizScore = null,
}) {
  let quizScore = null
  let topicPerformance

  if (attempts.length > 0) {
    const latestAttempt = attempts[0]
    const latestTotal = Number(latestAttempt.total_questions) || Number(latestAttempt.total) || 0
    const latestScore = Number(latestAttempt.correct_answers ?? latestAttempt.score) || 0
    quizScore = latestTotal > 0 ? Math.round((latestScore / latestTotal) * 5) : 0
  } else if (fallbackQuizScore !== null) {
    quizScore = fallbackQuizScore
  }

  if (topicData.length > 0) {
    const topicTotals = {}
    topicData.forEach((item) => {
      const topicName = item.topic
      if (!topicTotals[topicName]) {
        topicTotals[topicName] = { topic: topicName, correct: 0, total: 0 }
      }
      topicTotals[topicName].correct += Number(item.correct_answers ?? item.correct) || 0
      topicTotals[topicName].total += Number(item.total_questions ?? item.total) || 0
    })

    topicPerformance = Object.values(topicTotals).map((topic) => ({
      ...topic,
      percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
    }))
  } else {
    const topicTotals = {}
    attempts.forEach((attempt) => {
      attempt.topicPerformance?.forEach((topic) => {
        if (!topicTotals[topic.topic]) topicTotals[topic.topic] = { topic: topic.topic, correct: 0, total: 0 }
        topicTotals[topic.topic].correct += Number(topic.correct) || 0
        topicTotals[topic.topic].total += Number(topic.total) || 0
      })
    })
    topicPerformance = Object.values(topicTotals).map((topic) => ({
      ...topic,
      percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
    }))
  }

  const skillLevels = savedSkills.map((skill) => ({
    name: skill.name || skill.skill_name || '',
    level: skill.level || 'Beginner',
    percentage: skillPercentages[skill.level] || 50,
  }))
  const strongSkills = skillLevels.filter((skill) => skill.percentage >= 65).map((skill) => skill.name)
  const weakSkills = skillLevels.filter((skill) => skill.percentage < 65).map((skill) => skill.name)
  const strongTopics = topicPerformance.filter((topic) => topic.percentage >= 70).map((topic) => topic.topic)
  const weakTopics = topicPerformance.filter((topic) => topic.percentage < 70).map((topic) => topic.topic)

  return {
    academicProfile,
    skillLevels,
    topicPerformance,
    strongSkills,
    weakSkills,
    strongTopics,
    weakTopics,
    quizScore,
    attempts,
    certificates,
    projects,
    experiences,
    hasEnoughData: savedSkills.length + projects.length + attempts.length > 0,
  }
}

function SkillAnalysis() {
  const { careerContext: sharedCareerContext } = useAuth()
  const [assessment, setAssessment] = useState(() => loadLocalStorageAssessment())
  const [isAnalyzed, setIsAnalyzed] = useState(false)
  const careerTrack = sharedCareerContext?.track || null
  const careerRequirements = careerTrack ? BASE_ROLE_REQUIREMENTS[careerTrack] || [] : []

  const loadAssessmentData = useCallback(async () => {
    const localProfile = readStorage('academicProfile', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
    const localSkills = readStorage('skills', [], Array.isArray)
    const localCertificates = readStorage('certificates', [], Array.isArray)
    const localProjects = readStorage('projects', [], Array.isArray)
    const localExperiences = readStorage('experiences', [], Array.isArray)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        setAssessment(loadLocalStorageAssessment())
        return
      }

      const user = session.user

      const [
        skillsLoaded,
        certsRes,
        projectsRes,
        experiencesRes,
        attemptsRes,
        topicsRes,
      ] = await Promise.all([
        fetchStudentSkills(user.id),
        supabase.from('certificates').select('*').eq('student_id', user.id),
        supabase.from('projects').select('*').eq('student_id', user.id),
        supabase.from('experiences').select('*').eq('student_id', user.id),
        supabase.from('quiz_attempts').select('*').eq('student_id', user.id).order('completed_at', { ascending: false }),
        supabase.from('quiz_topic_performance').select('*').eq('student_id', user.id),
      ])

      const savedSkills = Array.isArray(skillsLoaded) ? skillsLoaded : localSkills
      const certificates = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const projects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const experiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const attemptsData = Array.isArray(attemptsRes.data) ? attemptsRes.data : []
      const topicData = Array.isArray(topicsRes.data) ? topicsRes.data : []

      const calculated = computeAssessment({
        savedSkills,
        certificates,
        projects,
        experiences,
        academicProfile: localProfile,
        attempts: attemptsData,
        topicData,
      })

      setAssessment(calculated)
    } catch (err) {
      console.error('Unexpected error loading assessment data:', err)
      setAssessment(loadLocalStorageAssessment())
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refreshAssessment = () => {
      if (isMounted) {
        loadAssessmentData()
      }
    }

    refreshAssessment()

    window.addEventListener('storage', refreshAssessment)
    window.addEventListener('careerflow:data-update', refreshAssessment)
    window.addEventListener('focus', refreshAssessment)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshAssessment()
    })

    return () => {
      isMounted = false
      window.removeEventListener('storage', refreshAssessment)
      window.removeEventListener('careerflow:data-update', refreshAssessment)
      window.removeEventListener('focus', refreshAssessment)
      subscription?.unsubscribe()
    }
  }, [loadAssessmentData])

  const skillsToLearn = careerRequirements.filter((skill) => (
    !assessment.skillLevels.some((savedSkill) => normalizeSkillName(savedSkill.name) === normalizeSkillName(skill))
    && !assessment.strongTopics.some((topic) => normalizeSkillName(topic) === normalizeSkillName(skill))
  )).slice(0, 4)
  const uniqueStrong = [...new Set([...assessment.strongSkills, ...assessment.strongTopics])]
  const uniqueWeak = [...new Set([...assessment.weakSkills, ...assessment.weakTopics])]
  const confidence = assessment.attempts.length > 1 ? 'Developing evidence' : 'Limited evidence'

  return (
    <main className="analysis-page">
      <div className="analysis-shell">
        <Link className="back-link" to="/"><span aria-hidden="true">&lt;-</span> Back to Dashboard</Link>
        <header className="analysis-header">
          <p className="eyebrow">Evidence-based learning guidance</p>
          <h1>AI Skill Gap Analysis</h1>
          <p>Review saved skill levels and repeated topic performance against the active {careerTrack || 'student'} career direction.</p>
        </header>

        <section className="analysis-dashboard" aria-labelledby="skill-overview-heading">
          <div className="analysis-dashboard-heading"><div><p className="analysis-label">Saved student evidence</p><h2 id="skill-overview-heading">Current skill level</h2></div><span className="demo-badge">Indicative assessment</span></div>
          {!assessment.hasEnoughData ? <p className="analysis-empty-state">Not enough assessment data yet. Complete more quizzes and add more projects.</p> : <>
            <p className="analysis-score-summary">Latest quiz score: {assessment.quizScore === null ? 'Not attempted' : `${assessment.quizScore} / 5`} | Attempts reviewed: {assessment.attempts.length} | Portfolio: {assessment.projects.length} projects, {assessment.certificates.length} certificates, {assessment.experiences.length} experiences</p>
            <div className="skill-progress-list">
              {assessment.skillLevels.map((skill) => <div className="skill-progress-item" key={skill.name}><div className="skill-progress-label"><span>{skill.name} <small>({skill.level})</small></span><strong>{skill.percentage}%</strong></div><div className="progress-track" role="progressbar" aria-label={`${skill.name} skill level`} aria-valuenow={skill.percentage} aria-valuemin="0" aria-valuemax="100"><div className="progress-fill" style={{ width: `${skill.percentage}%` }} /></div></div>)}
            </div>
            <button className="analyze-button" type="button" onClick={() => setIsAnalyzed(true)}>Analyze My Skills</button>
          </>}
        </section>

        {assessment.hasEnoughData && isAnalyzed && <section className="analysis-results" aria-labelledby="analysis-results-heading">
          <div className="results-heading"><div><p className="analysis-label">Transparent learning guidance</p><h2 id="analysis-results-heading">What the evidence suggests</h2></div><span className="results-status">{confidence}</span></div>
          <div className="result-grid">
            <article className="result-card analysis-strong"><h3>Strong skills/topics</h3><p className="analysis-evidence">Saved levels and quiz topics at 70% or higher.</p><ul>{uniqueStrong.length ? uniqueStrong.map((item) => <li key={item}>{item}</li>) : <li>No strong area confirmed yet</li>}</ul></article>
            <article className="result-card analysis-improve"><h3>Weak skills/topics</h3><p className="analysis-evidence">Review focus only; one low result is not proof of no ability.</p><ul>{uniqueWeak.length ? uniqueWeak.map((item) => <li key={item}>{item}</li>) : <li>No weak area confirmed yet</li>}</ul></article>
            <article className="result-card analysis-learning"><h3>Skills to learn next</h3><p className="analysis-evidence">Prioritized from missing core topics and current weak areas.</p><ul>{skillsToLearn.length ? skillsToLearn.map((item) => <li key={item}>{item}</li>) : <li>Extend your strongest skill with an applied project</li>}</ul></article>
            <article className="result-card analysis-careers"><h3>Recommended learning order</h3><p className="analysis-evidence">Start with fundamentals, then apply them.</p><ol>{skillsToLearn.slice(0, 3).map((item, index) => <li key={item}>{index + 1}. {item}</li>)}</ol></article>
          </div>
        </section>}
      </div>
    </main>
  )
}

export default SkillAnalysis
