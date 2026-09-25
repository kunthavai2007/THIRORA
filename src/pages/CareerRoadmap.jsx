import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { readStorage } from '../utils/storage'
import { supabase } from '../lib/supabase'
import {
  resolveCareerContext,
} from '../utils/careerContext'
import { fetchStudentSkills } from '../services/skillService'

// =========================================================================
// 1. CENTRALIZED CAREER SKILL REQUIREMENTS SPECIFICATION
// =========================================================================
const careerSkillRequirements = {
  'Front-End Developer': [
    {
      name: 'HTML5 & Semantic Structure',
      aliases: ['html', 'html5', 'semantic html', 'web semantics'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 1,
      description: 'Semantic markup, accessibility tags, and clean DOM structure.',
    },
    {
      name: 'Modern CSS & Responsive Layouts',
      aliases: ['css', 'css3', 'flexbox', 'grid', 'css grid', 'tailwind', 'sass'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 2,
      description: 'Flexbox, CSS Grid systems, media queries, and mobile-first design.',
    },
    {
      name: 'Git & Version Control',
      aliases: ['git', 'github', 'version control', 'gitlab'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 3,
      description: 'Branching, staging, committing, and remote GitHub synchronization.',
    },
    {
      name: 'JavaScript (ES6+)',
      aliases: ['javascript', 'js', 'es6', 'ecmascript'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 4,
      description: 'Closures, prototypes, array methods, async programming, and DOM APIs.',
    },
    {
      name: 'Asynchronous JS & REST APIs',
      aliases: ['rest api', 'fetch', 'async javascript', 'ajax', 'apis', 'rest'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 5,
      description: 'Promises, async/await, HTTP error handling, and JSON data parsing.',
    },
    {
      name: 'Frontend Framework (React / Vue)',
      aliases: ['react', 'react.js', 'reactjs', 'vue', 'vue.js', 'next.js', 'angular'],
      requiredLevel: 'Advanced',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 6,
      description: 'Component architecture, state management, custom hooks, and lifecycles.',
    },
    {
      name: 'Frontend Performance & UI Architecture',
      aliases: ['ui/ux', 'web performance', 'accessibility', 'aria', 'responsive web design', 'css architecture'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 7,
      description: 'Asset optimization, rendering efficiency, and modular UI structure.',
    },
  ],

  'Full-Stack Developer': [
    {
      name: 'Web Fundamentals (HTML & CSS)',
      aliases: ['html', 'css', 'html/css', 'html5', 'css3'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 1,
      description: 'Semantic markup, layout styling, and cross-browser responsiveness.',
    },
    {
      name: 'Git & Branching Workflows',
      aliases: ['git', 'github', 'version control', 'gitlab'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 2,
      description: 'Branch management, pull requests, merge conflict resolution, and PR reviews.',
    },
    {
      name: 'JavaScript / TypeScript for Full-Stack',
      aliases: ['javascript', 'typescript', 'js', 'ts', 'es6'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 3,
      description: 'Asynchronous control flow, type systems, functional array methods, and Node syntax.',
    },
    {
      name: 'SQL & Database Design',
      aliases: ['sql', 'postgresql', 'mysql', 'database', 'rdbms', 'sqlite'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 4,
      description: 'Relational schema modeling, multi-table joins, primary/foreign keys, and transactions.',
    },
    {
      name: 'Backend Framework & APIs (Node / Express)',
      aliases: ['node', 'node.js', 'express', 'express.js', 'fastapi', 'django', 'backend'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 5,
      description: 'RESTful API routing, middleware controllers, authentication, and database connectors.',
    },
    {
      name: 'Frontend Framework (React / Next.js)',
      aliases: ['react', 'react.js', 'next.js', 'vue', 'frontend'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 6,
      description: 'Client-server integration, interactive UI state, and API consumption.',
    },
    {
      name: 'Database Indexing & Security (RLS)',
      aliases: ['database design', 'indexing', 'transactions', 'security', 'rls', 'row level security'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 7,
      description: 'Query optimization, SQL indexes, data encryption, and Row-Level Security.',
    },
  ],

  'Python Developer': [
    {
      name: 'Python Core Syntax & Data Structures',
      aliases: ['python', 'python3', 'core python'],
      requiredLevel: 'Advanced',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 1,
      description: 'Variables, loops, lists, dicts, comprehensions, generators, and standard modules.',
    },
    {
      name: 'Git Version Control & Documentation',
      aliases: ['git', 'github', 'version control'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 2,
      description: 'Repository structure, clean commit history, README documentation, and branching.',
    },
    {
      name: 'Object-Oriented Programming (OOP)',
      aliases: ['oop', 'object-oriented programming', 'object oriented', 'classes', 'inheritance'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 3,
      description: 'Classes, encapsulation, inheritance, polymorphism, dunder methods, and design patterns.',
    },
    {
      name: 'SQL & Database Adapters',
      aliases: ['sql', 'postgresql', 'sqlite', 'mysql', 'database', 'sqlalchemy', 'psycopg2'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 4,
      description: 'Relational data queries, parameterization, and database connectors in Python.',
    },
    {
      name: 'Data Structures & Algorithms (DSA)',
      aliases: ['dsa', 'data structures', 'algorithms', 'problem solving'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 5,
      description: 'Arrays, hash tables, stacks, queues, sorting algorithms, and complexity analysis.',
    },
    {
      name: 'Python Web Framework (Django / FastAPI / Flask)',
      aliases: ['django', 'fastapi', 'flask', 'python web', 'rest api'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 6,
      description: 'REST API endpoints, request validation, serialization, and ORM integration.',
    },
    {
      name: 'Software Testing & Automation',
      aliases: ['testing', 'pytest', 'unittest', 'automation', 'selenium', 'scripting'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 7,
      description: 'Unit testing with pytest, test suites, mocking, and automation scripts.',
    },
  ],

  'Data Analyst': [
    {
      name: 'Spreadsheets & Data Organization (Excel)',
      aliases: ['excel', 'spreadsheets', 'advanced excel', 'google sheets', 'pivot tables'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 1,
      description: 'Data cleaning, lookup formulas (VLOOKUP/XLOOKUP), pivot tables, and aggregations.',
    },
    {
      name: 'Git & Reproducible Analysis',
      aliases: ['git', 'github', 'version control'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 2,
      description: 'Version tracking for analysis scripts, notebooks, and dataset documentation.',
    },
    {
      name: 'SQL for Data Analysis',
      aliases: ['sql', 'postgresql', 'mysql', 'sqlite', 'database', 'data queries'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 3,
      description: 'Multi-table JOINs, GROUP BY aggregations, window functions, and subqueries.',
    },
    {
      name: 'Python for Data Analysis (Pandas & NumPy)',
      aliases: ['python', 'pandas', 'numpy', 'python for data analysis'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 4,
      description: 'DataFrame wrangling, series indexing, missing value handling, and statistical functions.',
    },
    {
      name: 'Applied Statistics & Quantitative Logic',
      aliases: ['statistics', 'applied statistics', 'probability', 'mathematics', 'stats', 'quantitative'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 5,
      description: 'Mean, median, standard deviation, distribution shapes, correlation, and hypothesis checks.',
    },
    {
      name: 'Data Visualization & BI Dashboards (Power BI / Tableau)',
      aliases: ['power bi', 'tableau', 'data visualization', 'matplotlib', 'seaborn', 'bi', 'dashboards'],
      requiredLevel: 'Advanced',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 6,
      description: 'Interactive business intelligence reports, KPI visualizations, and executive charts.',
    },
    {
      name: 'Exploratory Data Analysis (EDA)',
      aliases: ['eda', 'exploratory data analysis', 'data storytelling', 'data cleaning', 'analytics'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 7,
      description: 'Uncovering pattern insights, outlier detection, and data-backed findings.',
    },
  ],

  'Software Developer': [
    {
      name: 'Core Programming (Python / Java / C++ / JS)',
      aliases: ['python', 'java', 'c++', 'c#', 'javascript', 'c', 'core programming'],
      requiredLevel: 'Advanced',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 1,
      description: 'Syntax mastery, control flow, functions, modular architecture, and memory efficiency.',
    },
    {
      name: 'Git & Command Line Workflow',
      aliases: ['git', 'github', 'cli', 'version control', 'bash'],
      requiredLevel: 'Intermediate',
      stage: 'Foundation',
      stageNumber: 1,
      priority: 2,
      description: 'Repository management, branching, commit discipline, and command-line tools.',
    },
    {
      name: 'Object-Oriented Programming (OOP)',
      aliases: ['oop', 'object-oriented programming', 'object oriented', 'classes', 'polymorphism'],
      requiredLevel: 'Intermediate',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 3,
      description: 'Encapsulation, inheritance, polymorphism, interfaces, and modular class design.',
    },
    {
      name: 'SQL & Relational Database Queries',
      aliases: ['sql', 'relational database', 'database', 'mysql', 'postgresql', 'sqlite'],
      requiredLevel: 'Advanced',
      stage: 'Core Skills',
      stageNumber: 2,
      priority: 4,
      description: 'Database normalization, SELECT queries, JOIN operations, indexes, and transactions.',
    },
    {
      name: 'Data Structures & Algorithms (DSA)',
      aliases: ['dsa', 'data structures', 'algorithms', 'data structures and algorithms'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 5,
      description: 'Arrays, linked lists, trees, hash tables, graph traversals, and Big-O complexity.',
    },
    {
      name: 'Software Testing & Clean Code Architecture',
      aliases: ['software testing', 'testing', 'unit testing', 'ci/cd', 'design patterns', 'clean code'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 6,
      description: 'Unit testing, test-driven logic, modular interfaces, and readable clean code.',
    },
    {
      name: 'Problem Solving & System Logic',
      aliases: ['problem solving', 'competitive programming', 'system design', 'computer science'],
      requiredLevel: 'Intermediate',
      stage: 'Advanced Skills',
      stageNumber: 3,
      priority: 7,
      description: 'Algorithmic reasoning, edge-case analysis, and structured computational logic.',
    },
  ],
}

// =========================================================================
// 2. LEVEL & STRING NORMALIZATION HELPERS
// =========================================================================
const LEVEL_WEIGHTS = {
  'Not Found': 0,
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
}

function normalizeText(text) {
  return typeof text === 'string' ? text.trim().toLowerCase() : ''
}

function normalizeSkillName(name) {
  return typeof name === 'string'
    ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : ''
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

// =========================================================================
// 3. PURE SKILL GAP EVALUATION FUNCTIONS
// =========================================================================
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
      gapStatus, // 'Completed' | 'Improve' | 'Learn'
      stage: req.stage,
      stageNumber: req.stageNumber || 1,
      priority: req.priority,
      description: req.description,
      actionLink: '/academic-profile?tab=skills',
    }
  })
}

function getRecommendedLearningOrder(evaluatedGaps) {
  // Order only incomplete skills:
  // 1. Learn missing prerequisite/core skills first (gapStatus === 'Learn')
  // 2. Then Improve skills below required level (gapStatus === 'Improve')
  // 3. Within same category, order by requirement priority
  // 4. Completed skills do NOT appear as learning tasks
  const incomplete = evaluatedGaps.filter((g) => g.gapStatus !== 'Completed')

  return incomplete.sort((a, b) => {
    if (a.gapStatus === 'Learn' && b.gapStatus !== 'Learn') return -1
    if (a.gapStatus !== 'Learn' && b.gapStatus === 'Learn') return 1
    return a.priority - b.priority
  })
}

// =========================================================================
// 4. CAREER EVIDENCE EVALUATION (Projects, Certificates, Experience)
// =========================================================================
function checkProjects(projects, keywords = []) {
  if (!projects || projects.length === 0) return 'none'
  if (!keywords || keywords.length === 0) return 'completed'

  const hasMatching = projects.some((p) => {
    const techText = Array.isArray(p.technologies) ? p.technologies.join(' ').toLowerCase() : String(p.technologies || '').toLowerCase()
    const titleText = (p.title || '').toLowerCase()
    const descText = (p.description || '').toLowerCase()
    const fullText = `${titleText} ${descText} ${techText}`
    return keywords.some((k) => fullText.includes(normalizeText(k)))
  })

  if (hasMatching) return 'completed'
  return projects.length > 0 ? 'in_progress' : 'none'
}

function checkCertificates(certificates, keywords = []) {
  if (!certificates || certificates.length === 0) return 'none'
  if (!keywords || keywords.length === 0) return 'completed'

  const hasMatching = certificates.some((c) => {
    const text = `${c.name || c.title || ''} ${c.organization || c.issuer || ''}`.toLowerCase()
    return keywords.some((k) => text.includes(normalizeText(k)))
  })

  if (hasMatching) return 'completed'
  return certificates.length > 0 ? 'in_progress' : 'none'
}

function checkExperiences(experiences) {
  if (!experiences || experiences.length === 0) return 'none'
  return 'completed'
}

// Stage 4-6 Evidence Definitions for each Role
const careerEvidenceDefinitions = {
  'Front-End Developer': {
    projectKeywords: ['html', 'css', 'javascript', 'react', 'frontend', 'web', 'ui'],
    projectTitle: 'Interactive Frontend Portfolio Project',
    projectReqText: 'Build and record at least 1 frontend web application with interactive UI and API consumption.',
    experienceTitle: 'Frontend Internship or Workshop Experience',
    experienceReqText: 'Verified frontend internship, open source contributions, or practical web workshop.',
    certKeywords: ['frontend', 'web', 'javascript', 'react', 'css', 'html', 'meta', 'google'],
    certTitle: 'Web Development / Frontend Certification',
    certReqText: 'Industry-recognized credential in Modern Web Development, JavaScript, or Frontend Frameworks.',
  },
  'Full-Stack Developer': {
    projectKeywords: ['sql', 'database', 'backend', 'api', 'full-stack', 'fullstack', 'crud', 'node', 'express'],
    projectTitle: 'Full-Stack CRUD Application with Database',
    projectReqText: 'Complete web application connecting frontend UI, backend API, and persistent relational database.',
    experienceTitle: 'Software / Full-Stack Internship Experience',
    experienceReqText: 'Documented technical internship, practical workshop, or freelance development experience.',
    certKeywords: ['full stack', 'fullstack', 'cloud', 'aws', 'database', 'sql', 'node', 'web'],
    certTitle: 'Full-Stack / Database / Cloud Certification',
    certReqText: 'Certification in Full-Stack Web Development, Cloud Services (AWS/GCP), or Database Systems.',
  },
  'Python Developer': {
    projectKeywords: ['python', 'django', 'fastapi', 'flask', 'automation', 'script'],
    projectTitle: 'Python Application or Automation Tool Project',
    projectReqText: 'Build and document a functional Python utility, automation script, or REST API service.',
    experienceTitle: 'Python / Software Internship Experience',
    experienceReqText: 'Industry internship, open source Python contributions, or technical project work.',
    certKeywords: ['python', 'pcep', 'pcap', 'developer', 'software'],
    certTitle: 'Certified Python Developer / Associate Credential',
    certReqText: 'Python Institute (PCEP/PCAP) or Cloud Developer certification.',
  },
  'Data Analyst': {
    projectKeywords: ['data', 'analytics', 'sql', 'python', 'analysis', 'dataset', 'bi', 'excel'],
    projectTitle: 'Exploratory Data Analysis (EDA) Project on Public Dataset',
    projectReqText: 'Analyze a dataset, uncover 3 key business insights, and present visual chart findings.',
    experienceTitle: 'Data Analytics / Research Internship Experience',
    experienceReqText: 'Internship, data consulting workshop, or practical business intelligence role.',
    certKeywords: ['data', 'analytics', 'google', 'ibm', 'microsoft', 'sql', 'power bi', 'tableau'],
    certTitle: 'Google / Microsoft / IBM Data Analytics Certification',
    certReqText: 'Industry-recognized certification in Data Analytics, Power BI, or Business Intelligence.',
  },
  'Software Developer': {
    projectKeywords: ['software', 'developer', 'application', 'project', 'algorithm', 'system'],
    projectTitle: 'Modular Software Application Project',
    projectReqText: 'Develop a documented software application with clean commit history, OOP modularity, and tests.',
    experienceTitle: 'Software Engineering Internship Experience',
    experienceReqText: 'Documented industrial internship, open source contributions, or practical technical experience.',
    certKeywords: ['software', 'developer', 'cloud', 'aws', 'azure', 'gcp', 'java', 'python', 'oracle'],
    certTitle: 'Software Engineering / Cloud Associate Certification',
    certReqText: 'Certification in Software Development, Cloud Architecture, or Computer Science fundamentals.',
  },
}

// =========================================================================
// 5. FUNCTIONAL SVG ICONS (Clean, accessible, no decorative emojis)
// =========================================================================
function CheckCircleIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ClockIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function LockIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function ArrowRightIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function CompassIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function AwardIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

function BriefcaseIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function CodeIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function BookOpenIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function TrendingUpIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function TargetIcon({ className = 'roadmap-icon' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

// =========================================================================
// 6. MAIN COMPONENT
// =========================================================================
function CareerRoadmap() {
  const { careerContext: sharedCareerContext } = useAuth()
  const [data, setData] = useState({
    profile: {},
    skills: [],
    certificates: [],
    projects: [],
    experiences: [],
    attempts: [],
    topicPerformance: [],
    quizScore: null,
    hasEnoughData: false,
    loading: true,
  })

  // Load student data from Supabase with localStorage fallback
  const loadStudentData = useCallback(async () => {
    const localProfile = readStorage('academicProfile', {}, (v) => v !== null && typeof v === 'object' && !Array.isArray(v))
    const localSkills = readStorage('skills', [], Array.isArray)
    const localCertificates = readStorage('certificates', [], Array.isArray)
    const localProjects = readStorage('projects', [], Array.isArray)
    const localExperiences = readStorage('experiences', [], Array.isArray)
    const localAttempts = readStorage('quizAttempts', [], Array.isArray)
    const localQuizScore = readStorage('quizScore', null, (v) => Number.isInteger(v) && v >= 0 && v <= 5)

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
          quizScore: localQuizScore,
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

      let derivedQuizScore = null
      if (attemptsData.length > 0) {
        const latest = attemptsData[0]
        const latestTotal = Number(latest.total_questions) || Number(latest.total) || 0
        const latestScore = Number(latest.correct_answers ?? latest.score) || 0
        derivedQuizScore = latestTotal > 0 ? Math.round((latestScore / latestTotal) * 5) : 0
      } else if (localQuizScore !== null) {
        derivedQuizScore = localQuizScore
      }

      const evidenceCount = formattedSkills.length + formattedProjects.length + formattedCerts.length + formattedExperiences.length + attemptsData.length

      setData({
        profile: mergedProfile,
        skills: formattedSkills,
        certificates: formattedCerts,
        projects: formattedProjects,
        experiences: formattedExperiences,
        attempts: attemptsData,
        topicPerformance,
        quizScore: derivedQuizScore,
        hasEnoughData: evidenceCount > 0,
        loading: false,
      })
    } catch (err) {
      console.error('Unexpected error loading roadmap data:', err)
      setData({
        profile: localProfile,
        skills: localSkills,
        certificates: localCertificates,
        projects: localProjects,
        experiences: localExperiences,
        attempts: localAttempts,
        topicPerformance: [],
        quizScore: localQuizScore,
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

  // 1. Unified Career Context Resolution (shared canonical context)
  const resolvedCareerContext = sharedCareerContext || resolveCareerContext({
    profile: data.profile,
    skills: data.skills,
    certificates: data.certificates,
    projects: data.projects,
    experiences: data.experiences,
    quizAttempts: data.attempts,
    topicPerformance: data.topicPerformance,
    explicitGoal: data.profile?.careerGoal || data.profile?.career_goal,
  })

  const targetCareer = resolvedCareerContext.track
  const hasSupportedCareerContext = resolvedCareerContext.hasContext

  // 2. Evaluate Explicit Skill Gaps for the Selected Career Goal
  const evaluatedGaps = useMemo(() => {
    if (!targetCareer) return []
    const requiredSkills = careerSkillRequirements[targetCareer] || []
    return evaluateSkillGaps(data.skills, requiredSkills)
  }, [targetCareer, data.skills])

  // 3. Derived Skill Gap Summary (Completed, Improve, Learn)
  const gapSummary = useMemo(() => {
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

  // 4. Recommended Learning Order (Incomplete Skills Sorted by Priority)
  const recommendedLearningOrder = useMemo(() => {
    return getRecommendedLearningOrder(evaluatedGaps)
  }, [evaluatedGaps])

  // 5. Build and Evaluate the 6-Stage Roadmap Connected to Skill Gaps and Career Evidence
  const evaluatedRoadmap = useMemo(() => {
    const evidenceConfig = careerEvidenceDefinitions[targetCareer] || careerEvidenceDefinitions['Software Developer']

    // Group evaluated skill gaps by stage
    const foundationSkills = evaluatedGaps.filter((g) => g.stage === 'Foundation')
    const coreSkills = evaluatedGaps.filter((g) => g.stage === 'Core Skills')
    const advancedSkills = evaluatedGaps.filter((g) => g.stage === 'Advanced Skills')

    // Helper to map gapStatus to roadmap status
    const mapGapStatus = (gap) => {
      if (gap.gapStatus === 'Completed') return 'Completed'
      if (gap.gapStatus === 'Improve') return 'In Progress'
      return 'Not Started'
    }

    const stagesConfig = [
      {
        stageNumber: 1,
        stageTitle: 'Foundation',
        stageSubtitle: 'Core syntax, fundamental markup & version control discipline',
        items: foundationSkills.map((gap, idx) => ({
          id: `stage1-${idx + 1}`,
          title: gap.skillName,
          requirementText: `${gap.description} (Target: ${gap.requiredLevel} | Current: ${gap.currentLevel})`,
          status: mapGapStatus(gap),
          gapStatus: gap.gapStatus,
          currentLevel: gap.currentLevel,
          requiredLevel: gap.requiredLevel,
          category: 'skill',
          actionLink: gap.actionLink,
          actionLabel: gap.gapStatus === 'Learn' ? 'Add Skill' : gap.gapStatus === 'Improve' ? 'Improve Skill' : 'Verified',
        })),
      },
      {
        stageNumber: 2,
        stageTitle: 'Core Skills',
        stageSubtitle: 'Programming logic, relational database queries & architecture',
        items: coreSkills.map((gap, idx) => ({
          id: `stage2-${idx + 1}`,
          title: gap.skillName,
          requirementText: `${gap.description} (Target: ${gap.requiredLevel} | Current: ${gap.currentLevel})`,
          status: mapGapStatus(gap),
          gapStatus: gap.gapStatus,
          currentLevel: gap.currentLevel,
          requiredLevel: gap.requiredLevel,
          category: 'skill',
          actionLink: gap.actionLink,
          actionLabel: gap.gapStatus === 'Learn' ? 'Add Skill' : gap.gapStatus === 'Improve' ? 'Improve Skill' : 'Verified',
        })),
      },
      {
        stageNumber: 3,
        stageTitle: 'Advanced Skills',
        stageSubtitle: 'Frameworks, data structures, testing & specialized tools',
        items: advancedSkills.map((gap, idx) => ({
          id: `stage3-${idx + 1}`,
          title: gap.skillName,
          requirementText: `${gap.description} (Target: ${gap.requiredLevel} | Current: ${gap.currentLevel})`,
          status: mapGapStatus(gap),
          gapStatus: gap.gapStatus,
          currentLevel: gap.currentLevel,
          requiredLevel: gap.requiredLevel,
          category: 'skill',
          actionLink: gap.actionLink,
          actionLabel: gap.gapStatus === 'Learn' ? 'Add Skill' : gap.gapStatus === 'Improve' ? 'Improve Skill' : 'Verified',
        })),
      },
      {
        stageNumber: 4,
        stageTitle: 'Projects & Experience',
        stageSubtitle: 'Practical application repos, real databases & industry work',
        items: [
          {
            id: 'stage4-1',
            title: evidenceConfig.projectTitle,
            requirementText: evidenceConfig.projectReqText,
            category: 'project',
            actionLink: '/academic-profile?tab=projects',
            actionLabel: 'Add Project',
            status: (() => {
              const res = checkProjects(data.projects, evidenceConfig.projectKeywords)
              if (res === 'completed') return 'Completed'
              if (res === 'in_progress') return 'In Progress'
              return 'Not Started'
            })(),
          },
          {
            id: 'stage4-2',
            title: evidenceConfig.experienceTitle,
            requirementText: evidenceConfig.experienceReqText,
            category: 'experience',
            actionLink: '/academic-profile?tab=experience',
            actionLabel: 'Add Experience',
            status: (() => {
              const res = checkExperiences(data.experiences)
              if (res === 'completed') return 'Completed'
              return data.projects.length >= 2 ? 'In Progress' : 'Not Started'
            })(),
          },
        ],
      },
      {
        stageNumber: 5,
        stageTitle: 'Certifications',
        stageSubtitle: 'Verified industry credentials & professional validations',
        items: [
          {
            id: 'stage5-1',
            title: evidenceConfig.certTitle,
            requirementText: evidenceConfig.certReqText,
            category: 'certificate',
            actionLink: '/academic-profile?tab=certificates',
            actionLabel: 'Add Certificate',
            status: (() => {
              const res = checkCertificates(data.certificates, evidenceConfig.certKeywords)
              if (res === 'completed') return 'Completed'
              return data.certificates.length > 0 ? 'In Progress' : 'Not Started'
            })(),
          },
        ],
      },
      {
        stageNumber: 6,
        stageTitle: 'Placement Ready',
        stageSubtitle: 'ATS resume, technical assessment consistency & campus readiness',
        items: [
          {
            id: 'stage6-1',
            title: 'Technical Resume & Verified Portfolio Profile',
            requirementText: 'Completed academic foundation + documented project portfolio and formatted resume.',
            category: 'placement',
            actionLink: '/resume-builder',
            actionLabel: 'Build Resume',
            status: (() => {
              const hasProfile = Boolean(data.profile?.department || data.profile?.collegeName || data.profile?.college_name)
              const hasPortfolio = data.projects.length >= 1 && data.skills.length >= 3
              if (hasProfile && hasPortfolio) return 'Completed'
              if (hasProfile || hasPortfolio) return 'In Progress'
              return 'Not Started'
            })(),
          },
          {
            id: 'stage6-2',
            title: 'Technical Assessment & Problem Solving Verification',
            requirementText: 'Completed weekly technical quizzes demonstrating multi-topic competence.',
            category: 'quiz',
            actionLink: '/weekly-quiz',
            actionLabel: 'Take Quiz',
            status: (() => {
              if (data.attempts.length >= 2 && (data.quizScore === null || data.quizScore >= 3)) return 'Completed'
              if (data.attempts.length >= 1) return 'In Progress'
              return 'Not Started'
            })(),
          },
        ],
      },
    ]

    const stageResults = stagesConfig.map((stage) => {
      const stageCompleted = stage.items.filter((i) => i.status === 'Completed').length
      const stageInProgress = stage.items.filter((i) => i.status === 'In Progress').length
      const isStageComplete = stageCompleted === stage.items.length

      return {
        ...stage,
        completedCount: stageCompleted,
        inProgressCount: stageInProgress,
        totalCount: stage.items.length,
        isStageComplete,
      }
    })

    const allItems = stageResults.flatMap((s) => s.items)
    const totalItemsCount = allItems.length
    const completedCount = allItems.filter((i) => i.status === 'Completed').length
    const inProgressCount = allItems.filter((i) => i.status === 'In Progress').length

    const activeStage = stageResults.find((s) => !s.isStageComplete) || stageResults[stageResults.length - 1]
    const nextRecommendedStep = allItems.find((i) => i.status !== 'Completed') || null

    const overallPercentage = totalItemsCount > 0
      ? Math.round(((completedCount * 1.0 + inProgressCount * 0.5) / totalItemsCount) * 100)
      : 0

    return {
      stages: stageResults,
      totalItemsCount,
      completedCount,
      inProgressCount,
      overallPercentage,
      currentStage: activeStage,
      nextRecommendedStep,
    }
  }, [targetCareer, evaluatedGaps, data])

  if (data.loading) {
    return (
      <main className="roadmap-page">
        <div className="roadmap-shell">
          <div className="roadmap-loading-state">
            <CompassIcon className="roadmap-spin-icon" />
            <p>Loading your personalized career skill gap roadmap...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="roadmap-page">
      <div className="roadmap-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        {/* Page Header */}
        <header className="roadmap-header">
          <div className="roadmap-header-top">
            <div>
              <p className="eyebrow">Personalized Career Gap Roadmap</p>
              <h1>Career Roadmap &amp; Skill Gap Analysis</h1>
              <p className="roadmap-header-subtitle">
                An evidence-based milestone tracker comparing your verified skills against target industry requirements, with recommended learning priorities.
              </p>
            </div>
          </div>
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

        {/* Empty State when student has no data */}
        {!data.hasEnoughData ? (
          <section className="roadmap-empty-section">
            <div className="roadmap-empty-card">
              <div className="roadmap-empty-icon-wrap">
                <CompassIcon />
              </div>
              <h2>Your profile does not have enough data yet.</h2>
              <p>
                Add your skills, projects, certificates, or quiz results to build your personalized roadmap.
              </p>
              <div className="roadmap-empty-actions">
                <Link to="/academic-profile?tab=skills" className="roadmap-btn roadmap-btn-primary">
                  <BookOpenIcon /> Add Skills
                </Link>
                <Link to="/weekly-quiz" className="roadmap-btn roadmap-btn-secondary">
                  <CodeIcon /> Take Weekly Quiz
                </Link>
                <Link to="/academic-profile?tab=projects" className="roadmap-btn roadmap-btn-secondary">
                  <BriefcaseIcon /> Add Project
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Top Metrics Dashboard Grid */}
            <section className="roadmap-overview-grid" aria-label="Roadmap progress overview">
              {/* Card 1: Target Career */}
              <div className="roadmap-stat-card">
                <span className="roadmap-stat-label">Career Goal</span>
                <div className="roadmap-stat-main">
                  <strong>{targetCareer}</strong>
                  <span className="roadmap-tag-pill">
                    {resolvedCareerContext.sourceLabel}
                  </span>
                </div>
                <small className="roadmap-stat-note">
                  {gapSummary.completedCount} of {gapSummary.totalCount} required skills met
                </small>
              </div>

              {/* Card 2: Overall Progress Percentage */}
              <div className="roadmap-stat-card">
                <span className="roadmap-stat-label">Overall Milestone Progress</span>
                <div className="roadmap-stat-progress-wrap">
                  <div className="roadmap-stat-progress-num">
                    <strong>{evaluatedRoadmap.overallPercentage}%</strong>
                    <small>{evaluatedRoadmap.completedCount} of {evaluatedRoadmap.totalItemsCount} milestones completed</small>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Overall roadmap progress"
                    aria-valuenow={evaluatedRoadmap.overallPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${evaluatedRoadmap.overallPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Current Stage */}
              <div className="roadmap-stat-card">
                <span className="roadmap-stat-label">Current Active Stage</span>
                <div className="roadmap-stat-main">
                  <strong>Stage {evaluatedRoadmap.currentStage?.stageNumber}: {evaluatedRoadmap.currentStage?.stageTitle}</strong>
                  <span className="roadmap-stage-badge">
                    {evaluatedRoadmap.currentStage?.completedCount} / {evaluatedRoadmap.currentStage?.totalCount} Done
                  </span>
                </div>
                <small className="roadmap-stat-note">
                  {evaluatedRoadmap.currentStage?.stageSubtitle}
                </small>
              </div>
            </section>

            {/* ============================================================= */}
            {/* 5. PERSONALIZED SKILL GAP SUMMARY SECTION                     */}
            {/* ============================================================= */}
            <section className="roadmap-stat-card" style={{ padding: '26px' }} aria-labelledby="skill-gap-heading">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <span className="roadmap-stat-label">Personalized Skill Gap</span>
                  <h2 id="skill-gap-heading" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    Your Skill Gap Analysis for {targetCareer}
                  </h2>
                </div>
                <span className="roadmap-tag-pill" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                  Target: {targetCareer}
                </span>
              </div>

              {/* 3-Column Skill Breakdown Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '12px' }}>
                {/* Completed Skills */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ color: 'var(--success-color)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircleIcon /> Completed Skills ({gapSummary.completedCount})
                    </strong>
                    <span className="badge-item-completed roadmap-item-badge">Verified</span>
                  </div>
                  {gapSummary.completed.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No completed skills yet for this role.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {gapSummary.completed.map((s) => (
                        <li key={s.skillName} style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>{s.skillName}</strong></span>
                          <span style={{ color: 'var(--text-secondary)' }}>{s.currentLevel} (Req: {s.requiredLevel})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Skills to Improve */}
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ color: 'var(--warning-color)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUpIcon /> Skills to Improve ({gapSummary.improveCount})
                    </strong>
                    <span className="badge-item-in-progress roadmap-item-badge">Level Up</span>
                  </div>
                  {gapSummary.improve.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All added skills meet required levels!</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {gapSummary.improve.map((s) => (
                        <li key={s.skillName} style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>{s.skillName}</strong></span>
                          <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>{s.currentLevel} &rarr; {s.requiredLevel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Skills to Learn */}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ color: 'var(--accent-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TargetIcon /> Skills to Learn ({gapSummary.learnCount})
                    </strong>
                    <span className="badge-item-not-started roadmap-item-badge">Missing</span>
                  </div>
                  {gapSummary.learn.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All required skills are added to your profile!</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {gapSummary.learn.map((s) => (
                        <li key={s.skillName} style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>{s.skillName}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>Not Found &rarr; {s.requiredLevel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* ============================================================= */}
            {/* 6. SKILL LEVEL COMPARISON TABLE                               */}
            {/* ============================================================= */}
            <section className="roadmap-timeline-section" aria-labelledby="comparison-table-heading">
              <div className="roadmap-section-header">
                <div>
                  <p className="roadmap-section-eyebrow">Skill Level Comparison</p>
                  <h2 id="comparison-table-heading">Current vs. Required Skill Proficiency</h2>
                </div>
                <div className="roadmap-legend">
                  <span className="roadmap-legend-item">
                    <CheckCircleIcon className="roadmap-icon-completed" /> Completed ({gapSummary.completedCount})
                  </span>
                  <span className="roadmap-legend-item">
                    <ClockIcon className="roadmap-icon-progress" /> Improve ({gapSummary.improveCount})
                  </span>
                  <span className="roadmap-legend-item">
                    <LockIcon className="roadmap-icon-locked" /> Learn ({gapSummary.learnCount})
                  </span>
                </div>
              </div>

              {/* Responsive Comparison Table Container */}
              <div className="roadmap-stage-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '14px 20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Required Skill</th>
                        <th style={{ padding: '14px 20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Current Level</th>
                        <th style={{ padding: '14px 20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Required Level</th>
                        <th style={{ padding: '14px 20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Gap Status</th>
                        <th style={{ padding: '14px 20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatedGaps.map((gap) => {
                        const statusClass =
                          gap.gapStatus === 'Completed'
                            ? 'item-completed'
                            : gap.gapStatus === 'Improve'
                              ? 'item-in-progress'
                              : 'item-not-started'

                        return (
                          <tr
                            key={gap.skillName}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: gap.gapStatus === 'Completed' ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                              transition: 'background 120ms ease',
                            }}
                          >
                            <td style={{ padding: '14px 20px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              <div>
                                {gap.skillName}
                                <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Stage: {gap.stage}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '0.84rem', color: gap.currentLevel === 'Not Found' ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: gap.currentLevel !== 'Not Found' ? 700 : 500 }}>
                              {gap.currentLevel}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '0.84rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                              {gap.requiredLevel}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span className={`roadmap-item-badge badge-${statusClass}`}>
                                {gap.gapStatus}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              {gap.gapStatus === 'Completed' ? (
                                <span className="roadmap-verified-label">
                                  <CheckCircleIcon /> Verified
                                </span>
                              ) : (
                                <Link to={gap.actionLink} className="roadmap-item-btn">
                                  <span>{gap.gapStatus === 'Learn' ? 'Add Skill' : 'Improve'}</span>
                                  <ArrowRightIcon />
                                </Link>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ============================================================= */}
            {/* 7. RECOMMENDED LEARNING ORDER SECTION                         */}
            {/* ============================================================= */}
            {recommendedLearningOrder.length > 0 && (
              <section className="roadmap-timeline-section" aria-labelledby="learning-order-heading">
                <div className="roadmap-section-header">
                  <div>
                    <p className="roadmap-section-eyebrow">Targeted Learning Roadmap</p>
                    <h2 id="learning-order-heading">Recommended Learning Order</h2>
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {recommendedLearningOrder.length} prioritized learning action(s) to close your skill gap
                  </small>
                </div>

                <div className="roadmap-stages-container">
                  <div className="roadmap-stage-card" style={{ padding: '22px 24px' }}>
                    <div className="roadmap-items-list">
                      {recommendedLearningOrder.map((task, idx) => (
                        <div
                          key={task.skillName}
                          className={`roadmap-item-row ${task.gapStatus === 'Improve' ? 'item-in-progress' : 'item-not-started'}`}
                        >
                          {/* Step Number Badge */}
                          <div className="roadmap-item-icon-col">
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: task.gapStatus === 'Learn' ? 'var(--accent-light)' : 'var(--warning-bg)',
                                color: task.gapStatus === 'Learn' ? 'var(--accent-primary)' : 'var(--warning-color)',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                              }}
                            >
                              0{idx + 1}
                            </span>
                          </div>

                          {/* Task Description */}
                          <div className="roadmap-item-body">
                            <div className="roadmap-item-title-row">
                              <h4>{task.skillName}</h4>
                              <span
                                className={`roadmap-item-badge ${
                                  task.gapStatus === 'Learn' ? 'badge-item-not-started' : 'badge-item-in-progress'
                                }`}
                              >
                                {task.gapStatus === 'Learn' ? 'Learn from Scratch' : 'Improve Proficiency'}
                              </span>
                            </div>
                            <p>
                              Progression: <strong>{task.currentLevel}</strong> &rarr; <strong>{task.requiredLevel}</strong> &bull; Stage: {task.stage} &bull; {task.description}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div className="roadmap-item-action-col">
                            <Link to={task.actionLink} className="roadmap-item-btn">
                              <span>{task.gapStatus === 'Learn' ? 'Add Skill' : 'Level Up'}</span>
                              <ArrowRightIcon />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Next Recommended Step Banner */}
            {evaluatedRoadmap.nextRecommendedStep && (
              <section className="roadmap-next-step-card" aria-label="Next recommended milestone action">
                <div className="roadmap-next-step-badge">
                  <span>Earliest Incomplete Milestone</span>
                </div>
                <div className="roadmap-next-step-content">
                  <div className="roadmap-next-step-text">
                    <h3>
                      {evaluatedRoadmap.nextRecommendedStep.title}
                    </h3>
                    <p>{evaluatedRoadmap.nextRecommendedStep.requirementText}</p>
                  </div>
                  <Link
                    to={evaluatedRoadmap.nextRecommendedStep.actionLink}
                    className="roadmap-btn roadmap-btn-action"
                  >
                    <span>{evaluatedRoadmap.nextRecommendedStep.actionLabel}</span>
                    <ArrowRightIcon />
                  </Link>
                </div>
              </section>
            )}

            {/* ============================================================= */}
            {/* 8. FULL 6-STAGE ORDERED CAREER PROGRESSION TIMELINE           */}
            {/* ============================================================= */}
            <section className="roadmap-timeline-section" aria-labelledby="roadmap-stages-heading">
              <div className="roadmap-section-header">
                <div>
                  <p className="roadmap-section-eyebrow">Full 6-Stage Ordered Progression</p>
                  <h2 id="roadmap-stages-heading">Milestone Progression Timeline</h2>
                </div>
                <div className="roadmap-legend">
                  <span className="roadmap-legend-item">
                    <CheckCircleIcon className="roadmap-icon-completed" /> Completed
                  </span>
                  <span className="roadmap-legend-item">
                    <ClockIcon className="roadmap-icon-progress" /> In Progress
                  </span>
                  <span className="roadmap-legend-item">
                    <LockIcon className="roadmap-icon-locked" /> Not Started
                  </span>
                </div>
              </div>

              <div className="roadmap-stages-container">
                {evaluatedRoadmap.stages.map((stage) => {
                  const isComplete = stage.isStageComplete
                  return (
                    <article
                      key={stage.stageNumber}
                      className={`roadmap-stage-card ${isComplete ? 'roadmap-stage-completed' : ''}`}
                    >
                      {/* Stage Card Header */}
                      <div className="roadmap-stage-header">
                        <div className="roadmap-stage-title-wrap">
                          <span className="roadmap-stage-num-mark">0{stage.stageNumber}</span>
                          <div>
                            <h3>
                              Stage {stage.stageNumber}: {stage.stageTitle}
                            </h3>
                            <p>{stage.stageSubtitle}</p>
                          </div>
                        </div>

                        <div className="roadmap-stage-status-wrap">
                          <span className={`roadmap-stage-status-pill ${isComplete ? 'pill-completed' : 'pill-active'}`}>
                            {stage.completedCount} / {stage.totalCount} Completed
                          </span>
                        </div>
                      </div>

                      {/* Stage Items Grid */}
                      <div className="roadmap-items-list">
                        {stage.items.map((item) => {
                          const statusClass =
                            item.status === 'Completed'
                              ? 'item-completed'
                              : item.status === 'In Progress'
                                ? 'item-in-progress'
                                : 'item-not-started'

                          return (
                            <div key={item.id} className={`roadmap-item-row ${statusClass}`}>
                              {/* Left status icon */}
                              <div className="roadmap-item-icon-col">
                                {item.status === 'Completed' && (
                                  <CheckCircleIcon className="roadmap-icon-completed" />
                                )}
                                {item.status === 'In Progress' && (
                                  <ClockIcon className="roadmap-icon-progress" />
                                )}
                                {item.status === 'Not Started' && (
                                  <LockIcon className="roadmap-icon-locked" />
                                )}
                              </div>

                              {/* Center item details */}
                              <div className="roadmap-item-body">
                                <div className="roadmap-item-title-row">
                                  <h4>{item.title}</h4>
                                  <span className={`roadmap-item-badge badge-${statusClass}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p>{item.requirementText}</p>
                              </div>

                              {/* Right action button */}
                              <div className="roadmap-item-action-col">
                                {item.status !== 'Completed' ? (
                                  <Link to={item.actionLink} className="roadmap-item-btn">
                                    <span>{item.actionLabel}</span>
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

            {/* Quick Summary Evidence Footer */}
            <section className="roadmap-evidence-footer" aria-label="Career evidence summary">
              <div className="roadmap-evidence-card">
                <div className="roadmap-evidence-header">
                  <AwardIcon />
                  <h4>Verified Career Evidence Summary</h4>
                </div>
                <div className="roadmap-evidence-pills">
                  <span>Saved Skills: <strong>{data.skills.length}</strong></span>
                  <span>Projects: <strong>{data.projects.length}</strong></span>
                  <span>Certificates: <strong>{data.certificates.length}</strong></span>
                  <span>Internships: <strong>{data.experiences.length}</strong></span>
                  <span>Quiz Attempts: <strong>{data.attempts.length}</strong></span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default CareerRoadmap
