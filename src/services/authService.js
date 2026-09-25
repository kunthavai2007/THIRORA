/**
 * Thirora - Authentication Service
 * Supabase Authentication + Profile Management
 *
 * Authentication source:
 *   Supabase Auth
 *
 * Profile source:
 *   public.profiles
 *
 * LocalStorage is used only for:
 *   - device information
 *   - security notifications
 *
 * It is NOT used for passwords or authentication sessions.
 */

import { supabase } from '../lib/supabase'
import { readStorage, writeStorage } from '../utils/storage.js'

export const AUTH_USERS_KEY = 'careerflow_auth_users'
export const AUTH_SESSION_KEY = 'careerflow_auth_session'
export const USER_DEVICES_KEY = 'careerflow_user_devices'
export const USER_NOTIFICATIONS_KEY = 'careerflow_notifications'
export const PASSWORD_RESET_TOKENS_KEY = 'careerflow_pwd_reset_tokens'

/* =========================================================
   DEVICE MANAGEMENT
========================================================= */

export function getOrCreateDeviceId() {
  const DEVICE_ID_KEY = 'careerflow_client_device_id'

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)

    if (!deviceId) {
      deviceId =
        'dev_' +
        Math.random().toString(36).substring(2, 11) +
        '_' +
        Date.now().toString(36)

      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }

    return deviceId
  } catch {
    return 'temporary_' + Date.now().toString(36)
  }
}

export function getDeviceFingerprint() {
  const ua =
    typeof navigator !== 'undefined'
      ? navigator.userAgent || ''
      : ''

  let os = 'Unknown OS'
  let browser = 'Unknown Browser'
  let deviceType = 'Desktop'

  /* Operating system */

  if (/Windows/i.test(ua)) {
    os = 'Windows'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS'
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS'
    deviceType = /iPad/i.test(ua) ? 'Tablet' : 'Mobile'
  } else if (/Android/i.test(ua)) {
    os = 'Android'
    deviceType = /Tablet|Nexus 7|Nexus 10/i.test(ua)
      ? 'Tablet'
      : 'Mobile'
  } else if (/Linux/i.test(ua)) {
    os = 'Linux'
  }

  /* Browser */

  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge'
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome'
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox'
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari'
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera'
  }

  const screenResolution =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width || 0}x${window.screen.height || 0}`
      : '0x0'

  return {
    deviceId: getOrCreateDeviceId(),
    os,
    browser,
    deviceType,
    screenResolution,
    userAgent: ua,
    ipCity: 'Local Gateway (Client)',
  }
}

export async function initializeAuthStorage() {
  const devices = readStorage(
    USER_DEVICES_KEY,
    null,
    Array.isArray
  )

  if (!devices) {
    writeStorage(USER_DEVICES_KEY, [])
  }

  const notifications = readStorage(
    USER_NOTIFICATIONS_KEY,
    null,
    Array.isArray
  )

  if (!notifications) {
    writeStorage(USER_NOTIFICATIONS_KEY, [])
  }
}

/* =========================================================
   DEVICE LOGIN TRACKING
========================================================= */

function trackDeviceLogin(userId) {
  if (!userId) return false

  try {
    const fingerprint = getDeviceFingerprint()

    const devices = readStorage(
      USER_DEVICES_KEY,
      [],
      Array.isArray
    )

    const userDevices = devices.filter(
      (device) => device.userId === userId
    )

    const existingDevice = userDevices.find(
      (device) =>
        device.deviceId === fingerprint.deviceId
    )

    const now = new Date().toISOString()

    let isNewDevice = false

    if (!existingDevice) {
      isNewDevice = true

      const newDeviceRecord = {
        id: 'dev_' + Date.now().toString(36),
        userId,
        deviceId: fingerprint.deviceId,
        deviceName: `${fingerprint.browser} on ${fingerprint.os}`,
        deviceType: fingerprint.deviceType,
        browser: fingerprint.browser,
        os: fingerprint.os,
        location: fingerprint.ipCity,
        ipAddress: '127.0.0.1 (Local Client)',
        lastActive: now,
        firstSeen: now,
        isCurrentDevice: true,
        status: 'active',
      }

      const updatedDevices = devices.map((device) =>
        device.userId === userId
          ? {
            ...device,
            isCurrentDevice: false,
          }
          : device
      )

      updatedDevices.push(newDeviceRecord)

      writeStorage(
        USER_DEVICES_KEY,
        updatedDevices
      )

      createSecurityNotification(userId, {
        title: 'New Device Login Detected',
        message:
          `Your account was accessed from a new device: ` +
          `${fingerprint.browser} on ${fingerprint.os}.`,
        type: 'security',
        priority: 'high',
        actionUrl: '/settings?tab=devices',
      })
    } else {
      const updatedDevices = devices.map((device) => {
        if (device.userId !== userId) {
          return device
        }

        if (
          device.deviceId ===
          fingerprint.deviceId
        ) {
          return {
            ...device,
            lastActive: now,
            isCurrentDevice: true,
            status: 'active',
          }
        }

        return {
          ...device,
          isCurrentDevice: false,
        }
      })

      writeStorage(
        USER_DEVICES_KEY,
        updatedDevices
      )
    }

    return isNewDevice
  } catch {
    return false
  }
}

/* =========================================================
   PROFILE HELPERS
========================================================= */

/**
 * Creates a profile only when an authenticated Supabase
 * session exists.
 *
 * Signup with email confirmation may not have a session.
 * In that case the database trigger handles profile creation.
 */
export async function ensureUserProfile(
  user,
  additionalData = {}
) {
  if (!user?.id) {
    return null
  }

  /* Verify authenticated session */

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession()

  if (
    sessionError ||
    !sessionData?.session ||
    sessionData.session.user?.id !== user.id
  ) {
    console.log(
      '[THIRORA AUTH] No authenticated session. Profile sync skipped.'
    )

    return null
  }

  const metadata = user.user_metadata || {}

  const profilePayload = {
    id: user.id,

    name:
      additionalData.name ??
      metadata.name ??
      metadata.full_name ??
      user.email?.split('@')[0] ??
      null,

    phone:
      additionalData.phone ??
      metadata.phone ??
      null,

    college_name:
      additionalData.collegeName ??
      additionalData.college_name ??
      metadata.collegeName ??
      metadata.college_name ??
      null,

    department:
      additionalData.department ??
      metadata.department ??
      null,

    current_year:
      additionalData.currentYear ??
      additionalData.current_year ??
      metadata.currentYear ??
      metadata.current_year ??
      null,

    graduation_year:
      additionalData.graduationYear ??
      additionalData.graduation_year ??
      metadata.graduationYear ??
      metadata.graduation_year ??
      null,

    target_role:
      additionalData.targetRole ??
      additionalData.target_role ??
      metadata.targetRole ??
      metadata.target_role ??
      null,

    cgpa:
      additionalData.cgpa ??
      metadata.cgpa ??
      null,

    bio:
      additionalData.bio ??
      metadata.bio ??
      null,

    avatar_url:
      additionalData.avatarUrl ??
      additionalData.avatar_url ??
      metadata.avatarUrl ??
      metadata.avatar_url ??
      null,

    updated_at: new Date().toISOString(),
  }

  /*
   * Do not overwrite existing profile fields with null
   * when no additional information was supplied.
   */

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile) {
    const updates = {
      updated_at: new Date().toISOString(),
    }

    Object.entries(profilePayload).forEach(
      ([key, value]) => {
        if (
          key !== 'id' &&
          value !== null &&
          value !== undefined &&
          value !== ''
        ) {
          updates[key] = value
        }
      }
    )

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error(
        '[THIRORA AUTH] Profile update error:',
        error.message
      )

      throw new Error(
        `Profile update failed: ${error.message}`
      )
    }

    return data
  }

  /*
   * Profile does not exist.
   * Create it using the authenticated session.
   */

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select()
    .maybeSingle()

  if (error) {
    /*
     * Another process may have created it between
     * SELECT and INSERT.
     */
    if (error.code === '23505') {
      const retry = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (retry.error) {
        throw new Error(
          `Profile lookup failed: ${retry.error.message}`
        )
      }

      return retry.data
    }

    console.error(
      '[THIRORA AUTH] Profile creation error:',
      error.message
    )

    throw new Error(
      `Profile creation failed: ${error.message}`
    )
  }

  return data
}

/* =========================================================
   LOGIN
========================================================= */

export async function loginUser(
  email,
  password
) {
  if (!email || !email.trim()) {
    throw new Error(
      'Please enter your email address.'
    )
  }

  if (!password) {
    throw new Error(
      'Please enter your password.'
    )
  }

  const normalizedEmail =
    email.trim().toLowerCase()

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    throw new Error(
      error.message ||
      'Unable to sign in. Please check your email and password.'
    )
  }

  if (!data?.session || !data?.user) {
    throw new Error(
      'Login succeeded but no active session was created. Please try again.'
    )
  }

  const user = data.user
  const session = data.session

  let isNewDevice = false

  try {
    isNewDevice = Boolean(trackDeviceLogin(user.id))
  } catch {
    // Ignore tracking errors
  }

  /*
   * Profile synchronization is secondary.
   * Authentication should remain successful even if
   * profile synchronization has a temporary issue.
   */

  try {
    await ensureUserProfile(user)
  } catch (profileError) {
    console.error(
      '[THIRORA AUTH] Profile synchronization failed:',
      profileError.message
    )
  }

  return {
    user,
    session,
    isNewDevice,
  }
}

/* =========================================================
   SIGN UP
========================================================= */

export async function registerUser(
  userData = {}
) {
  const {
    name,
    email,
    password,
  } = userData

  if (!name || !name.trim()) {
    throw new Error(
      'Please enter your full name.'
    )
  }

  if (!email || !email.trim()) {
    throw new Error(
      'Please enter a valid email address.'
    )
  }

  if (!password || password.length < 8) {
    throw new Error(
      'Password must be at least 8 characters long.'
    )
  }

  const normalizedEmail =
    email.trim().toLowerCase()

  const trimmedName =
    name.trim()

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,

    options: {
      data: {
        name: trimmedName,
      },
    },
  })

  if (error) {
    throw new Error(
      error.message ||
      'Failed to create your account.'
    )
  }

  const user = data?.user || null
  const session = data?.session || null

  /*
   * IMPORTANT:
   *
   * When Supabase Email Confirmation is enabled,
   * session can be null here.
   *
   * We intentionally do NOT attempt an immediate
   * password login.
   */

  if (session && user) {
    try {
      await supabase.auth.setSession(session)
    } catch {
      // Supabase already owns the session.
    }

    try {
      trackDeviceLogin(user.id)
    } catch {
      // Non-critical.
    }

    try {
      await ensureUserProfile(
        user,
        {
          name: trimmedName,
        }
      )
    } catch (profileError) {
      console.error(
        '[THIRORA AUTH] Signup profile sync failed:',
        profileError.message
      )
    }
  }

  return {
    user,
    session,
    emailConfirmationRequired:
      Boolean(user && !session),
  }
}

/* =========================================================
   CURRENT SESSION
========================================================= */

export async function getCurrentSessionUser() {
  try {
    const {
      data,
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error(
        '[THIRORA AUTH] Session error:',
        error.message
      )

      return null
    }

    if (!data?.session) {
      return null
    }

    return {
      user: data.session.user,
      session: data.session,
    }
  } catch (error) {
    console.error(
      '[THIRORA AUTH] Failed to restore session:',
      error
    )

    return null
  }
}

/* =========================================================
   GOOGLE AUTH
========================================================= */

export async function loginWithGoogle() {
  const redirectTo =
    typeof window !== 'undefined'
      ? window.location.origin
      : undefined

  const {
    data,
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: 'google',

    options: {
      redirectTo,
    },
  })

  if (error) {
    throw new Error(
      error.message ||
      'Unable to continue with Google.'
    )
  }

  return data
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutUser() {
  const {
    error,
  } = await supabase.auth.signOut()

  if (error) {
    throw new Error(
      error.message ||
      'Failed to log out.'
    )
  }

  return true
}

/* =========================================================
   PROFILE UPDATE
========================================================= */

/* =========================================================
   CANONICAL STUDENT PROFILE SAVE
   ========================================================= */

function parseYearValue(value) {
  if (value === null || value === undefined || value === '') return null
  const match = String(value).match(/\d+/)
  const year = match ? Number(match[0]) : Number(value)
  return Number.isFinite(year) ? year : null
}

function parseCgpaValue(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number.parseFloat(String(value))
  return Number.isFinite(number) ? number : null
}

export async function saveStudentProfile(userId, updates = {}) {
  if (!userId) throw new Error('No authenticated user found.')

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user || authData.user.id !== userId) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (readError) throw new Error(`Unable to read your profile: ${readError.message}`)

  const current = existing || {}
  const metadata = authData.user.user_metadata || {}
  const value = (camelKey, snakeKey, fallback = null) => {
    if (updates[camelKey] !== undefined) return updates[camelKey]
    if (updates[snakeKey] !== undefined) return updates[snakeKey]
    return current[snakeKey] ?? fallback
  }

  const targetRole = value('targetRole', 'target_role', metadata.target_role || metadata.targetRole || null)
  const profilePayload = {
    name: value('name', 'name', current.name || metadata.name || metadata.full_name || authData.user.email?.split('@')[0] || ''),
    email: authData.user.email || current.email || '',
    phone: value('phone', 'phone', current.phone ?? metadata.phone ?? null),
    college_name: value('collegeName', 'college_name', current.college_name ?? metadata.college_name ?? null),
    department: value('department', 'department', current.department ?? metadata.department ?? null),
    current_year: parseYearValue(value('currentYear', 'current_year', current.current_year ?? metadata.current_year ?? null)),
    current_semester: value('currentSemester', 'current_semester', current.current_semester ?? metadata.current_semester ?? null),
    register_number: value('registerNumber', 'register_number', current.register_number ?? metadata.register_number ?? null),
    graduation_year: parseYearValue(value('graduationYear', 'graduation_year', current.graduation_year ?? metadata.graduation_year ?? null)),
    graduation_date: value('graduationDate', 'graduation_date', current.graduation_date ?? metadata.graduation_date ?? null),
    target_role: targetRole === '' ? null : targetRole,
    cgpa: parseCgpaValue(value('currentCgpa', 'cgpa', current.cgpa ?? metadata.cgpa ?? null)),
    bio: value('bio', 'bio', current.bio ?? metadata.bio ?? null),
    avatar_url: value('avatarUrl', 'avatar_url', current.avatar_url ?? metadata.avatar_url ?? null),
    avatar_color: value('avatarColor', 'avatar_color', current.avatar_color ?? metadata.avatarColor ?? '#173f70'),
    avatar_emoji: value('avatarEmoji', 'avatar_emoji', current.avatar_emoji ?? metadata.avatarEmoji ?? 'TP'),
    updated_at: new Date().toISOString(),
  }

  const { data: saved, error: saveError } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('id', userId)
    .select('*')
    .maybeSingle()

  if (saveError) throw new Error(`Profile update failed: ${saveError.message}`)
  if (!saved) throw new Error('Profile update did not return a saved row.')

  // Auth metadata is a compatibility mirror; public.profiles remains canonical.
  try {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        name: saved.name,
        phone: saved.phone,
        college_name: saved.college_name,
        department: saved.department,
        current_year: saved.current_year,
        current_semester: saved.current_semester,
        register_number: saved.register_number,
        graduation_year: saved.graduation_year,
        graduation_date: saved.graduation_date,
        target_role: saved.target_role,
        cgpa: saved.cgpa,
        bio: saved.bio,
        avatar_url: saved.avatar_url,
        avatarColor: saved.avatar_color,
        avatarEmoji: saved.avatar_emoji,
      },
    })
    if (metadataError) console.error('[THIRORA AUTH] Metadata mirror failed:', metadataError.message)
  } catch (metadataError) {
    console.error('[THIRORA AUTH] Metadata mirror failed:', metadataError)
  }

  return saved
}

export async function updateUserProfile(
  userIdOrUpdates,
  maybeUpdates
) {
  const updates =
    typeof userIdOrUpdates === 'object' &&
      userIdOrUpdates !== null
      ? userIdOrUpdates
      : maybeUpdates || {}

  /*
   * Get the currently authenticated user.
   */

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    )
  }

  const user = userData.user

  /*
   * Update Supabase Auth metadata only with
   * values actually supplied.
   */

  const metadataUpdates = {
    ...updates,
  }

  delete metadataUpdates.collegeName
  delete metadataUpdates.currentYear
  delete metadataUpdates.graduationYear
  delete metadataUpdates.targetRole
  delete metadataUpdates.avatarUrl
  delete metadataUpdates.careerGoal
  delete metadataUpdates.career_goal

  const {
    data: updatedAuth,
    error: authError,
  } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      ...metadataUpdates,

      ...(updates.collegeName !== undefined && {
        college_name: updates.collegeName,
      }),

      ...(updates.currentYear !== undefined && {
        current_year: updates.currentYear,
      }),

      ...(updates.graduationYear !== undefined && {
        graduation_year: updates.graduationYear,
      }),

      ...(updates.targetRole !== undefined && {
        target_role: updates.targetRole,
      }),

      ...(updates.avatarUrl !== undefined && {
        avatar_url: updates.avatarUrl,
      }),

      ...(updates.careerGoal !== undefined && {
        career_goal: updates.careerGoal,
      }),

      ...(updates.career_goal !== undefined && {
        career_goal: updates.career_goal,
      }),
    },
  })

  if (authError) {
    throw new Error(
      authError.message ||
      'Failed to update account profile.'
    )
  }

  /*
   * Build only the fields that were actually changed.
   */

  const profileData = {
    updated_at: new Date().toISOString(),
  }

  if (updates.name !== undefined) {
    profileData.name = updates.name
  }

  if (updates.phone !== undefined) {
    profileData.phone = updates.phone
  }

  if (updates.collegeName !== undefined) {
    profileData.college_name =
      updates.collegeName
  }

  if (updates.department !== undefined) {
    profileData.department = updates.department
  }

  if (updates.currentSemester !== undefined) {
    profileData.current_semester = updates.currentSemester || null
  }

  if (updates.registerNumber !== undefined) {
    profileData.register_number = updates.registerNumber || null
  }

  if (updates.graduationDate !== undefined) {
    profileData.graduation_date = updates.graduationDate || null
  }

  if (updates.targetRole !== undefined) {
    profileData.target_role =
      updates.targetRole || null
  }

  if (updates.bio !== undefined) {
    profileData.bio = updates.bio
  }

  if (updates.avatarUrl !== undefined) {
    profileData.avatar_url =
      updates.avatarUrl
  }

  if (updates.avatarColor !== undefined) {
    profileData.avatar_color = updates.avatarColor
  }

  if (updates.avatarEmoji !== undefined) {
    profileData.avatar_emoji = updates.avatarEmoji
  }

  if (updates.currentYear !== undefined) {
    const yearMatch = String(
      updates.currentYear
    ).match(/(\d+)/)

    profileData.current_year =
      yearMatch
        ? Number(yearMatch[1])
        : null
  }

  if (
    updates.graduationYear !== undefined
  ) {
    const graduationYear =
      Number(updates.graduationYear)

    profileData.graduation_year =
      Number.isFinite(graduationYear)
        ? graduationYear
        : null
  }

  if (updates.cgpa !== undefined) {
    const cgpa =
      Number.parseFloat(
        String(updates.cgpa)
      )

    profileData.cgpa =
      Number.isFinite(cgpa)
        ? cgpa
        : null
  }

  /*
   * Update public.profiles only when there are
   * actual profile fields to update. The explicit
   * career goal is persisted in Auth metadata because
   * this project has no separate profiles.career_goal column.
   */

  const {
    error: profileError,
  } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id)
    .select()
    .maybeSingle()

  if (profileError) {
    throw new Error(
      profileError.message ||
      'Failed to update public profile.'
    )
  }

  /*
   * Auth user contains the latest metadata.
   * This is what AuthContext will use.
   */

  return updatedAuth?.user || user
}

/* =========================================================
   CHANGE PASSWORD
========================================================= */

export async function changeUserPassword(
  arg1,
  arg2,
  arg3
) {
  /*
   * Supports both:
   *
   * changeUserPassword(newPassword)
   *
   * changeUserPassword(userId, currentPassword, newPassword)
   *
   * Supabase Auth only needs the new password here.
   */

  const newPassword =
    arg3 !== undefined
      ? arg3
      : arg2 !== undefined
        ? arg2
        : arg1

  if (
    !newPassword ||
    newPassword.length < 8
  ) {
    throw new Error(
      'New password must be at least 8 characters long.'
    )
  }

  const {
    data,
    error,
  } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(
      error.message ||
      'Failed to change password.'
    )
  }

  const userId =
    data?.user?.id || null

  if (userId) {
    try {
      createSecurityNotification(
        userId,
        {
          title:
            'Password Changed Successfully',
          message:
            'Your account password was updated.',
          type: 'security',
          priority: 'high',
          actionUrl:
            '/settings?tab=security',
        }
      )
    } catch {
      // Non-critical.
    }
  }

  return true
}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export async function requestPasswordReset(
  email
) {
  if (!email || !email.trim()) {
    throw new Error(
      'Please enter your email address.'
    )
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : undefined

  const {
    error,
  } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo,
    }
  )

  if (error) {
    throw new Error(
      error.message ||
      'Failed to send password reset email.'
    )
  }

  return {
    success: true,
    message:
      'Password reset link sent to your email address.',
  }
}

/* =========================================================
   RESET PASSWORD
========================================================= */

export async function resetPasswordWithCode(
  email,
  codeOrPassword,
  maybePassword
) {
  /*
   * Supabase recovery uses the authenticated recovery
   * session from the email link.
   *
   * The code parameter is kept for compatibility with
   * the existing Auth UI, but it is not used as a
   * Supabase authentication credential.
   */

  const newPassword =
    maybePassword || codeOrPassword

  if (
    !newPassword ||
    newPassword.length < 8
  ) {
    throw new Error(
      'Password must be at least 8 characters long.'
    )
  }

  const {
    data,
    error,
  } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(
      error.message ||
      'Failed to reset password.'
    )
  }

  return {
    success: true,
    user: data?.user || null,
  }
}

/* =========================================================
   DEVICE SESSION MANAGEMENT
========================================================= */

export function logoutFromOtherDevices(
  userId
) {
  const currentFingerprint =
    getDeviceFingerprint()

  const devices = readStorage(
    USER_DEVICES_KEY,
    [],
    Array.isArray
  )

  const updatedDevices =
    devices.map((device) => {
      if (device.userId !== userId) {
        return device
      }

      if (
        device.deviceId ===
        currentFingerprint.deviceId
      ) {
        return {
          ...device,
          isCurrentDevice: true,
          status: 'active',
        }
      }

      return {
        ...device,
        status: 'revoked',
        isCurrentDevice: false,
      }
    })

  writeStorage(
    USER_DEVICES_KEY,
    updatedDevices
  )

  createSecurityNotification(
    userId,
    {
      title:
        'Logged Out from Other Devices',
      message:
        'Other locally tracked device sessions have been marked as revoked.',
      type: 'security',
      priority: 'medium',
      actionUrl:
        '/settings?tab=devices',
    }
  )

  return updatedDevices.filter(
    (device) =>
      device.userId === userId
  )
}

export function revokeDeviceSession(
  userId,
  deviceRecordId
) {
  const devices = readStorage(
    USER_DEVICES_KEY,
    [],
    Array.isArray
  )

  const updatedDevices =
    devices.map((device) => {
      if (
        device.userId === userId &&
        device.id === deviceRecordId
      ) {
        return {
          ...device,
          status: 'revoked',
          isCurrentDevice: false,
        }
      }

      return device
    })

  writeStorage(
    USER_DEVICES_KEY,
    updatedDevices
  )

  return updatedDevices.filter(
    (device) =>
      device.userId === userId
  )
}

/* =========================================================
   SECURITY NOTIFICATIONS
========================================================= */

export function createSecurityNotification(
  userId,
  {
    title,
    message,
    type = 'system',
    priority = 'medium',
    actionUrl = '',
  }
) {
  const notifications =
    readStorage(
      USER_NOTIFICATIONS_KEY,
      [],
      Array.isArray
    )

  const newNotification = {
    id:
      'notif_' +
      Date.now().toString(36) +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 5),

    userId,
    type,
    priority,
    title,
    message,
    timestamp:
      new Date().toISOString(),
    read: false,
    actionUrl,
  }

  notifications.unshift(
    newNotification
  )

  writeStorage(
    USER_NOTIFICATIONS_KEY,
    notifications
  )

  try {
    window.dispatchEvent(
      new CustomEvent(
        'careerflow:notification-new',
        {
          detail: newNotification,
        }
      )
    )
  } catch {
    // Ignore browser event errors.
  }

  return newNotification
}

/* =========================================================
   SAFE USER
========================================================= */

export function getSafeUser(user) {
  if (!user) return null

  return {
    ...user,
  }
}