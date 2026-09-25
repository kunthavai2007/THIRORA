import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  readStorage,
  writeStorage,
  notifyDataChange,
} from '../utils/storage'
import { supabase } from '../lib/supabase'

const profileStorageKey = 'academicProfile'
const certificatesStorageKey = 'certificates'
const projectsStorageKey = 'projects'
const experiencesStorageKey = 'experiences'

const skillLevels = ['Beginner', 'Intermediate', 'Advanced']
const experienceTypes = ['Internship', 'Workshop']

const initialProfile = {
  studentName: '',
  email: '',
  phone: '',
  registerNumber: '',
  collegeName: '',
  department: '',
  currentYear: '',
  currentSemester: '',
  currentCgpa: '',
  graduationDate: '',
  graduationYear: '',
  targetRole: '',
  careerGoal: '',
}

const initialCertificate = {
  name: '',
  organization: '',
  completionDate: '',
  link: '',
  skills: '',
}

const initialProject = {
  title: '',
  description: '',
  technologies: '',
  link: '',
}

const initialExperience = {
  type: 'Internship',
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  certificateLink: '',
}

const validTabs = [
  'academic',
  'skills',
  'certificates',
  'experience',
  'projects',
]

function AcademicProfile() {
  const {
    currentUser,
    skills: sharedSkills,
    addStudentSkill,
    syncStudentSkills,
    deleteStudentSkill,
    updateProfile,
  } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTabParam = searchParams.get('tab')

  const activeTab = validTabs.includes(currentTabParam)
    ? currentTabParam
    : 'academic'

  // --------------------------------------------------
  // ACADEMIC PROFILE STATE
  // --------------------------------------------------

  const [profile, setProfile] = useState(initialProfile)
  const [isProfileSaved, setIsProfileSaved] = useState(false)

  // --------------------------------------------------
  // SKILLS STATE
  // --------------------------------------------------

  const skills = sharedSkills
  const [skillName, setSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState('Beginner')

  // --------------------------------------------------
  // CERTIFICATES STATE
  // --------------------------------------------------

  const [certificates, setCertificates] = useState([])
  const [certificateForm, setCertificateForm] =
    useState(initialCertificate)

  // --------------------------------------------------
  // EXPERIENCE STATE
  // --------------------------------------------------

  const [experiences, setExperiences] = useState(() =>
    readStorage(experiencesStorageKey, [], Array.isArray)
  )
  const [experienceForm, setExperienceForm] =
    useState(initialExperience)

  // --------------------------------------------------
  // PROJECTS STATE
  // --------------------------------------------------

  const [projects, setProjects] = useState(() =>
    readStorage(projectsStorageKey, [], Array.isArray)
  )
  const [projectForm, setProjectForm] =
    useState(initialProject)

  // --------------------------------------------------
  // LOAD LOCAL DATA FOR EXPERIENCE & PROJECTS ONLY
  // CERTIFICATES ARE NOW LOADED FROM SUPABASE
  // --------------------------------------------------

  // --------------------------------------------------
  // LOAD CERTIFICATES FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true

    async function loadCertificatesFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (
          sessionError ||
          !session?.user ||
          !isMounted
        ) {
          return
        }

        const user = session.user

        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', {
            ascending: true,
          })

        if (error) {
          console.error(
            'Error loading certificates:',
            error
          )
          return
        }

        if (!isMounted) return

        const formattedCertificates =
          (data || []).map((item) => ({
            id: item.id,

            name:
              item.certificate_name ?? '',

            organization:
              item.issuing_organization ?? '',

            completionDate:
              item.issue_date ?? '',

            link:
              item.credential_url ?? '',

            credentialId:
              item.credential_id ?? '',

            skills:
              item.skills ?? [],

            student_id:
              item.student_id,

            created_at:
              item.created_at,

            updated_at:
              item.updated_at,
          }))

        setCertificates(
          formattedCertificates
        )

        writeStorage(
          certificatesStorageKey,
          formattedCertificates
        )
      } catch (error) {
        console.error(
          'Unexpected error loading certificates:',
          error
        )
      }
    }

    loadCertificatesFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (
          session?.user &&
          isMounted
        ) {
          loadCertificatesFromSupabase()
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Academic Profile form state is synchronized from the canonical AuthContext
  // profile snapshot; the Skills tab uses the shared skills array below.

  // --------------------------------------------------
  // LOAD ACADEMIC PROFILE FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true

    async function loadSupabaseProfile() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        const user = session?.user

        console.log(
          '[PROFILE DEBUG] current user:',
          user?.id,
          user?.email
        )

        if (
          sessionError ||
          !user ||
          !isMounted
        ) {
          if (isMounted) {
            setProfile(initialProfile)
          }

          return
        }

        const {
          data: profileRow,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        console.log(
          '[PROFILE DEBUG] profile row:',
          profileRow || profileError
        )

        if (isMounted) {
          const userMetadata =
            user.user_metadata || {}

          const userEmail =
            user.email || ''

          const fallbackName =
            userMetadata.name ||
            userMetadata.full_name ||
            (userEmail
              ? userEmail.split('@')[0]
              : '')

          const resolvedName =
            profileRow?.name &&
              profileRow.name.trim()
              ? profileRow.name.trim()
              : fallbackName || ''

          const updated = {
            studentName: resolvedName,

            email:
              userEmail ||
              profileRow?.email ||
              '',

            phone:
              profileRow?.phone ??
              userMetadata.phone ??
              '',

            registerNumber:
              profileRow?.register_number ??
              '',

            collegeName:
              profileRow?.college_name ??
              userMetadata.collegeName ??
              userMetadata.college_name ??
              '',

            department:
              profileRow?.department ??
              userMetadata.department ??
              '',

            currentYear:
              profileRow?.current_year != null
                ? String(
                  profileRow.current_year
                )
                : userMetadata.currentYear ||
                userMetadata.current_year ||
                '',

            currentSemester:
              profileRow?.current_semester != null
                ? String(
                  profileRow.current_semester
                )
                : '',

            graduationYear:
              profileRow?.graduation_year != null
                ? String(
                  profileRow.graduation_year
                )
                : userMetadata.graduationYear ||
                userMetadata.graduation_year ||
                '',

            graduationDate:
              profileRow?.graduation_date ??
              (profileRow?.graduation_year
                ? `${profileRow.graduation_year}-06-01`
                : ''),

            currentCgpa:
              profileRow?.cgpa != null
                ? String(profileRow.cgpa)
                : userMetadata.cgpa || '',

            careerGoal:
              userMetadata.career_goal ??
              userMetadata.careerGoal ??
              '',

            targetRole: (() => {
              const value = profileRow?.target_role ?? userMetadata.targetRole ?? userMetadata.target_role ?? ''
              return String(value).trim().toLowerCase() === 'software engineer' ? '' : value
            })(),
          }

          setProfile(updated)

          writeStorage(
            profileStorageKey,
            updated
          )
        }
      } catch (error) {
        console.error(
          'Error loading profile from Supabase:',
          error
        )
      }
    }

    loadSupabaseProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (
          session?.user &&
          isMounted
        ) {
          loadSupabaseProfile()
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // LOAD PROJECTS FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true

    async function loadProjectsFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (
          sessionError ||
          !session?.user ||
          !isMounted
        ) {
          if (isMounted && !session?.user) {
            setProjects([])
            writeStorage(projectsStorageKey, [])
          }
          return
        }

        const user = session.user

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', {
            ascending: true,
          })

        if (error) {
          console.error(
            'Error loading projects from Supabase:',
            error
          )
          return
        }

        if (!isMounted) return

        const formattedProjects =
          (data || []).map((item) => ({
            id: item.id,
            title: item.title ?? '',
            description: item.description ?? '',
            technologies: Array.isArray(item.technologies)
              ? item.technologies.join(', ')
              : (item.technologies ?? ''),
            link:
              item.project_url ||
              item.github_url ||
              '',
            project_url:
              item.project_url ?? '',
            github_url:
              item.github_url ?? '',
            start_date:
              item.start_date ?? null,
            end_date:
              item.end_date ?? null,
            role: item.role ?? '',
            student_id: item.student_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))

        setProjects(
          formattedProjects
        )

        writeStorage(
          projectsStorageKey,
          formattedProjects
        )
      } catch (error) {
        console.error(
          'Unexpected error loading projects:',
          error
        )
      }
    }

    loadProjectsFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (
          session?.user &&
          isMounted
        ) {
          loadProjectsFromSupabase()
        } else if (!session?.user && isMounted) {
          setProjects([])
          writeStorage(projectsStorageKey, [])
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // LOAD EXPERIENCES FROM SUPABASE
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true

    async function loadExperiencesFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (
          sessionError ||
          !session?.user ||
          !isMounted
        ) {
          if (isMounted && !session?.user) {
            setExperiences([])
            writeStorage(experiencesStorageKey, [])
          }
          return
        }

        const user = session.user

        const { data, error } = await supabase
          .from('experiences')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', {
            ascending: true,
          })

        if (error) {
          console.error(
            'Error loading experiences from Supabase:',
            error
          )
          return
        }

        if (!isMounted) return

        const formattedExperiences =
          (data || []).map((item) => ({
            id: item.id,
            type:
              item.experience_type ??
              item.type ??
              'Internship',
            experience_type:
              item.experience_type ??
              'Internship',
            title:
              item.role ??
              item.title ??
              '',
            role: item.role ?? '',
            organization:
              item.organization ?? '',
            startDate:
              item.start_date ??
              item.startDate ??
              '',
            endDate:
              item.end_date ??
              item.endDate ??
              '',
            start_date:
              item.start_date ?? null,
            end_date:
              item.end_date ?? null,
            description:
              item.description ?? '',
            certificateLink:
              item.certificate_url ??
              item.certificateLink ??
              '',
            certificate_url:
              item.certificate_url ?? '',
            skills: Array.isArray(item.skills)
              ? item.skills
              : [],
            student_id: item.student_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))

        setExperiences(
          formattedExperiences
        )

        writeStorage(
          experiencesStorageKey,
          formattedExperiences
        )
      } catch (error) {
        console.error(
          'Unexpected error loading experiences:',
          error
        )
      }
    }

    loadExperiencesFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (
          session?.user &&
          isMounted
        ) {
          loadExperiencesFromSupabase()
        } else if (!session?.user && isMounted) {
          setExperiences([])
          writeStorage(experiencesStorageKey, [])
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // TAB CHANGE
  // --------------------------------------------------

  function handleTabChange(tabKey) {
    setSearchParams(
      { tab: tabKey },
      { replace: true }
    )
  }

  // --------------------------------------------------
  // ACADEMIC PROFILE HANDLERS
  // --------------------------------------------------

  function handleProfileChange(event) {
    const {
      name,
      value,
    } = event.target

    setProfile((current) => ({
      ...current,
      [name]: value,
    }))

    setIsProfileSaved(false)
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession()

      const user = session?.user

      if (authError || !user) {
        alert(
          'Your login session has expired. Please sign in again.'
        )

        return
      }

      await updateProfile({
        name: profile.studentName,
        phone: profile.phone,
        collegeName: profile.collegeName,
        department: profile.department,
        careerGoal: profile.careerGoal || '',
        targetRole: profile.targetRole || '',
        currentYear: profile.currentYear,
        currentSemester: profile.currentSemester,
        registerNumber: profile.registerNumber,
        graduationDate: profile.graduationDate,
        graduationYear: profile.graduationYear,
        currentCgpa: profile.currentCgpa,
      })

      setProfile((current) => ({
        ...current,
        email: currentUser?.email || current.email,
        targetRole: profile.targetRole || '',
        careerGoal: profile.careerGoal || '',
      }))
      setIsProfileSaved(true)

      notifyDataChange(
        'profile-saved'
      )
    } catch (error) {
      console.error(
        'Profile save error:',
        error
      )

      alert(
        'Unable to save profile. Please try again.'
      )
    }
  }

  // --------------------------------------------------
  // SKILLS HANDLERS - SUPABASE
  // --------------------------------------------------

  async function handleAddSkill(event) {
    event.preventDefault()
    const trimmed = skillName.trim()
    if (!trimmed) return

    try {
      await addStudentSkill({
        name: trimmed,
        level: skillLevel,
        category: 'Technical',
      })
      setSkillName('')
      setSkillLevel('Beginner')
    } catch (error) {
      console.error('Unexpected skill add error:', error)
      alert(error.message || 'Unable to add skill.')
    }
  }

  async function handleDeleteSkill(skill) {
    try {
      await deleteStudentSkill(skill.id, skill.name || skill.skill_name)
    } catch (error) {
      console.error('Unexpected skill delete error:', error)
      alert(error.message || 'Unable to delete skill.')
    }
  }

  // --------------------------------------------------
  // CERTIFICATE HANDLERS - SUPABASE
  // --------------------------------------------------

  function handleCertificateChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target

    setCertificateForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    )
  }

  async function handleAddCertificate(event) {
    event.preventDefault()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const certificateName =
        certificateForm.name.trim()

      const issuingOrganization =
        certificateForm.organization.trim()

      const issueDate =
        certificateForm.completionDate

      const credentialUrl =
        certificateForm.link.trim()

      if (
        !certificateName ||
        !issuingOrganization ||
        !issueDate ||
        !credentialUrl
      ) {
        return
      }

      // Check duplicate certificate
      const {
        data: existingCertificates,
        error: existingError,
      } = await supabase
        .from('certificates')
        .select('id')
        .eq(
          'student_id',
          user.id
        )
        .ilike(
          'certificate_name',
          certificateName
        )

      if (existingError) {
        console.error(
          'Certificate duplicate check error:',
          existingError
        )

        alert(
          existingError.message ||
          'Unable to check existing certificate.'
        )

        return
      }

      if (
        existingCertificates?.length > 0
      ) {
        alert(
          'This certificate has already been added.'
        )

        return
      }

      const skillsArray = Array.isArray(certificateForm.skills)
        ? certificateForm.skills
        : typeof certificateForm.skills === 'string'
          ? certificateForm.skills.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
          : []

      const {
        data,
        error,
      } = await supabase
        .from('certificates')
        .insert({
          student_id:
            user.id,

          certificate_name:
            certificateName,

          issuing_organization:
            issuingOrganization,

          issue_date:
            issueDate,

          credential_url:
            credentialUrl,

          credential_id:
            '',

          skills: skillsArray,
        })
        .select('*')
        .single()

      if (error) {
        console.error(
          'Certificate insert error:',
          error
        )

        alert(
          error.message ||
          'Failed to add certificate.'
        )

        return
      }

      const formattedCertificate = {
        id: data.id,

        name:
          data.certificate_name ??
          certificateName,

        organization:
          data.issuing_organization ??
          issuingOrganization,

        completionDate:
          data.issue_date ??
          issueDate,

        link:
          data.credential_url ??
          credentialUrl,

        credentialId:
          data.credential_id ??
          '',

        skills:
          data.skills ??
          skillsArray,

        student_id:
          data.student_id,

        created_at:
          data.created_at,

        updated_at:
          data.updated_at,
      }

      if (skillsArray.length > 0) {
        await syncStudentSkills(skillsArray, { source: 'Certificate' })
      }

      const updated = [
        ...certificates,
        formattedCertificate,
      ]

      setCertificates(updated)

      writeStorage(
        certificatesStorageKey,
        updated
      )

      setCertificateForm(
        initialCertificate
      )

      notifyDataChange(
        'certificate-added'
      )
    } catch (error) {
      console.error(
        'Unexpected certificate add error:',
        error
      )

      alert(
        error.message ||
        'Unable to add certificate.'
      )
    }
  }

  async function handleDeleteCertificate(
    certificateId
  ) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq(
          'id',
          certificateId
        )
        .eq(
          'student_id',
          user.id
        )

      if (error) {
        console.error(
          'Certificate delete error:',
          error
        )

        alert(
          error.message ||
          'Failed to delete certificate.'
        )

        return
      }

      const updated =
        certificates.filter(
          (item) =>
            item.id !==
            certificateId
        )

      setCertificates(updated)

      writeStorage(
        certificatesStorageKey,
        updated
      )

      notifyDataChange(
        'certificate-deleted'
      )
    } catch (error) {
      console.error(
        'Unexpected certificate delete error:',
        error
      )

      alert(
        error.message ||
        'Unable to delete certificate.'
      )
    }
  }

  // --------------------------------------------------
  // EXPERIENCE HANDLERS - SUPABASE
  // --------------------------------------------------

  function handleExperienceChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target

    setExperienceForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    )
  }

  async function handleAddExperience(
    event
  ) {
    event.preventDefault()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const expType =
        experienceForm.type || 'Internship'
      const roleTitle =
        experienceForm.title.trim()
      const orgName =
        experienceForm.organization.trim()
      const startDate =
        experienceForm.startDate || null
      const endDate =
        experienceForm.endDate || null
      const desc =
        experienceForm.description.trim()
      const certUrl =
        experienceForm.certificateLink.trim()

      if (!roleTitle || !orgName) {
        return
      }

      const skillsArray = Array.isArray(
        experienceForm.skills
      )
        ? experienceForm.skills
        : typeof experienceForm.skills === 'string'
          ? experienceForm.skills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []

      const {
        data,
        error,
      } = await supabase
        .from('experiences')
        .insert({
          student_id: user.id,
          experience_type: expType,
          role: roleTitle,
          organization: orgName,
          start_date: startDate,
          end_date: endDate,
          description: desc,
          certificate_url: certUrl,
          skills: skillsArray,
        })
        .select('*')
        .single()

      if (error) {
        console.error(
          'Experience insert error:',
          error
        )

        alert(
          error.message ||
          'Failed to add experience.'
        )

        return
      }

      const formattedExperience = {
        id: data.id,
        type:
          data.experience_type ?? expType,
        experience_type:
          data.experience_type ?? expType,
        title:
          data.role ?? roleTitle,
        role:
          data.role ?? roleTitle,
        organization:
          data.organization ?? orgName,
        startDate:
          data.start_date ?? startDate ?? '',
        endDate:
          data.end_date ?? endDate ?? '',
        start_date:
          data.start_date ?? startDate,
        end_date:
          data.end_date ?? endDate,
        description:
          data.description ?? desc,
        certificateLink:
          data.certificate_url ?? certUrl,
        certificate_url:
          data.certificate_url ?? certUrl,
        skills: Array.isArray(data.skills)
          ? data.skills
          : skillsArray,
        student_id: data.student_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      if (skillsArray.length > 0) {
        await syncStudentSkills(skillsArray, { source: 'Experience' })
      }

      const updated = [
        ...experiences,
        formattedExperience,
      ]

      setExperiences(updated)

      writeStorage(
        experiencesStorageKey,
        updated
      )

      setExperienceForm(
        initialExperience
      )

      notifyDataChange(
        'experience-added'
      )
    } catch (error) {
      console.error(
        'Unexpected experience add error:',
        error
      )

      alert(
        error.message ||
        'Unable to add experience.'
      )
    }
  }

  async function handleDeleteExperience(
    experienceId
  ) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', experienceId)
        .eq('student_id', user.id)

      if (error) {
        console.error(
          'Experience delete error:',
          error
        )

        alert(
          error.message ||
          'Failed to delete experience.'
        )

        return
      }

      const updated =
        experiences.filter(
          (item) =>
            item.id !==
            experienceId
        )

      setExperiences(updated)

      writeStorage(
        experiencesStorageKey,
        updated
      )

      notifyDataChange(
        'experience-deleted'
      )
    } catch (error) {
      console.error(
        'Unexpected experience delete error:',
        error
      )

      alert(
        error.message ||
        'Unable to delete experience.'
      )
    }
  }

  // --------------------------------------------------
  // PROJECT HANDLERS - SUPABASE
  // --------------------------------------------------

  function handleProjectChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target

    setProjectForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    )
  }

  async function handleAddProject(
    event
  ) {
    event.preventDefault()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const projectTitle =
        projectForm.title.trim()
      const projectDescription =
        projectForm.description.trim()
      const projectTech =
        projectForm.technologies.trim()
      const projectLink =
        projectForm.link.trim()

      if (!projectTitle) {
        return
      }

      const technologiesArray = projectTech
        ? projectTech
            .split(',')
            .map((tech) => tech.trim())
            .filter(Boolean)
        : []

      const isGithub =
        projectLink
          .toLowerCase()
          .includes('github.com')

      const {
        data,
        error,
      } = await supabase
        .from('projects')
        .insert({
          student_id: user.id,
          title: projectTitle,
          description: projectDescription,
          technologies: technologiesArray,
          project_url: projectLink,
          github_url: isGithub ? projectLink : '',
          start_date: null,
          end_date: null,
          role: 'Contributor',
        })
        .select('*')
        .single()

      if (error) {
        console.error(
          'Project insert error:',
          error
        )

        alert(
          error.message ||
          'Failed to add project.'
        )

        return
      }

      const formattedProject = {
        id: data.id,
        title:
          data.title ??
          projectTitle,
        description:
          data.description ??
          projectDescription,
        technologies: Array.isArray(data.technologies)
          ? data.technologies.join(', ')
          : (data.technologies ?? projectTech),
        link:
          data.project_url ||
          data.github_url ||
          projectLink,
        project_url:
          data.project_url ??
          projectLink,
        github_url:
          data.github_url ??
          (isGithub ? projectLink : ''),
        start_date:
          data.start_date ??
          null,
        end_date:
          data.end_date ??
          null,
        role:
          data.role ??
          'Contributor',
        student_id:
          data.student_id,
        created_at:
          data.created_at,
        updated_at:
          data.updated_at,
      }

      if (technologiesArray.length > 0) {
        await syncStudentSkills(technologiesArray, { source: 'Project' })
      }

      const updated = [
        ...projects,
        formattedProject,
      ]

      setProjects(updated)

      writeStorage(
        projectsStorageKey,
        updated
      )

      setProjectForm(
        initialProject
      )

      notifyDataChange(
        'project-added'
      )
    } catch (error) {
      console.error(
        'Unexpected project add error:',
        error
      )

      alert(
        error.message ||
        'Unable to add project.'
      )
    }
  }

  async function handleDeleteProject(
    projectId
  ) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.user
      ) {
        alert('Please sign in again.')
        return
      }

      const user = session.user

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('student_id', user.id)

      if (error) {
        console.error(
          'Project delete error:',
          error
        )

        alert(
          error.message ||
          'Failed to delete project.'
        )

        return
      }

      const updated =
        projects.filter(
          (item) =>
            item.id !==
            projectId
        )

      setProjects(updated)

      writeStorage(
        projectsStorageKey,
        updated
      )

      notifyDataChange(
        'project-deleted'
      )
    } catch (error) {
      console.error(
        'Unexpected project delete error:',
        error
      )

      alert(
        error.message ||
        'Unable to delete project.'
      )
    }
  }

  // --------------------------------------------------
  // TABS
  // --------------------------------------------------

  const tabsConfig = [
    {
      key: 'academic',
      label: 'Academic Details',
      count: null,
    },

    {
      key: 'skills',
      label: 'Skills',
      count: skills.length,
    },

    {
      key: 'certificates',
      label: 'Certificates',
      count: certificates.length,
    },

    {
      key: 'projects',
      label: 'Projects',
      count: projects.length,
    },

    {
      key: 'experience',
      label: 'Internships & Workshops',
      count: experiences.length,
    },
  ]

  return (
    <main className="profile-page unified-academic-page">
      <div className="profile-shell unified-academic-shell">

        <Link
          className="back-link"
          to="/"
        >
          <span aria-hidden="true">
            &lt;-
          </span>{' '}
          Back to Dashboard
        </Link>

        <header className="profile-header unified-page-header">

          <p className="eyebrow">
            Complete student portfolio
          </p>

          <h1>
            Academic Profile
          </h1>

          <p>
            Manage your academic foundation,
            technical skills, verified certificates,
            practical experiences, and portfolio
            projects in one place.
          </p>

        </header>

        {/* UNIFIED TAB NAVIGATION */}

        <nav
          className="academic-tabs-nav"
          aria-label="Academic Profile sections"
        >

          {tabsConfig.map((tab) => {
            const isActive =
              activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                className={`academic-tab-btn ${isActive
                  ? 'academic-tab-active'
                  : ''
                  }`}
                onClick={() =>
                  handleTabChange(
                    tab.key
                  )
                }
                aria-selected={
                  isActive
                }
                role="tab"
              >

                <span className="academic-tab-label">
                  {tab.label}
                </span>

                {tab.count !== null && (
                  <span className="academic-tab-badge">
                    {tab.count}
                  </span>
                )}

              </button>
            )
          })}

        </nav>

        {/* ==================================================
            TAB 1: ACADEMIC DETAILS
        ================================================== */}

        {activeTab === 'academic' && (
          <section
            className="academic-tab-panel"
            aria-labelledby="academic-details-title"
          >

            <form
              className="profile-form"
              onSubmit={
                handleProfileSubmit
              }
            >

              <div className="form-heading">

                <div>

                  <h2 id="academic-details-title">
                    Academic Details
                  </h2>

                  <p>
                    Keep your information current
                    to personalize your career journey.
                  </p>

                </div>

                <span className="required-note">
                  * Required
                </span>

              </div>

              <div className="form-grid">

                <label className="form-field form-field-wide">
                  Student Name <span>*</span>

                  <input
                    name="studentName"
                    type="text"
                    value={
                      profile.studentName
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </label>

                <label className="form-field">
                  Register Number <span>*</span>

                  <input
                    name="registerNumber"
                    type="text"
                    value={
                      profile.registerNumber
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Enter your register number"
                    required
                  />
                </label>

                <label className="form-field">
                  Email

                  <input
                    name="email"
                    type="email"
                    value={
                      profile.email
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Optional contact email"
                  />
                </label>

                <label className="form-field">
                  Phone Number

                  <input
                    name="phone"
                    type="tel"
                    value={
                      profile.phone
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Optional phone number"
                  />
                </label>

                <label className="form-field">
                  College Name <span>*</span>

                  <input
                    name="collegeName"
                    type="text"
                    value={
                      profile.collegeName
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Enter your college name"
                    required
                  />
                </label>

                <label className="form-field form-field-wide">
                  Department <span>*</span>

                  <input
                    name="department"
                    type="text"
                    value={
                      profile.department
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="Enter your department"
                    required
                  />
                </label>

                <label className="form-field">
                  Current Year <span>*</span>

                  <select
                    name="currentYear"
                    value={
                      profile.currentYear
                    }
                    onChange={
                      handleProfileChange
                    }
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select year
                    </option>

                    <option value="1">
                      First year
                    </option>

                    <option value="2">
                      Second year
                    </option>

                    <option value="3">
                      Third year
                    </option>

                    <option value="4">
                      Fourth year
                    </option>

                  </select>
                </label>

                <label className="form-field">
                  Current Semester <span>*</span>

                  <select
                    name="currentSemester"
                    value={
                      profile.currentSemester
                    }
                    onChange={
                      handleProfileChange
                    }
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select semester
                    </option>

                    <option value="1">
                      Semester 1
                    </option>

                    <option value="2">
                      Semester 2
                    </option>

                    <option value="3">
                      Semester 3
                    </option>

                    <option value="4">
                      Semester 4
                    </option>

                    <option value="5">
                      Semester 5
                    </option>

                    <option value="6">
                      Semester 6
                    </option>

                    <option value="7">
                      Semester 7
                    </option>

                    <option value="8">
                      Semester 8
                    </option>

                  </select>
                </label>

                <label className="form-field">
                  Current CGPA <span>*</span>

                  <input
                    name="currentCgpa"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={
                      profile.currentCgpa
                    }
                    onChange={
                      handleProfileChange
                    }
                    placeholder="e.g. 8.50"
                    required
                  />
                </label>

                <label className="form-field">
                  Graduation Date

                  <input
                    name="graduationDate"
                    type="date"
                    value={
                      profile.graduationDate
                    }
                    onChange={
                      handleProfileChange
                    }
                  />
                </label>

              </div>

              <div className="form-footer">

                {isProfileSaved && (
                  <p
                    className="success-message"
                    role="status"
                  >
                    Academic details saved successfully.
                  </p>
                )}

                <button
                  className="save-button"
                  type="submit"
                >
                  Save Academic Details
                </button>

              </div>

            </form>

          </section>
        )}

        {/* ==================================================
            TAB 2: SKILLS
        ================================================== */}

        {activeTab === 'skills' && (
          <section
            className="academic-tab-panel"
            aria-labelledby="skills-panel-title"
          >

            <section
              className="skills-panel"
              aria-labelledby="add-skill-heading"
            >

              <div className="skills-panel-heading">

                <div>

                  <h2 id="add-skill-heading">
                    Add a Skill
                  </h2>

                  <p>
                    Record a skill and specify your
                    current proficiency level.
                  </p>

                </div>

                <span className="skills-count">
                  {skills.length}{' '}
                  {skills.length === 1
                    ? 'skill'
                    : 'skills'}
                </span>

              </div>

              <form
                className="skill-form"
                onSubmit={
                  handleAddSkill
                }
              >

                <label className="skill-field skill-name-field">
                  Skill name

                  <input
                    type="text"
                    value={
                      skillName
                    }
                    onChange={(event) =>
                      setSkillName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. JavaScript"
                    required
                  />
                </label>

                <label className="skill-field">
                  Skill level

                  <select
                    value={
                      skillLevel
                    }
                    onChange={(event) =>
                      setSkillLevel(
                        event.target.value
                      )
                    }
                  >

                    {skillLevels.map(
                      (level) => (
                        <option
                          key={level}
                          value={level}
                        >
                          {level}
                        </option>
                      )
                    )}

                  </select>
                </label>

                <button
                  className="add-skill-button"
                  type="submit"
                >
                  Add Skill
                </button>

              </form>

            </section>

            <section
              className="skills-list-section"
              aria-labelledby="skills-list-heading"
            >

              <div className="skills-list-heading">

                <h2 id="skills-list-heading">
                  Your Skills
                </h2>

                <span>
                  {skills.length
                    ? 'Keep growing your technical edge'
                    : 'No skills added yet'}
                </span>

              </div>

              {skills.length ? (
                <div className="skills-list">

                  {skills.map(
                    (skill) => (
                      <article
                        className="skill-card"
                        key={`${skill.student_id || 'skill'}-${skill.name}`}
                      >

                        <div
                          className="skill-card-mark"
                          aria-hidden="true"
                        >
                          SK
                        </div>

                        <div className="skill-card-details">

                          <h3>
                            {skill.name}
                          </h3>

                          <span>
                            {skill.level}
                          </span>

                        </div>

                        <button
                          className="delete-skill-button"
                          type="button"
                          onClick={() =>
                            handleDeleteSkill(
                              skill
                            )
                          }
                          aria-label={`Delete ${skill.name}`}
                        >
                          Delete
                        </button>

                      </article>
                    )
                  )}

                </div>
              ) : (
                <div className="empty-skills-state">

                  <div
                    className="empty-state-mark"
                    aria-hidden="true"
                  >
                    +
                  </div>

                  <p>
                    Your added skills will appear here.
                  </p>

                </div>
              )}

            </section>

          </section>
        )}

        {/* ==================================================
            TAB 3: CERTIFICATES
        ================================================== */}

        {activeTab === 'certificates' && (
          <section
            className="academic-tab-panel"
            aria-labelledby="certificates-panel-title"
          >

            <section
              className="certificates-panel"
              aria-labelledby="add-certificate-heading"
            >

              <div className="certificates-panel-heading">

                <div>

                  <h2 id="add-certificate-heading">
                    Add a Certificate
                  </h2>

                  <p>
                    Capture credentials and verifiable
                    achievement links.
                  </p>

                </div>

                <span className="certificates-count">
                  {certificates.length}{' '}
                  {certificates.length === 1
                    ? 'certificate'
                    : 'certificates'}
                </span>

              </div>

              <form
                className="certificate-form"
                onSubmit={
                  handleAddCertificate
                }
              >

                <label className="certificate-field">
                  Certificate Name

                  <input
                    name="name"
                    type="text"
                    value={
                      certificateForm.name
                    }
                    onChange={
                      handleCertificateChange
                    }
                    placeholder="e.g. AWS Certified Cloud Practitioner"
                    required
                  />
                </label>

                <label className="certificate-field">
                  Issuing Organization

                  <input
                    name="organization"
                    type="text"
                    value={
                      certificateForm.organization
                    }
                    onChange={
                      handleCertificateChange
                    }
                    placeholder="e.g. Amazon Web Services"
                    required
                  />
                </label>

                <label className="certificate-field">
                  Date of Completion

                  <input
                    name="completionDate"
                    type="date"
                    value={
                      certificateForm.completionDate
                    }
                    onChange={
                      handleCertificateChange
                    }
                    required
                  />
                </label>

                <label className="certificate-field">
                  Certificate Link

                  <input
                    name="link"
                    type="url"
                    value={
                      certificateForm.link
                    }
                    onChange={
                      handleCertificateChange
                    }
                    placeholder="https://..."
                    required
                  />
                </label>

                <label className="certificate-field">
                  Skills / Technologies Covered (optional)

                  <input
                    name="skills"
                    type="text"
                    value={
                      certificateForm.skills || ''
                    }
                    onChange={
                      handleCertificateChange
                    }
                    placeholder="e.g. AWS, Cloud Computing, Linux"
                  />
                </label>

                <button
                  className="add-certificate-button"
                  type="submit"
                >
                  Add Certificate
                </button>

              </form>

            </section>

            <section
              className="certificate-list-section"
              aria-labelledby="certificate-list-heading"
            >

              <div className="certificate-list-heading">

                <h2 id="certificate-list-heading">
                  Your Certificates
                </h2>

                <span>
                  {certificates.length
                    ? 'A record of your achievements'
                    : 'No certificates added yet'}
                </span>

              </div>

              {certificates.length ? (
                <div className="certificate-list">

                  {certificates.map(
                    (item) => (
                      <article
                        className="certificate-card"
                        key={item.id}
                      >

                        <div
                          className="certificate-card-mark"
                          aria-hidden="true"
                        >
                          CERT
                        </div>

                        <div className="certificate-card-content">

                          <h3>
                            {item.name}
                          </h3>

                          <dl className="certificate-details">

                            <div>

                              <dt>
                                Issued by
                              </dt>

                              <dd>
                                {
                                  item.organization
                                }
                              </dd>

                            </div>

                            <div>

                              <dt>
                                Completed
                              </dt>

                              <dd>
                                {
                                  item.completionDate
                                }
                              </dd>

                            </div>

                          </dl>

                          <a
                            className="certificate-link"
                            href={
                              item.link
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            View certificate{' '}
                            <span aria-hidden="true">
                              -&gt;
                            </span>
                          </a>

                        </div>

                        <button
                          className="delete-certificate-button"
                          type="button"
                          onClick={() =>
                            handleDeleteCertificate(
                              item.id
                            )
                          }
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>

                      </article>
                    )
                  )}

                </div>
              ) : (
                <div className="empty-certificates-state">

                  <div
                    className="empty-certificate-mark"
                    aria-hidden="true"
                  >
                    +
                  </div>

                  <p>
                    Your certificates will appear here
                    once you add them.
                  </p>

                </div>
              )}

            </section>

          </section>
        )}

        {/* ==================================================
            TAB 4: EXPERIENCE
        ================================================== */}

        {activeTab === 'experience' && (
          <section
            className="academic-tab-panel"
            aria-labelledby="experience-panel-title"
          >

            <section
              className="experience-panel"
              aria-labelledby="add-experience-heading"
            >

              <div className="experience-panel-heading">

                <div>

                  <h2 id="add-experience-heading">
                    Add an Experience
                  </h2>

                  <p>
                    Record internships, hands-on
                    workshops, or industrial trainings.
                  </p>

                </div>

                <span className="experience-count">
                  {experiences.length}{' '}
                  {experiences.length === 1
                    ? 'experience'
                    : 'experiences'}
                </span>

              </div>

              <form
                className="experience-form"
                onSubmit={
                  handleAddExperience
                }
              >

                <label className="experience-field">
                  Experience Type

                  <select
                    name="type"
                    value={
                      experienceForm.type
                    }
                    onChange={
                      handleExperienceChange
                    }
                  >

                    {experienceTypes.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}

                  </select>
                </label>

                <label className="experience-field">
                  Title

                  <input
                    name="title"
                    type="text"
                    value={
                      experienceForm.title
                    }
                    onChange={
                      handleExperienceChange
                    }
                    placeholder="e.g. Software Development Intern"
                    required
                  />
                </label>

                <label className="experience-field experience-field-wide">
                  Organization

                  <input
                    name="organization"
                    type="text"
                    value={
                      experienceForm.organization
                    }
                    onChange={
                      handleExperienceChange
                    }
                    placeholder="e.g. Northstar Labs"
                    required
                  />
                </label>

                <label className="experience-field">
                  Start Date

                  <input
                    name="startDate"
                    type="date"
                    value={
                      experienceForm.startDate
                    }
                    onChange={
                      handleExperienceChange
                    }
                    required
                  />
                </label>

                <label className="experience-field">
                  End Date

                  <input
                    name="endDate"
                    type="date"
                    value={
                      experienceForm.endDate
                    }
                    onChange={
                      handleExperienceChange
                    }
                    required
                  />
                </label>

                <label className="experience-field experience-field-wide">
                  Description

                  <textarea
                    name="description"
                    value={
                      experienceForm.description
                    }
                    onChange={
                      handleExperienceChange
                    }
                    placeholder="Describe what you learned, built, or contributed"
                    rows="4"
                    required
                  />
                </label>

                <label className="experience-field experience-field-wide">
                  Certificate Link

                  <input
                    name="certificateLink"
                    type="url"
                    value={
                      experienceForm.certificateLink
                    }
                    onChange={
                      handleExperienceChange
                    }
                    placeholder="https://..."
                    required
                  />
                </label>

                <button
                  className="add-experience-button"
                  type="submit"
                >
                  Add Experience
                </button>

              </form>

            </section>

            <section
              className="experience-list-section"
              aria-labelledby="experience-list-heading"
            >

              <div className="experience-list-heading">

                <h2 id="experience-list-heading">
                  Your Experiences
                </h2>

                <span>
                  {experiences.length
                    ? 'Your practical journey, in one place'
                    : 'No experiences added yet'}
                </span>

              </div>

              {experiences.length ? (
                <div className="experience-list">

                  {experiences.map(
                    (item) => (
                      <article
                        className="experience-card"
                        key={item.id}
                      >

                        <div className="experience-card-topline">

                          <span className="experience-type">
                            {item.type}
                          </span>

                          <button
                            className="delete-experience-button"
                            type="button"
                            onClick={() =>
                              handleDeleteExperience(
                                item.id
                              )
                            }
                            aria-label={`Delete ${item.title}`}
                          >
                            Delete
                          </button>

                        </div>

                        <div className="experience-card-content">

                          <h3>
                            {item.title}
                          </h3>

                          <p className="experience-organization">
                            {item.organization}
                          </p>

                          <p className="experience-description">
                            {item.description}
                          </p>

                          <dl className="experience-details">

                            <div>

                              <dt>
                                Start date
                              </dt>

                              <dd>
                                {item.startDate}
                              </dd>

                            </div>

                            <div>

                              <dt>
                                End date
                              </dt>

                              <dd>
                                {item.endDate}
                              </dd>

                            </div>

                          </dl>

                          <a
                            className="experience-certificate-link"
                            href={
                              item.certificateLink
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            View certificate{' '}
                            <span aria-hidden="true">
                              -&gt;
                            </span>
                          </a>

                        </div>

                      </article>
                    )
                  )}

                </div>
              ) : (
                <div className="empty-experience-state">

                  <div
                    className="empty-experience-mark"
                    aria-hidden="true"
                  >
                    +
                  </div>

                  <p>
                    Your internships and workshops
                    will appear here once you add them.
                  </p>

                </div>
              )}

            </section>

          </section>
        )}

        {/* ==================================================
            TAB 5: PROJECTS
        ================================================== */}

        {activeTab === 'projects' && (
          <section
            className="academic-tab-panel"
            aria-labelledby="projects-panel-title"
          >

            <section
              className="projects-panel"
              aria-labelledby="add-project-heading"
            >

              <div className="projects-panel-heading">

                <div>

                  <h2 id="add-project-heading">
                    Add a Project
                  </h2>

                  <p>
                    Build a portfolio of engineering
                    and design work.
                  </p>

                </div>

                <span className="projects-count">
                  {projects.length}{' '}
                  {projects.length === 1
                    ? 'project'
                    : 'projects'}
                </span>

              </div>

              <form
                className="project-form"
                onSubmit={
                  handleAddProject
                }
              >

                <label className="project-field">
                  Project Title

                  <input
                    name="title"
                    type="text"
                    value={
                      projectForm.title
                    }
                    onChange={
                      handleProjectChange
                    }
                    placeholder="e.g. Thirora Career Navigator"
                    required
                  />
                </label>

                <label className="project-field">
                  Technologies Used

                  <input
                    name="technologies"
                    type="text"
                    value={
                      projectForm.technologies
                    }
                    onChange={
                      handleProjectChange
                    }
                    placeholder="e.g. React, Node.js, CSS Grid"
                    required
                  />
                </label>

                <label className="project-field project-field-wide">
                  Project Description

                  <textarea
                    name="description"
                    value={
                      projectForm.description
                    }
                    onChange={
                      handleProjectChange
                    }
                    placeholder="Describe what you built and the problems solved"
                    rows="4"
                    required
                  />
                </label>

                <label className="project-field project-field-wide">
                  Project Link

                  <input
                    name="link"
                    type="url"
                    value={
                      projectForm.link
                    }
                    onChange={
                      handleProjectChange
                    }
                    placeholder="https://github.com/..."
                    required
                  />
                </label>

                <button
                  className="add-project-button"
                  type="submit"
                >
                  Add Project
                </button>

              </form>

            </section>

            <section
              className="project-list-section"
              aria-labelledby="project-list-heading"
            >

              <div className="project-list-heading">

                <h2 id="project-list-heading">
                  Your Projects
                </h2>

                <span>
                  {projects.length
                    ? 'Your work, in one place'
                    : 'No projects added yet'}
                </span>

              </div>

              {projects.length ? (
                <div className="project-list">

                  {projects.map(
                    (item) => (
                      <article
                        className="project-card"
                        key={item.id}
                      >

                        <div className="project-card-topline">

                          <div
                            className="project-card-mark"
                            aria-hidden="true"
                          >
                            PRJ
                          </div>

                          <button
                            className="delete-project-button"
                            type="button"
                            onClick={() =>
                              handleDeleteProject(
                                item.id
                              )
                            }
                            aria-label={`Delete ${item.title}`}
                          >
                            Delete
                          </button>

                        </div>

                        <div className="project-card-content">

                          <h3>
                            {item.title}
                          </h3>

                          <p>
                            {item.description}
                          </p>

                          <div className="project-card-meta">

                            <div>

                              <span>
                                Technologies
                              </span>

                              <strong>
                                {item.technologies}
                              </strong>

                            </div>

                            <a
                              className="project-link"
                              href={
                                item.link
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              View project{' '}
                              <span aria-hidden="true">
                                -&gt;
                              </span>
                            </a>

                          </div>

                        </div>

                      </article>
                    )
                  )}

                </div>
              ) : (
                <div className="empty-projects-state">

                  <div
                    className="empty-project-mark"
                    aria-hidden="true"
                  >
                    +
                  </div>

                  <p>
                    Your projects will appear here
                    once you add them.
                  </p>

                </div>
              )}

            </section>

          </section>
        )}

      </div>
    </main>
  )
}

export default AcademicProfile