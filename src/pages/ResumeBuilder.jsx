import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { readStorage } from '../utils/storage'
import { resolveCareerContext } from '../utils/careerContext'
import { useAuth } from '../context/useAuth'
import { fetchStudentSkills } from '../services/skillService'


function normalizeProficiency(proficiency) {
  if (!proficiency) return 'Beginner'
  if (typeof proficiency === 'number') {
    if (proficiency >= 3) return 'Advanced'
    if (proficiency === 2) return 'Intermediate'
    return 'Beginner'
  }
  const str = String(proficiency).trim().toLowerCase()
  if (str === '3' || str === 'advanced' || str === 'expert') return 'Advanced'
  if (str === '2' || str === 'intermediate' || str === 'medium') return 'Intermediate'
  return 'Beginner'
}

function formatDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return ''
  try {
    const parts = dateStr.split('-')
    if (parts.length === 1 && parts[0].length === 4) return parts[0]
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateRange(startDate, endDate) {
  const start = formatDisplayDate(startDate)
  const end = endDate ? formatDisplayDate(endDate) : ''
  if (start && end) return `${start} – ${end}`
  if (start) return `${start} – Present`
  if (end) return end
  return ''
}

function formatTechList(tech) {
  if (!tech) return []
  if (Array.isArray(tech)) return tech.map((t) => String(t).trim()).filter(Boolean)
  if (typeof tech === 'string') {
    return tech.split(/[,|;]/).map((t) => t.trim()).filter(Boolean)
  }
  return []
}

function splitIntoBullets(text) {
  if (!text || typeof text !== 'string') return []
  const rawLines = text.split(/\r?\n/)
  const bullets = []
  for (const line of rawLines) {
    const trimmed = line.replace(/^[•\-*]\s*/, '').trim()
    if (trimmed) {
      bullets.push(trimmed)
    }
  }
  if (bullets.length === 1 && bullets[0].length > 120 && bullets[0].includes('.')) {
    return bullets[0]
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5)
  }
  return bullets
}

function generateCareerSummary(profile, skills, projects, experiences, certificates, quizTopics, targetRole) {
  if (!targetRole) {
    return 'Career Goal Not Set: Set your target career role in your Academic Profile or Career Roadmap to generate a specialized professional summary.'
  }

  const roleName = targetRole
  const dept = profile.department ? profile.department.trim() : ''
  const college = profile.college_name ? profile.college_name.trim() : ''

  const topSkills = skills.slice(0, 5).map((s) => s.skill_name || s.name).filter(Boolean)
  const skillClause = topSkills.length > 0 ? `with demonstrated proficiency in ${topSkills.join(', ')}` : 'with rigorous foundational training'

  const baseSentence = (dept && college)
    ? `Motivated ${dept} student at ${college} pursuing opportunities as a ${roleName} ${skillClause}.`
    : dept
    ? `Results-oriented ${dept} student aspiring as a ${roleName} ${skillClause}.`
    : `Dedicated aspiring ${roleName} ${skillClause}.`

  const projectCount = projects.length
  const expCount = experiences.length
  let practicalSentence = ''

  if (projectCount > 0 && expCount > 0) {
    practicalSentence = ` Equipped with practical experience across ${expCount} professional/internship engagement${expCount > 1 ? 's' : ''} and ${projectCount} hands-on technical project${projectCount > 1 ? 's' : ''}.`
  } else if (projectCount > 0) {
    practicalSentence = ` Demonstrated practical capability through ${projectCount} completed project${projectCount > 1 ? 's' : ''} applying real-world engineering standards.`
  } else if (expCount > 0) {
    practicalSentence = ` Strengthened by ${expCount} hands-on industry internship and work experience${expCount > 1 ? 's' : ''}.`
  }

  const topAssessments = (quizTopics || []).filter((t) => t.percentage >= 75).slice(0, 2)
  let assessmentSentence = ''
  if (topAssessments.length > 0) {
    const topicsStr = topAssessments.map((t) => `${t.topic} (${t.percentage}%)`).join(', ')
    assessmentSentence = ` Verified competencies include top scores in ${topicsStr}.`
  }

  return `${baseSentence}${practicalSentence}${assessmentSentence}`.trim()
}

function transformRawDataToResume({
  profile = {},
  skills = [],
  certificates = [],
  projects = [],
  experiences = [],
  attempts = [],
  topics = [],
  userEmail = '',
  resolvedCareer = null,
}) {
  const context = resolveCareerContext({
    profile,
    skills,
    certificates,
    projects,
    experiences,
    quizAttempts: attempts,
    topicPerformance: topics,
    explicitGoal: profile?.careerGoal || profile?.career_goal,
  })
  const targetRole = (resolvedCareer?.hasContext && resolvedCareer.track) || context.track || ''
  const fullName = profile.name || profile.studentName || ''
  const phone = profile.phone || ''
  const college = profile.college_name || profile.collegeName || ''
  const department = profile.department || ''
  const cgpa = profile.cgpa || ''
  const currentYear = profile.current_year || profile.currentYear || ''
  const currentSemester = profile.current_semester || profile.currentSemester || ''
  const registerNumber = profile.register_number || profile.registerNumber || ''
  const graduationYear = profile.graduation_year || profile.graduationYear || ''
  const graduationDate = profile.graduation_date || profile.graduationDate || ''
  const location = profile.location || ''

  // Project URLs
  const githubProject = projects.find((p) => p.github_url || p.githubUrl)
  const liveProject = projects.find((p) => p.project_url || p.projectUrl)
  const githubUrl = githubProject?.github_url || githubProject?.githubUrl || profile.github_url || ''
  const portfolioUrl = liveProject?.project_url || liveProject?.projectUrl || profile.portfolio_url || ''

  // Group Skills by Category
  const skillsByCategory = {}
  skills.forEach((s) => {
    const name = s.skill_name || s.name || ''
    if (!name) return
    const rawCategory = s.category ? String(s.category).trim() : 'Core Technical Skills'
    const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)
    const level = normalizeProficiency(s.proficiency || s.level)

    if (!skillsByCategory[category]) {
      skillsByCategory[category] = []
    }
    skillsByCategory[category].push({
      name,
      level,
      proficiency: s.proficiency || (level === 'Advanced' ? 3 : level === 'Intermediate' ? 2 : 1),
    })
  })

  // Format Projects
  const formattedProjects = projects.map((p) => {
    const tech = formatTechList(p.technologies)
    const bullets = splitIntoBullets(p.description)
    const dateRange = formatDateRange(p.start_date || p.startDate, p.end_date || p.endDate)

    return {
      id: p.id || Math.random().toString(),
      title: p.title || 'Untitled Project',
      role: p.role || '',
      dateRange,
      technologies: tech,
      techString: tech.join(', '),
      description: p.description || '',
      bullets: bullets.length > 0 ? bullets : (p.description ? [p.description] : []),
      githubUrl: p.github_url || p.githubUrl || '',
      projectUrl: p.project_url || p.projectUrl || '',
    }
  })

  // Format Experiences
  const formattedExperiences = experiences.map((e) => {
    const bullets = splitIntoBullets(e.description)
    const dateRange = formatDateRange(e.start_date || e.startDate, e.end_date || e.endDate)
    const skillsUsed = formatTechList(e.skills)

    return {
      id: e.id || Math.random().toString(),
      role: e.role || e.title || 'Role',
      organization: e.organization || e.company || '',
      experienceType: e.experience_type || e.type || 'Experience',
      dateRange,
      description: e.description || '',
      bullets: bullets.length > 0 ? bullets : (e.description ? [e.description] : []),
      skillsUsed,
      certificateUrl: e.certificate_url || e.certificateUrl || '',
    }
  })

  // Format Certifications
  const formattedCertificates = certificates.map((c) => ({
    id: c.id || Math.random().toString(),
    name: c.certificate_name || c.name || 'Certificate',
    issuingOrg: c.issuing_organization || c.organization || '',
    issueDate: formatDisplayDate(c.issue_date || c.issueDate),
    credentialId: c.credential_id || c.credentialId || '',
    credentialUrl: c.credential_url || c.credentialUrl || '',
  }))

  // Quiz Highlights (Topic percentage >= 70%)
  const filteredTopics = (topics || [])
    .filter((t) => Number(t.percentage) >= 70)
    .map((t) => ({
      topic: t.topic || 'Skill Topic',
      percentage: Number(t.percentage),
    }))

  const latestAttempt = attempts && attempts.length > 0 ? attempts[0] : null
  const latestQuiz = latestAttempt
    ? {
        title: latestAttempt.quiz_title || latestAttempt.title || 'Assessment',
        score: latestAttempt.score ?? latestAttempt.correct_answers ?? 0,
        total: latestAttempt.total_questions ?? 5,
        percentage: Number(latestAttempt.percentage || 0),
        date: formatDisplayDate(latestAttempt.completed_at || latestAttempt.completedAt),
      }
    : null

  // Professional Summary
  const summaryText = generateCareerSummary(
    profile,
    skills,
    projects,
    experiences,
    certificates,
    filteredTopics,
    targetRole
  )

  return {
    header: {
      fullName,
      targetRole: targetRole || '',
      email: userEmail || profile.email || '',
      phone,
      college,
      location,
      githubUrl,
      portfolioUrl,
    },
    summary: {
      text: summaryText,
      hasTargetRole: Boolean(targetRole),
    },
    education: {
      department,
      college,
      currentYear,
      currentSemester,
      cgpa,
      registerNumber,
      graduationYear,
      graduationDate,
    },
    skills: skillsByCategory,
    projects: formattedProjects,
    experience: formattedExperiences,
    certifications: formattedCertificates,
    assessmentHighlights: filteredTopics,
    latestQuiz,
  }
}

// Icons
function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function ResumeBuilder() {
  const { careerContext: sharedCareerContext } = useAuth()
  const careerContextRef = useRef(sharedCareerContext)
  useEffect(() => {
    careerContextRef.current = sharedCareerContext
  }, [sharedCareerContext])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTemplate, setActiveTemplate] = useState('classic') // 'classic' | 'modern' | 'technical'
  const [viewMode, setViewMode] = useState('split') // 'split' | 'preview-only' | 'edit-only'

  // Master generated data from Supabase/Local
  const [pristineResume, setPristineResume] = useState(null)
  // Session editable resume copy
  const [resume, setResume] = useState(null)
  const [dataSource, setDataSource] = useState('supabase')

  const loadData = useCallback(async () => {
    // Local Storage fallbacks
    const localProfile = readStorage('academicProfile', {}, (v) => v !== null && typeof v === 'object' && !Array.isArray(v))
    const localSkills = readStorage('skills', [], Array.isArray)
    const localCertificates = readStorage('certificates', [], Array.isArray)
    const localProjects = readStorage('projects', [], Array.isArray)
    const localExperiences = readStorage('experiences', [], Array.isArray)
    const localAttempts = readStorage('quizAttempts', [], Array.isArray)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        // Fallback to local storage
        const transformed = transformRawDataToResume({
          profile: localProfile,
          skills: localSkills,
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          attempts: localAttempts,
          topics: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
          userEmail: localProfile.email || '',
          resolvedCareer: careerContextRef.current,
        })
        setPristineResume(transformed)
        setResume(transformed)
        setDataSource('local')
        setLoading(false)
        return
      }

      const user = session.user

      const [
        profileRes,
        skillsRes,
        certsRes,
        projectsRes,
        experiencesRes,
        attemptsRes,
        topicsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, college_name, department, current_year, graduation_year, target_role, cgpa, bio, register_number, current_semester, graduation_date, avatar_url')
          .eq('id', user.id)
          .maybeSingle(),
        fetchStudentSkills(user.id),
        supabase
          .from('certificates')
          .select('id, certificate_name, issuing_organization, issue_date, expiry_date, credential_id, credential_url, skills')
          .eq('student_id', user.id),
        supabase
          .from('projects')
          .select('id, title, description, technologies, project_url, github_url, start_date, end_date, role')
          .eq('student_id', user.id),
        supabase
          .from('experiences')
          .select('id, experience_type, role, organization, start_date, end_date, description, certificate_url, skills')
          .eq('student_id', user.id),
        supabase
          .from('quiz_attempts')
          .select('id, quiz_title, total_questions, correct_answers, score, percentage, completed_at')
          .eq('student_id', user.id)
          .order('completed_at', { ascending: false }),
        supabase
          .from('quiz_topic_performance')
          .select('attempt_id, topic, total_questions, correct_answers, percentage')
          .eq('student_id', user.id),
      ])

      const fetchedProfile = profileRes.data || localProfile
      const fetchedSkills = Array.isArray(skillsRes) ? skillsRes : localSkills
      const fetchedCerts = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const fetchedProjects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const fetchedExperiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const fetchedAttempts = Array.isArray(attemptsRes.data) ? attemptsRes.data : localAttempts
      const fetchedTopics = Array.isArray(topicsRes.data) ? topicsRes.data : (localAttempts[localAttempts.length - 1]?.topicPerformance || [])

      const transformed = transformRawDataToResume({
        profile: fetchedProfile,
        skills: fetchedSkills,
        certificates: fetchedCerts,
        projects: fetchedProjects,
        experiences: fetchedExperiences,
        attempts: fetchedAttempts,
        topics: fetchedTopics,
        userEmail: user.email || fetchedProfile.email || '',
        resolvedCareer: careerContextRef.current,
      })

      setPristineResume(transformed)
      setResume(transformed)
      setDataSource(Array.isArray(skillsRes) || profileRes.data ? 'supabase' : 'local')
      setLoading(false)
    } catch (err) {
      console.error('Error loading resume data from Supabase:', err)
      // Fallback
      const transformed = transformRawDataToResume({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        attempts: localAttempts,
        topics: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
        userEmail: localProfile.email || '',
      })
      setPristineResume(transformed)
      setResume(transformed)
      setDataSource('local')
      setError('Could not connect to online records. Loaded local backup data.')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refresh = () => {
      if (isMounted) {
        loadData()
      }
    }

    refresh()

    window.addEventListener('storage', refresh)
    window.addEventListener('careerflow:data-update', refresh)
    window.addEventListener('focus', refresh)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })

    return () => {
      isMounted = false
      window.removeEventListener('storage', refresh)
      window.removeEventListener('careerflow:data-update', refresh)
      window.removeEventListener('focus', refresh)
      subscription?.unsubscribe()
    }
  }, [loadData])

  // Reset edits back to original Supabase data
  const handleResetToStored = () => {
    if (pristineResume) {
      setResume(JSON.parse(JSON.stringify(pristineResume)))
    }
  }

  // Check whether student has any content
  const hasContent = useMemo(() => {
    if (!resume) return false
    const h = resume.header
    const edu = resume.education
    const hasNameOrContact = Boolean(h.fullName || h.email || h.phone || h.college)
    const hasSkills = Object.keys(resume.skills || {}).length > 0
    const hasProjects = (resume.projects || []).length > 0
    const hasExp = (resume.experience || []).length > 0
    const hasCerts = (resume.certifications || []).length > 0
    const hasEdu = Boolean(edu.department || edu.college || edu.cgpa)
    const hasSummary = Boolean(resume.summary?.text && resume.summary.hasTargetRole)
    return hasNameOrContact || hasSkills || hasProjects || hasExp || hasCerts || hasEdu || hasSummary
  }, [resume])

  // Handlers for session edits
  const updateHeaderField = (field, value) => {
    setResume((prev) => ({
      ...prev,
      header: { ...prev.header, [field]: value },
    }))
  }

  const updateSummaryText = (value) => {
    setResume((prev) => ({
      ...prev,
      summary: { ...prev.summary, text: value },
    }))
  }

  const updateEducationField = (field, value) => {
    setResume((prev) => ({
      ...prev,
      education: { ...prev.education, [field]: value },
    }))
  }

  const updateProjectDescription = (index, value) => {
    setResume((prev) => {
      const updated = [...prev.projects]
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          description: value,
          bullets: splitIntoBullets(value),
        }
      }
      return { ...prev, projects: updated }
    })
  }

  const updateExperienceDescription = (index, value) => {
    setResume((prev) => {
      const updated = [...prev.experience]
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          description: value,
          bullets: splitIntoBullets(value),
        }
      }
      return { ...prev, experience: updated }
    })
  }

  return (
    <main className="resume-page thirora-resume-scope">
      <style>{`
        /* Scoped styles for Resume Builder */
        .thirora-resume-scope {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px clamp(16px, 4vw, 48px) 64px;
        }

        .resume-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .resume-hero {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .resume-hero-left h1 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          color: #0f172a;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 6px 0;
        }

        .resume-hero-left p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .resume-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          border: 1px solid transparent;
        }

        .btn-primary {
          background: #1e3a8a;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);
        }
        .btn-primary:hover {
          background: #172554;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #ffffff;
          color: #334155;
          border-color: #cbd5e1;
        }
        .btn-secondary:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-outline-primary {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }
        .btn-outline-primary:hover {
          background: #dbeafe;
        }

        /* Template Toolbar */
        .template-toolbar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .template-selector-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .template-group-label {
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 6px;
        }

        .template-pill {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .template-pill:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .template-pill.active {
          background: #1e3a8a;
          color: #ffffff;
          border-color: #1e3a8a;
          box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
        }

        .view-mode-group {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }

        .view-mode-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .view-mode-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Main Workspace Layout */
        .resume-split-container {
          display: grid;
          gap: 28px;
          align-items: start;
        }
        .resume-split-container.split-mode {
          grid-template-columns: minmax(340px, 0.85fr) minmax(460px, 1.15fr);
        }
        .resume-split-container.preview-mode {
          grid-template-columns: 1fr;
          max-width: 900px;
          margin: 0 auto;
        }
        .resume-split-container.edit-mode {
          grid-template-columns: 1fr;
          max-width: 900px;
          margin: 0 auto;
        }

        /* Editing Panel */
        .resume-editor-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 20px;
        }

        .editor-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .editor-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          background: #e0f2fe;
          color: #0369a1;
        }

        .editor-section {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #f8fafc;
        }

        .editor-section-title {
          font-size: 0.85rem;
          font-weight: 800;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group-full {
          grid-column: span 2;
        }

        .form-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 4px;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.86rem;
          color: #0f172a;
          background: #f8fafc;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        .form-textarea {
          resize: vertical;
          min-height: 72px;
          line-height: 1.45;
        }

        /* Empty State Card */
        .resume-empty-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 64px 32px;
          text-align: center;
          max-width: 680px;
          margin: 40px auto;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .empty-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #eff6ff;
          color: #1d4ed8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .resume-empty-card h2 {
          font-size: 1.5rem;
          color: #0f172a;
          font-weight: 800;
          margin: 0 0 10px 0;
        }

        .resume-empty-card p {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0 auto 28px;
          max-width: 480px;
        }

        .empty-nav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          text-align: left;
        }

        .empty-nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #1e3a8a;
          background: #f8fafc;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 700;
          transition: all 0.15s ease;
        }
        .empty-nav-link:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          transform: translateY(-1px);
        }

        /* Resume Document Paper Container */
        .resume-paper-wrapper {
          position: sticky;
          top: 24px;
        }

        .resume-paper {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          padding: 44px 48px;
          min-height: 840px;
          box-sizing: border-box;
          color: #111827;
          font-size: 0.88rem;
          line-height: 1.5;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* ----------------------------------------------------
           TEMPLATE 1: CLASSIC ATS
        ---------------------------------------------------- */
        .template-classic .ats-header {
          text-align: center;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .template-classic .ats-name {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        .template-classic .ats-target-role {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0 0 8px 0;
        }
        .template-classic .ats-contact-bar {
          font-size: 0.82rem;
          color: #475569;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px 14px;
        }
        .template-classic .ats-section {
          margin-bottom: 18px;
        }
        .template-classic .ats-section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin: 0 0 10px 0;
        }

        /* ----------------------------------------------------
           TEMPLATE 2: MODERN MINIMAL
        ---------------------------------------------------- */
        .template-modern .ats-header {
          text-align: left;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
        }
        .template-modern .ats-name {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }
        .template-modern .ats-target-role {
          font-size: 1rem;
          font-weight: 700;
          color: #2563eb;
          margin: 0;
        }
        .template-modern .ats-contact-bar {
          font-size: 0.8rem;
          color: #475569;
          text-align: right;
          line-height: 1.45;
        }
        .template-modern .ats-section {
          margin-bottom: 20px;
        }
        .template-modern .ats-section-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .template-modern .ats-section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        /* ----------------------------------------------------
           TEMPLATE 3: TECHNICAL DEVELOPER
        ---------------------------------------------------- */
        .template-technical .ats-header {
          text-align: left;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #0f172a;
          padding: 16px 20px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .template-technical .ats-name {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .template-technical .ats-target-role {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0284c7;
          margin: 0 0 6px 0;
        }
        .template-technical .ats-contact-bar {
          font-size: 0.8rem;
          color: #475569;
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .template-technical .ats-section {
          margin-bottom: 20px;
        }
        .template-technical .ats-section-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 4px;
          margin: 0 0 10px 0;
        }

        /* Shared Item Typography */
        .resume-entry {
          margin-bottom: 12px;
        }
        .resume-entry:last-child {
          margin-bottom: 0;
        }

        .entry-topline {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
        }

        .entry-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .entry-subtitle {
          font-size: 0.84rem;
          font-weight: 600;
          color: #334155;
        }

        .entry-date {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
        }

        .entry-tech {
          font-size: 0.8rem;
          font-weight: 600;
          color: #2563eb;
          margin: 2px 0 4px 0;
        }

        .entry-bullets {
          margin: 4px 0 0 0;
          padding-left: 18px;
          color: #334155;
          font-size: 0.85rem;
          line-height: 1.45;
        }

        .entry-bullets li {
          margin-bottom: 3px;
        }

        .skills-grid-display {
          display: grid;
          gap: 6px;
        }

        .skill-cat-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.85rem;
          line-height: 1.45;
        }

        .skill-cat-name {
          font-weight: 700;
          color: #0f172a;
          min-width: 140px;
          flex-shrink: 0;
        }

        .skill-cat-list {
          color: #334155;
        }

        .skill-tag {
          display: inline;
        }

        .skill-level-badge {
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 500;
        }

        .edu-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 4px;
        }

        .summary-paragraph {
          color: #334155;
          font-size: 0.86rem;
          line-height: 1.55;
          margin: 0;
          text-align: justify;
        }

        .resume-link {
          color: #1e3a8a;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* ----------------------------------------------------
           PRINT STYLES (window.print)
        ---------------------------------------------------- */
        @media print {
          body, html {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .resume-top-nav,
          .resume-hero,
          .template-toolbar,
          .resume-editor-panel,
          .resume-empty-card,
          .no-print {
            display: none !important;
          }

          .thirora-resume-scope {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .resume-split-container {
            display: block !important;
            grid-template-columns: 1fr !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .resume-paper-wrapper {
            position: static !important;
          }

          .resume-paper {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            min-height: auto !important;
            color: #000000 !important;
          }

          .ats-section, .resume-entry {
            page-break-inside: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .resume-split-container.split-mode {
            grid-template-columns: 1fr;
          }
          .resume-paper-wrapper {
            position: static;
          }
        }
      `}</style>

      <div className="resume-shell">
        {/* Navigation */}
        <div className="resume-top-nav no-print">
          <Link className="back-link" to="/">
            <span aria-hidden="true">&larr;</span> Back to Dashboard
          </Link>
          <span className="editor-badge">
            {dataSource === 'supabase' ? 'Online Profile Synced' : 'Local Data Mode'}
          </span>
        </div>

        {/* Hero Header */}
        <header className="resume-hero no-print">
          <div className="resume-hero-left">
            <p className="resume-label">THIRORA Career Acceleration</p>
            <h1>ATS Resume Builder</h1>
            <p>Generate industry-ready, ATS-compliant resumes directly from your verified profile, skills, projects, and assessment scores.</p>
          </div>
          <div className="resume-hero-actions">
            <button
              className="action-btn btn-secondary"
              type="button"
              onClick={handleResetToStored}
              title="Reset any temporary edits back to your original saved profile records"
            >
              <RefreshIcon />
              Reset to Profile
            </button>
            <button
              className="action-btn btn-primary"
              type="button"
              onClick={() => window.print()}
            >
              <PrinterIcon />
              Print / Save as PDF
            </button>
          </div>
        </header>

        {/* Loading / Error States */}
        {loading && (
          <div className="resume-empty-card" style={{ padding: '48px 24px' }}>
            <div className="empty-icon-circle">
              <RefreshIcon />
            </div>
            <h2>Loading Verified Resume Data...</h2>
            <p>Gathering your student profile, verified skills, projects, experiences, and assessment records from Supabase.</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px 20px', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', fontSize: '0.88rem' }} className="no-print">
            <strong>Note:</strong> {error}
          </div>
        )}

        {!loading && resume && !hasContent && (
          /* Empty State */
          <div className="resume-empty-card">
            <div className="empty-icon-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2>No Resume Data Found</h2>
            <p>
              Your resume will appear here once you add your profile, skills, projects, education, or experience.
            </p>
            <div className="empty-nav-grid">
              <Link className="empty-nav-link" to="/academic-profile">
                <span>Academic Profile</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="empty-nav-link" to="/skills">
                <span>Add Technical Skills</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="empty-nav-link" to="/career-roadmap">
                <span>Set Career Goal</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="empty-nav-link" to="/quiz">
                <span>Take Weekly Quiz</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        )}

        {!loading && resume && hasContent && (
          <>
            {/* Template and View Controls Toolbar */}
            <div className="template-toolbar no-print">
              <div className="template-selector-group">
                <span className="template-group-label">Template:</span>
                <button
                  type="button"
                  className={`template-pill ${activeTemplate === 'classic' ? 'active' : ''}`}
                  onClick={() => setActiveTemplate('classic')}
                >
                  Classic ATS
                </button>
                <button
                  type="button"
                  className={`template-pill ${activeTemplate === 'modern' ? 'active' : ''}`}
                  onClick={() => setActiveTemplate('modern')}
                >
                  Modern Minimal
                </button>
                <button
                  type="button"
                  className={`template-pill ${activeTemplate === 'technical' ? 'active' : ''}`}
                  onClick={() => setActiveTemplate('technical')}
                >
                  Technical Developer
                </button>
              </div>

              <div className="view-mode-group">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                >
                  Side by Side
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'edit-only' ? 'active' : ''}`}
                  onClick={() => setViewMode('edit-only')}
                >
                  Edit Form
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'preview-only' ? 'active' : ''}`}
                  onClick={() => setViewMode('preview-only')}
                >
                  Document Only
                </button>
              </div>
            </div>

            {/* Split Workspace */}
            <div
              className={`resume-split-container ${
                viewMode === 'split'
                  ? 'split-mode'
                  : viewMode === 'edit-only'
                  ? 'edit-mode'
                  : 'preview-mode'
              }`}
            >
              {/* Left Column: Interactive Session Editing Panel */}
              {(viewMode === 'split' || viewMode === 'edit-only') && (
                <section className="resume-editor-panel no-print" aria-label="Resume Content Editor">
                  <div className="editor-header">
                    <div>
                      <h2 className="editor-title">Resume Customizer</h2>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Edits are active for this session. Database records remain intact.</span>
                    </div>
                    <span className="editor-badge">
                      <EditIcon /> Live Editing
                    </span>
                  </div>

                  {/* Header / Contact Details */}
                  <div className="editor-section">
                    <h3 className="editor-section-title">Header & Contact</h3>
                    <div className="form-grid">
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="fullName">Full Name</label>
                        <input
                          id="fullName"
                          className="form-input"
                          type="text"
                          value={resume.header.fullName}
                          onChange={(e) => updateHeaderField('fullName', e.target.value)}
                          placeholder="Student Name"
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                          id="email"
                          className="form-input"
                          type="email"
                          value={resume.header.email}
                          onChange={(e) => updateHeaderField('email', e.target.value)}
                          placeholder="Email Address"
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="phone">Phone</label>
                        <input
                          id="phone"
                          className="form-input"
                          type="tel"
                          value={resume.header.phone}
                          onChange={(e) => updateHeaderField('phone', e.target.value)}
                          placeholder="Phone Number"
                        />
                      </div>
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="college">College / University</label>
                        <input
                          id="college"
                          className="form-input"
                          type="text"
                          value={resume.header.college}
                          onChange={(e) => updateHeaderField('college', e.target.value)}
                          placeholder="Institution Name"
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="githubUrl">GitHub Profile URL</label>
                        <input
                          id="githubUrl"
                          className="form-input"
                          type="url"
                          value={resume.header.githubUrl}
                          onChange={(e) => updateHeaderField('githubUrl', e.target.value)}
                          placeholder="https://github.com/..."
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="portfolioUrl">Live Portfolio / Demo URL</label>
                        <input
                          id="portfolioUrl"
                          className="form-input"
                          type="url"
                          value={resume.header.portfolioUrl}
                          onChange={(e) => updateHeaderField('portfolioUrl', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Summary */}
                  <div className="editor-section">
                    <h3 className="editor-section-title">
                      Professional Summary
                      {resume.header.targetRole && (
                        <span style={{ fontSize: '0.74rem', color: '#2563eb', textTransform: 'none', fontWeight: 600 }}>
                          Role: {resume.header.targetRole}
                        </span>
                      )}
                    </h3>
                    <label className="form-label" htmlFor="summaryText">Tailored Career Summary</label>
                    <textarea
                      id="summaryText"
                      className="form-textarea"
                      rows={4}
                      value={resume.summary.text}
                      onChange={(e) => updateSummaryText(e.target.value)}
                      placeholder="Enter professional summary..."
                    />
                  </div>

                  {/* Education Form */}
                  <div className="editor-section">
                    <h3 className="editor-section-title">Education Details</h3>
                    <div className="form-grid">
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="department">Degree & Department</label>
                        <input
                          id="department"
                          className="form-input"
                          type="text"
                          value={resume.education.department}
                          onChange={(e) => updateEducationField('department', e.target.value)}
                          placeholder="e.g. B.E. Computer Science and Engineering"
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="cgpa">CGPA / Percentage</label>
                        <input
                          id="cgpa"
                          className="form-input"
                          type="text"
                          value={resume.education.cgpa}
                          onChange={(e) => updateEducationField('cgpa', e.target.value)}
                          placeholder="e.g. 8.5"
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="graduationYear">Graduation Year</label>
                        <input
                          id="graduationYear"
                          className="form-input"
                          type="text"
                          value={resume.education.graduationYear || resume.education.graduationDate}
                          onChange={(e) => updateEducationField('graduationYear', e.target.value)}
                          placeholder="e.g. 2025"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Project Descriptions */}
                  {resume.projects.length > 0 && (
                    <div className="editor-section">
                      <h3 className="editor-section-title">Project Bullet Points</h3>
                      {resume.projects.map((proj, idx) => (
                        <div key={proj.id || idx} style={{ marginBottom: '14px' }}>
                          <label className="form-label" htmlFor={`proj-desc-${idx}`}>
                            {proj.title} {proj.role ? `(${proj.role})` : ''}
                          </label>
                          <textarea
                            id={`proj-desc-${idx}`}
                            className="form-textarea"
                            rows={3}
                            value={proj.description}
                            onChange={(e) => updateProjectDescription(idx, e.target.value)}
                            placeholder="Describe project responsibilities and accomplishments (new lines will render as bullet points)..."
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Experience Descriptions */}
                  {resume.experience.length > 0 && (
                    <div className="editor-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      <h3 className="editor-section-title">Experience Bullet Points</h3>
                      {resume.experience.map((exp, idx) => (
                        <div key={exp.id || idx} style={{ marginBottom: '14px' }}>
                          <label className="form-label" htmlFor={`exp-desc-${idx}`}>
                            {exp.role} at {exp.organization}
                          </label>
                          <textarea
                            id={`exp-desc-${idx}`}
                            className="form-textarea"
                            rows={3}
                            value={exp.description}
                            onChange={(e) => updateExperienceDescription(idx, e.target.value)}
                            placeholder="Describe internship or work responsibilities (new lines will render as bullet points)..."
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Right Column: ATS Resume Paper Output */}
              {(viewMode === 'split' || viewMode === 'preview-only') && (
                <div className="resume-paper-wrapper">
                  <article className={`resume-paper template-${activeTemplate}`} aria-label="Resume Document Preview">
                    {/* Header Section */}
                    <header className="ats-header">
                      <div className="ats-header-content">
                        {resume.header.fullName && <h1 className="ats-name">{resume.header.fullName}</h1>}
                        {resume.header.targetRole && (
                          <div className="ats-target-role">{resume.header.targetRole}</div>
                        )}
                        <div className="ats-contact-bar">
                          {resume.header.email && <span>{resume.header.email}</span>}
                          {resume.header.phone && <span>{resume.header.phone}</span>}
                          {resume.header.college && <span>{resume.header.college}</span>}
                          {resume.header.location && <span>{resume.header.location}</span>}
                          {resume.header.githubUrl && (
                            <span>
                              <a href={resume.header.githubUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                                GitHub
                              </a>
                            </span>
                          )}
                          {resume.header.portfolioUrl && (
                            <span>
                              <a href={resume.header.portfolioUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                                Portfolio
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                    </header>

                    {/* 1. Professional Summary */}
                    {resume.summary.text && (
                      <section className="ats-section" aria-labelledby="section-summary">
                        <h2 id="section-summary" className="ats-section-title">Professional Summary</h2>
                        <p className="summary-paragraph">{resume.summary.text}</p>
                      </section>
                    )}

                    {/* 2. Technical Skills */}
                    {Object.keys(resume.skills || {}).length > 0 && (
                      <section className="ats-section" aria-labelledby="section-skills">
                        <h2 id="section-skills" className="ats-section-title">Technical Skills</h2>
                        <div className="skills-grid-display">
                          {Object.entries(resume.skills).map(([category, list]) => (
                            <div className="skill-cat-row" key={category}>
                              <strong className="skill-cat-name">{category}:</strong>
                              <span className="skill-cat-list">
                                {list.map((s, idx) => (
                                  <span key={s.name || idx} className="skill-tag">
                                    {s.name} <span className="skill-level-badge">({s.level})</span>
                                    {idx < list.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 3. Education */}
                    {(resume.education.department || resume.education.college || resume.education.cgpa) && (
                      <section className="ats-section" aria-labelledby="section-education">
                        <h2 id="section-education" className="ats-section-title">Education</h2>
                        <div className="resume-entry">
                          <div className="entry-topline">
                            <h3 className="entry-title">
                              {resume.education.department || 'Degree Program'}
                            </h3>
                            <span className="entry-date">
                              {resume.education.graduationYear
                                ? `Graduation: ${resume.education.graduationYear}`
                                : resume.education.currentYear
                                ? `Year ${resume.education.currentYear}${resume.education.currentSemester ? `, Sem ${resume.education.currentSemester}` : ''}`
                                : ''}
                            </span>
                          </div>
                          <div className="edu-item">
                            <span className="entry-subtitle">{resume.education.college}</span>
                            {resume.education.cgpa && (
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                                CGPA: {resume.education.cgpa}
                              </span>
                            )}
                          </div>
                          {resume.education.registerNumber && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              Reg No: {resume.education.registerNumber}
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {/* 4. Projects */}
                    {resume.projects.length > 0 && (
                      <section className="ats-section" aria-labelledby="section-projects">
                        <h2 id="section-projects" className="ats-section-title">Projects</h2>
                        {resume.projects.map((proj, idx) => (
                          <div className="resume-entry" key={proj.id || idx}>
                            <div className="entry-topline">
                              <h3 className="entry-title">
                                {proj.title}
                                {proj.role && <span style={{ fontWeight: 500, color: '#475569' }}> &mdash; {proj.role}</span>}
                              </h3>
                              {proj.dateRange && <span className="entry-date">{proj.dateRange}</span>}
                            </div>

                            {proj.techString && (
                              <div className="entry-tech">
                                <strong>Technologies:</strong> {proj.techString}
                              </div>
                            )}

                            {proj.bullets.length > 0 && (
                              <ul className="entry-bullets">
                                {proj.bullets.map((bullet, bIdx) => (
                                  <li key={bIdx}>{bullet}</li>
                                ))}
                              </ul>
                            )}

                            {(proj.githubUrl || proj.projectUrl) && (
                              <div style={{ fontSize: '0.8rem', marginTop: '4px', display: 'flex', gap: '12px' }}>
                                {proj.githubUrl && (
                                  <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                                    Source Code <ExternalLinkIcon />
                                  </a>
                                )}
                                {proj.projectUrl && (
                                  <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                                    Live Demo <ExternalLinkIcon />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    )}

                    {/* 5. Experience / Internships */}
                    {resume.experience.length > 0 && (
                      <section className="ats-section" aria-labelledby="section-experience">
                        <h2 id="section-experience" className="ats-section-title">Work & Internship Experience</h2>
                        {resume.experience.map((exp, idx) => (
                          <div className="resume-entry" key={exp.id || idx}>
                            <div className="entry-topline">
                              <h3 className="entry-title">
                                {exp.role} &mdash; <span className="entry-subtitle">{exp.organization}</span>
                              </h3>
                              {exp.dateRange && <span className="entry-date">{exp.dateRange}</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                              Type: {exp.experienceType}
                              {exp.skillsUsed && exp.skillsUsed.length > 0 && ` | Skills: ${exp.skillsUsed.join(', ')}`}
                            </div>

                            {exp.bullets.length > 0 && (
                              <ul className="entry-bullets">
                                {exp.bullets.map((bullet, bIdx) => (
                                  <li key={bIdx}>{bullet}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </section>
                    )}

                    {/* 6. Certifications */}
                    {resume.certifications.length > 0 && (
                      <section className="ats-section" aria-labelledby="section-certifications">
                        <h2 id="section-certifications" className="ats-section-title">Certifications</h2>
                        {resume.certifications.map((cert, idx) => (
                          <div className="resume-entry" key={cert.id || idx}>
                            <div className="entry-topline">
                              <h3 className="entry-title">{cert.name}</h3>
                              {cert.issueDate && <span className="entry-date">{cert.issueDate}</span>}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                              {cert.issuingOrg}
                              {cert.credentialId && ` | Credential ID: ${cert.credentialId}`}
                              {cert.credentialUrl && (
                                <>
                                  {' | '}
                                  <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                                    Verify
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </section>
                    )}

                    {/* 7. Assessment Highlights */}
                    {((resume.assessmentHighlights && resume.assessmentHighlights.length > 0) || resume.latestQuiz) && (
                      <section className="ats-section" aria-labelledby="section-assessments">
                        <h2 id="section-assessments" className="ats-section-title">Assessment & Benchmark Highlights</h2>
                        {resume.assessmentHighlights && resume.assessmentHighlights.length > 0 && (
                          <ul className="entry-bullets" style={{ marginTop: '4px' }}>
                            {resume.assessmentHighlights.map((topic, idx) => (
                              <li key={idx}>
                                <strong>{topic.topic}</strong> &mdash; Verified Score: {topic.percentage}%
                              </li>
                            ))}
                          </ul>
                        )}
                        {resume.latestQuiz && (
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '6px' }}>
                            Recent Technical Benchmark: <strong>{resume.latestQuiz.title}</strong> ({resume.latestQuiz.percentage}% accuracy)
                          </div>
                        )}
                      </section>
                    )}
                  </article>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
