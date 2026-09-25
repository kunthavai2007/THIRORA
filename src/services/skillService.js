/**
 * THIRORA - Canonical student skill service.
 *
 * Supabase public.skills is the source of truth. localStorage is only a
 * user-scoped cache used for immediate rendering and offline fallback.
 */

import { supabase } from '../lib/supabase'
import { readStorage, writeStorage, notifyDataChange } from '../utils/storage'

export const SKILLS_STORAGE_KEY = 'skills'

function readCachedSkills() {
  return readStorage(SKILLS_STORAGE_KEY, [], Array.isArray)
    .map(formatSkillRow)
    .filter(Boolean)
}

function cachedSkillsForUser(userId) {
  if (!userId) {
    const cached = readCachedSkills()
    return cached.filter((skill) => !skill.student_id)
  }
  const userScoped = readStorage(`skills_${userId}`, null, Array.isArray)
  if (userScoped) {
    return userScoped.map(formatSkillRow).filter(Boolean)
  }
  const cached = readCachedSkills()
  return cached.filter((skill) => skill.student_id === userId)
}

function cacheSkills(skills) {
  writeStorage(SKILLS_STORAGE_KEY, skills)
}

function cacheStudentSkills(userId, skills) {
  if (!userId) {
    cacheSkills(skills)
    return
  }
  const userSkills = skills.map((s) => ({ ...s, student_id: userId }))
  writeStorage(`skills_${userId}`, userSkills)
  writeStorage(SKILLS_STORAGE_KEY, userSkills)
}

export function normalizeProficiency(levelOrNumber) {
  if (levelOrNumber === null || levelOrNumber === undefined || levelOrNumber === '') return 1
  if (typeof levelOrNumber === 'number') {
    return Math.min(Math.max(levelOrNumber, 1), 3)
  }
  const value = String(levelOrNumber).trim().toLowerCase()
  if (value === '3' || value === 'advanced' || value === 'expert') return 3
  if (value === '2' || value === 'intermediate' || value === 'medium') return 2
  return 1
}

export function formatProficiencyLabel(value) {
  const number = Number(value)
  if (number >= 3) return 'Advanced'
  if (number === 2) return 'Intermediate'
  return 'Beginner'
}

export function formatSkillRow(row) {
  if (!row) return null
  const name = String(row.skill_name || row.name || '').trim()
  if (!name) return null
  const proficiency = normalizeProficiency(row.proficiency ?? row.level)

  return {
    id: row.id ?? `${row.student_id || 'local'}-${name}`,
    name,
    skill_name: name,
    level: formatProficiencyLabel(proficiency),
    proficiency,
    student_id: row.student_id || null,
    category: row.category || 'Technical',
    years_experience: row.years_experience ?? '0',
    source: row.source || 'Student',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }
}

/**
 * Fetch only the authenticated student's rows. A failed read returns the
 * last valid cache and never replaces it with an empty array.
 */
export async function fetchStudentSkills(userId) {
  const fallback = cachedSkillsForUser(userId)

  if (!userId) return fallback

  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[SKILL SERVICE] Error fetching skills:', error.message)
      return fallback
    }

    const skills = (Array.isArray(data) ? data : []).map(formatSkillRow).filter(Boolean)
    cacheStudentSkills(userId, skills)
    return skills
  } catch (error) {
    console.error('[SKILL SERVICE] Unexpected fetch error:', error)
    return fallback
  }
}

/**
 * Add a skill to the authenticated student's skills table.
 * Deduplicates against existing student skills (case-insensitive & trimmed).
 */
export async function addStudentSkill(
  userId,
  { name, level = 'Beginner', category = 'Technical', source = 'Student', years_experience = '0' }
) {
  const skillName = String(name || '').trim()
  if (!skillName) throw new Error('Skill name cannot be empty.')

  const normalizedInput = skillName.toLowerCase()
  const proficiency = normalizeProficiency(level)
  const cached = cachedSkillsForUser(userId)

  if (cached.some((skill) => (skill.name || '').trim().toLowerCase() === normalizedInput)) {
    throw new Error(`The skill "${skillName}" is already in your skills list.`)
  }

  if (userId) {
    const { data: existing, error: duplicateError } = await supabase
      .from('skills')
      .select('id, skill_name')
      .eq('student_id', userId)

    if (duplicateError) throw new Error(`Unable to verify existing skills: ${duplicateError.message}`)

    const hasDuplicate = existing?.some(
      (row) => String(row.skill_name || '').trim().toLowerCase() === normalizedInput
    )
    if (hasDuplicate) throw new Error(`The skill "${skillName}" has already been added.`)

    const { data: inserted, error: insertError } = await supabase
      .from('skills')
      .insert({
        student_id: userId,
        skill_name: skillName,
        proficiency,
        category,
        years_experience: String(years_experience || '0'),
        source,
      })
      .select('*')
      .single()

    if (insertError || !inserted) {
      throw new Error(`Failed to save skill: ${insertError?.message || 'No row returned.'}`)
    }

    const created = formatSkillRow(inserted)
    cacheStudentSkills(userId, [...cached, created])
    notifyDataChange('skill-added')
    return created
  }

  const created = formatSkillRow({
    id: `local_${Date.now()}`,
    skill_name: skillName,
    proficiency,
    category,
    years_experience: String(years_experience || '0'),
    source,
  })
  cacheSkills([...cached, created])
  notifyDataChange('skill-added')
  return created
}

/**
 * Synchronize skills added from ANY source (Projects, Experience, Certificates, etc.)
 * into the student's central skills table in Supabase.
 *
 * Rules:
 * - Match skills case-insensitively.
 * - Avoid duplicate skills.
 * - Preserve the user's existing proficiency if the skill already exists.
 * - Only user-provided / verified profile data should become actual student skills.
 * - Update cache and broadcast updates so Skills page & UI reflect it immediately.
 */
export async function syncStudentSkillsFromSource(
  userId,
  skillNames = [],
  {
    source = 'Student',
    category = 'Technical',
    defaultProficiency = 1,
  } = {}
) {
  if (!userId) return []

  // Normalize raw skill input (array, comma/semicolon-separated string)
  const rawList = Array.isArray(skillNames)
    ? skillNames
    : typeof skillNames === 'string'
    ? skillNames.split(/[,|;]/)
    : []

  const cleanedNames = rawList
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)

  if (cleanedNames.length === 0) {
    return cachedSkillsForUser(userId)
  }

  // Fetch current verified skills for this student
  const currentSkills = await fetchStudentSkills(userId)
  const existingMap = new Map()
  currentSkills.forEach((s) => {
    const key = (s.name || s.skill_name || '').trim().toLowerCase()
    if (key) existingMap.set(key, s)
  })

  // Identify new skills to insert (case-insensitive & deduplicated)
  const toInsert = []
  const seenNew = new Set()

  for (const name of cleanedNames) {
    const key = name.toLowerCase()
    if (existingMap.has(key) || seenNew.has(key)) {
      // Already exists - preserve existing proficiency and row!
      continue
    }
    seenNew.add(key)
    toInsert.push({
      student_id: userId,
      skill_name: name,
      proficiency: normalizeProficiency(defaultProficiency),
      category,
      years_experience: '0',
      source,
    })
  }

  if (toInsert.length === 0) {
    return currentSkills
  }

  try {
    const { data, error } = await supabase
      .from('skills')
      .insert(toInsert)
      .select('*')

    if (error) {
      console.error('[SKILL SERVICE] Error syncing skills to Supabase:', error.message)
      // Fallback local rows
      const fallbackInserted = toInsert.map((item, idx) =>
        formatSkillRow({
          id: `local_sync_${Date.now()}_${idx}`,
          ...item,
        })
      )
      const merged = [...currentSkills, ...fallbackInserted]
      cacheStudentSkills(userId, merged)
      notifyDataChange('skills-synced')
      return merged
    }

    const newlyInserted = (Array.isArray(data) ? data : []).map(formatSkillRow).filter(Boolean)
    const updatedSkills = [...currentSkills, ...newlyInserted]
    cacheStudentSkills(userId, updatedSkills)
    notifyDataChange('skills-synced')
    return updatedSkills
  } catch (err) {
    console.error('[SKILL SERVICE] Unexpected error in syncStudentSkillsFromSource:', err)
    return currentSkills
  }
}

export async function updateStudentSkill(userId, skillId, updates = {}) {
  if (!userId) throw new Error('Sign in to update a skill.')
  if (!skillId) throw new Error('A skill id is required.')

  const payload = {}
  if (updates.name !== undefined || updates.skill_name !== undefined) {
    const name = String(updates.name ?? updates.skill_name).trim()
    if (!name) throw new Error('Skill name cannot be empty.')
    payload.skill_name = name
  }
  if (updates.level !== undefined || updates.proficiency !== undefined) {
    payload.proficiency = normalizeProficiency(updates.proficiency ?? updates.level)
  }
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.years_experience !== undefined) payload.years_experience = updates.years_experience
  if (!Object.keys(payload).length) throw new Error('No skill changes were supplied.')

  const { data: updated, error } = await supabase
    .from('skills')
    .update(payload)
    .eq('student_id', userId)
    .eq('id', skillId)
    .select('*')
    .single()

  if (error || !updated) throw new Error(`Failed to update skill: ${error?.message || 'No row returned.'}`)

  const formatted = formatSkillRow(updated)
  const current = cachedSkillsForUser(userId)
  cacheStudentSkills(userId, [
    ...current.filter((skill) => String(skill.id) !== String(skillId)),
    formatted,
  ])
  notifyDataChange('skill-updated')
  return formatted
}

export async function deleteStudentSkill(userId, skillId, skillName) {
  const current = cachedSkillsForUser(userId)
  if (!userId) {
    const remaining = current.filter((skill) => {
      const sameId = skillId && String(skill.id) === String(skillId)
      const sameName = skillName && skill.name.toLowerCase() === String(skillName).toLowerCase()
      return !(sameId || sameName)
    })
    cacheSkills(remaining)
    notifyDataChange('skill-deleted')
    return remaining
  }

  if (!skillId && !skillName) throw new Error('A skill id or name is required.')

  let query = supabase.from('skills').delete().eq('student_id', userId)
  if (skillId && !String(skillId).startsWith('local_')) query = query.eq('id', skillId)
  else query = query.ilike('skill_name', skillName)

  const { error } = await query
  if (error) throw new Error(`Failed to delete skill: ${error.message}`)

  const remaining = current.filter((skill) => {
    const sameId = skillId && String(skill.id) === String(skillId)
    const sameName = skillName && skill.name.toLowerCase() === String(skillName).toLowerCase()
    return !(sameId || sameName)
  })
  cacheStudentSkills(userId, remaining)
  notifyDataChange('skill-deleted')
  return remaining
}


