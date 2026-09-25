/**
 * THIRORA - Unified Career Context Resolution System
 * 
 * Provides consistent career-context resolution across all modules:
 * 1. Career Recommendations
 * 2. Career Roadmap
 * 3. Overall Progress
 * 4. Job Matching
 * 5. Placement Preparation
 * 6. Resume Builder
 * 
 * Priority Hierarchy:
 * 1. Explicit Career Goal selected by student (UI override / active selector)
 * 2. Target Career Goal / Target Role stored in student profile
 * 3. Actual student evidence (skills, certificates, projects, experience, quiz performance)
 * 4. Student Department fallback (if supported)
 * 
 * For unsupported/unknown: returns null with standard guidance message.
 */

// 5 Standard Supported THIRORA Career Tracks
export const CAREER_TRACKS = [
  'Front-End Developer',
  'Full-Stack Developer',
  'Python Developer',
  'Data Analyst',
  'Software Developer',
]

// Role Aliases for standardizing raw role strings
export const ROLE_ALIASES = {
  'frontend': 'Front-End Developer',
  'front-end': 'Front-End Developer',
  'frontend developer': 'Front-End Developer',
  'front-end developer': 'Front-End Developer',
  'frontend engineer': 'Front-End Developer',
  'front-end engineer': 'Front-End Developer',
  'ui developer': 'Front-End Developer',
  'ui/ux developer': 'Front-End Developer',
  'web developer': 'Front-End Developer',
  'fullstack': 'Full-Stack Developer',
  'full-stack': 'Full-Stack Developer',
  'full stack': 'Full-Stack Developer',
  'fullstack developer': 'Full-Stack Developer',
  'full-stack developer': 'Full-Stack Developer',
  'full stack developer': 'Full-Stack Developer',
  'fullstack engineer': 'Full-Stack Developer',
  'full-stack engineer': 'Full-Stack Developer',
  'python': 'Python Developer',
  'python developer': 'Python Developer',
  'python engineer': 'Python Developer',
  'python programmer': 'Python Developer',
  'data analyst': 'Data Analyst',
  'business analyst': 'Data Analyst',
  'data analysis': 'Data Analyst',
  'data analytics': 'Data Analyst',
  'analytics': 'Data Analyst',
  'software developer': 'Software Developer',
  'software engineer': 'Software Developer',
  'swe': 'Software Developer',
  'sde': 'Software Developer',
  'programmer': 'Software Developer',
}

// Department to Standard Track Mapping for Fallback Context (Priority 4)
export const DEPARTMENT_TRACK_MAP = {
  'computer science': 'Software Developer',
  'computer science and engineering': 'Software Developer',
  'cse': 'Software Developer',
  'information technology': 'Software Developer',
  'it': 'Software Developer',
  'software engineering': 'Software Developer',
  'computer engineering': 'Software Developer',
  'computing': 'Software Developer',
  'computer applications': 'Software Developer',
  'mca': 'Software Developer',
  'bca': 'Software Developer',
  'data science': 'Data Analyst',
  'data analytics': 'Data Analyst',
  'artificial intelligence': 'Data Analyst',
  'ai': 'Data Analyst',
  'ai & ds': 'Data Analyst',
  'ai and ds': 'Data Analyst',
  'ai and data science': 'Data Analyst',
  'machine learning': 'Data Analyst',
  'statistics': 'Data Analyst',
  'mathematics': 'Data Analyst',
  'business analytics': 'Data Analyst',
  'web design': 'Front-End Developer',
  'web development': 'Front-End Developer',
  'multimedia': 'Front-End Developer',
  'ui design': 'Front-End Developer',
  'python programming': 'Python Developer',
  'computational science': 'Python Developer',
}

// Base role skill requirements for evidence matching
export const BASE_ROLE_REQUIREMENTS = {
  'Front-End Developer': ['HTML', 'CSS', 'JavaScript'],
  'Full-Stack Developer': ['JavaScript', 'SQL', 'Git'],
  'Python Developer': ['Python', 'Git'],
  'Data Analyst': ['SQL', 'Python'],
  'Software Developer': ['JavaScript', 'Python', 'Git'],
}

// Domain evidence keywords for project & certificate scoring
export const DOMAIN_EVIDENCE_KEYWORDS = {
  'Front-End Developer': {
    skills: ['html', 'css', 'javascript', 'react', 'vue', 'tailwind', 'sass', 'ui', 'frontend', 'angular', 'next.js', 'typescript'],
    projects: ['html', 'css', 'javascript', 'react', 'frontend', 'web', 'ui', 'responsive', 'portfolio', 'website'],
    certs: ['frontend', 'web', 'javascript', 'react', 'css', 'html', 'meta', 'google', 'ui'],
  },
  'Full-Stack Developer': {
    skills: ['javascript', 'sql', 'git', 'node', 'express', 'postgresql', 'mongodb', 'fullstack', 'react', 'django', 'fastapi', 'rest api', 'backend'],
    projects: ['sql', 'database', 'backend', 'api', 'full-stack', 'fullstack', 'crud', 'node', 'express', 'rest'],
    certs: ['full stack', 'fullstack', 'cloud', 'aws', 'database', 'sql', 'node', 'web'],
  },
  'Python Developer': {
    skills: ['python', 'django', 'fastapi', 'flask', 'git', 'oop', 'pytest', 'automation', 'scripting'],
    projects: ['python', 'django', 'fastapi', 'flask', 'automation', 'script', 'bot', 'backend'],
    certs: ['python', 'pcep', 'pcap', 'developer', 'software'],
  },
  'Data Analyst': {
    skills: ['sql', 'python', 'excel', 'pandas', 'numpy', 'power bi', 'tableau', 'statistics', 'eda', 'analytics', 'data analysis', 'visualization'],
    projects: ['data', 'analytics', 'sql', 'python', 'analysis', 'dataset', 'bi', 'excel', 'pandas', 'visualization', 'dashboard'],
    certs: ['data', 'analytics', 'google', 'ibm', 'microsoft', 'sql', 'power bi', 'tableau'],
  },
  'Software Developer': {
    skills: ['javascript', 'python', 'java', 'c++', 'c', 'git', 'sql', 'dsa', 'oop', 'system design', 'algorithms', 'software engineering'],
    projects: ['software', 'developer', 'application', 'project', 'algorithm', 'system', 'crud', 'desktop', 'backend', 'fullstack'],
    certs: ['software', 'developer', 'cloud', 'aws', 'azure', 'gcp', 'java', 'python', 'oracle', 'cs50'],
  },
}

export function normalizeText(text) {
  return typeof text === 'string' ? text.trim().toLowerCase() : ''
}

export function normalizeSkillName(name) {
  return typeof name === 'string'
    ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : ''
}

/**
 * Standardize raw role string into one of the 5 supported career tracks.
 */
export function standardizeCareerRole(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') return null
  const trimmed = rawRole.trim()
  if (CAREER_TRACKS.includes(trimmed)) return trimmed

  const cleaned = normalizeText(trimmed)
  if (ROLE_ALIASES[cleaned]) return ROLE_ALIASES[cleaned]

  const match = CAREER_TRACKS.find((role) => normalizeText(role) === cleaned)
  return match || null
}

/**
 * Resolve department string into supported career track if available.
 */
export function resolveDepartmentTrack(department) {
  if (!department || typeof department !== 'string') return null
  const cleaned = normalizeText(department)
  if (!cleaned) return null

  if (DEPARTMENT_TRACK_MAP[cleaned]) {
    return DEPARTMENT_TRACK_MAP[cleaned]
  }

  // Substring / partial match on known department keys
  for (const [deptKey, track] of Object.entries(DEPARTMENT_TRACK_MAP)) {
    if (cleaned.includes(deptKey) || deptKey.includes(cleaned)) {
      return track
    }
  }

  return null
}

/**
 * Analyze available student evidence to infer the best supported career track.
 * Returns { topTrack: string | null, score: number, scoresByTrack: object }
 */
export function analyzeStudentEvidence({
  skills = [],
  certificates = [],
  projects = [],
  experiences = [],
  quizAttempts = [],
  topicPerformance = [],
}) {
  const scoresByTrack = {}
  let maxScore = 0
  let topTrack = null

  const savedSkillNames = skills.map((s) => normalizeText(s.name || s.skill_name || ''))
  const projectTexts = projects.map((p) => {
    const tech = Array.isArray(p.technologies) ? p.technologies.join(' ') : String(p.technologies || '')
    return `${p.title || ''} ${p.description || ''} ${tech}`.toLowerCase()
  })
  const certTexts = certificates.map((c) => {
    return `${c.title || c.name || c.certificate_name || ''} ${c.issuer || c.organization || c.issuing_organization || ''}`.toLowerCase()
  })
  const combinedTopics = topicPerformance.length > 0
    ? topicPerformance
    : quizAttempts.flatMap((a) => a.topicPerformance || [])

  const strongTopics = combinedTopics
    .filter((t) => Number(t.percentage) >= 70 || (Number(t.total) >= 2 && Number(t.percentage) >= 65))
    .map((t) => normalizeText(t.topic || ''))

  CAREER_TRACKS.forEach((track) => {
    const config = DOMAIN_EVIDENCE_KEYWORDS[track] || { skills: [], projects: [], certs: [] }
    let score = 0

    // 1. Matched skills (3 points each)
    config.skills.forEach((keyword) => {
      const cleanKeyword = normalizeText(keyword)
      if (savedSkillNames.some((s) => s.includes(cleanKeyword) || cleanKeyword.includes(s))) {
        score += 3
      }
    })

    // 2. Strong quiz topics (2 points each)
    config.skills.forEach((keyword) => {
      const cleanKeyword = normalizeText(keyword)
      if (strongTopics.some((t) => t.includes(cleanKeyword) || cleanKeyword.includes(t))) {
        score += 2
      }
    })

    // 3. Relevant projects (2 points each)
    config.projects.forEach((keyword) => {
      const cleanKeyword = normalizeText(keyword)
      if (projectTexts.some((text) => text.includes(cleanKeyword))) {
        score += 2
      }
    })

    // 4. Relevant certificates (2 points each)
    config.certs.forEach((keyword) => {
      const cleanKeyword = normalizeText(keyword)
      if (certTexts.some((text) => text.includes(cleanKeyword))) {
        score += 2
      }
    })

    // 5. Relevant experiences (2 points each for domain match)
    experiences.forEach((exp) => {
      const expSkills = Array.isArray(exp.skills) ? exp.skills.join(' ') : String(exp.skills || '')
      const expText = `${exp.role || ''} ${exp.organization || ''} ${exp.description || ''} ${expSkills}`.toLowerCase()
      config.skills.forEach((keyword) => {
        const cleanKeyword = normalizeText(keyword)
        if (expText.includes(cleanKeyword)) {
          score += 2
        }
      })
    })

    scoresByTrack[track] = score

    if (score > maxScore) {
      maxScore = score
      topTrack = track
    }
  })

  return {
    topTrack: maxScore > 0 ? topTrack : null,
    score: maxScore,
    scoresByTrack,
  }
}

/**
 * THIRORA - Central Student Career Resolution Function
 * 
 * Strict Priority Hierarchy:
 * 
 * PRIORITY 1: Onboarding / Signup / Start Career Selection
 * - Career selected or provided during the initial onboarding/signup/start process.
 * 
 * PRIORITY 2: Saved Profile Target Career Goal
 * - Explicit Target Career Goal / Target Role stored in the student's saved profile data.
 * 
 * PRIORITY 3: Actual Student Evidence Analysis
 * - Evaluates verified skills, certificates, projects, experiences/internships, and quiz/topic data
 *   against THIRORA's 5 supported career tracks.
 * 
 * PRIORITY 4: Academic Department Fallback
 * - Sensible deterministic department mapping for students with no prior evidence.
 * 
 * Fallback / Insufficient Data:
 * - Returns track: null, hasContext: false (never hardcodes Front-End Developer or any default).
 */
export function resolveStudentCareer({
  onboardingGoal = null,
  explicitGoal = null,
  profile = null,
  user = null,
  skills = [],
  certificates = [],
  projects = [],
  experiences = [],
  quizAttempts = [],
  topicPerformance = [],
} = {}) {
  const activeProfile = profile || {}
  const activeUser = user || {}
  const metadata = activeUser.user_metadata || {}

  // PRIORITY 1: Initial onboarding / signup / start selection
  const onboardingCandidate =
    onboardingGoal ||
    metadata.onboarding_career ||
    metadata.onboardingCareer ||
    metadata.initial_career ||
    metadata.initialCareer ||
    metadata.signup_career ||
    metadata.career_goal ||
    metadata.careerGoal ||
    activeProfile?.onboarding_career ||
    activeProfile?.onboardingCareer ||
    activeProfile?.initial_career ||
    activeProfile?.initialCareer ||
    explicitGoal ||
    null

  if (onboardingCandidate) {
    const standardized = standardizeCareerRole(onboardingCandidate)
    if (standardized) {
      return {
        track: standardized,
        source: 'onboarding',
        sourceLabel: 'Onboarding Goal',
        priority: 1,
        hasContext: true,
      }
    }
  }

  // PRIORITY 2: Saved Target Career Goal in student's profile data
  const profileCandidate =
    activeProfile?.target_role ||
    activeProfile?.targetRole ||
    activeProfile?.career_goal ||
    activeProfile?.careerGoal ||
    activeUser?.targetRole ||
    activeUser?.target_role ||
    null

  if (profileCandidate) {
    const standardized = standardizeCareerRole(profileCandidate)
    if (standardized) {
      return {
        track: standardized,
        source: 'profile_target_role',
        sourceLabel: 'Profile Target Role',
        priority: 2,
        hasContext: true,
      }
    }
  }

  // PRIORITY 3: Actual Student Evidence (Skills, Certificates, Projects, Experience, Quiz)
  const hasAnyEvidence = (
    skills.length > 0 ||
    certificates.length > 0 ||
    projects.length > 0 ||
    experiences.length > 0 ||
    quizAttempts.length > 0 ||
    topicPerformance.length > 0
  )

  if (hasAnyEvidence) {
    const evidenceResult = analyzeStudentEvidence({
      skills,
      certificates,
      projects,
      experiences,
      quizAttempts,
      topicPerformance,
    })

    if (evidenceResult.topTrack && evidenceResult.score > 0) {
      return {
        track: evidenceResult.topTrack,
        source: 'evidence',
        sourceLabel: 'Student Evidence Match',
        score: evidenceResult.score,
        priority: 3,
        hasContext: true,
      }
    }
  }

  // PRIORITY 4: Student Department Fallback
  const department =
    activeProfile?.department ||
    activeProfile?.college_department ||
    activeUser?.department ||
    null

  if (department) {
    const deptTrack = resolveDepartmentTrack(department)
    if (deptTrack) {
      return {
        track: deptTrack,
        source: 'department',
        sourceLabel: `Department Context (${department})`,
        department,
        priority: 4,
        hasContext: true,
      }
    }
  }

  // UNSUPPORTED / UNKNOWN / INSUFFICIENT DATA (Never invent or hardcode a career)
  return {
    track: null,
    source: 'unsupported',
    sourceLabel: 'No Supported Career Context',
    priority: null,
    hasContext: false,
    message: 'Career guidance will become available after you add a career goal or more profile data.',
  }
}

/**
 * Alias resolveCareerContext to resolveStudentCareer for backward compatibility.
 */
export const resolveCareerContext = resolveStudentCareer



