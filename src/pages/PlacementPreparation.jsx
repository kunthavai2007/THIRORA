import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { readStorage, writeStorage } from '../utils/storage'
import {
  resolveCareerContext,
} from '../utils/careerContext'
import { fetchStudentSkills } from '../services/skillService'

// Canonical Skill Requirements synchronized with Career Roadmap
const careerSkillRequirements = {
  'Front-End Developer': [
    {
      name: 'HTML5 & Semantic Structure',
      aliases: ['html', 'html5', 'semantic html', 'web semantics'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Semantic markup, accessibility tags, and clean DOM structure.',
    },
    {
      name: 'Modern CSS & Responsive Layouts',
      aliases: ['css', 'css3', 'flexbox', 'grid', 'css grid', 'tailwind', 'sass', 'bootstrap'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Flexbox, CSS Grid systems, media queries, and responsive web design.',
    },
    {
      name: 'Git & Version Control',
      aliases: ['git', 'github', 'version control', 'gitlab'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Branching, staging, committing, and remote GitHub synchronization.',
    },
    {
      name: 'JavaScript (ES6+)',
      aliases: ['javascript', 'js', 'es6', 'ecmascript'],
      requiredLevel: 'Advanced',
      weight: 25,
      description: 'Closures, prototypes, array methods, async programming, and DOM APIs.',
    },
    {
      name: 'Asynchronous JS & REST APIs',
      aliases: ['rest api', 'fetch', 'async javascript', 'ajax', 'apis', 'rest', 'axios'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Promises, async/await, HTTP error handling, and JSON parsing.',
    },
    {
      name: 'Frontend Framework (React / Vue)',
      aliases: ['react', 'react.js', 'reactjs', 'vue', 'vue.js', 'next.js'],
      requiredLevel: 'Advanced',
      weight: 20,
      description: 'Component architecture, state management, custom hooks, and lifecycles.',
    },
  ],

  'Full-Stack Developer': [
    {
      name: 'Web Fundamentals (HTML & CSS)',
      aliases: ['html', 'css', 'html/css', 'html5', 'css3'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Semantic markup, layout styling, and cross-browser responsiveness.',
    },
    {
      name: 'Git & Branching Workflows',
      aliases: ['git', 'github', 'version control', 'gitlab'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Branch management, pull requests, merge conflict resolution, and PR reviews.',
    },
    {
      name: 'JavaScript / TypeScript for Full-Stack',
      aliases: ['javascript', 'typescript', 'js', 'ts', 'es6'],
      requiredLevel: 'Advanced',
      weight: 25,
      description: 'Asynchronous control flow, type systems, functional methods, and Node syntax.',
    },
    {
      name: 'SQL & Database Design',
      aliases: ['sql', 'postgresql', 'mysql', 'database', 'rdbms', 'sqlite', 'postgres'],
      requiredLevel: 'Advanced',
      weight: 20,
      description: 'Relational schema modeling, multi-table joins, keys, and transactions.',
    },
    {
      name: 'Backend Framework & APIs (Node / Express)',
      aliases: ['node', 'node.js', 'nodejs', 'express', 'express.js', 'fastapi', 'backend', 'rest api'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'RESTful API routing, middleware controllers, authentication, and connectors.',
    },
    {
      name: 'Frontend Framework (React / Next.js)',
      aliases: ['react', 'react.js', 'reactjs', 'next.js', 'vue', 'frontend'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Client-server integration, interactive UI state, and API consumption.',
    },
  ],

  'Python Developer': [
    {
      name: 'Python Core Syntax & Data Structures',
      aliases: ['python', 'python3', 'core python', 'python 3'],
      requiredLevel: 'Advanced',
      weight: 30,
      description: 'Variables, loops, lists, dicts, comprehensions, and standard libraries.',
    },
    {
      name: 'Git Version Control & Documentation',
      aliases: ['git', 'github', 'version control'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Repository structure, clean commit history, README documentation.',
    },
    {
      name: 'Object-Oriented Programming (OOP)',
      aliases: ['oop', 'object-oriented programming', 'object oriented', 'classes', 'inheritance'],
      requiredLevel: 'Advanced',
      weight: 20,
      description: 'Classes, encapsulation, inheritance, polymorphism, and modular design.',
    },
    {
      name: 'SQL & Database Adapters',
      aliases: ['sql', 'postgresql', 'postgres', 'sqlite', 'mysql', 'database'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Relational data queries, parameterization, and database connectors.',
    },
    {
      name: 'Python Web Framework (Django / FastAPI / Flask)',
      aliases: ['django', 'fastapi', 'flask', 'python web', 'rest api', 'apis'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'REST API endpoints, request validation, serialization, and ORM integration.',
    },
    {
      name: 'Software Testing & Automation',
      aliases: ['testing', 'pytest', 'unittest', 'automation', 'selenium', 'scripting'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Unit testing with pytest, test suites, mocking, and automation scripts.',
    },
  ],

  'Data Analyst': [
    {
      name: 'Spreadsheets & Data Organization (Excel)',
      aliases: ['excel', 'spreadsheets', 'advanced excel', 'google sheets', 'pivot tables'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Data cleaning, lookup formulas (VLOOKUP/XLOOKUP), pivot tables, and aggregations.',
    },
    {
      name: 'Git & Reproducible Analysis',
      aliases: ['git', 'github', 'version control'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Version tracking for analysis scripts, notebooks, and dataset documentation.',
    },
    {
      name: 'SQL for Data Analysis',
      aliases: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'database', 'data queries'],
      requiredLevel: 'Advanced',
      weight: 25,
      description: 'Multi-table JOINs, GROUP BY aggregations, window functions, and subqueries.',
    },
    {
      name: 'Python for Data Analysis (Pandas & NumPy)',
      aliases: ['python', 'pandas', 'numpy', 'python for data analysis'],
      requiredLevel: 'Intermediate',
      weight: 20,
      description: 'DataFrame wrangling, series indexing, missing value handling, and statistical math.',
    },
    {
      name: 'Applied Statistics & Quantitative Logic',
      aliases: ['statistics', 'applied statistics', 'probability', 'stats', 'quantitative'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Mean, median, standard deviation, distribution shapes, correlation, hypothesis checks.',
    },
    {
      name: 'Data Visualization & BI Dashboards',
      aliases: ['power bi', 'tableau', 'data visualization', 'matplotlib', 'seaborn', 'bi', 'dashboards'],
      requiredLevel: 'Advanced',
      weight: 15,
      description: 'Interactive business intelligence reports, KPI visualizations, and executive charts.',
    },
  ],

  'Software Developer': [
    {
      name: 'Core Programming (Python / Java / C++ / JS)',
      aliases: ['python', 'java', 'c++', 'c#', 'javascript', 'c', 'core programming'],
      requiredLevel: 'Advanced',
      weight: 25,
      description: 'Syntax mastery, control flow, functions, modular architecture, and algorithms.',
    },
    {
      name: 'Git & Command Line Workflow',
      aliases: ['git', 'github', 'cli', 'version control', 'bash'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Repository management, branching, commit discipline, and command-line tools.',
    },
    {
      name: 'Object-Oriented Programming (OOP)',
      aliases: ['oop', 'object-oriented programming', 'object oriented', 'classes', 'polymorphism'],
      requiredLevel: 'Intermediate',
      weight: 15,
      description: 'Encapsulation, inheritance, polymorphism, interfaces, and modular class design.',
    },
    {
      name: 'SQL & Relational Database Queries',
      aliases: ['sql', 'relational database', 'database', 'mysql', 'postgresql', 'postgres'],
      requiredLevel: 'Advanced',
      weight: 20,
      description: 'Database normalization, queries, JOIN operations, indexes, and transactions.',
    },
    {
      name: 'Data Structures & Algorithms (DSA)',
      aliases: ['dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'problem solving'],
      requiredLevel: 'Intermediate',
      weight: 20,
      description: 'Arrays, linked lists, trees, hash tables, graph traversals, and Big-O complexity.',
    },
    {
      name: 'Software Testing & Clean Code Architecture',
      aliases: ['software testing', 'testing', 'unit testing', 'ci/cd', 'design patterns', 'clean code'],
      requiredLevel: 'Intermediate',
      weight: 10,
      description: 'Unit testing, test-driven logic, modular interfaces, and readable clean code.',
    },
  ],
}

const LEVEL_WEIGHTS = {
  'Not Found': 0,
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
}

function cleanSkill(str) {
  if (!str || typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

function isSkillMatch(candidateName, targetName, aliases = []) {
  const normCandidate = cleanSkill(candidateName)
  if (!normCandidate) return false

  const allTargets = [targetName, ...(aliases || [])].map(cleanSkill).filter(Boolean)
  if (allTargets.includes(normCandidate)) return true

  for (const t of allTargets) {
    if (t.length >= 3 && normCandidate.length >= 3) {
      if (normCandidate.includes(t) || t.includes(normCandidate)) return true
    }
  }
  return false
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

function isWithinPlacementWindow(graduationDateStr) {
  if (!graduationDateStr) return false
  const gradDate = new Date(graduationDateStr.includes('T') ? graduationDateStr : `${graduationDateStr}T00:00:00`)
  if (isNaN(gradDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeMonthsFromToday = new Date(today)
  threeMonthsFromToday.setMonth(threeMonthsFromToday.getMonth() + 3)

  return gradDate >= today && gradDate <= threeMonthsFromToday
}

// Icons
function CheckCircleIcon({ color = '#16a34a' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function AlertTriangleIcon({ color = '#d97706' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const APPLICATION_STATUSES = [
  'Draft',
  'Applied',
  'Assessment',
  'Interview',
  'Shortlisted',
  'Selected',
  'Rejected',
  'Withdrawn',
]

const APPLICATION_RESULTS = ['Pending', 'Selected', 'Rejected', 'On Hold']

function PlacementPreparation() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // Student Data from Supabase
  const [studentData, setStudentData] = useState({
    profile: {},
    skills: [],
    certificates: [],
    projects: [],
    experiences: [],
    quizAttempts: [],
    quizTopicPerformance: [],
    targetRole: null,
  })

  // Application Tracker State
  const [applications, setApplications] = useState([])
  const [showAppModal, setShowAppModal] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [appForm, setAppForm] = useState({
    company: '',
    role: '',
    driveDate: '',
    interviewDate: '',
    status: 'Applied',
    result: 'Pending',
    notes: '',
  })

  // Load authenticated data from Supabase
  const loadPlacementData = useCallback(async () => {
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
        // Fallback to local storage for guest
        const context = resolveCareerContext({
          profile: localProfile,
          skills: localSkills,
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          topicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
        })
        const resolved = context.track
        setUserId(null)
        setStudentData({
          profile: localProfile,
          skills: localSkills.map((s) => ({
            name: s.name || s.skill_name || '',
            proficiency: s.proficiency || s.level,
            level: getProficiencyLabel(parseProficiency(s.proficiency || s.level)),
          })),
          certificates: localCertificates,
          projects: localProjects,
          experiences: localExperiences,
          quizAttempts: localAttempts,
          quizTopicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
          targetRole: resolved,
        })
        const savedApps = readStorage('thirora_placement_apps_guest', [], Array.isArray)
        setApplications(savedApps)
        setLoading(false)
        return
      }

      const user = session.user
      setUserId(user.id)

      // Parallel queries strictly filtered by user.id
      const [
        profileRes,
        skillsLoaded,
        certsRes,
        projectsRes,
        experiencesRes,
        attemptsRes,
        topicsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, target_role, name, student_name, college_name, department, current_year, current_semester, current_cgpa, graduation_date, graduation_year, register_number')
          .eq('id', user.id)
          .maybeSingle(),
        fetchStudentSkills(user.id),
        supabase
          .from('certificates')
          .select('id, certificate_name, issuing_organization, issue_date, credential_url, skills')
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
          .from('quiz_attempts')
          .select('id, student_id, score, total_questions, percentage, completed_at')
          .eq('student_id', user.id)
          .order('completed_at', { ascending: false }),
        supabase
          .from('quiz_topic_performance')
          .select('id, student_id, topic, percentage')
          .eq('student_id', user.id),
      ])

      const fetchedProfile = profileRes.data || localProfile
      const fetchedSkills = Array.isArray(skillsLoaded)
        ? skillsLoaded.map((item) => ({
            name: item.skill_name || item.name || '',
            proficiency: item.proficiency,
            level: getProficiencyLabel(parseProficiency(item.proficiency)),
          }))
        : localSkills.map((s) => ({
            name: s.name || s.skill_name || '',
            proficiency: s.proficiency || s.level,
            level: getProficiencyLabel(parseProficiency(s.proficiency || s.level)),
          }))

      const fetchedCerts = Array.isArray(certsRes.data) ? certsRes.data : localCertificates
      const fetchedProjects = Array.isArray(projectsRes.data) ? projectsRes.data : localProjects
      const fetchedExperiences = Array.isArray(experiencesRes.data) ? experiencesRes.data : localExperiences
      const fetchedAttempts = Array.isArray(attemptsRes.data) ? attemptsRes.data : localAttempts
      const fetchedTopics = Array.isArray(topicsRes.data)
        ? topicsRes.data
        : (localAttempts[localAttempts.length - 1]?.topicPerformance || [])

      const context = resolveCareerContext({
        profile: fetchedProfile,
        skills: fetchedSkills,
        certificates: fetchedCerts,
        projects: fetchedProjects,
        experiences: fetchedExperiences,
        quizAttempts: fetchedAttempts,
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
        quizAttempts: fetchedAttempts,
        quizTopicPerformance: fetchedTopics,
        targetRole: resolved,
      })

      // Load private applications tracker for this student
      const userAppsKey = `thirora_placement_apps_${user.id}`
      const savedApps = readStorage(userAppsKey, [], Array.isArray)
      setApplications(savedApps)

      setLoading(false)
    } catch (err) {
      console.error('Error loading placement preparation data:', err)
      const context = resolveCareerContext({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        quizAttempts: localAttempts,
        topicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
      })
      const resolved = context.track
      setStudentData({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        quizAttempts: localAttempts,
        quizTopicPerformance: localAttempts[localAttempts.length - 1]?.topicPerformance || [],
        targetRole: resolved,
      })
      const savedApps = readStorage('thirora_placement_apps_guest', [], Array.isArray)
      setApplications(savedApps)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refresh = () => {
      if (isMounted) {
        loadPlacementData()
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
  }, [loadPlacementData])

  // Application CRUD handlers
  function saveApplicationsToStorage(newApps) {
    setApplications(newApps)
    const key = userId ? `thirora_placement_apps_${userId}` : 'thirora_placement_apps_guest'
    writeStorage(key, newApps)
  }

  function handleOpenAddApp() {
    setEditingApp(null)
    setAppForm({
      company: '',
      role: studentData.targetRole || '',
      driveDate: new Date().toISOString().slice(0, 10),
      interviewDate: '',
      status: 'Applied',
      result: 'Pending',
      notes: '',
    })
    setShowAppModal(true)
  }

  function handleOpenEditApp(app) {
    setEditingApp(app)
    setAppForm({
      company: app.company,
      role: app.role,
      driveDate: app.driveDate || '',
      interviewDate: app.interviewDate || '',
      status: app.status || 'Applied',
      result: app.result || 'Pending',
      notes: app.notes || '',
    })
    setShowAppModal(true)
  }

  function handleDeleteApp(appId) {
    if (window.confirm('Remove this application record?')) {
      const updated = applications.filter((a) => a.id !== appId)
      saveApplicationsToStorage(updated)
    }
  }

  function handleSubmitAppForm(e) {
    e.preventDefault()
    if (!appForm.company.trim() || !appForm.role.trim()) {
      alert('Company Name and Role are required.')
      return
    }

    if (editingApp) {
      const updated = applications.map((a) =>
        a.id === editingApp.id
          ? {
              ...a,
              ...appForm,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
      saveApplicationsToStorage(updated)
    } else {
      const newApp = {
        id: Date.now().toString(),
        ...appForm,
        createdAt: new Date().toISOString(),
      }
      saveApplicationsToStorage([newApp, ...applications])
    }
    setShowAppModal(false)
  }

  // Multi-Pillar Placement Readiness Calculation Engine
  const readinessMetrics = useMemo(() => {
    const { profile, skills, certificates, projects, experiences, quizAttempts, quizTopicPerformance, targetRole } = studentData

    // -------------------------------------------------------------
    // PILLAR A: Academic & Profile Readiness (Weight: 15%)
    // -------------------------------------------------------------
    let academicPoints = 0
    const studentName = profile.name || profile.student_name || profile.studentName
    const college = profile.college_name || profile.collegeName
    const dept = profile.department
    const year = profile.current_year || profile.currentYear
    const sem = profile.current_semester || profile.currentSemester
    const gradDate = profile.graduation_date || profile.graduationDate || profile.graduation_year || profile.graduationYear
    const cgpa = profile.current_cgpa || profile.currentCgpa

    if (studentName) academicPoints += 2
    if (college || dept) academicPoints += 3
    if (year || sem) academicPoints += 3
    if (gradDate) academicPoints += 3
    if (targetRole) academicPoints += 2
    if (cgpa) academicPoints += 2

    const pillarA_score = Math.min(15, academicPoints)
    const pillarA_status = pillarA_score >= 13 ? 'Complete' : pillarA_score >= 8 ? 'In Progress' : 'Incomplete'
    const pillarA_reason = !targetRole
      ? 'Target role not set in profile.'
      : !cgpa
      ? 'CGPA not yet recorded in Academic Profile.'
      : !gradDate
      ? 'Graduation date not specified.'
      : 'Core academic details and target role are recorded.'

    // Timing classification
    const inPlacementWindow = isWithinPlacementWindow(gradDate)

    // -------------------------------------------------------------
    // PILLAR B: Technical Skill Readiness (Weight: 25%)
    // -------------------------------------------------------------
    const roleReqs = careerSkillRequirements[targetRole] || []
    let skillPointsEarned = 0
    let skillPointsTotal = 0
    const matchedSkills = []
    const underProficientSkills = []
    const missingSkills = []

    if (roleReqs.length > 0) {
      roleReqs.forEach((req) => {
        const reqLevelVal = LEVEL_WEIGHTS[req.requiredLevel] || 2
        skillPointsTotal += reqLevelVal

        const found = skills.find((s) => isSkillMatch(s.name || s.skill_name, req.name, req.aliases))
        if (found) {
          const currentVal = parseProficiency(found.proficiency || found.level)
          const currentLabel = getProficiencyLabel(currentVal)

          if (currentVal >= reqLevelVal) {
            skillPointsEarned += reqLevelVal
            matchedSkills.push({
              name: req.name,
              requiredLevel: req.requiredLevel,
              currentLevel: currentLabel,
              status: 'Completed',
            })
          } else {
            skillPointsEarned += currentVal
            underProficientSkills.push({
              name: req.name,
              requiredLevel: req.requiredLevel,
              currentLevel: currentLabel,
              gapReason: `${req.requiredLevel} required, ${currentLabel} current`,
              status: 'Improve',
            })
          }
        } else {
          missingSkills.push({
            name: req.name,
            requiredLevel: req.requiredLevel,
            currentLevel: 'Not Recorded',
            gapReason: `${req.requiredLevel} required`,
            status: 'Learn',
          })
        }
      })
    }

    const pillarB_score = skillPointsTotal > 0
      ? Math.round((skillPointsEarned / skillPointsTotal) * 25)
      : (skills.length > 0 ? Math.min(25, skills.length * 4) : 0)

    const pillarB_status = pillarB_score >= 20 ? 'Strong Match' : pillarB_score >= 12 ? 'Progressing' : 'High Skill Gaps'
    const pillarB_reason = !targetRole
      ? 'Set your target role to evaluate industry skill requirements.'
      : missingSkills.length > 0
      ? `${missingSkills.length} required skill(s) missing for ${targetRole}.`
      : underProficientSkills.length > 0
      ? `${underProficientSkills.length} skill(s) need proficiency upgrades.`
      : 'All core technical requirements met for your target role.'

    // -------------------------------------------------------------
    // PILLAR C: Project Portfolio Readiness (Weight: 15%)
    // -------------------------------------------------------------
    let projectPoints = 0
    if (projects.length >= 1) projectPoints += 4
    if (projects.length >= 2) projectPoints += 3
    const projectsWithDesc = projects.filter((p) => p.description && p.description.trim().length > 15).length
    if (projectsWithDesc >= 1) projectPoints += 3
    const projectsWithTech = projects.filter((p) => (p.technologies && (Array.isArray(p.technologies) ? p.technologies.length > 0 : p.technologies.trim().length > 0))).length
    if (projectsWithTech >= 1) projectPoints += 2
    const projectsWithLinks = projects.filter((p) => p.github_url || p.githubUrl || p.project_url || p.projectUrl || p.link).length
    if (projectsWithLinks >= 1) projectPoints += 3

    const pillarC_score = Math.min(15, projectPoints)
    const pillarC_status = pillarC_score >= 12 ? 'Strong Portfolio' : pillarC_score >= 6 ? 'Needs Enhancement' : 'Portfolio Incomplete'
    const pillarC_reason = projects.length === 0
      ? 'No engineering projects documented.'
      : projectsWithLinks === 0
      ? 'Add GitHub repository or live project links to strengthen credibility.'
      : projects.length < 2
      ? 'Add at least 2 featured technical projects.'
      : 'Portfolio contains documented projects with repository evidence.'

    // -------------------------------------------------------------
    // PILLAR D: Technical Assessment Readiness (Weight: 15%)
    // -------------------------------------------------------------
    let quizPoints = 0
    const totalAttempts = quizAttempts.length
    let avgQuizScore = 0

    if (totalAttempts > 0) {
      const sum = quizAttempts.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0)
      avgQuizScore = Math.round(sum / totalAttempts)
      quizPoints += Math.min(6, totalAttempts * 3)
      if (avgQuizScore >= 70) {
        quizPoints += 9
      } else {
        quizPoints += Math.round((avgQuizScore / 70) * 9)
      }
    } else if (quizTopicPerformance.length > 0) {
      const sum = quizTopicPerformance.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0)
      avgQuizScore = Math.round(sum / quizTopicPerformance.length)
      quizPoints += 6
      if (avgQuizScore >= 70) quizPoints += 9
      else quizPoints += Math.round((avgQuizScore / 70) * 9)
    }

    const pillarD_score = Math.min(15, quizPoints)
    const pillarD_status = pillarD_score >= 12 ? 'Assessment Ready' : pillarD_score >= 6 ? 'Practice Required' : 'Not Started'
    const pillarD_reason = totalAttempts === 0 && quizTopicPerformance.length === 0
      ? 'No weekly technical assessments completed yet.'
      : avgQuizScore < 70
      ? `Current assessment average (${avgQuizScore}%) is below the 70% placement benchmark.`
      : `Assessment benchmark met (${avgQuizScore}% score across assessments).`

    // -------------------------------------------------------------
    // PILLAR E: Experience & Credentials (Weight: 15%)
    // -------------------------------------------------------------
    let expPoints = 0
    if (certificates.length >= 1) expPoints += 4
    if (certificates.length >= 2) expPoints += 3.5
    if (experiences.length >= 1) expPoints += 4.5
    if (experiences.length >= 2) expPoints += 3

    const pillarE_score = Math.min(15, Math.round(expPoints))
    const pillarE_status = pillarE_score >= 11 ? 'Strong Evidence' : pillarE_score >= 5 ? 'Developing' : 'No Experience'
    const pillarE_reason = certificates.length === 0 && experiences.length === 0
      ? 'No certificates or internships/workshops recorded.'
      : `${certificates.length} certificate(s) and ${experiences.length} experience record(s).`

    // -------------------------------------------------------------
    // PILLAR F: Resume Readiness (Weight: 15%)
    // -------------------------------------------------------------
    let resumePoints = 0
    if (studentName) resumePoints += 3
    if (college && dept) resumePoints += 3
    if (skills.length >= 3) resumePoints += 3
    if (projects.length >= 1) resumePoints += 3
    if (certificates.length >= 1 || experiences.length >= 1) resumePoints += 3

    const pillarF_score = Math.min(15, resumePoints)
    const pillarF_status = pillarF_score >= 12 ? 'Resume Ready' : pillarF_score >= 6 ? 'Needs Completion' : 'Incomplete'
    const pillarF_reason = pillarF_score >= 12
      ? 'Sufficient profile, skill, and project data to generate an ATS-ready resume.'
      : 'Add more skills, projects, and educational details to complete your resume.'

    // Total Overall Placement Readiness Score (0–100%)
    const totalScore = Math.min(100, Math.max(0,
      pillarA_score + pillarB_score + pillarC_score + pillarD_score + pillarE_score + pillarF_score
    ))

    const overallTier = totalScore >= 75
      ? 'Placement Ready'
      : totalScore >= 50
      ? 'Nearing Readiness'
      : 'Preparation Phase'

    // -------------------------------------------------------------
    // Dynamic Personalized Preparation Checklist
    // -------------------------------------------------------------
    const checklist = [
      {
        id: 'academic_profile',
        title: 'Complete Academic Profile',
        status: (studentName && dept && cgpa && gradDate) ? 'Completed' : (studentName || dept) ? 'In Progress' : 'Pending',
        description: 'Ensure college, department, CGPA, and graduation date are recorded.',
        route: '/academic-profile',
        actionLabel: 'Update Profile',
      },
      {
        id: 'career_goal',
        title: 'Set Target Career Goal',
        status: targetRole ? 'Completed' : 'Pending',
        description: targetRole ? `Active target: ${targetRole}` : 'Select your desired THIRORA career track.',
        route: '/academic-profile',
        actionLabel: 'Set Career Goal',
      },
      {
        id: 'technical_skills',
        title: 'Acquire Core Target Skills',
        status: missingSkills.length === 0 && skills.length > 0 ? 'Completed' : skills.length > 0 ? 'In Progress' : 'Pending',
        description: missingSkills.length > 0 ? `${missingSkills.length} required skill(s) missing.` : 'All required track skills present.',
        route: '/skills',
        actionLabel: 'Add Skills',
      },
      {
        id: 'skill_proficiency',
        title: 'Upgrade Skill Proficiency Levels',
        status: underProficientSkills.length === 0 && skills.length > 0 ? 'Completed' : underProficientSkills.length > 0 ? 'In Progress' : 'Pending',
        description: underProficientSkills.length > 0 ? `${underProficientSkills.length} skill(s) below required industry level.` : 'Proficiency levels aligned.',
        route: '/career-roadmap',
        actionLabel: 'Open Roadmap',
      },
      {
        id: 'weekly_quiz',
        title: 'Pass Weekly Technical Assessment (≥70%)',
        status: avgQuizScore >= 70 ? 'Completed' : totalAttempts > 0 ? 'In Progress' : 'Pending',
        description: avgQuizScore >= 70 ? `Passed with ${avgQuizScore}% average.` : 'Take weekly assessment to verify technical benchmark.',
        route: '/weekly-quiz',
        actionLabel: 'Take Quiz',
      },
      {
        id: 'projects_evidence',
        title: 'Document Engineering Projects',
        status: projects.length >= 2 ? 'Completed' : projects.length === 1 ? 'In Progress' : 'Pending',
        description: `${projects.length} of 2 recommended projects added.`,
        route: '/academic-profile',
        actionLabel: 'Manage Projects',
      },
      {
        id: 'github_links',
        title: 'Add Project Repository Links',
        status: projectsWithLinks >= 1 ? 'Completed' : projects.length > 0 ? 'In Progress' : 'Pending',
        description: projectsWithLinks >= 1 ? 'Repository links provided.' : 'Attach GitHub repository links to projects.',
        route: '/academic-profile',
        actionLabel: 'Add Links',
      },
      {
        id: 'certifications',
        title: 'Record Course Certifications',
        status: certificates.length >= 1 ? 'Completed' : 'Pending',
        description: `${certificates.length} certificate(s) recorded.`,
        route: '/academic-profile',
        actionLabel: 'Add Certificate',
      },
      {
        id: 'resume_builder',
        title: 'Generate Standardized ATS Resume',
        status: pillarF_status === 'Resume Ready' ? 'Completed' : 'In Progress',
        description: pillarF_status === 'Resume Ready' ? 'Ready for export.' : 'Complete missing sections for resume generation.',
        route: '/resume-builder',
        actionLabel: 'Open Resume Builder',
      },
      {
        id: 'job_matching',
        title: 'Benchmark with Industry Requirement Profiles',
        status: pillarB_score >= 18 ? 'Completed' : 'In Progress',
        description: 'Compare skills against THIRORA requirement profiles.',
        route: '/job-matching',
        actionLabel: 'Review Matches',
      },
    ]

    // Determine the Next Best Action
    const nextActionItem = checklist.find((item) => item.status !== 'Completed') || checklist[0]

    return {
      pillars: [
        { id: 'A', name: 'Academic & Profile', score: pillarA_score, max: 15, status: pillarA_status, reason: pillarA_reason, route: '/academic-profile', action: 'Update Profile' },
        { id: 'B', name: 'Technical Skills', score: pillarB_score, max: 25, status: pillarB_status, reason: pillarB_reason, route: '/career-roadmap', action: 'Open Roadmap' },
        { id: 'C', name: 'Project Portfolio', score: pillarC_score, max: 15, status: pillarC_status, reason: pillarC_reason, route: '/academic-profile', action: 'Manage Projects' },
        { id: 'D', name: 'Technical Assessment', score: pillarD_score, max: 15, status: pillarD_status, reason: pillarD_reason, route: '/weekly-quiz', action: 'Take Quiz' },
        { id: 'E', name: 'Experience & Credentials', score: pillarE_score, max: 15, status: pillarE_status, reason: pillarE_reason, route: '/academic-profile', action: 'Add Credentials' },
        { id: 'F', name: 'Resume Readiness', score: pillarF_score, max: 15, status: pillarF_status, reason: pillarF_reason, route: '/resume-builder', action: 'Build Resume' },
      ],
      totalScore,
      overallTier,
      inPlacementWindow,
      matchedSkills,
      underProficientSkills,
      missingSkills,
      avgQuizScore,
      totalAttempts,
      checklist,
      nextActionItem,
    }
  }, [studentData])

  return (
    <main className="placement-page thirora-placement-scope">
      <style>{`
        .thirora-placement-scope {
          min-height: 100vh;
          background: var(--bg-page, #f8fafc);
          color: var(--text-main, #0f172a);
          padding: 24px clamp(16px, 4vw, 48px) 64px;
        }

        .placement-shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .placement-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .nav-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary, #475569);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 600;
          transition: color 0.15s ease;
        }
        .nav-back-link:hover {
          color: var(--accent-primary, #2563eb);
        }

        /* Hero Header */
        .placement-hero {
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

        .hero-tag {
          font-size: 0.76rem;
          font-weight: 800;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          display: block;
        }

        .placement-hero h1 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          color: var(--text-main, #0f172a);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 8px 0;
        }

        .placement-hero p {
          color: var(--text-secondary, #64748b);
          font-size: 0.95rem;
          margin: 0;
          max-width: 720px;
          line-height: 1.55;
        }

        /* Overall Score Overview Banner */
        .readiness-overview-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: var(--card-shadow, 0 4px 12px rgba(15, 23, 42, 0.03));
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
          align-items: center;
        }

        .score-circle-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding-right: 24px;
          border-right: 1px solid var(--border-color, #e2e8f0);
        }

        .score-big-num {
          font-size: 3.2rem;
          font-weight: 900;
          line-height: 1;
          color: #1e3a8a;
        }

        .tier-badge-main {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 5px 12px;
          border-radius: 999px;
          margin-top: 8px;
        }

        .tier-ready { background: #dcfce7; color: #15803d; }
        .tier-nearing { background: #fef3c7; color: #b45309; }
        .tier-prep { background: #f1f5f9; color: #475569; }

        .overview-details h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 6px 0;
        }

        .overview-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 24px;
          margin-top: 14px;
          font-size: 0.86rem;
          color: var(--text-secondary, #475569);
        }

        .overview-meta-item strong {
          color: var(--text-main, #0f172a);
        }

        /* Next Best Action Callout */
        .next-action-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .next-action-title {
          font-size: 0.78rem;
          font-weight: 800;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 4px 0;
        }

        .next-action-card h4 {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 4px 0;
        }

        .next-action-card p {
          font-size: 0.88rem;
          color: #334155;
          margin: 0;
        }

        .cta-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s ease, transform 0.15s ease;
          border: none;
          cursor: pointer;
        }
        .cta-btn-primary:hover {
          background: #172554;
          transform: translateY(-1px);
        }

        /* 6 Pillars Grid */
        .pillars-section {
          margin-bottom: 32px;
        }

        .section-header-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 18px;
        }

        .pillar-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 20px;
          box-shadow: var(--card-shadow, 0 2px 8px rgba(15, 23, 42, 0.02));
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.15s ease;
        }
        .pillar-card:hover {
          transform: translateY(-2px);
        }

        .pillar-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .pillar-topline h4 {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0;
        }

        .pillar-score-badge {
          font-size: 0.84rem;
          font-weight: 800;
          color: #1e3a8a;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .pillar-progress-track {
          width: 100%;
          height: 6px;
          background: var(--border-color, #e2e8f0);
          border-radius: 999px;
          overflow: hidden;
          margin: 8px 0 12px 0;
        }

        .pillar-progress-fill {
          height: 100%;
          background: #2563eb;
          border-radius: 999px;
        }

        .pillar-reason-text {
          font-size: 0.82rem;
          color: var(--text-secondary, #64748b);
          line-height: 1.45;
          margin: 0 0 14px 0;
          flex-grow: 1;
        }

        .pillar-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid var(--border-color, #f1f5f9);
        }

        .status-pill {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .status-good { background: #f0fdf4; color: #166534; }
        .status-warn { background: #fffbeb; color: #92400e; }
        .status-bad { background: #f8fafc; color: #64748b; }

        .pillar-link {
          font-size: 0.82rem;
          font-weight: 700;
          color: #2563eb;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .pillar-link:hover {
          text-decoration: underline;
        }

        /* Skills Gap Detail Box */
        .skills-gap-summary {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 14px;
          padding: 22px 26px;
          margin-bottom: 28px;
        }

        .skills-tag-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .skill-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
        }
        .skill-pill-matched { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .skill-pill-gap { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .skill-pill-missing { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

        /* Checklist Section */
        .checklist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 14px;
          margin-bottom: 32px;
        }

        .checklist-item-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .check-icon-wrap {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checklist-content {
          flex-grow: 1;
        }

        .checklist-content h5 {
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 3px 0;
        }

        .checklist-content p {
          font-size: 0.8rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        /* Application Tracker */
        .tracker-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 32px;
          box-shadow: var(--card-shadow, 0 4px 12px rgba(15, 23, 42, 0.03));
        }

        .tracker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        .tracker-header h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0;
        }

        .tracker-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
        }

        .tracker-table th, .tracker-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .tracker-table th {
          background: var(--bg-elevated, #f8fafc);
          font-weight: 800;
          color: var(--text-secondary, #475569);
          text-transform: uppercase;
          font-size: 0.74rem;
          letter-spacing: 0.05em;
        }

        .app-status-badge {
          display: inline-block;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .badge-applied { background: #eff6ff; color: #1e40af; }
        .badge-interview { background: #fef3c7; color: #b45309; }
        .badge-selected { background: #dcfce7; color: #15803d; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }
        .badge-default { background: #f1f5f9; color: #475569; }

        .btn-action-sm {
          background: none;
          border: none;
          font-size: 0.8rem;
          font-weight: 700;
          color: #2563eb;
          cursor: pointer;
          margin-right: 8px;
          padding: 2px 4px;
        }
        .btn-action-sm:hover {
          text-decoration: underline;
        }

        .btn-delete-sm {
          color: #dc2626;
        }

        /* Modal Styles */
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

        .modal-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          width: 100%;
          max-width: 540px;
          padding: 26px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0 0 16px 0;
        }

        .form-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field label {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-secondary, #475569);
          text-transform: uppercase;
        }

        .form-input, .form-select, .form-textarea {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-input, #f8fafc);
          font-size: 0.88rem;
          color: var(--text-main, #0f172a);
        }

        .form-textarea {
          resize: vertical;
          min-height: 70px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-secondary {
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--text-secondary, #475569);
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 860px) {
          .readiness-overview-card {
            grid-template-columns: 1fr;
          }
          .score-circle-box {
            border-right: none;
            border-bottom: 1px solid var(--border-color, #e2e8f0);
            padding-right: 0;
            padding-bottom: 20px;
          }
          .pillars-grid {
            grid-template-columns: 1fr;
          }
          .checklist-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="placement-shell">
        {/* Top Navigation */}
        <nav className="placement-top-nav" aria-label="Breadcrumbs">
          <Link className="nav-back-link" to="/">
            <span aria-hidden="true">&larr;</span> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link className="nav-back-link" to="/overall-progress">
              View Overall Progress &rarr;
            </Link>
          </div>
        </nav>

        {/* Hero Header */}
        <header className="placement-hero">
          <div>
            <span className="hero-tag">THIRORA Campus Placement Hub</span>
            <h1>Placement Preparation &amp; Readiness</h1>
            <p>
              Evaluate your holistic campus placement readiness across academic metrics, technical skill proficiencies, engineering projects, assessment benchmarks, and resume readiness.
            </p>
          </div>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="tracker-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <h3>Evaluating Placement Readiness...</h3>
            <p style={{ color: '#64748b' }}>Loading authenticated profile, skills, assessments, and project evidence from Supabase.</p>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. Overall Score Overview Card */}
            <section className="readiness-overview-card" aria-label="Placement Readiness Overview">
              <div className="score-circle-box">
                <span className="score-big-num">{readinessMetrics.totalScore}%</span>
                <span className={`tier-badge-main ${readinessMetrics.overallTier === 'Placement Ready' ? 'tier-ready' : readinessMetrics.overallTier === 'Nearing Readiness' ? 'tier-nearing' : 'tier-prep'}`}>
                  {readinessMetrics.overallTier}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                  Deterministic Multi-Pillar Score
                </span>
              </div>

              <div className="overview-details">
                <h3>Campus Placement Status</h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                  {readinessMetrics.overallTier === 'Placement Ready'
                    ? 'Your academic profile, technical proficiencies, project portfolio, and assessment benchmark satisfy campus placement readiness standards.'
                    : readinessMetrics.overallTier === 'Nearing Readiness'
                    ? 'You have a solid foundation. Addressing the targeted checklist items below will advance your placement readiness.'
                    : 'Placement preparation starts with completing your academic profile, setting a career goal, adding verified skills, and documenting project evidence.'}
                </p>

                <div className="overview-meta-row">
                  <div className="overview-meta-item">
                    Target Role: <strong>{studentData.targetRole || 'Career Goal Not Set'}</strong>
                  </div>
                  <div className="overview-meta-item">
                    Graduation Window: <strong>{readinessMetrics.inPlacementWindow ? 'Active Placement Window (Within 3 Months)' : 'Preparation Phase'}</strong>
                  </div>
                  <div className="overview-meta-item">
                    Current CGPA: <strong>{studentData.profile.current_cgpa || studentData.profile.currentCgpa || 'Not Recorded'}</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Next Best Action Callout */}
            {readinessMetrics.nextActionItem && (
              <section className="next-action-card" aria-label="Next Recommended Action">
                <div>
                  <span className="next-action-title">Recommended Next Preparation Step</span>
                  <h4>{readinessMetrics.nextActionItem.title}</h4>
                  <p>{readinessMetrics.nextActionItem.description}</p>
                </div>
                <Link to={readinessMetrics.nextActionItem.route} className="cta-btn-primary">
                  <span>{readinessMetrics.nextActionItem.actionLabel}</span>
                  <ArrowRightIcon />
                </Link>
              </section>
            )}

            {/* 3. Six Readiness Pillars Grid */}
            <section className="pillars-section" aria-label="Readiness Pillars Breakdown">
              <div className="section-header-title">
                <span>Placement Readiness Pillars (100% Breakdown)</span>
              </div>

              <div className="pillars-grid">
                {readinessMetrics.pillars.map((pillar) => {
                  const percent = Math.round((pillar.score / pillar.max) * 100)
                  const statusClass = percent >= 80 ? 'status-good' : percent >= 45 ? 'status-warn' : 'status-bad'

                  return (
                    <article className="pillar-card" key={pillar.id}>
                      <div>
                        <div className="pillar-topline">
                          <h4>{pillar.name}</h4>
                          <span className="pillar-score-badge">{pillar.score} / {pillar.max} pts</span>
                        </div>
                        <div className="pillar-progress-track">
                          <div className="pillar-progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="pillar-reason-text">{pillar.reason}</p>
                      </div>

                      <div className="pillar-footer">
                        <span className={`status-pill ${statusClass}`}>{pillar.status}</span>
                        <Link to={pillar.route} className="pillar-link">
                          {pillar.action} &rarr;
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* 4. Target Role Skills & Gap Breakdown */}
            <section className="skills-gap-summary" aria-label="Target Role Skill Requirements">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Technical Skill Alignment: {studentData.targetRole || 'Career Goal Not Set'}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Comparison against THIRORA standardized career requirements.
                  </p>
                </div>
                {studentData.targetRole ? (
                  <Link to="/career-roadmap" className="cta-btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                    Open Career Roadmap &rarr;
                  </Link>
                ) : (
                  <Link to="/academic-profile" className="cta-btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                    Set Career Goal in Profile &rarr;
                  </Link>
                )}
              </div>

              {studentData.targetRole ? (
                <div style={{ marginTop: '16px' }}>
                  {/* Matched Skills */}
                  {readinessMetrics.matchedSkills.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                        ✓ Matched Skills ({readinessMetrics.matchedSkills.length})
                      </span>
                      <div className="skills-tag-group">
                        {readinessMetrics.matchedSkills.map((s) => (
                          <span className="skill-pill skill-pill-matched" key={s.name}>
                            {s.name} ({s.currentLevel})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills to Improve */}
                  {readinessMetrics.underProficientSkills.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                        △ Skills to Upgrade ({readinessMetrics.underProficientSkills.length})
                      </span>
                      <div className="skills-tag-group">
                        {readinessMetrics.underProficientSkills.map((s) => (
                          <span className="skill-pill skill-pill-gap" key={s.name}>
                            {s.name} ({s.gapReason})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {readinessMetrics.missingSkills.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        ○ Missing Skills ({readinessMetrics.missingSkills.length})
                      </span>
                      <div className="skills-tag-group">
                        {readinessMetrics.missingSkills.map((s) => (
                          <span className="skill-pill skill-pill-missing" key={s.name}>
                            {s.name} ({s.requiredLevel} required)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ marginTop: '14px', fontSize: '0.88rem', color: '#64748b' }}>
                  Select your target role in your Academic Profile to view skill alignment and proficiency gaps.
                </p>
              )}
            </section>

            {/* 5. Personalized Preparation Checklist */}
            <section aria-label="Placement Preparation Checklist">
              <div className="section-header-title">
                <span>Personalized Preparation Checklist</span>
              </div>

              <div className="checklist-grid">
                {readinessMetrics.checklist.map((item) => (
                  <div className="checklist-item-card" key={item.id}>
                    <div className="check-icon-wrap">
                      {item.status === 'Completed' ? (
                        <CheckCircleIcon color="#16a34a" />
                      ) : (
                        <AlertTriangleIcon color={item.status === 'In Progress' ? '#d97706' : '#94a3b8'} />
                      )}
                    </div>
                    <div className="checklist-content">
                      <h5>{item.title}</h5>
                      <p>{item.description}</p>
                      {item.status !== 'Completed' ? (
                        <Link to={item.route} className="pillar-link" style={{ fontSize: '0.78rem' }}>
                          {item.actionLabel} &rarr;
                        </Link>
                      ) : (
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#16a34a' }}>Completed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Placement Application Tracker */}
            <section className="tracker-card" aria-label="Placement Drive & Application Tracker">
              <div className="tracker-header">
                <div>
                  <h3>Campus Placement Drive &amp; Application Tracker</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                    Record and track your active campus recruitment drives and off-campus applications.
                  </p>
                </div>
                <button type="button" className="cta-btn-primary" onClick={handleOpenAddApp}>
                  <PlusIcon /> Log Application
                </button>
              </div>

              {applications.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tracker-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Drive / Applied Date</th>
                        <th>Interview Date</th>
                        <th>Status</th>
                        <th>Result</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => {
                        const badgeClass =
                          app.status === 'Applied'
                            ? 'badge-applied'
                            : app.status === 'Interview'
                            ? 'badge-interview'
                            : app.status === 'Selected'
                            ? 'badge-selected'
                            : app.status === 'Rejected'
                            ? 'badge-rejected'
                            : 'badge-default'

                        return (
                          <tr key={app.id}>
                            <td><strong>{app.company}</strong></td>
                            <td>{app.role}</td>
                            <td>{app.driveDate || '—'}</td>
                            <td>{app.interviewDate || '—'}</td>
                            <td>
                              <span className={`app-status-badge ${badgeClass}`}>{app.status}</span>
                            </td>
                            <td>{app.result || 'Pending'}</td>
                            <td>
                              <button type="button" className="btn-action-sm" onClick={() => handleOpenEditApp(app)}>
                                Edit
                              </button>
                              <button type="button" className="btn-action-sm btn-delete-sm" onClick={() => handleDeleteApp(app.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b' }}>
                    No placement applications logged yet. Click &quot;Log Application&quot; to track campus drives and interview milestones.
                  </p>
                  <button type="button" className="cta-btn-primary" onClick={handleOpenAddApp} style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
                    <PlusIcon /> Log First Application
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* Application Modal (Add / Edit) */}
        {showAppModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-app-title">
            <div className="modal-card">
              <h3 id="modal-app-title">{editingApp ? 'Edit Placement Application' : 'Log Placement Drive Application'}</h3>
              <form onSubmit={handleSubmitAppForm} className="form-grid">
                <div className="form-field">
                  <label htmlFor="app-company">Company Name *</label>
                  <input
                    id="app-company"
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Acme Corporation"
                    value={appForm.company}
                    onChange={(e) => setAppForm({ ...appForm, company: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="app-role">Applied Role *</label>
                  <input
                    id="app-role"
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Associate Software Engineer"
                    value={appForm.role}
                    onChange={(e) => setAppForm({ ...appForm, role: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field">
                    <label htmlFor="app-drive-date">Drive / Applied Date</label>
                    <input
                      id="app-drive-date"
                      type="date"
                      className="form-input"
                      value={appForm.driveDate}
                      onChange={(e) => setAppForm({ ...appForm, driveDate: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="app-interview-date">Interview Date</label>
                    <input
                      id="app-interview-date"
                      type="date"
                      className="form-input"
                      value={appForm.interviewDate}
                      onChange={(e) => setAppForm({ ...appForm, interviewDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field">
                    <label htmlFor="app-status">Application Status</label>
                    <select
                      id="app-status"
                      className="form-select"
                      value={appForm.status}
                      onChange={(e) => setAppForm({ ...appForm, status: e.target.value })}
                    >
                      {APPLICATION_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="app-result">Result</label>
                    <select
                      id="app-result"
                      className="form-select"
                      value={appForm.result}
                      onChange={(e) => setAppForm({ ...appForm, result: e.target.value })}
                    >
                      {APPLICATION_RESULTS.map((res) => (
                        <option key={res} value={res}>{res}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="app-notes">Preparation &amp; Interview Notes</label>
                  <textarea
                    id="app-notes"
                    className="form-textarea"
                    placeholder="e.g. Technical round covered SQL and React lifecycle hooks..."
                    value={appForm.notes}
                    onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAppModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cta-btn-primary">
                    {editingApp ? 'Save Changes' : 'Add Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default PlacementPreparation
