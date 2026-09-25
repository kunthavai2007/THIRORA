import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { readStorage } from '../utils/storage'
import {
  resolveCareerContext,
} from '../utils/careerContext'
import { fetchStudentSkills } from '../services/skillService'

// Clean string for technical skill comparison: lowercase, trim, remove non-alphanumerics
function cleanSkill(str) {
  if (!str || typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

// Known Technical Equivalences & Aliases
const TECHNICAL_EQUIVALENCES = [
  ['javascript', 'js', 'es6', 'ecmascript'],
  ['typescript', 'ts'],
  ['react', 'reactjs', 'react.js', 'react js'],
  ['node', 'nodejs', 'node.js', 'node js'],
  ['postgresql', 'postgres', 'psql'],
  ['mongodb', 'mongo'],
  ['python', 'python3', 'python 3'],
  ['css', 'css3'],
  ['html', 'html5'],
  ['dsa', 'datastructures', 'algorithms', 'datastructuresandalgorithms', 'datastructuresalgorithms'],
  ['oop', 'objectorientedprogramming', 'objectoriented'],
  ['powerbi', 'power bi'],
  ['restapi', 'restapis', 'rest', 'apis', 'api', 'restfulapi'],
]

// Skill Alias & Equivalence Matching
function isSkillMatching(candidateName, targetName, aliases = []) {
  const normCandidate = cleanSkill(candidateName)
  if (!normCandidate) return false

  const allTargets = [targetName, ...(aliases || [])].map(cleanSkill).filter(Boolean)

  // 1. Direct equality after normalization
  if (allTargets.includes(normCandidate)) return true

  // 2. Check equivalence sets
  for (const group of TECHNICAL_EQUIVALENCES) {
    const cleanGroup = group.map(cleanSkill)
    if (cleanGroup.includes(normCandidate)) {
      if (allTargets.some((t) => cleanGroup.includes(t))) {
        return true
      }
    }
  }

  // 3. Substring matching for compound names (>= 3 characters)
  for (const t of allTargets) {
    if (t.length >= 3 && normCandidate.length >= 3) {
      if (normCandidate.includes(t) || t.includes(normCandidate)) {
        return true
      }
    }
  }

  return false
}

// THIRORA Proficiency Level Mapping: 1 = Beginner, 2 = Intermediate, 3 = Advanced
const PROFICIENCY_VALUES = {
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
}

function parseProficiency(val) {
  if (val === null || val === undefined) return 1
  if (typeof val === 'number') {
    if (val >= 3) return 3
    if (val === 2) return 2
    return 1
  }
  const s = String(val).trim().toLowerCase()
  if (s === '3' || s === 'advanced' || s === 'expert' || s === 'senior') return 3
  if (s === '2' || s === 'intermediate' || s === 'mid' || s === 'medium') return 2
  return 1
}

function getProficiencyLabel(num) {
  if (num >= 3) return 'Advanced'
  if (num === 2) return 'Intermediate'
  return 'Beginner'
}

// Curated Industry Job Requirement Profiles (Standard Technical Benchmarks, No Fake Vacancies)
const JOB_REQUIREMENT_PROFILES = [
  // 1. Front-End Developer Profiles
  {
    id: 'fe-junior-engineer',
    role: 'Front-End Developer',
    title: 'Junior Front-End Developer — Skill Profile',
    description: 'Constructs responsive, accessible web interfaces and interactive components using modern semantic HTML, CSS styling, and client-side JavaScript frameworks.',
    workArrangement: 'Remote / Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'HTML5 & Semantic Structure', aliases: ['html', 'html5', 'semantic html'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Modern CSS & Responsive Layouts', aliases: ['css', 'css3', 'flexbox', 'grid', 'tailwind', 'bootstrap'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'JavaScript (ES6+)', aliases: ['javascript', 'js', 'es6', 'ecmascript'], requiredLevel: 'Advanced', weight: 30 },
      { name: 'React', aliases: ['react', 'react.js', 'reactjs', 'react js'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Git & Version Control', aliases: ['git', 'github', 'version control', 'gitlab'], requiredLevel: 'Beginner', weight: 10 },
    ],
  },
  {
    id: 'fe-ui-web-dev',
    role: 'Front-End Developer',
    title: 'UI & Web Applications Engineer — Skill Profile',
    description: 'Specializes in component architecture, state management, asynchronous REST API integration, and cross-device performance optimization.',
    workArrangement: 'Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'JavaScript (ES6+)', aliases: ['javascript', 'js', 'es6', 'ecmascript'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'React & State Management', aliases: ['react', 'react.js', 'reactjs', 'redux', 'context api'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'Modern CSS & UI Systems', aliases: ['css', 'css3', 'tailwind', 'sass', 'responsive design'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'REST APIs & Asynchronous JS', aliases: ['rest api', 'apis', 'rest', 'fetch', 'axios', 'async javascript'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Git & Version Control', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', weight: 10 },
    ],
  },

  // 2. Full-Stack Developer Profiles
  {
    id: 'fs-associate-dev',
    role: 'Full-Stack Developer',
    title: 'Associate Full-Stack Developer — Skill Profile',
    description: 'Builds end-to-end web applications combining responsive client frontends, server-side APIs in Node.js/Express, and relational SQL database storage.',
    workArrangement: 'Remote / Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'JavaScript / TypeScript', aliases: ['javascript', 'typescript', 'js', 'ts', 'es6'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'React', aliases: ['react', 'react.js', 'reactjs', 'react js'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Node.js & Express', aliases: ['node', 'node.js', 'nodejs', 'express', 'express.js', 'backend'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'SQL & Database Design', aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'database'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Git & Branching Workflows', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', weight: 15 },
    ],
  },
  {
    id: 'fs-web-app-eng',
    role: 'Full-Stack Developer',
    title: 'Full-Stack Web Application Engineer — Skill Profile',
    description: 'Designs full-lifecycle software applications with secure REST endpoints, database schema optimization, and responsive user interfaces.',
    workArrangement: 'Hybrid / On-site',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'JavaScript & Web Fundamentals', aliases: ['javascript', 'js', 'html', 'css', 'typescript'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'SQL & Relational Databases', aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'database', 'rdbms'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'Backend API Architecture', aliases: ['node', 'node.js', 'express', 'rest api', 'apis', 'backend'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Frontend Framework (React)', aliases: ['react', 'react.js', 'reactjs', 'next.js', 'frontend'], requiredLevel: 'Intermediate', weight: 15 },
      { name: 'Git & Version Control', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', weight: 15 },
    ],
  },

  // 3. Python Developer Profiles
  {
    id: 'py-app-developer',
    role: 'Python Developer',
    title: 'Python Application Developer — Skill Profile',
    description: 'Develops backend services, automated data processing routines, and application modules following clean object-oriented design standards.',
    workArrangement: 'Remote / Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'Python Core & Data Structures', aliases: ['python', 'python3', 'python 3', 'core python'], requiredLevel: 'Advanced', weight: 30 },
      { name: 'Object-Oriented Programming (OOP)', aliases: ['oop', 'object oriented programming', 'object-oriented programming', 'classes'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'SQL & Relational Databases', aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'database'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Python Web Framework (Django / FastAPI / Flask)', aliases: ['django', 'fastapi', 'flask', 'python web', 'rest api', 'apis'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Git & Version Control', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', weight: 10 },
    ],
  },
  {
    id: 'py-automation-eng',
    role: 'Python Developer',
    title: 'Python Automation & API Developer — Skill Profile',
    description: 'Creates workflow automation utilities, external API integrations, and robust test suites utilizing modern Python tooling.',
    workArrangement: 'Remote',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'Python Programming', aliases: ['python', 'python3', 'python 3'], requiredLevel: 'Advanced', weight: 35 },
      { name: 'REST APIs & Web Services', aliases: ['rest api', 'apis', 'rest', 'requests', 'fastapi', 'flask'], requiredLevel: 'Intermediate', weight: 25 },
      { name: 'Software Testing & Automation', aliases: ['testing', 'pytest', 'unittest', 'software testing', 'automation'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Git & Command Line Workflow', aliases: ['git', 'github', 'cli', 'version control', 'bash'], requiredLevel: 'Intermediate', weight: 20 },
    ],
  },

  // 4. Data Analyst Profiles
  {
    id: 'da-entry-analyst',
    role: 'Data Analyst',
    title: 'Entry-Level Data Analyst — Skill Profile',
    description: 'Cleans, transforms, and analyzes structured business data using SQL queries and Python libraries to extract actionable quantitative insights.',
    workArrangement: 'Hybrid / On-site',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'SQL for Data Analysis', aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'database', 'queries'], requiredLevel: 'Advanced', weight: 30 },
      { name: 'Python for Data Analysis (Pandas & NumPy)', aliases: ['python', 'pandas', 'numpy', 'python for data analysis'], requiredLevel: 'Intermediate', weight: 25 },
      { name: 'Spreadsheets & Excel', aliases: ['excel', 'spreadsheets', 'advanced excel', 'ms excel', 'microsoft excel', 'pivot tables'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Data Visualization & Reporting', aliases: ['data visualization', 'power bi', 'tableau', 'matplotlib', 'seaborn', 'visualization'], requiredLevel: 'Intermediate', weight: 15 },
      { name: 'Git & Reproducible Analysis', aliases: ['git', 'github', 'version control'], requiredLevel: 'Beginner', weight: 10 },
    ],
  },
  {
    id: 'da-bi-analyst',
    role: 'Data Analyst',
    title: 'Business Intelligence & Quantitative Analyst — Skill Profile',
    description: 'Builds analytical dashboards, executes aggregate statistical queries, and evaluates key metrics across enterprise databases.',
    workArrangement: 'Remote / Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'SQL & Complex Joins', aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'database', 'queries'], requiredLevel: 'Advanced', weight: 35 },
      { name: 'Data Visualization & BI Dashboards', aliases: ['data visualization', 'power bi', 'tableau', 'dashboards', 'bi'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'Applied Statistics & Quantitative Logic', aliases: ['statistics', 'applied statistics', 'stats', 'probability', 'quantitative methods'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Python or Advanced Excel', aliases: ['python', 'pandas', 'excel', 'spreadsheets'], requiredLevel: 'Intermediate', weight: 20 },
    ],
  },

  // 5. Software Developer Profiles
  {
    id: 'sd-dev-one',
    role: 'Software Developer',
    title: 'Software Developer I — Skill Profile',
    description: 'Implements modular code, applies fundamental algorithms and data structures, and collaborates on software version control.',
    workArrangement: 'Hybrid / On-site',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'Core Programming (Python / Java / C++ / JS)', aliases: ['programming', 'python', 'java', 'c++', 'c', 'javascript', 'core programming'], requiredLevel: 'Advanced', weight: 30 },
      { name: 'Data Structures & Algorithms (DSA)', aliases: ['dsa', 'data structures', 'algorithms', 'data structures & algorithms', 'problem solving'], requiredLevel: 'Intermediate', weight: 25 },
      { name: 'Object-Oriented Programming (OOP)', aliases: ['oop', 'object oriented programming', 'object-oriented programming', 'classes'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'SQL & Relational Databases', aliases: ['sql', 'database', 'mysql', 'postgresql', 'postgres'], requiredLevel: 'Intermediate', weight: 15 },
      { name: 'Git & Version Control', aliases: ['git', 'github', 'version control'], requiredLevel: 'Intermediate', weight: 10 },
    ],
  },
  {
    id: 'sd-associate-swe',
    role: 'Software Developer',
    title: 'Associate Software Engineer — Skill Profile',
    description: 'Develops tested application features, optimizes database interactions, and ensures adherence to clean architecture principles.',
    workArrangement: 'Remote / Hybrid',
    location: 'Standard Industry Benchmark',
    requiredSkills: [
      { name: 'Core Programming (Java / Python / JS)', aliases: ['java', 'python', 'javascript', 'c++', 'programming', 'clean code'], requiredLevel: 'Advanced', weight: 30 },
      { name: 'SQL & Relational Database Queries', aliases: ['sql', 'relational database', 'database', 'mysql', 'postgresql', 'postgres'], requiredLevel: 'Advanced', weight: 25 },
      { name: 'Software Testing & Clean Code', aliases: ['software testing', 'testing', 'unit testing', 'pytest', 'jest', 'qa'], requiredLevel: 'Intermediate', weight: 20 },
      { name: 'Problem Solving & System Logic', aliases: ['problem solving', 'dsa', 'data structures', 'algorithms', 'computer science'], requiredLevel: 'Intermediate', weight: 15 },
      { name: 'Git & Command Line Workflow', aliases: ['git', 'github', 'cli', 'version control'], requiredLevel: 'Intermediate', weight: 10 },
    ],
  },
]

// Icons
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function AwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

function JobMatching() {
  const { careerContext: sharedCareerContext } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState('All Tiers')
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModalJob, setActiveModalJob] = useState(null)

  // Authenticated student data state
  const [studentData, setStudentData] = useState({
    profile: {},
    skills: [],
    certificates: [],
    projects: [],
    experiences: [],
    quizTopics: [],
    targetRole: null,
  })

  // Load authenticated data from Supabase (filtered strictly by user.id)
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
        // Fallback to local storage
        const context = resolveCareerContext({
          profile: localProfile,
          skills: localSkills,
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          topicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
        })
        const resolved = context.track
        setStudentData({
          profile: localProfile,
          skills: localSkills.map((s) => ({
            name: s.name || s.skill_name || '',
            category: s.category || '',
            proficiency: s.proficiency || s.level,
            level: getProficiencyLabel(parseProficiency(s.proficiency || s.level)),
            years_experience: s.years_experience || s.yearsExperience || 0,
          })),
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          quizTopics: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
          targetRole: resolved,
        })
        setLoading(false)
        return
      }

      const user = session.user

      // Execute queries filtered strictly by authenticated user.id
      const [
        profileRes,
        skillsLoaded,
        certsRes,
        projectsRes,
        experiencesRes,
        topicsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, target_role, name, department, current_year, graduation_year')
          .eq('id', user.id)
          .maybeSingle(),
        fetchStudentSkills(user.id),
        supabase
          .from('certificates')
          .select('id, certificate_name, issuing_organization, skills, credential_url')
          .eq('student_id', user.id),
        supabase
          .from('projects')
          .select('id, title, description, technologies, project_url, github_url')
          .eq('student_id', user.id),
        supabase
          .from('experiences')
          .select('id, experience_type, role, organization, description, skills')
          .eq('student_id', user.id),
        supabase
          .from('quiz_topic_performance')
          .select('topic, percentage')
          .eq('student_id', user.id),
      ])

      const fetchedProfile = profileRes.data || localProfile
      const fetchedSkills = Array.isArray(skillsLoaded)
        ? skillsLoaded.map((item) => ({
            name: item.skill_name || item.name || '',
            category: item.category || '',
            proficiency: item.proficiency,
            level: getProficiencyLabel(parseProficiency(item.proficiency)),
            years_experience: item.years_experience || 0,
          }))
        : localSkills.map((s) => ({
            name: s.name || s.skill_name || '',
            category: s.category || '',
            proficiency: s.proficiency || s.level,
            level: getProficiencyLabel(parseProficiency(s.proficiency || s.level)),
            years_experience: s.years_experience || s.yearsExperience || 0,
          }))

      const fetchedCerts = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const fetchedProjects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const fetchedExperiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const fetchedTopics = Array.isArray(topicsRes.data)
        ? topicsRes.data
        : (localAttempts[localAttempts.length - 1]?.topicPerformance || [])

      const context = resolveCareerContext({
        profile: fetchedProfile,
        skills: fetchedSkills,
        certificates: fetchedCerts,
        projects: fetchedProjects,
        experiences: fetchedExperiences,
        topicPerformance: fetchedTopics,
        explicitGoal: fetchedProfile?.careerGoal || fetchedProfile?.career_goal,
      })
      const resolved = context.track

      setStudentData({
        profile: fetchedProfile,
        skills: fetchedSkills,
        certificates: fetchedCerts,
        projects: fetchedProjects,
        experiences: fetchedExperiences,
        quizTopics: fetchedTopics,
        targetRole: resolved,
      })
      setLoading(false)
    } catch (err) {
      console.error('Error loading student data for Job Matching:', err)
      const context = resolveCareerContext({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        topicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
      })
      const resolved = context.track
      setStudentData({
        profile: localProfile,
        skills: localSkills.map((s) => ({
          name: s.name || s.skill_name || '',
          category: s.category || '',
          proficiency: s.proficiency || s.level,
          level: getProficiencyLabel(parseProficiency(s.proficiency || s.level)),
          years_experience: s.years_experience || 0,
        })),
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        quizTopics: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
        targetRole: resolved,
      })
      setLoading(false)
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

  // Core Skill Matching Calculation Engine
  const evaluatedProfiles = useMemo(() => {
    const { skills, projects, experiences, quizTopics } = studentData
    const hasAnySkills = skills.length > 0

    return JOB_REQUIREMENT_PROFILES.map((job) => {
      let totalRequiredPoints = 0
      let totalEarnedPoints = 0

      const matchedSkills = []
      const underProficientSkills = []
      const missingSkills = []

      job.requiredSkills.forEach((reqSkill) => {
        const weight = reqSkill.weight || 20
        const requiredLevelVal = PROFICIENCY_VALUES[reqSkill.requiredLevel] || 2
        totalRequiredPoints += weight

        // If the student has zero skills recorded
        if (!hasAnySkills) {
          missingSkills.push({
            name: reqSkill.name,
            requiredLevel: reqSkill.requiredLevel,
            currentLevel: 'Not Recorded',
            gapReason: `${reqSkill.requiredLevel} required`,
            weight,
            isPortfolioSupported: false,
            isQuizSupported: false,
          })
          return
        }

        // Find match in student's verified skills
        const matchedStudentSkill = skills.find((s) => {
          const sName = s.name || s.skill_name || ''
          return isSkillMatching(sName, reqSkill.name, reqSkill.aliases)
        })

        // Check supporting portfolio evidence from projects
        const hasProjectEvidence = projects.some((p) => {
          const pTechs = Array.isArray(p.technologies)
            ? p.technologies
            : typeof p.technologies === 'string'
            ? p.technologies.split(/[,|;]/)
            : []
          return pTechs.some((t) => isSkillMatching(t, reqSkill.name, reqSkill.aliases))
        })

        // Check supporting portfolio evidence from experiences
        const hasExpEvidence = experiences.some((e) => {
          const eSkills = Array.isArray(e.skills)
            ? e.skills
            : typeof e.skills === 'string'
            ? e.skills.split(/[,|;]/)
            : []
          return eSkills.some((s) => isSkillMatching(s, reqSkill.name, reqSkill.aliases))
        })

        // Check quiz topic assessment evidence (score >= 70%)
        const hasQuizEvidence = (quizTopics || []).some((q) => {
          if (Number(q.percentage) < 70) return false
          return isSkillMatching(q.topic, reqSkill.name, reqSkill.aliases)
        })

        const isPortfolioSupported = hasProjectEvidence || hasExpEvidence
        const isQuizSupported = hasQuizEvidence

        if (matchedStudentSkill) {
          const currentLevelVal = parseProficiency(matchedStudentSkill.proficiency || matchedStudentSkill.level)
          const currentLevelLabel = getProficiencyLabel(currentLevelVal)

          if (currentLevelVal >= requiredLevelVal) {
            // Fully matched: receive full weight
            totalEarnedPoints += weight
            matchedSkills.push({
              name: reqSkill.name,
              requiredLevel: reqSkill.requiredLevel,
              currentLevel: currentLevelLabel,
              weight,
              isPortfolioSupported,
              isQuizSupported,
            })
          } else {
            // Under-proficient: receive partial credit (current level / required level)
            const partialCredit = weight * (currentLevelVal / requiredLevelVal)
            totalEarnedPoints += partialCredit
            underProficientSkills.push({
              name: reqSkill.name,
              requiredLevel: reqSkill.requiredLevel,
              currentLevel: currentLevelLabel,
              gapReason: `${reqSkill.requiredLevel} required, ${currentLevelLabel} current`,
              weight,
              isPortfolioSupported,
              isQuizSupported,
            })
          }
        } else {
          // Missing skill: receive 0 points
          missingSkills.push({
            name: reqSkill.name,
            requiredLevel: reqSkill.requiredLevel,
            currentLevel: 'Not Recorded',
            gapReason: `${reqSkill.requiredLevel} required`,
            weight,
            isPortfolioSupported,
            isQuizSupported,
          })
        }
      })

      // Transparent match percentage: 0% if 0 skills or 0 earned points, clamped 0–100
      const matchPercentage = totalRequiredPoints > 0
        ? Math.min(100, Math.max(0, Math.round((totalEarnedPoints / totalRequiredPoints) * 100)))
        : 0

      // Exact THIRORA Eligibility Tiers
      const tier = matchPercentage >= 75
        ? 'Strong Match'
        : matchPercentage >= 50
        ? 'Good Match'
        : 'Developing'

      // Recommended Next Skills sorted logically:
      // 1. Missing high-priority skills (highest weight first)
      // 2. Under-proficient high-priority skills (highest weight first)
      const recommendedNextSkills = [
        ...missingSkills
          .slice()
          .sort((a, b) => b.weight - a.weight)
          .map((s) => ({
            ...s,
            priority: 'Missing Skill',
            actionText: `Acquire foundational ${s.requiredLevel} concepts in Career Roadmap`,
          })),
        ...underProficientSkills
          .slice()
          .sort((a, b) => b.weight - a.weight)
          .map((s) => ({
            ...s,
            priority: 'Proficiency Gap',
            actionText: `Advance proficiency from ${s.currentLevel} to ${s.requiredLevel}`,
          })),
      ]

      return {
        ...job,
        matchPercentage,
        tier,
        totalRequiredPoints,
        totalEarnedPoints: Math.round(totalEarnedPoints * 10) / 10,
        matchedSkills,
        underProficientSkills,
        missingSkills,
        recommendedNextSkills,
      }
    })
  }, [studentData])

  // Filtered profiles for rendering using centralized resolved career
  const filteredProfiles = useMemo(() => {
    const activeCareerTrack = studentData.targetRole || sharedCareerContext?.track
    return evaluatedProfiles.filter((profile) => {
      // Automatically match target career from centralized career resolution
      if (activeCareerTrack && profile.role !== activeCareerTrack) {
        return false
      }
      // Filter by tier
      if (selectedTier !== 'All Tiers' && profile.tier !== selectedTier) {
        return false
      }
      // Filter by work arrangement
      if (selectedWorkArrangement !== 'All') {
        if (selectedWorkArrangement === 'Remote' && !profile.workArrangement.includes('Remote')) {
          return false
        }
        if (selectedWorkArrangement === 'Hybrid' && !profile.workArrangement.includes('Hybrid')) {
          return false
        }
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = profile.title.toLowerCase().includes(q)
        const matchRole = profile.role.toLowerCase().includes(q)
        const matchSkills = profile.requiredSkills.some((s) => s.name.toLowerCase().includes(q))
        if (!matchTitle && !matchRole && !matchSkills) {
          return false
        }
      }
      return true
    })
  }, [evaluatedProfiles, studentData.targetRole, sharedCareerContext?.track, selectedTier, selectedWorkArrangement, searchQuery])

  const hasSkills = studentData.skills.length > 0

  return (
    <main className="job-matching-page thirora-job-matching-scope">
      <style>{`
        /* Self-contained styling for Job Matching */
        .thirora-job-matching-scope {
          min-height: 100vh;
          background: var(--bg-page, #f8fafc);
          color: var(--text-main, #0f172a);
          padding: 24px clamp(16px, 4vw, 48px) 64px;
        }

        .job-matching-shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .job-matching-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .job-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary, #475569);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 600;
          transition: color 0.15s ease;
        }
        .job-nav-link:hover {
          color: var(--accent-primary, #2563eb);
        }

        .job-hero {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 24px;
          box-shadow: var(--card-shadow, 0 4px 12px rgba(15, 23, 42, 0.03));
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .job-hero-tag {
          display: inline-block;
          font-size: 0.76rem;
          font-weight: 800;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .job-hero h1 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          color: var(--text-main, #0f172a);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 8px 0;
        }

        .job-hero p {
          color: var(--text-secondary, #64748b);
          font-size: 0.95rem;
          margin: 0;
          max-width: 720px;
          line-height: 1.55;
        }

        /* Target Role Banner */
        .target-role-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 16px 22px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .target-role-banner-unset {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .target-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 6px;
          background: #1e3a8a;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
        }

        /* Filter Controls */
        .job-filters-panel {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
          box-shadow: var(--card-shadow, 0 2px 8px rgba(15, 23, 42, 0.02));
        }

        .filters-row {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1 1 180px;
        }

        .filter-label {
          font-size: 0.76rem;
          font-weight: 800;
          color: var(--text-secondary, #475569);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-select,
        .filter-input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-input, #f8fafc);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main, #0f172a);
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #2563eb;
          background: var(--bg-card, #ffffff);
        }

        .track-pill-btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-secondary, #475569);
          transition: all 0.15s ease;
        }
        .track-pill-btn:hover {
          background: var(--bg-elevated, #f8fafc);
          color: var(--text-main, #0f172a);
        }

        /* Results Grid */
        .job-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .job-results-header h2 {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0;
        }

        .job-profiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 22px;
        }

        /* Requirement Profile Card */
        .profile-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 14px;
          padding: 24px;
          box-shadow: var(--card-shadow, 0 4px 14px rgba(15, 23, 42, 0.03));
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .profile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
        }

        .card-topline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }

        .card-title-group h3 {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 6px 0;
          line-height: 1.35;
        }

        .card-track-badge {
          display: inline-block;
          font-size: 0.74rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
        }

        /* Score Badge */
        .match-score-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
          padding: 8px 14px;
          border-radius: 12px;
          text-align: right;
        }

        .score-number {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1;
        }

        .tier-pill {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 4px;
        }

        .tier-strong {
          background: #dcfce7;
          color: #15803d;
        }
        .tier-strong .score-number {
          color: #15803d;
        }

        .tier-good {
          background: #fef3c7;
          color: #b45309;
        }
        .tier-good .score-number {
          color: #b45309;
        }

        .tier-developing {
          background: #f1f5f9;
          color: #475569;
        }
        .tier-developing .score-number {
          color: #475569;
        }

        /* Progress Bar */
        .match-progress-track {
          width: 100%;
          height: 6px;
          background: var(--border-color, #e2e8f0);
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0 14px 0;
        }
        .match-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
        }
        .fill-strong { background: #16a34a; }
        .fill-good { background: #f59e0b; }
        .fill-developing { background: #64748b; }

        .card-description {
          font-size: 0.88rem;
          color: var(--text-secondary, #475569);
          line-height: 1.5;
          margin: 0 0 14px 0;
        }

        .card-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.78rem;
          color: var(--text-muted, #64748b);
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color, #f1f5f9);
        }

        /* Skills Breakdown Sections */
        .skills-breakdown-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 18px;
        }

        .skill-group-title {
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .skill-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .skill-tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .tag-matched {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .tag-gap {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .tag-missing {
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .evidence-indicator {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
          font-weight: 700;
          margin-left: 2px;
        }

        /* Recommended Action Box */
        .recommended-action-box {
          background: var(--bg-elevated, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .recommended-action-title {
          font-size: 0.78rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .recommended-action-list {
          margin: 0;
          padding-left: 18px;
          font-size: 0.82rem;
          color: var(--text-secondary, #334155);
          line-height: 1.5;
        }

        /* Card Action Buttons */
        .card-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-action-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s ease, transform 0.15s ease;
          box-sizing: border-box;
        }
        .card-action-link:hover {
          background: #172554;
          transform: translateY(-1px);
        }

        .card-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-secondary, #475569);
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .card-secondary-btn:hover {
          background: var(--bg-elevated, #f8fafc);
          color: var(--text-main, #0f172a);
        }

        /* Empty State Card */
        .job-empty-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          max-width: 600px;
          margin: 32px auto;
          box-shadow: var(--card-shadow, 0 4px 14px rgba(15, 23, 42, 0.03));
        }
        .empty-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #eff6ff;
          color: #1d4ed8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .job-empty-card h3 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 8px 0;
        }
        .job-empty-card p {
          color: var(--text-secondary, #64748b);
          font-size: 0.92rem;
          line-height: 1.55;
          margin: 0 0 20px 0;
        }

        /* Modal Details View */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .modal-container {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          line-height: 1;
          padding: 4px;
        }
        .modal-close-btn:hover {
          color: var(--text-main, #0f172a);
        }

        .detail-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
          font-size: 0.84rem;
        }
        .detail-table th, .detail-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .detail-table th {
          background: var(--bg-elevated, #f8fafc);
          font-weight: 700;
          color: var(--text-secondary, #475569);
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .job-profiles-grid {
            grid-template-columns: 1fr;
          }
          .filters-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-group {
            width: 100%;
          }
          .card-actions-group {
            flex-direction: column;
          }
          .card-action-link,
          .card-secondary-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="job-matching-shell">
        {/* Top Navigation */}
        <nav className="job-matching-top-nav" aria-label="Breadcrumb Navigation">
          <Link className="job-nav-link" to="/">
            <span aria-hidden="true">&larr;</span> Back to Dashboard
          </Link>
          <Link className="job-nav-link" to="/career-roadmap" style={{ color: '#1e3a8a', fontWeight: 700 }}>
            <CompassIcon /> View Career Roadmap
          </Link>
        </nav>

        {/* Hero Header */}
        <header className="job-hero">
          <div className="job-hero-left">
            <span className="job-hero-tag">THIRORA Skill Benchmarking</span>
            <h1>Skill-to-Job Requirement Matching</h1>
            <p>
              Evaluate your verified technical skills, proficiency levels, projects, and assessment scores directly against standardized industry job requirement profiles.
            </p>
          </div>
        </header>

        {/* Target Role Context Banner */}
        {studentData.targetRole ? (
          <div className="target-role-banner" role="region" aria-label="Target Career Direction">
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>Target Career Track:</span>
              <strong style={{ marginLeft: '8px', color: '#0f172a', fontSize: '0.96rem' }}>{studentData.targetRole}</strong>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                Your requirement profiles are automatically prioritized based on your academic profile target role.
              </p>
            </div>
            <span className="target-role-badge">
              Active Career Direction
            </span>
          </div>
        ) : (
          <div className="target-role-banner target-role-banner-unset" role="region" aria-label="Career Goal Not Set">
            <div>
              <strong style={{ color: '#854d0e', fontSize: '0.94rem' }}>Career Goal Not Set</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#a16207' }}>
                Set your target career role in your Academic Profile to automatically align your benchmark.
              </p>
            </div>
            <Link
              to="/academic-profile"
              className="track-pill-btn"
              style={{ background: '#854d0e', color: '#ffffff', borderColor: '#854d0e' }}
            >
              Set Goal in Profile &rarr;
            </Link>
          </div>
        )}

        {/* Filter Controls Panel */}
        <section className="job-filters-panel" aria-label="Requirement Profile Filters">
          <div className="filters-row">
            <div className="filter-group">
              <label className="filter-label" htmlFor="tier-select">Match Tier</label>
              <select
                id="tier-select"
                className="filter-select"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
              >
                <option value="All Tiers">All Match Tiers</option>
                <option value="Strong Match">Strong Match (75%–100%)</option>
                <option value="Good Match">Good Match (50%–74%)</option>
                <option value="Developing">Developing (0%–49%)</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label" htmlFor="arrangement-select">Work Arrangement</label>
              <select
                id="arrangement-select"
                className="filter-select"
                value={selectedWorkArrangement}
                onChange={(e) => setSelectedWorkArrangement(e.target.value)}
              >
                <option value="All">All Arrangements</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid / On-site</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label" htmlFor="search-input">Search Requirement</label>
              <input
                id="search-input"
                type="text"
                className="filter-input"
                placeholder="Filter by skill or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="job-empty-card" role="status">
            <div className="empty-icon-box">
              <SearchIcon />
            </div>
            <h3>Evaluating Skill Requirements...</h3>
            <p>Loading your verified skills, projects, and assessment scores from Supabase.</p>
          </div>
        )}

        {/* Empty State: Student has 0 skills */}
        {!loading && !hasSkills && (
          <div className="job-empty-card" role="region" aria-label="No Skills Recorded">
            <div className="empty-icon-box">
              <SearchIcon />
            </div>
            <h3>No Skills Added Yet</h3>
            <p>
              Your skill match percentage is calculated from your real verified skills. Add your core technical skills in your Academic Profile or Skills section to see how you match against industry requirements.
            </p>
            <Link to="/skills" className="card-action-link" style={{ maxWidth: '240px', margin: '0 auto' }}>
              Add Technical Skills &rarr;
            </Link>
          </div>
        )}

        {/* Empty State: No profiles match the active filter */}
        {!loading && hasSkills && filteredProfiles.length === 0 && (
          <div className="job-empty-card" role="region" aria-label="No Matching Profiles">
            <div className="empty-icon-box">
              <SearchIcon />
            </div>
            <h3>No Matching Requirement Profiles</h3>
            <p>
              No skill profiles matched the selected combination of filters. Try adjusting your match tier, work arrangement, or search query.
            </p>
            <button
              type="button"
              className="track-pill-btn"
              onClick={() => {
                setSelectedTier('All Tiers')
                setSelectedWorkArrangement('All')
                setSearchQuery('')
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Profiles Results Grid */}
        {!loading && hasSkills && filteredProfiles.length > 0 && (
          <section aria-labelledby="job-results-heading">
            <div className="job-results-header">
              <h2 id="job-results-heading">
                Industry Skill Requirement Profiles ({filteredProfiles.length})
              </h2>
            </div>

            <div className="job-profiles-grid">
              {filteredProfiles.map((job) => {
                const tierClass =
                  job.tier === 'Strong Match'
                    ? 'tier-strong'
                    : job.tier === 'Good Match'
                    ? 'tier-good'
                    : 'tier-developing'

                const fillClass =
                  job.tier === 'Strong Match'
                    ? 'fill-strong'
                    : job.tier === 'Good Match'
                    ? 'fill-good'
                    : 'fill-developing'

                return (
                  <article className="profile-card" key={job.id}>
                    <div>
                      {/* Topline Header */}
                      <div className="card-topline">
                        <div className="card-title-group">
                          <span className="card-track-badge">{job.role}</span>
                          <h3>{job.title}</h3>
                        </div>
                        <div className={`match-score-badge ${tierClass}`}>
                          <span className="score-number">{job.matchPercentage}%</span>
                          <span className={`tier-pill ${tierClass}`}>{job.tier}</span>
                        </div>
                      </div>

                      {/* Match Progress Bar */}
                      <div className="match-progress-track" aria-hidden="true">
                        <div
                          className={`match-progress-fill ${fillClass}`}
                          style={{ width: `${job.matchPercentage}%` }}
                        />
                      </div>

                      {/* Description & Metadata */}
                      <p className="card-description">{job.description}</p>
                      <div className="card-meta-row">
                        <span><strong>Arrangement:</strong> {job.workArrangement}</span>
                        <span><strong>Benchmark:</strong> {job.location}</span>
                      </div>

                      {/* Skills Breakdown Box */}
                      <div className="skills-breakdown-box">
                        {/* 1. Matched Skills */}
                        {job.matchedSkills.length > 0 && (
                          <div>
                            <div className="skill-group-title" style={{ color: '#166534' }}>
                              <CheckIcon /> Matched Skills ({job.matchedSkills.length})
                            </div>
                            <div className="skill-tags-list">
                              {job.matchedSkills.map((s) => (
                                <span className="skill-tag-pill tag-matched" key={s.name}>
                                  <CheckIcon /> {s.name} ({s.currentLevel})
                                  {s.isPortfolioSupported && (
                                    <span className="evidence-indicator" title="Demonstrated in project or experience portfolio">
                                      <BriefcaseIcon /> Portfolio
                                    </span>
                                  )}
                                  {s.isQuizSupported && (
                                    <span className="evidence-indicator" title="Verified with ≥70% score in assessment">
                                      <AwardIcon /> Quiz
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Proficiency Gaps (Under-Proficient) */}
                        {job.underProficientSkills.length > 0 && (
                          <div>
                            <div className="skill-group-title" style={{ color: '#b45309' }}>
                              <AlertTriangleIcon /> Proficiency Gaps ({job.underProficientSkills.length})
                            </div>
                            <div className="skill-tags-list">
                              {job.underProficientSkills.map((s) => (
                                <span className="skill-tag-pill tag-gap" key={s.name}>
                                  <AlertTriangleIcon /> {s.name} ({s.gapReason})
                                  {s.isPortfolioSupported && (
                                    <span className="evidence-indicator" title="Supporting portfolio evidence present">
                                      <BriefcaseIcon /> Portfolio
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Missing Skills */}
                        {job.missingSkills.length > 0 && (
                          <div>
                            <div className="skill-group-title" style={{ color: '#64748b' }}>
                              <CircleIcon /> Missing Skills ({job.missingSkills.length})
                            </div>
                            <div className="skill-tags-list">
                              {job.missingSkills.map((s) => (
                                <span className="skill-tag-pill tag-missing" key={s.name}>
                                  <CircleIcon /> {s.name} ({s.requiredLevel} required)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recommended Learning Needs */}
                      {job.recommendedNextSkills.length > 0 && (
                        <div className="recommended-action-box">
                          <div className="recommended-action-title">
                            <span>Recommended Next Skills:</span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                              Prioritized for this track
                            </span>
                          </div>
                          <ul className="recommended-action-list">
                            {job.recommendedNextSkills.slice(0, 3).map((s) => (
                              <li key={s.name}>
                                <strong>{s.name}</strong> &mdash; {s.actionText}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Group */}
                    <div className="card-actions-group">
                      <Link
                        to="/career-roadmap"
                        className="card-action-link"
                        title="Follow your personalized milestone tracker to acquire these skills"
                      >
                        <span>Build Skills in Career Roadmap</span>
                        <ArrowRightIcon />
                      </Link>
                      <button
                        type="button"
                        className="card-secondary-btn"
                        onClick={() => setActiveModalJob(job)}
                        title="View detailed skill requirements and points breakdown"
                      >
                        View Breakdown
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* Modal: Full Requirement & Points Breakdown */}
        {activeModalJob && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-job-title"
            onClick={() => setActiveModalJob(null)}
          >
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="card-track-badge">{activeModalJob.role}</span>
                  <h3 id="modal-job-title" style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                    {activeModalJob.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setActiveModalJob(null)}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                  {activeModalJob.description}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.84rem', color: '#64748b' }}>
                  <span><strong>Calculated Score:</strong> {activeModalJob.matchPercentage}% ({activeModalJob.totalEarnedPoints} / {activeModalJob.totalRequiredPoints} pts)</span>
                  <span><strong>Tier:</strong> {activeModalJob.tier}</span>
                </div>
              </div>

              <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.95rem', fontWeight: 800 }}>
                Requirement & Proficiency Evaluation Table
              </h4>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Required Skill</th>
                    <th>Required Level</th>
                    <th>Your Verified Level</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeModalJob.requiredSkills.map((req) => {
                    const matched = activeModalJob.matchedSkills.find((m) => m.name === req.name)
                    const under = activeModalJob.underProficientSkills.find((u) => u.name === req.name)
                    const missing = activeModalJob.missingSkills.find((m) => m.name === req.name)

                    let statusBadge = null
                    let currentLevel = 'Not Recorded'

                    if (matched) {
                      currentLevel = matched.currentLevel
                      statusBadge = <span style={{ color: '#166534', fontWeight: 700 }}>✓ Matched</span>
                    } else if (under) {
                      currentLevel = under.currentLevel
                      statusBadge = <span style={{ color: '#b45309', fontWeight: 700 }}>△ Gap</span>
                    } else if (missing) {
                      statusBadge = <span style={{ color: '#64748b', fontWeight: 600 }}>○ Missing</span>
                    }

                    return (
                      <tr key={req.name}>
                        <td><strong>{req.name}</strong></td>
                        <td>{req.requiredLevel}</td>
                        <td>{currentLevel}</td>
                        <td>{req.weight} pts</td>
                        <td>{statusBadge}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="card-secondary-btn"
                  onClick={() => setActiveModalJob(null)}
                >
                  Close
                </button>
                <Link
                  to="/career-roadmap"
                  className="card-action-link"
                  style={{ flex: 'none', padding: '10px 20px' }}
                >
                  Learn this skill in your Career Roadmap &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default JobMatching