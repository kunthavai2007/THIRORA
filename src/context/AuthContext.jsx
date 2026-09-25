import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchStudentSkills,
  addStudentSkill as persistStudentSkill,
  deleteStudentSkill as persistDeleteStudentSkill,
  updateStudentSkill as persistUpdateStudentSkill,
  syncStudentSkillsFromSource,
} from '../services/skillService'
import {
  USER_DEVICES_KEY,
  USER_NOTIFICATIONS_KEY,
  changeUserPassword,
  getCurrentSessionUser,
  loginUser,
  logoutFromOtherDevices,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithCode,
  revokeDeviceSession,
  updateUserProfile,
} from '../services/authService'
import { readStorage, writeStorage, removeStorage, notifyDataChange } from '../utils/storage'
import { resolveStudentCareer } from '../utils/careerContext'
import { AuthContext } from './auth-context'

/**
 * Convert Supabase Auth user into the user object used by THIRORA.
 *
 * Important:
 * Do not invent/default personal information here.
 * Supabase Auth is the source of truth for authentication.
 */
function formatSupabaseUser(user, profile = null) {
  if (!user) return null

  const metadata = user.user_metadata || {}
  const valueFromProfile = (key, fallback) => {
    const value = profile?.[key]
    return value === null || value === undefined || value === '' ? fallback : value
  }

  return {
    ...user,
    id: user.id,
    email: user.email || '',
    name: valueFromProfile('name', metadata.name || metadata.full_name || user.email?.split('@')[0] || ''),
    phone: valueFromProfile('phone', metadata.phone || ''),
    collegeName: valueFromProfile('college_name', metadata.college_name || metadata.collegeName || ''),
    department: valueFromProfile('department', metadata.department || ''),
    currentYear: valueFromProfile('current_year', metadata.current_year || metadata.currentYear || ''),
    currentSemester: valueFromProfile('current_semester', metadata.current_semester || metadata.currentSemester || ''),
    registerNumber: valueFromProfile('register_number', metadata.register_number || metadata.registerNumber || ''),
    graduationYear: valueFromProfile('graduation_year', metadata.graduation_year || metadata.graduationYear || ''),
    graduationDate: valueFromProfile('graduation_date', metadata.graduation_date || metadata.graduationDate || ''),
    targetRole: (() => {
      const role = valueFromProfile('target_role', metadata.target_role || metadata.targetRole || '')
      return String(role).trim().toLowerCase() === 'software engineer' ? '' : role
    })(),
    careerGoal: metadata.career_goal || metadata.careerGoal || '',
    cgpa: valueFromProfile('cgpa', metadata.cgpa || ''),
    bio: valueFromProfile('bio', metadata.bio || ''),
    avatarColor: valueFromProfile('avatar_color', metadata.avatarColor || '#173f70'),
    avatarUrl: valueFromProfile('avatar_url', metadata.avatar_url || metadata.avatarUrl || ''),
    avatarEmoji: valueFromProfile('avatar_emoji', metadata.avatarEmoji || 'TP'),
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const currentUserRef = useRef(currentUser)
  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeDevices, setActiveDevices] = useState([])
  const [notifications, setNotifications] = useState([])
  const [profileRow, setProfileRow] = useState(null)
  const [skills, setSkills] = useState([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [careerData, setCareerData] = useState({
    profile: {},
    skills: [],
    certificates: [],
    projects: [],
    experiences: [],
    attempts: [],
    topicPerformance: [],
  })
  const [careerContext, setCareerContext] = useState(null)

  /**
   * Refresh local device and notification information
   * for the currently authenticated Supabase user.
   */
  const refreshUserData = useCallback((userId) => {
    if (!userId) {
      setActiveDevices([])
      setNotifications([])
      return
    }

    const allDevices = readStorage(
      USER_DEVICES_KEY,
      [],
      Array.isArray
    )

    const userDevices = allDevices.filter(
      (device) => device.userId === userId
    )

    setActiveDevices(userDevices)

    const allNotifications = readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

    const userNotifications = allNotifications.filter(
      (notification) => notification.userId === userId
    )

    userNotifications.sort(
      (a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    )

    setNotifications(userNotifications)
  }, [])

  const refreshStudentData = useCallback(async (userId) => {
    if (!userId) {
      setProfileRow(null)
      setSkills([])
      setCareerContext(null)
      setCareerData({ profile: {}, skills: [], certificates: [], projects: [], experiences: [], attempts: [], topicPerformance: [] })
      setSkillsLoading(false)
      return
    }

    setSkillsLoading(true)
    const localProfile = readStorage('academicProfile', {}, (value) => value !== null && typeof value === 'object' && !Array.isArray(value))
    const localCertificates = readStorage('certificates', [], Array.isArray)
    const localProjects = readStorage('projects', [], Array.isArray)
    const localExperiences = readStorage('experiences', [], Array.isArray)
    const localAttempts = readStorage('quizAttempts', [], Array.isArray)

    try {
      const [authResult, profileResult, loadedSkills, certificatesResult, projectsResult, experiencesResult, attemptsResult, topicsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        fetchStudentSkills(userId),
        supabase.from('certificates').select('*').eq('student_id', userId),
        supabase.from('projects').select('*').eq('student_id', userId),
        supabase.from('experiences').select('*').eq('student_id', userId),
        supabase.from('quiz_attempts').select('*').eq('student_id', userId).order('completed_at', { ascending: false }),
        supabase.from('quiz_topic_performance').select('*').eq('student_id', userId),
      ])

      const profile = profileResult.data || localProfile
      const careerGoal = authResult.data?.user?.user_metadata?.career_goal || authResult.data?.user?.user_metadata?.careerGoal || profile?.career_goal || profile?.careerGoal || ''
      const certificates = Array.isArray(certificatesResult.data) ? certificatesResult.data : localCertificates
      const projects = Array.isArray(projectsResult.data) ? projectsResult.data : localProjects
      const experiences = Array.isArray(experiencesResult.data) ? experiencesResult.data : localExperiences
      const attempts = Array.isArray(attemptsResult.data) ? attemptsResult.data : localAttempts
      const topicRows = Array.isArray(topicsResult.data) ? topicsResult.data : []
      const topicTotals = {}
      topicRows.forEach((topic) => {
        const key = String(topic.topic || '').trim().toLowerCase()
        if (!key) return
        if (!topicTotals[key]) topicTotals[key] = { topic: topic.topic, correct: 0, total: 0 }
        topicTotals[key].correct += Number(topic.correct_answers ?? topic.correct) || 0
        topicTotals[key].total += Number(topic.total_questions ?? topic.total) || 0
      })
      const topicPerformance = Object.values(topicTotals).map((topic) => ({
        ...topic,
        percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
      }))

      if (profileResult.error) console.error('[AUTH CONTEXT] Profile refresh failed:', profileResult.error.message)
      const activeUser = authResult.data?.user || currentUserRef.current
      if (profileResult.data) {
        setProfileRow(profileResult.data)
        setCurrentUser((previous) => formatSupabaseUser(activeUser || previous, profileResult.data))
      }
      setSkills((prev) => {
        if (Array.isArray(loadedSkills) && JSON.stringify(prev) === JSON.stringify(loadedSkills)) return prev
        return loadedSkills
      })
      const nextCareerData = { profile, skills: loadedSkills, certificates, projects, experiences, attempts, topicPerformance }
      setCareerData(nextCareerData)
      const resolvedCareer = resolveStudentCareer({
        ...nextCareerData,
        user: activeUser,
        profile,
        onboardingGoal:
          activeUser?.user_metadata?.onboarding_career ||
          activeUser?.user_metadata?.onboardingCareer ||
          activeUser?.user_metadata?.career_goal ||
          activeUser?.user_metadata?.careerGoal ||
          activeUser?.user_metadata?.target_role,
        explicitGoal: careerGoal,
      })
      setCareerContext((prev) => {
        if (
          prev &&
          prev.track === resolvedCareer.track &&
          prev.source === resolvedCareer.source &&
          prev.sourceLabel === resolvedCareer.sourceLabel &&
          prev.hasContext === resolvedCareer.hasContext
        ) {
          return prev
        }
        return resolvedCareer
      })
    } catch (error) {
      console.error('[AUTH CONTEXT] Student data refresh failed:', error)
    } finally {
      setSkillsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleDataUpdate = () => {
      const activeId = currentUserRef.current?.id
      if (activeId) refreshStudentData(activeId)
    }
    window.addEventListener('careerflow:data-update', handleDataUpdate)
    return () => window.removeEventListener('careerflow:data-update', handleDataUpdate)
  }, [refreshStudentData])

  /**
   * Set authenticated user from a Supabase session.
   */
  const applySession = useCallback((nextSession) => {
    if (!nextSession?.user) {
      setCurrentUser(null)
      setSession(null)
      setActiveDevices([])
      setNotifications([])
      setProfileRow(null)
      setSkills([])
      setCareerContext(null)
      setCareerData({ profile: {}, skills: [], certificates: [], projects: [], experiences: [], attempts: [], topicPerformance: [] })
      return
    }

    const formattedUser = formatSupabaseUser(
      nextSession.user
    )

    setCurrentUser(formattedUser)
    setSession(nextSession)

    refreshUserData(nextSession.user.id)
    void refreshStudentData(nextSession.user.id)
  }, [refreshStudentData, refreshUserData])

  /**
   * Restore the Supabase session when the application starts.
   */
  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      try {
        console.log('[AUTH DEBUG] Restoring Supabase session...')

        const current = await getCurrentSessionUser()

        console.log(
          '[AUTH DEBUG] Startup session exists:',
          Boolean(current?.session)
        )

        console.log(
          '[AUTH DEBUG] Startup user:',
          current?.user?.email || null
        )

        if (!isMounted) return

        if (current?.session?.user) {
          applySession(current.session)
        } else {
          applySession(null)
        }
      } catch (error) {
        console.error(
          '[AUTH DEBUG] Session restoration error:',
          error
        )

        if (isMounted) {
          applySession(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    /**
     * Listen to Supabase authentication events.
     *
     * Supabase handles session persistence internally.
     * This listener keeps React state synchronized with it.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log(
          '[AUTH DEBUG] Auth event:',
          event,
          '| session:',
          Boolean(nextSession),
          '| user:',
          nextSession?.user?.email || null
        )

        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          const prevId = currentUserRef.current?.id
          applySession(null)
          removeStorage('skills')
          if (prevId) removeStorage(`skills_${prevId}`)
          removeStorage('academicProfile')
          removeStorage('projects')
          removeStorage('certificates')
          removeStorage('experiences')
          removeStorage('quizAttempts')
          removeStorage('quizScore')
          notifyDataChange('logout')
          setLoading(false)
          return
        }

        if (nextSession?.user) {
          applySession(nextSession)
        } else if (
          event === 'INITIAL_SESSION' &&
          !nextSession
        ) {
          applySession(null)
        }

        setLoading(false)
      }
    )

    /**
     * Refresh notifications when a new notification
     * is created elsewhere in the application.
     */
    async function handleNewNotification() {
      try {
        const current = await getCurrentSessionUser()

        if (current?.user?.id) {
          refreshUserData(current.user.id)
        }
      } catch {
        // Ignore notification refresh errors.
      }
    }

    window.addEventListener(
      'careerflow:notification-new',
      handleNewNotification
    )

    return () => {
      isMounted = false

      subscription?.unsubscribe()

      window.removeEventListener(
        'careerflow:notification-new',
        handleNewNotification
      )
    }
  }, [applySession, refreshUserData])

  /**
   * LOGIN
   *
   * Supabase Auth is the only authentication source.
   */
  async function login(email, password, rememberMe = true) {
    console.log(
      '[AUTH DEBUG] Login started for:',
      email
    )

    const result = await loginUser(
      email,
      password,
      rememberMe
    )

    console.log(
      '[AUTH DEBUG] Login result user:',
      result?.user?.email || null
    )

    console.log(
      '[AUTH DEBUG] Login result session:',
      Boolean(result?.session)
    )

    if (!result?.user || !result?.session) {
      throw new Error(
        'Login succeeded without an active session. Please try again.'
      )
    }

    const formattedUser = formatSupabaseUser(
      result.user
    )

    setCurrentUser(formattedUser)
    setSession(result.session)

    refreshUserData(result.user.id)
    void refreshStudentData(result.user.id)

    return {
      ...result,
      user: formattedUser,
    }
  }

  /**
   * SIGN UP
   *
   * Supabase may return session = null when
   * email confirmation is enabled.
   *
   * That is expected behavior.
   */
  async function signup(userData) {
    console.log(
      '[AUTH DEBUG] Signup started for:',
      userData?.email || null
    )

    const result = await registerUser(userData)

    console.log(
      '[AUTH DEBUG] Signup user:',
      result?.user?.email || null
    )

    console.log(
      '[AUTH DEBUG] Signup session:',
      Boolean(result?.session)
    )

    if (result?.session?.user) {
      const formattedUser = formatSupabaseUser(
        result.session.user
      )

      setCurrentUser(formattedUser)
      setSession(result.session)

      refreshUserData(result.session.user.id)
      void refreshStudentData(result.session.user.id)

      return {
        ...result,
        user: formattedUser,
      }
    }

    /**
     * Email confirmation enabled:
     * user exists, but there is no authenticated session yet.
     */
    setCurrentUser(null)
    setSession(null)
    setActiveDevices([])
    setNotifications([])
    setProfileRow(null)
    setSkills([])
    setCareerContext(null)
    setCareerData({ profile: {}, skills: [], certificates: [], projects: [], experiences: [], attempts: [], topicPerformance: [] })
    return result
  }

  /**
   * LOGOUT
   */
  async function logout() {
    console.log('[AUTH DEBUG] Logout started')

    const prevId = currentUser?.id
    await logoutUser()

    setCurrentUser(null)
    setSession(null)
    setActiveDevices([])
    setNotifications([])
    setProfileRow(null)
    setSkills([])
    setCareerContext(null)
    setCareerData({ profile: {}, skills: [], certificates: [], projects: [], experiences: [], attempts: [], topicPerformance: [] })

    removeStorage('skills')
    if (prevId) removeStorage(`skills_${prevId}`)
    removeStorage('academicProfile')
    removeStorage('projects')
    removeStorage('certificates')
    removeStorage('experiences')
    removeStorage('quizAttempts')
    removeStorage('quizScore')
    notifyDataChange('logout')
  }

  /**
   * Logout from other locally tracked devices.
   */
  function handleLogoutOtherDevices() {
    if (!currentUser?.id) return []

    const updated = logoutFromOtherDevices(
      currentUser.id
    )

    setActiveDevices(updated)

    refreshUserData(currentUser.id)

    return updated
  }

  /**
   * Revoke a locally tracked device.
   */
  function handleRevokeDevice(deviceRecordId) {
    if (!currentUser?.id) return []

    const updated = revokeDeviceSession(
      currentUser.id,
      deviceRecordId
    )

    setActiveDevices(updated)

    return updated
  }

  /**
   * Update authenticated user's profile through the existing service and
   * immediately refresh the canonical profile snapshot used by all modules.
   */
  async function updateProfile(updates) {
    if (!currentUser?.id) {
      throw new Error('No authenticated user found.')
    }

    const updatedUser = await updateUserProfile(currentUser.id, updates)
    await refreshStudentData(currentUser.id)
    return updatedUser
  }

  async function addStudentSkillForUser(input) {
    if (!currentUser?.id) throw new Error('Please sign in before adding a skill.')
    const created = await persistStudentSkill(currentUser.id, input)
    setSkills((previous) => {
      const withoutDuplicate = previous.filter((skill) => skill.name.toLowerCase() !== created.name.toLowerCase())
      const nextSkills = [...withoutDuplicate, created]
      setCareerData((prevCareer) => {
        const nextCareer = { ...prevCareer, skills: nextSkills }
        setCareerContext(resolveStudentCareer({ ...nextCareer, user: currentUser, profile: prevCareer.profile }))
        return nextCareer
      })
      return nextSkills
    })
    return created
  }

  async function syncStudentSkillsForUser(skillNames, options = {}) {
    if (!currentUser?.id) return []
    const updated = await syncStudentSkillsFromSource(currentUser.id, skillNames, options)
    setSkills(updated)
    setCareerData((prevCareer) => {
      const nextCareer = { ...prevCareer, skills: updated }
      setCareerContext(resolveStudentCareer({ ...nextCareer, user: currentUser, profile: prevCareer.profile }))
      return nextCareer
    })
    return updated
  }

  async function deleteStudentSkillForUser(skillId, skillName) {
    if (!currentUser?.id) throw new Error('Please sign in before deleting a skill.')
    const remaining = await persistDeleteStudentSkill(currentUser.id, skillId, skillName)
    const userRemaining = remaining.filter((skill) => skill.student_id === currentUser.id)
    setSkills(userRemaining)
    setCareerData((prevCareer) => {
      const nextCareer = { ...prevCareer, skills: userRemaining }
      setCareerContext(resolveStudentCareer({ ...nextCareer, user: currentUser, profile: prevCareer.profile }))
      return nextCareer
    })
    return remaining
  }

  async function updateStudentSkillForUser(skillId, updates) {
    if (!currentUser?.id) throw new Error('Please sign in before updating a skill.')
    const updated = await persistUpdateStudentSkill(currentUser.id, skillId, updates)
    setSkills((previous) => {
      const nextSkills = [
        ...previous.filter((skill) => String(skill.id) !== String(skillId)),
        updated,
      ]
      setCareerData((prevCareer) => {
        const nextCareer = { ...prevCareer, skills: nextSkills }
        setCareerContext(resolveStudentCareer({ ...nextCareer, user: currentUser, profile: prevCareer.profile }))
        return nextCareer
      })
      return nextSkills
    })
    return updated
  }

  /**
   * Change authenticated user's password.
   */
  async function changePassword(
    currentPassword,
    newPassword
  ) {
    if (!currentUser?.id) {
      throw new Error('No authenticated user found.')
    }

    const result = await changeUserPassword(
      currentUser.id,
      currentPassword,
      newPassword
    )

    refreshUserData(currentUser.id)

    return result
  }

  /**
   * Forgot password.
   */
  async function forgotPassword(email) {
    return await requestPasswordReset(email)
  }

  /**
   * Password recovery.
   */
  async function resetPassword(
    email,
    code,
    newPassword
  ) {
    return await resetPasswordWithCode(
      email,
      code,
      newPassword
    )
  }

  /**
   * Mark one notification as read.
   */
  function markNotificationRead(notificationId) {
    if (!currentUser?.id) return

    const allNotifications = readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

    const updatedNotifications =
      allNotifications.map((notification) => {
        if (
          notification.userId === currentUser.id &&
          notification.id === notificationId
        ) {
          return {
            ...notification,
            read: true,
          }
        }

        return notification
      })

    writeStorage(
      USER_NOTIFICATIONS_KEY,
      updatedNotifications
    )

    refreshUserData(currentUser.id)
  }

  /**
   * Mark all notifications as read.
   */
  function markAllNotificationsRead() {
    if (!currentUser?.id) return

    const allNotifications = readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

    const updatedNotifications =
      allNotifications.map((notification) => {
        if (notification.userId === currentUser.id) {
          return {
            ...notification,
            read: true,
          }
        }

        return notification
      })

    writeStorage(
      USER_NOTIFICATIONS_KEY,
      updatedNotifications
    )

    refreshUserData(currentUser.id)
  }

  /**
   * Delete one notification.
   */
  function deleteNotification(notificationId) {
    if (!currentUser?.id) return

    const allNotifications = readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

    const updatedNotifications =
      allNotifications.filter(
        (notification) =>
          !(
            notification.userId === currentUser.id &&
            notification.id === notificationId
          )
      )

    writeStorage(
      USER_NOTIFICATIONS_KEY,
      updatedNotifications
    )

    refreshUserData(currentUser.id)
  }

  /**
   * Clear all notifications for current user.
   */
  function clearAllNotifications() {
    if (!currentUser?.id) return

    const allNotifications = readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

    const updatedNotifications =
      allNotifications.filter(
        (notification) =>
          notification.userId !== currentUser.id
      )

    writeStorage(
      USER_NOTIFICATIONS_KEY,
      updatedNotifications
    )

    refreshUserData(currentUser.id)
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length

  const value = {
    currentUser,
    session,
    loading,
    profileRow,
    skills,
    skillsLoading,
    careerData,
    careerContext,

    activeDevices,
    notifications,
    unreadCount,

    login,
    signup,
    logout,

    logoutOtherDevices:
      handleLogoutOtherDevices,

    revokeDevice:
      handleRevokeDevice,

    updateProfile,
    addStudentSkill: addStudentSkillForUser,
    syncStudentSkills: syncStudentSkillsForUser,
    deleteStudentSkill: deleteStudentSkillForUser,
    updateStudentSkill: updateStudentSkillForUser,
    refreshStudentData,
    resolveCareer: resolveStudentCareer,
    changePassword,

    forgotPassword,
    resetPassword,

    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,

    refreshUserData,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider