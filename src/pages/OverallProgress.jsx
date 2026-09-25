import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { readStorage } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import {
  resolveCareerContext,
  normalizeText,
  normalizeSkillName,
  DOMAIN_EVIDENCE_KEYWORDS,
} from '../utils/careerContext'
import { fetchStudentSkills } from '../services/skillService'

// Centralized Career Skill Requirements Specification (Aligned with CareerRoadmap)
const careerSkillRequirements = {
  'Front-End Developer': [
    { name: 'HTML5 & Semantic Structure', aliases: ['html', 'html5', 'semantic html'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 1, description: 'Semantic markup, accessibility tags, and clean DOM structure.' },
    { name: 'Modern CSS & Responsive Layouts', aliases: ['css', 'css3', 'flexbox', 'grid', 'tailwind'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 2, description: 'Flexbox, CSS Grid systems, media queries, and mobile-first design.' },
    { name: 'Git & Version Control', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 3, description: 'Branching, staging, committing, and remote GitHub synchronization.' },
    { name: 'JavaScript (ES6+)', aliases: ['javascript', 'js', 'es6'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 4, description: 'Closures, prototypes, array methods, async programming, and DOM APIs.' },
    { name: 'Asynchronous JS & REST APIs', aliases: ['rest api', 'fetch', 'async javascript', 'apis'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 5, description: 'Promises, async/await, HTTP error handling, and JSON data parsing.' },
    { name: 'Frontend Framework (React / Vue)', aliases: ['react', 'react.js', 'reactjs', 'vue', 'next.js'], requiredLevel: 'Advanced', stage: 'Advanced Skills', stageNumber: 3, priority: 6, description: 'Component architecture, state management, custom hooks, and lifecycles.' },
    { name: 'Frontend Performance & UI Architecture', aliases: ['ui/ux', 'web performance', 'accessibility', 'responsive web design'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 7, description: 'Asset optimization, rendering efficiency, and modular UI structure.' },
  ],
  'Full-Stack Developer': [
    { name: 'Web Fundamentals (HTML & CSS)', aliases: ['html', 'css', 'html/css', 'html5'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 1, description: 'Semantic markup, layout styling, and cross-browser responsiveness.' },
    { name: 'Git & Branching Workflows', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 2, description: 'Branch management, pull requests, merge conflict resolution, and PR reviews.' },
    { name: 'JavaScript / TypeScript for Full-Stack', aliases: ['javascript', 'typescript', 'js', 'ts'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 3, description: 'Asynchronous control flow, type systems, functional array methods, and Node syntax.' },
    { name: 'SQL & Database Design', aliases: ['sql', 'postgresql', 'mysql', 'database'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 4, description: 'Relational schema modeling, multi-table joins, primary/foreign keys, and transactions.' },
    { name: 'Backend Framework & APIs (Node / Express)', aliases: ['node', 'node.js', 'express', 'express.js', 'fastapi'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 5, description: 'RESTful API routing, middleware controllers, authentication, and database connectors.' },
    { name: 'Frontend Framework (React / Next.js)', aliases: ['react', 'react.js', 'next.js', 'frontend'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 6, description: 'Client-server integration, interactive UI state, and API consumption.' },
    { name: 'Database Indexing & Security (RLS)', aliases: ['database design', 'indexing', 'transactions', 'security', 'rls'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 7, description: 'Query execution plans, composite indexes, role-based access security, and RLS.' },
  ],
  'Python Developer': [
    { name: 'Python Core Syntax & Data Structures', aliases: ['python', 'python3', 'core python'], requiredLevel: 'Advanced', stage: 'Foundation', stageNumber: 1, priority: 1, description: 'Data structures, list comprehensions, generators, and standard libraries.' },
    { name: 'Git Version Control & Documentation', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 2, description: 'Repository management, commit hygiene, docstrings, and README documentation.' },
    { name: 'Object-Oriented Programming (OOP)', aliases: ['oop', 'object-oriented programming', 'classes'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 3, description: 'Encapsulation, inheritance, polymorphism, abstract classes, and dunder methods.' },
    { name: 'SQL & Database Adapters', aliases: ['sql', 'postgresql', 'sqlite', 'mysql', 'database'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 4, description: 'Database connectivity, ORMs, parameterized queries, and schema migration.' },
    { name: 'Data Structures & Algorithms (DSA)', aliases: ['dsa', 'data structures', 'algorithms'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 5, description: 'Time/space complexity (Big-O), search/sort algorithms, trees, and hash tables.' },
    { name: 'Python Web Framework (Django / FastAPI / Flask)', aliases: ['django', 'fastapi', 'flask', 'python web'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 6, description: 'API routes, dependency injection, Pydantic validation, and service architecture.' },
    { name: 'Software Testing & Automation', aliases: ['testing', 'pytest', 'unittest', 'automation'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 7, description: 'Automated test suites with pytest, mocking, test coverage, and scripting.' },
  ],
  'Data Analyst': [
    { name: 'Spreadsheets & Data Organization (Excel)', aliases: ['excel', 'spreadsheets', 'advanced excel', 'pivot tables'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 1, description: 'VLOOKUP/XLOOKUP, Pivot tables, data formatting, and statistical formulas.' },
    { name: 'Git & Reproducible Analysis', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 2, description: 'Version control for analysis notebooks, SQL scripts, and data pipelines.' },
    { name: 'SQL for Data Analysis', aliases: ['sql', 'postgresql', 'mysql', 'database', 'data queries'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 3, description: 'Window functions, CTEs, aggregation grouping, and analytical joins.' },
    { name: 'Python for Data Analysis (Pandas & NumPy)', aliases: ['python', 'pandas', 'numpy'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 4, description: 'DataFrame wrangling, vectorization, missing value imputation, and series operations.' },
    { name: 'Applied Statistics & Quantitative Logic', aliases: ['statistics', 'applied statistics', 'probability', 'stats'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 5, description: 'Hypothesis testing, distributions, correlation vs causation, and A/B fundamentals.' },
    { name: 'Data Visualization & BI Dashboards', aliases: ['power bi', 'tableau', 'data visualization', 'matplotlib'], requiredLevel: 'Advanced', stage: 'Advanced Skills', stageNumber: 3, priority: 6, description: 'Interactive dashboard creation, KPI visual hierarchy, Power BI / Tableau.' },
    { name: 'Exploratory Data Analysis (EDA)', aliases: ['eda', 'exploratory data analysis', 'analytics'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 7, description: 'Pattern discovery, outlier detection, data storytelling, and business insights.' },
  ],
  'Software Developer': [
    { name: 'Core Programming (Python / Java / C++ / JS)', aliases: ['python', 'java', 'c++', 'javascript', 'c'], requiredLevel: 'Advanced', stage: 'Foundation', stageNumber: 1, priority: 1, description: 'Control flow, procedural and functional logic, memory models, and standard libraries.' },
    { name: 'Git & Command Line Workflow', aliases: ['git', 'github', 'cli', 'version control'], requiredLevel: 'Intermediate', stage: 'Foundation', stageNumber: 1, priority: 2, description: 'Branch management, pull requests, CLI commands, and build scripts.' },
    { name: 'Object-Oriented Programming (OOP)', aliases: ['oop', 'object-oriented programming', 'classes'], requiredLevel: 'Intermediate', stage: 'Core Skills', stageNumber: 2, priority: 3, description: 'Design patterns, class inheritance, interfaces, modular design, and SOLID principles.' },
    { name: 'SQL & Relational Database Queries', aliases: ['sql', 'relational database', 'database', 'mysql', 'postgresql'], requiredLevel: 'Advanced', stage: 'Core Skills', stageNumber: 2, priority: 4, description: 'CRUD queries, joins, constraints, relational normalization, and transactions.' },
    { name: 'Data Structures & Algorithms (DSA)', aliases: ['dsa', 'data structures', 'algorithms'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 5, description: 'Algorithm complexity, arrays, linked lists, stacks, queues, trees, and graphs.' },
    { name: 'Software Testing & Clean Architecture', aliases: ['software testing', 'testing', 'unit testing', 'ci/cd'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 6, description: 'Unit test authoring, test-driven development, refactoring, and clean code.' },
    { name: 'Problem Solving & System Logic', aliases: ['problem solving', 'system design', 'computer science'], requiredLevel: 'Intermediate', stage: 'Advanced Skills', stageNumber: 3, priority: 7, description: 'System modeling, API integration, debugging logic, and concurrent execution.' },
  ],
}

// Level Weights and String Helpers
const LEVEL_WEIGHTS = {
  'Not Found': 0,
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
}

function normalizeLevel(proficiencyOrLevel) {
  if (!proficiencyOrLevel) return 'Beginner'
  if (typeof proficiencyOrLevel === 'number') {
    if (proficiencyOrLevel >= 3) return 'Advanced'
    if (proficiencyOrLevel === 2) return 'Intermediate'
    return 'Beginner'
  }
  const str = String(proficiencyOrLevel).trim().toLowerCase()
  if (str === '3' || str === 'advanced' || str === 'expert') return 'Advanced'
  if (str === '2' || str === 'intermediate' || str === 'medium') return 'Intermediate'
  return 'Beginner'
}

function getStudentSkillLevel(studentSkills, skillReq) {
  if (!studentSkills || studentSkills.length === 0) return 'Not Found'
  const targetAliases = [skillReq.name, ...(skillReq.aliases || [])].map(normalizeSkillName)

  const match = studentSkills.find((s) => {
    const sName = normalizeSkillName(s.name || s.skill_name)
    if (!sName) return false
    return targetAliases.some((alias) => sName === alias || sName.includes(alias) || alias.includes(sName))
  })

  if (!match) return 'Not Found'
  return normalizeLevel(match.level || match.proficiency)
}

function compareSkillLevel(currentLevel, requiredLevel) {
  const currentWeight = LEVEL_WEIGHTS[currentLevel] || 0
  const requiredWeight = LEVEL_WEIGHTS[requiredLevel] || 2

  if (currentWeight === 0) return 'Learn'
  if (currentWeight < requiredWeight) return 'Improve'
  return 'Completed'
}

function evaluateSkillGaps(studentSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return []

  return requiredSkills.map((req) => {
    const currentLevel = getStudentSkillLevel(studentSkills, req)
    const gapStatus = compareSkillLevel(currentLevel, req.requiredLevel)

    return {
      skillName: req.name,
      currentLevel,
      requiredLevel: req.requiredLevel,
      gapStatus,
      stage: req.stage,
      stageNumber: req.stageNumber || 1,
      priority: req.priority,
      description: req.description,
      actionLink: '/academic-profile?tab=skills',
    }
  })
}

// Functional SVG Icons
function CheckCircleIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ClockIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function LockIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function ArrowRightIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function CompassIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function TargetIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronUpIcon({ className = 'progress-icon' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function OverallProgress() {
  const { careerContext: sharedCareerContext } = useAuth()
  const [data, setData] = useState({
    profile: {},
    skills: [],
    certificates: [],
    projects: [],
    experiences: [],
    attempts: [],
    topicPerformance: [],
    hasEnoughData: false,
    loading: true,
  })

  // TASK 2 Interactive State
  // activeStatusFilter: 'all' | 'Completed' | 'In Progress' | 'Pending'
  const [activeStatusFilter, setActiveStatusFilter] = useState('all')

  // activeSkillGapFilter: null | 'completed' | 'improve' | 'learn'
  const [activeSkillGapFilter, setActiveSkillGapFilter] = useState(null)

  // Load authenticated student data from Supabase with localStorage fallback
  const loadStudentData = useCallback(async () => {
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
        const evidenceCount = localSkills.length + localProjects.length + localCertificates.length + localExperiences.length + localAttempts.length
        setData({
          profile: localProfile,
          skills: localSkills,
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          attempts: localAttempts,
          topicPerformance: [],
          hasEnoughData: evidenceCount > 0,
          loading: false,
        })
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
        supabase.from('profiles').select('department, target_role, name, college_name, register_number').eq('id', user.id).maybeSingle(),
        fetchStudentSkills(user.id),
        supabase.from('certificates').select('*').eq('student_id', user.id),
        supabase.from('projects').select('*').eq('student_id', user.id),
        supabase.from('experiences').select('*').eq('student_id', user.id),
        supabase.from('quiz_attempts').select('*').eq('student_id', user.id).order('completed_at', { ascending: false }),
        supabase.from('quiz_topic_performance').select('*').eq('student_id', user.id),
      ])

      const profileData = profileRes.data || {}
      const mergedProfile = {
        ...localProfile,
        department: profileData.department || localProfile.department || '',
        target_role: profileData.target_role || localProfile.target_role || '',
        name: profileData.name || localProfile.name || '',
        college_name: profileData.college_name || localProfile.collegeName || '',
        register_number: profileData.register_number || localProfile.registerNumber || '',
      }

      const formattedSkills = Array.isArray(skillsLoaded)
        ? skillsLoaded
        : localSkills

      const formattedCerts = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const formattedProjects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const formattedExperiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const attemptsData = Array.isArray(attemptsRes.data) ? attemptsRes.data : localAttempts

      // Topic performance aggregation
      let topicPerformance = []
      if (topicsRes.data && topicsRes.data.length > 0) {
        const topicTotals = {}
        topicsRes.data.forEach((item) => {
          const key = normalizeText(item.topic)
          if (!key) return
          if (!topicTotals[key]) topicTotals[key] = { topic: item.topic.trim(), correct: 0, total: 0 }
          topicTotals[key].correct += Number(item.correct_answers) || 0
          topicTotals[key].total += Number(item.total_questions) || 0
        })
        topicPerformance = Object.values(topicTotals).map((v) => ({
          ...v,
          percentage: v.total ? Math.round((v.correct / v.total) * 100) : 0,
        }))
      }

      const evidenceCount = formattedSkills.length + formattedProjects.length + formattedCerts.length + formattedExperiences.length + attemptsData.length + (Object.values(mergedProfile).some(Boolean) ? 1 : 0)

      setData({
        profile: mergedProfile,
        skills: formattedSkills,
        certificates: formattedCerts,
        projects: formattedProjects,
        experiences: formattedExperiences,
        attempts: attemptsData,
        topicPerformance,
        hasEnoughData: evidenceCount > 0,
        loading: false,
      })
    } catch (err) {
      console.error('Unexpected error loading overall progress data:', err)
      setData({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        attempts: localAttempts,
        topicPerformance: [],
        hasEnoughData: false,
        loading: false,
      })
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refresh = () => {
      if (isMounted) {
        loadStudentData()
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
  }, [loadStudentData])

  // 1. Resolve Target Career Goal using Unified Resolution System (Priority: 1 -> 2 -> 3 -> 4)
  const localCareerContext = useMemo(() => {
    return resolveCareerContext({
      profile: data.profile,
      skills: data.skills,
      certificates: data.certificates,
      projects: data.projects,
      experiences: data.experiences,
      quizAttempts: data.attempts,
      topicPerformance: data.topicPerformance,
    })
  }, [data])
  const resolvedCareerContext = sharedCareerContext || localCareerContext

  const targetCareer = resolvedCareerContext.track || ''
  const hasSupportedCareerContext = resolvedCareerContext.hasContext

  // 2. Evaluate Skill Gaps for the Selected Career Goal
  const evaluatedGaps = useMemo(() => {
    if (!targetCareer) return []
    const requirements = careerSkillRequirements[targetCareer] || careerSkillRequirements['Software Developer']
    return evaluateSkillGaps(data.skills, requirements)
  }, [targetCareer, data.skills])

  // 3. Skill Gap Categorization & Lists (Completed, Improve, Learn)
  const skillGapGroups = useMemo(() => {
    if (evaluatedGaps.length === 0) {
      return { completed: [], improve: [], learn: [], totalCount: 0 }
    }
    const completed = evaluatedGaps.filter((g) => g.gapStatus === 'Completed')
    const improve = evaluatedGaps.filter((g) => g.gapStatus === 'Improve')
    const learn = evaluatedGaps.filter((g) => g.gapStatus === 'Learn')

    return {
      completed,
      improve,
      learn,
      totalCount: evaluatedGaps.length,
      completedCount: completed.length,
      improveCount: improve.length,
      learnCount: learn.length,
    }
  }, [evaluatedGaps])

  // 4. Deterministic 4-Year Milestone System (12 total milestones)
  const timelineProgress = useMemo(() => {
    const evidenceConfig = DOMAIN_EVIDENCE_KEYWORDS[targetCareer] || DOMAIN_EVIDENCE_KEYWORDS['Software Developer']

    // Helper: Git mastery check
    const gitSkillLevel = (() => {
      const match = data.skills.find((s) => normalizeSkillName(s.name || s.skill_name).includes('git') || normalizeSkillName(s.name || s.skill_name).includes('github'))
      return match ? normalizeLevel(match.level || match.proficiency) : 'Not Found'
    })()
    const gitQuizStrong = data.topicPerformance.some((t) => normalizeText(t.topic).includes('git') && t.percentage >= 70)

    // Stage 1 & 2 skills from gap analysis
    const foundationSkills = evaluatedGaps.filter((g) => g.stage === 'Foundation')
    const coreSkills = evaluatedGaps.filter((g) => g.stage === 'Core Skills')

    // Domain project keyword check
    const hasDomainProject = data.projects.some((p) => {
      const text = `${p.title || ''} ${p.description || ''} ${Array.isArray(p.technologies) ? p.technologies.join(' ') : String(p.technologies || '')}`.toLowerCase()
      return (evidenceConfig.projects || []).some((k) => text.includes(normalizeText(k)))
    })

    // Domain certificate keyword check
    const hasDomainCert = data.certificates.some((c) => {
      const text = `${c.title || c.name || c.certificate_name || ''} ${c.issuer || c.organization || c.issuing_organization || ''}`.toLowerCase()
      return (evidenceConfig.certs || []).some((k) => text.includes(normalizeText(k)))
    })

    // Topic mastery check (at least 1 strong topic >= 70%)
    const hasTopicMastery = data.topicPerformance.some((t) => (t.total >= 2 && t.percentage >= 70) || t.percentage >= 75)
    const hasAnyTopicAttempt = data.topicPerformance.some((t) => t.total >= 1 || t.percentage >= 40)

    // Profile check
    const hasAcademicProfile = Boolean(data.profile?.department || data.profile?.college_name || data.profile?.collegeName || data.profile?.register_number)

    // Build the 4 Years of Milestones (3 per year = 12 milestones total)
    const years = [
      {
        yearLabel: '1st Year',
        yearTitle: 'Foundation',
        yearDescription: 'Academic profile setup, foundational syntax, and Git version control discipline.',
        milestones: [
          {
            id: 'y1-m1',
            name: 'Academic Profile Foundation',
            description: 'Document your department, institution, and graduation timeline in your profile.',
            actionLink: '/academic-profile',
            actionLabel: 'Complete Profile',
            status: hasAcademicProfile ? 'Completed' : (Object.values(data.profile).some(Boolean) ? 'In Progress' : 'Pending'),
            evidenceText: hasAcademicProfile ? `Profile saved: ${data.profile.department || data.profile.college_name || 'Academic records'}` : 'Profile information incomplete',
          },
          {
            id: 'y1-m2',
            name: 'Foundational Career Skills',
            description: 'Master the initial required syntax and markup for your career track.',
            actionLink: '/academic-profile?tab=skills',
            actionLabel: 'Add Foundation Skills',
            status: foundationSkills.length > 0 && foundationSkills.every((s) => s.gapStatus === 'Completed')
              ? 'Completed'
              : (foundationSkills.some((s) => s.gapStatus !== 'Learn') || data.skills.length > 0 ? 'In Progress' : 'Pending'),
            evidenceText: `${foundationSkills.filter((s) => s.gapStatus === 'Completed').length} of ${foundationSkills.length} foundation skills verified`,
          },
          {
            id: 'y1-m3',
            name: 'Git & Version Control Discipline',
            description: 'Demonstrate intermediate+ Git proficiency or technical quiz competency.',
            actionLink: '/academic-profile?tab=skills',
            actionLabel: 'Add Git Skill',
            status: ['Intermediate', 'Advanced'].includes(gitSkillLevel) || gitQuizStrong
              ? 'Completed'
              : (gitSkillLevel === 'Beginner' || data.attempts.length > 0 ? 'In Progress' : 'Pending'),
            evidenceText: ['Intermediate', 'Advanced'].includes(gitSkillLevel) ? `Git verified (${gitSkillLevel})` : (gitQuizStrong ? 'Git quiz topic passed' : 'No Git skill or quiz recorded'),
          },
        ],
      },
      {
        yearLabel: '2nd Year',
        yearTitle: 'Skill Development',
        yearDescription: 'Core programming logic, relational SQL database queries, and weekly assessments.',
        milestones: [
          {
            id: 'y2-m1',
            name: 'Core Career Skills & SQL Modeling',
            description: 'Meet required levels for core language logic and relational SQL queries.',
            actionLink: '/academic-profile?tab=skills',
            actionLabel: 'Level Up Core Skills',
            status: coreSkills.length > 0 && coreSkills.every((s) => s.gapStatus === 'Completed')
              ? 'Completed'
              : (coreSkills.some((s) => s.gapStatus !== 'Learn') || data.skills.length >= 2 ? 'In Progress' : 'Pending'),
            evidenceText: `${coreSkills.filter((s) => s.gapStatus === 'Completed').length} of ${coreSkills.length} core skills verified`,
          },
          {
            id: 'y2-m2',
            name: 'Weekly Quiz Participation',
            description: 'Complete at least 2 technical assessments to validate continuous growth.',
            actionLink: '/weekly-quiz',
            actionLabel: 'Take Weekly Quiz',
            status: data.attempts.length >= 2 ? 'Completed' : (data.attempts.length === 1 ? 'In Progress' : 'Pending'),
            evidenceText: `${data.attempts.length} weekly quiz attempt(s) completed`,
          },
          {
            id: 'y2-m3',
            name: 'Quiz Topic Mastery',
            description: 'Demonstrate strong accuracy (>=70%) on key technical topics.',
            actionLink: '/weekly-quiz',
            actionLabel: 'Test Knowledge',
            status: hasTopicMastery ? 'Completed' : (hasAnyTopicAttempt ? 'In Progress' : 'Pending'),
            evidenceText: hasTopicMastery ? 'High accuracy achieved on core topics' : (hasAnyTopicAttempt ? 'Assessments recorded below 70%' : 'No topic assessments completed'),
          },
        ],
      },
      {
        yearLabel: '3rd Year',
        yearTitle: 'Projects & Experience',
        yearDescription: 'Practical application repositories, database backends, and verified internships.',
        milestones: [
          {
            id: 'y3-m1',
            name: 'Documented Project Portfolio',
            description: 'Build and record at least 2 functional software or data applications.',
            actionLink: '/academic-profile?tab=projects',
            actionLabel: 'Add Project',
            status: data.projects.length >= 2 ? 'Completed' : (data.projects.length === 1 ? 'In Progress' : 'Pending'),
            evidenceText: `${data.projects.length} project(s) recorded in portfolio`,
          },
          {
            id: 'y3-m2',
            name: 'Practical Domain Evidence',
            description: 'Document at least 1 application with domain-relevant technologies.',
            actionLink: '/academic-profile?tab=projects',
            actionLabel: 'Tag Project Technologies',
            status: hasDomainProject ? 'Completed' : (data.projects.length > 0 ? 'In Progress' : 'Pending'),
            evidenceText: hasDomainProject ? 'Relevant technology stack documented' : (data.projects.length > 0 ? 'General projects recorded' : 'No domain project recorded'),
          },
          {
            id: 'y3-m3',
            name: 'Internships & Technical Workshops',
            description: 'Record verified technical work experience, workshop, or open source contribution.',
            actionLink: '/academic-profile?tab=experience',
            actionLabel: 'Add Experience',
            status: data.experiences.length >= 1 ? 'Completed' : (data.projects.length >= 2 ? 'In Progress' : 'Pending'),
            evidenceText: `${data.experiences.length} practical experience item(s) documented`,
          },
        ],
      },
      {
        yearLabel: '4th Year',
        yearTitle: 'Career Preparation',
        yearDescription: 'Industry credentials, closing skill gaps, ATS resume, and placement readiness.',
        milestones: [
          {
            id: 'y4-m1',
            name: 'Relevant Industry Certification',
            description: 'Earn a verified credential from Google, Meta, AWS, Microsoft, or Python Institute.',
            actionLink: '/academic-profile?tab=certificates',
            actionLabel: 'Add Certificate',
            status: hasDomainCert ? 'Completed' : (data.certificates.length > 0 ? 'In Progress' : 'Pending'),
            evidenceText: `${data.certificates.length} certificate(s) verified in profile`,
          },
          {
            id: 'y4-m2',
            name: 'Skill Gap Closure',
            description: 'Close all remaining Learn and Improve skill gaps for your career track.',
            actionLink: '/career-roadmap',
            actionLabel: 'View Skill Gaps',
            status: evaluatedGaps.length > 0 && evaluatedGaps.every((g) => g.gapStatus === 'Completed')
              ? 'Completed'
              : (skillGapGroups.completedCount > 0 || skillGapGroups.improveCount > 0 ? 'In Progress' : 'Pending'),
            evidenceText: `${skillGapGroups.completedCount} of ${skillGapGroups.totalCount} track skills at required proficiency`,
          },
          {
            id: 'y4-m3',
            name: 'Placement & ATS Resume Readiness',
            description: 'Verified academic profile + project portfolio + technical quiz track record.',
            actionLink: '/resume-builder',
            actionLabel: 'Build ATS Resume',
            status: hasAcademicProfile && data.projects.length >= 1 && data.skills.length >= 2 && data.attempts.length >= 2
              ? 'Completed'
              : (hasAcademicProfile || data.projects.length > 0 || data.skills.length > 0 ? 'In Progress' : 'Pending'),
            evidenceText: hasAcademicProfile && data.projects.length >= 1 ? 'Ready for placement generation' : 'Pending profile and portfolio depth',
          },
        ],
      },
    ]

    // Calculate completion per year and overall
    let totalMilestones = 0
    let completedMilestones = 0
    let inProgressMilestones = 0
    let pendingMilestones = 0
    const allFlatMilestones = []
    let firstIncompleteMilestone = null

    const evaluatedYears = years.map((year) => {
      let yearCompleted = 0
      let yearInProgress = 0
      let yearPending = 0

      year.milestones.forEach((m) => {
        totalMilestones += 1
        const enriched = {
          ...m,
          yearLabel: year.yearLabel,
          yearTitle: year.yearTitle,
        }
        allFlatMilestones.push(enriched)

        if (m.status === 'Completed') {
          completedMilestones += 1
          yearCompleted += 1
        } else if (m.status === 'In Progress') {
          inProgressMilestones += 1
          yearInProgress += 1
        } else {
          pendingMilestones += 1
          yearPending += 1
        }

        if (!firstIncompleteMilestone && m.status !== 'Completed') {
          firstIncompleteMilestone = enriched
        }
      })

      const yearProgressPct = Math.round(((yearCompleted * 1.0 + yearInProgress * 0.5) / year.milestones.length) * 100)
      const yearStatus = yearCompleted === year.milestones.length
        ? 'Completed'
        : (yearCompleted > 0 || yearInProgress > 0 ? 'In Progress' : 'Pending')

      return {
        ...year,
        completedCount: yearCompleted,
        inProgressCount: yearInProgress,
        pendingCount: yearPending,
        totalCount: year.milestones.length,
        progressPct: yearProgressPct,
        status: yearStatus,
      }
    })

    // Overall Progress % Formula: round((completed * 1.0 + inProgress * 0.5) / total * 100)
    const overallPercentage = totalMilestones > 0
      ? Math.round(((completedMilestones * 1.0 + inProgressMilestones * 0.5) / totalMilestones) * 100)
      : 0

    // Active progress stage determination
    const activeYearObj = evaluatedYears.find((y) => y.status !== 'Completed')
    const currentProgressStage = activeYearObj
      ? `${activeYearObj.yearLabel} — ${activeYearObj.yearTitle}`
      : 'Career Ready'

    // Status label
    const overallStatusLabel = overallPercentage === 100
      ? 'Career Ready'
      : (overallPercentage >= 60 ? 'Well Advanced' : (overallPercentage >= 20 ? 'In Progress' : 'Getting Started'))

    return {
      years: evaluatedYears,
      allFlatMilestones,
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      pendingMilestones,
      overallPercentage,
      currentProgressStage,
      overallStatusLabel,
      nextRecommendedStep: firstIncompleteMilestone,
    }
  }, [targetCareer, evaluatedGaps, skillGapGroups, data])

  // Filtered milestones list when activeStatusFilter is not 'all'
  const filteredMilestones = useMemo(() => {
    if (activeStatusFilter === 'all') return []
    return timelineProgress.allFlatMilestones.filter((m) => m.status === activeStatusFilter)
  }, [activeStatusFilter, timelineProgress.allFlatMilestones])

  // Top metric summary values
  const progressSummary = [
    {
      label: 'Academic Profile',
      value: (data.profile?.department || data.profile?.college_name || data.profile?.collegeName) ? 'Completed' : (Object.values(data.profile).some(Boolean) ? 'In Progress' : 'Not Started'),
      mark: '01',
      route: '/academic-profile',
    },
    {
      label: 'Skills Added',
      value: `${data.skills.length} Saved`,
      mark: '02',
      route: '/academic-profile?tab=skills',
    },
    {
      label: 'Certificates',
      value: `${data.certificates.length} Verified`,
      mark: '03',
      route: '/academic-profile?tab=certificates',
    },
    {
      label: 'Projects',
      value: `${data.projects.length} Documented`,
      mark: '04',
      route: '/academic-profile?tab=projects',
    },
    {
      label: 'Internships',
      value: `${data.experiences.length} Documented`,
      mark: '05',
      route: '/academic-profile?tab=experience',
    },
    {
      label: 'Weekly Quizzes',
      value: data.attempts.length > 0 ? `${data.attempts.length} Attempt(s)` : 'Not Attempted',
      mark: '06',
      route: '/weekly-quiz',
    },
  ]

  if (data.loading) {
    return (
      <main className="progress-page">
        <div className="progress-shell">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px', color: 'var(--text-secondary)' }}>
            <CompassIcon className="roadmap-spin-icon" />
            <p>Loading your four-year career progress milestones...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="progress-page">
      <div className="progress-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        {/* Header */}
        <header className="progress-header">
          <p className="eyebrow">Your journey at a glance</p>
          <h1>Overall Career Progress</h1>
          <p>
            Track your verified milestones, skill development, practical repositories, and credentials across the four-year career readiness roadmap.
          </p>
        </header>

        {/* Unsupported Department / No Context Banner */}
        {!hasSupportedCareerContext && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Career guidance will become available after you add a career goal or more profile data.
            </p>
            <Link to="/academic-profile" className="roadmap-btn roadmap-btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              Set Career Goal
            </Link>
          </div>
        )}

        {/* Top Overview Progress Card */}
        <section className="progress-summary" aria-labelledby="progress-summary-heading">
          <div className="progress-section-heading">
            <div>
              <p className="progress-label">Overall Career Progress</p>
              <h2 id="progress-summary-heading">Milestone Summary</h2>
            </div>
            <span
              className="progress-status"
              style={{
                background: timelineProgress.overallPercentage >= 60 ? 'var(--success-bg)' : 'var(--accent-light)',
                color: timelineProgress.overallPercentage >= 60 ? 'var(--success-color)' : 'var(--accent-primary)',
              }}
            >
              {timelineProgress.overallStatusLabel}
            </span>
          </div>

          {/* Main Progress Metric Bar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Four-Year Career Journey Completion
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
                  <strong style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                    {timelineProgress.overallPercentage}%
                  </strong>
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    {timelineProgress.completedMilestones} of {timelineProgress.totalMilestones} milestones completed
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="roadmap-tag-pill" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                  Goal: {targetCareer} ({resolvedCareerContext.sourceLabel})
                </span>
                <span className="roadmap-stage-badge" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                  Stage: {timelineProgress.currentProgressStage}
                </span>
              </div>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Overall four-year career progress"
              aria-valuenow={timelineProgress.overallPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              style={{ height: '10px' }}
            >
              <div
                className="progress-fill"
                style={{ width: `${timelineProgress.overallPercentage}%` }}
              />
            </div>

            {/* TASK 2: Interactive Category Filter Buttons */}
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>
                Filter Category:
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter('all')
                  setActiveSkillGapFilter(null)
                }}
                className={`roadmap-btn ${activeStatusFilter === 'all' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px' }}
              >
                All Milestones ({timelineProgress.totalMilestones})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter(activeStatusFilter === 'Completed' ? 'all' : 'Completed')
                  setActiveSkillGapFilter(activeStatusFilter === 'Completed' ? null : 'completed')
                }}
                className={`roadmap-btn ${activeStatusFilter === 'Completed' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  borderColor: activeStatusFilter === 'Completed' ? 'var(--success-color)' : 'rgba(16, 185, 129, 0.3)',
                  color: activeStatusFilter === 'Completed' ? '#fff' : 'var(--success-color)',
                  background: activeStatusFilter === 'Completed' ? 'var(--success-color)' : 'rgba(16, 185, 129, 0.08)',
                }}
              >
                <CheckCircleIcon /> Complete ({timelineProgress.completedMilestones})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter(activeStatusFilter === 'In Progress' ? 'all' : 'In Progress')
                  setActiveSkillGapFilter(null)
                }}
                className={`roadmap-btn ${activeStatusFilter === 'In Progress' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  borderColor: activeStatusFilter === 'In Progress' ? 'var(--warning-color)' : 'rgba(245, 158, 11, 0.3)',
                  color: activeStatusFilter === 'In Progress' ? '#fff' : 'var(--warning-color)',
                  background: activeStatusFilter === 'In Progress' ? 'var(--warning-color)' : 'rgba(245, 158, 11, 0.08)',
                }}
              >
                <ClockIcon /> In Progress ({timelineProgress.inProgressMilestones})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter(activeStatusFilter === 'Pending' ? 'all' : 'Pending')
                  setActiveSkillGapFilter(null)
                }}
                className={`roadmap-btn ${activeStatusFilter === 'Pending' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  borderColor: activeStatusFilter === 'Pending' ? 'var(--text-muted)' : 'var(--border-color)',
                  color: activeStatusFilter === 'Pending' ? '#fff' : 'var(--text-secondary)',
                  background: activeStatusFilter === 'Pending' ? 'var(--text-secondary)' : 'var(--bg-elevated)',
                }}
              >
                <LockIcon /> Pending ({timelineProgress.pendingMilestones})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter(activeStatusFilter === 'Improve' ? 'all' : 'Improve')
                  setActiveSkillGapFilter(activeStatusFilter === 'Improve' ? null : 'improve')
                }}
                className={`roadmap-btn ${activeStatusFilter === 'Improve' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  borderColor: activeStatusFilter === 'Improve' ? 'var(--warning-color)' : 'rgba(245, 158, 11, 0.4)',
                  color: activeStatusFilter === 'Improve' ? '#fff' : 'var(--warning-color)',
                  background: activeStatusFilter === 'Improve' ? 'var(--warning-color)' : 'rgba(245, 158, 11, 0.1)',
                }}
              >
                <ClockIcon /> Improve ({skillGapGroups.improveCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter(activeStatusFilter === 'Learn' ? 'all' : 'Learn')
                  setActiveSkillGapFilter(activeStatusFilter === 'Learn' ? null : 'learn')
                }}
                className={`roadmap-btn ${activeStatusFilter === 'Learn' ? 'roadmap-btn-primary' : 'roadmap-btn-secondary'}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  borderColor: activeStatusFilter === 'Learn' ? 'var(--accent-primary)' : 'var(--border-color)',
                  color: activeStatusFilter === 'Learn' ? '#fff' : 'var(--accent-primary)',
                  background: activeStatusFilter === 'Learn' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                }}
              >
                <TargetIcon /> Learn ({skillGapGroups.learnCount})
              </button>
            </div>
          </div>

          {/* 6 Metric Summary Cards */}
          <div className="progress-summary-grid">
            {progressSummary.map((item) => (
              <Link
                to={item.route}
                className="progress-summary-card"
                key={item.label}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="progress-card-mark" aria-hidden="true">{item.mark}</span>
                <div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* TASK 2: Interactive Career Skill Progress & Actionable Gap Panels */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '22px 24px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Interactive Skill Progress
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                Skill Gap Status for {targetCareer}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Click any category below to view specific skills, required levels, and direct improvement actions.
              </p>
            </div>
            <Link to="/career-roadmap" className="roadmap-item-btn">
              <span>View Full Skill Roadmap</span>
              <ArrowRightIcon />
            </Link>
          </div>

          {/* 3 Clickable Skill Gap Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* 1. Completed Skills Card */}
            <button
              type="button"
              onClick={() => {
                const next = (activeStatusFilter === 'Completed' && activeSkillGapFilter === 'completed') ? 'all' : 'Completed'
                setActiveStatusFilter(next)
                setActiveSkillGapFilter(next === 'Completed' ? 'completed' : null)
              }}
              style={{
                background: (activeStatusFilter === 'Completed' || activeSkillGapFilter === 'completed') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.05)',
                border: (activeStatusFilter === 'Completed' || activeSkillGapFilter === 'completed') ? '2px solid var(--success-color)' : '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              aria-expanded={activeStatusFilter === 'Completed' || activeSkillGapFilter === 'completed'}
            >
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>Complete (Skills & Milestones)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success-color)' }}>
                  {skillGapGroups.completedCount} Verified Skills
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  {activeStatusFilter === 'Completed' ? 'Click to collapse details' : 'Click to view completed evidence'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <CheckCircleIcon className="roadmap-icon-completed" />
                {(activeStatusFilter === 'Completed' || activeSkillGapFilter === 'completed') ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            </button>

            {/* 2. Skills to Improve Card */}
            <button
              type="button"
              onClick={() => {
                const next = (activeStatusFilter === 'Improve' && activeSkillGapFilter === 'improve') ? 'all' : 'Improve'
                setActiveStatusFilter(next)
                setActiveSkillGapFilter(next === 'Improve' ? 'improve' : null)
              }}
              style={{
                background: (activeStatusFilter === 'Improve' || activeSkillGapFilter === 'improve') ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.05)',
                border: (activeStatusFilter === 'Improve' || activeSkillGapFilter === 'improve') ? '2px solid var(--warning-color)' : '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              aria-expanded={activeStatusFilter === 'Improve' || activeSkillGapFilter === 'improve'}
            >
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>Improve (Needs Level Up)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning-color)' }}>
                  {skillGapGroups.improveCount} Skills to Level Up
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  {activeStatusFilter === 'Improve' ? 'Click to collapse details' : 'Click to view improve actions'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <ClockIcon className="roadmap-icon-progress" />
                {(activeStatusFilter === 'Improve' || activeSkillGapFilter === 'improve') ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            </button>

            {/* 3. Skills to Learn Card */}
            <button
              type="button"
              onClick={() => {
                const next = (activeStatusFilter === 'Learn' && activeSkillGapFilter === 'learn') ? 'all' : 'Learn'
                setActiveStatusFilter(next)
                setActiveSkillGapFilter(next === 'Learn' ? 'learn' : null)
              }}
              style={{
                background: (activeStatusFilter === 'Learn' || activeSkillGapFilter === 'learn') ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-elevated)',
                border: (activeStatusFilter === 'Learn' || activeSkillGapFilter === 'learn') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              aria-expanded={activeStatusFilter === 'Learn' || activeSkillGapFilter === 'learn'}
            >
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>Learn (Missing Required)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {skillGapGroups.learnCount} Missing Skills
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  {activeStatusFilter === 'Learn' ? 'Click to collapse details' : 'Click to view missing skills'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <TargetIcon />
                {(activeStatusFilter === 'Learn' || activeSkillGapFilter === 'learn') ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            </button>
          </div>

          {/* TASK 2: Expandable Detail Panel for Improve / Learn / Completed skill categories */}
          {(activeSkillGapFilter || activeStatusFilter === 'Improve' || activeStatusFilter === 'Learn') && (
            <div style={{ marginTop: '18px', padding: '18px 20px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {(activeSkillGapFilter === 'completed' || activeStatusFilter === 'Completed') && 'Completed Skills Meeting Industry Requirements'}
                  {(activeSkillGapFilter === 'improve' || activeStatusFilter === 'Improve') && 'Skills Below Target Level — Action Plan'}
                  {(activeSkillGapFilter === 'learn' || activeStatusFilter === 'Learn') && 'Missing Core Skills — Priority Learning Plan'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSkillGapFilter(null)
                    if (activeStatusFilter === 'Improve' || activeStatusFilter === 'Learn') setActiveStatusFilter('all')
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}
                >
                  Close panel
                </button>
              </div>

              {(() => {
                const currentCategory = activeStatusFilter === 'Improve' ? 'improve' : (activeStatusFilter === 'Learn' ? 'learn' : (activeSkillGapFilter || 'completed'))
                const items = skillGapGroups[currentCategory] || []

                if (items.length === 0) {
                  return (
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      No skills currently in this category.
                    </p>
                  )
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((gap) => (
                      <div
                        key={gap.skillName}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>{gap.skillName}</strong>
                            <span className="roadmap-stage-badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                              {gap.stage}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {gap.description}
                          </p>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span>Current Level: <strong>{gap.currentLevel}</strong></span>
                            <span>Required Level: <strong>{gap.requiredLevel}</strong></span>
                          </div>
                        </div>

                        <div>
                          {gap.gapStatus === 'Completed' ? (
                            <span className="roadmap-verified-label" style={{ fontSize: '0.82rem' }}>
                              <CheckCircleIcon /> Verified ({gap.currentLevel})
                            </span>
                          ) : gap.gapStatus === 'Improve' ? (
                            <Link to="/academic-profile?tab=skills" className="roadmap-btn roadmap-btn-action" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                              <span>Level up to {gap.requiredLevel}</span>
                              <ArrowRightIcon />
                            </Link>
                          ) : (
                            <Link to="/academic-profile?tab=skills" className="roadmap-btn roadmap-btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                              <span>Add {gap.skillName}</span>
                              <ArrowRightIcon />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </section>

        {/* Next Recommended Step Banner */}
        {timelineProgress.nextRecommendedStep && (
          <section className="roadmap-next-step-card" aria-label="Next recommended milestone step">
            <div className="roadmap-next-step-badge">
              <span>Next Recommended Step &bull; {timelineProgress.nextRecommendedStep.yearLabel}</span>
            </div>
            <div className="roadmap-next-step-content">
              <div className="roadmap-next-step-text">
                <h3>{timelineProgress.nextRecommendedStep.name}</h3>
                <p>{timelineProgress.nextRecommendedStep.description}</p>
              </div>
              <Link to={timelineProgress.nextRecommendedStep.actionLink} className="roadmap-btn roadmap-btn-action">
                <span>{timelineProgress.nextRecommendedStep.actionLabel}</span>
                <ArrowRightIcon />
              </Link>
            </div>
          </section>
        )}

        {/* TASK 2: Filtered Milestones Panel (when Complete, In Progress, or Pending is active) */}
        {(activeStatusFilter === 'Completed' || activeStatusFilter === 'In Progress' || activeStatusFilter === 'Pending') ? (
          <section className="journey-timeline-section" aria-labelledby="filtered-milestones-heading">
            <div className="progress-section-heading">
              <div>
                <p className="progress-label">Active Milestone Filter</p>
                <h2 id="filtered-milestones-heading">
                  {activeStatusFilter === 'Completed' && `Completed Milestones (${filteredMilestones.length})`}
                  {activeStatusFilter === 'In Progress' && `In-Progress Milestones (${filteredMilestones.length})`}
                  {activeStatusFilter === 'Pending' && `Pending Milestones (${filteredMilestones.length})`}
                </h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Showing only milestones currently with status &ldquo;{activeStatusFilter}&rdquo; based on verified student evidence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveStatusFilter('all')
                  setActiveSkillGapFilter(null)
                }}
                className="roadmap-btn roadmap-btn-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                Show All 4 Years
              </button>
            </div>

            {filteredMilestones.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
                  No milestones currently in &ldquo;{activeStatusFilter}&rdquo; status.
                </p>
              </div>
            ) : (
              <div className="roadmap-items-list" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                {filteredMilestones.map((milestone) => {
                  const mStatusClass = milestone.status === 'Completed'
                    ? 'item-completed'
                    : (milestone.status === 'In Progress' ? 'item-in-progress' : 'item-not-started')

                  return (
                    <div key={milestone.id} className={`roadmap-item-row ${mStatusClass}`}>
                      <div className="roadmap-item-icon-col">
                        {milestone.status === 'Completed' && <CheckCircleIcon className="roadmap-icon-completed" />}
                        {milestone.status === 'In Progress' && <ClockIcon className="roadmap-icon-progress" />}
                        {milestone.status === 'Pending' && <LockIcon className="roadmap-icon-locked" />}
                      </div>

                      <div className="roadmap-item-body">
                        <div className="roadmap-item-title-row">
                          <h4>{milestone.name}</h4>
                          <span className="roadmap-stage-badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {milestone.yearLabel} &bull; {milestone.yearTitle}
                          </span>
                          <span className={`roadmap-item-badge badge-${mStatusClass}`}>
                            {milestone.status}
                          </span>
                        </div>
                        <p>{milestone.description}</p>
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                          Evidence: {milestone.evidenceText}
                        </small>
                      </div>

                      <div className="roadmap-item-action-col">
                        {milestone.status !== 'Completed' ? (
                          <Link to={milestone.actionLink} className="roadmap-item-btn">
                            <span>{milestone.actionLabel}</span>
                            <ArrowRightIcon />
                          </Link>
                        ) : (
                          <span className="roadmap-verified-label">
                            <CheckCircleIcon /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : (activeStatusFilter === 'all') ? (
          /* Dynamic Four-Year Career Milestone Timeline (Full View) */
          <section className="journey-timeline-section" aria-labelledby="journey-timeline-heading">
            <div className="progress-section-heading">
              <div>
                <p className="progress-label">Four-Year Milestone Roadmap</p>
                <h2 id="journey-timeline-heading">Career Development Timeline</h2>
              </div>
              <div className="roadmap-legend">
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter('Completed')}
                  className="roadmap-legend-item"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  title="Filter to completed milestones"
                >
                  <CheckCircleIcon className="roadmap-icon-completed" /> Completed ({timelineProgress.completedMilestones})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter('In Progress')}
                  className="roadmap-legend-item"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  title="Filter to in-progress milestones"
                >
                  <ClockIcon className="roadmap-icon-progress" /> In Progress ({timelineProgress.inProgressMilestones})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter('Pending')}
                  className="roadmap-legend-item"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  title="Filter to pending milestones"
                >
                  <LockIcon className="roadmap-icon-locked" /> Pending ({timelineProgress.pendingMilestones})
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {timelineProgress.years.map((year, yearIdx) => {
                const statusPillClass = year.status === 'Completed'
                  ? 'badge-item-completed'
                  : (year.status === 'In Progress' ? 'badge-item-in-progress' : 'badge-item-not-started')

                return (
                  <article
                    key={year.yearLabel}
                    className="roadmap-stage-card"
                    style={{
                      borderLeft: year.status === 'Completed' ? '4px solid var(--success-color)' : (year.status === 'In Progress' ? '4px solid var(--warning-color)' : '4px solid var(--border-color)'),
                    }}
                  >
                    {/* Year Header */}
                    <div className="roadmap-stage-header">
                      <div className="roadmap-stage-title-wrap">
                        <span className="roadmap-stage-num-mark">0{yearIdx + 1}</span>
                        <div>
                          <h3>{year.yearLabel} &mdash; {year.yearTitle}</h3>
                          <p>{year.yearDescription}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {year.completedCount}/{year.totalCount} completed ({year.progressPct}%)
                        </span>
                        <span className={`roadmap-item-badge ${statusPillClass}`}>
                          {year.status}
                        </span>
                      </div>
                    </div>

                    {/* Year Milestones List */}
                    <div className="roadmap-items-list">
                      {year.milestones.map((milestone) => {
                        const mStatusClass = milestone.status === 'Completed'
                          ? 'item-completed'
                          : (milestone.status === 'In Progress' ? 'item-in-progress' : 'item-not-started')

                        return (
                          <div key={milestone.id} className={`roadmap-item-row ${mStatusClass}`}>
                            {/* Left Icon */}
                            <div className="roadmap-item-icon-col">
                              {milestone.status === 'Completed' && <CheckCircleIcon className="roadmap-icon-completed" />}
                              {milestone.status === 'In Progress' && <ClockIcon className="roadmap-icon-progress" />}
                              {milestone.status === 'Pending' && <LockIcon className="roadmap-icon-locked" />}
                            </div>

                            {/* Center Body */}
                            <div className="roadmap-item-body">
                              <div className="roadmap-item-title-row">
                                <h4>{milestone.name}</h4>
                                <span className={`roadmap-item-badge badge-${mStatusClass}`}>
                                  {milestone.status}
                                </span>
                              </div>
                              <p>{milestone.description}</p>
                            </div>

                            {/* Right Action */}
                            <div className="roadmap-item-action-col">
                              {milestone.status !== 'Completed' ? (
                                <Link to={milestone.actionLink} className="roadmap-item-btn">
                                  <span>{milestone.actionLabel}</span>
                                  <ArrowRightIcon />
                                </Link>
                              ) : (
                                <span className="roadmap-verified-label">
                                  <CheckCircleIcon /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default OverallProgress