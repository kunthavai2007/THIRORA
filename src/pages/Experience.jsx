import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readStorage, writeStorage, notifyDataChange } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { syncStudentSkillsFromSource } from '../services/skillService'

const experienceTypes = ['Internship', 'Workshop']

const initialExperience = {
  type: 'Internship',
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  certificateLink: '',
}

const experiencesStorageKey = 'experiences'

function Experience() {
  const [experience, setExperience] = useState(initialExperience)
  const [experiences, setExperiences] = useState(() =>
    readStorage(experiencesStorageKey, [], Array.isArray)
  )

  useEffect(() => {
    let isMounted = true

    async function loadExperiencesFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
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
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading experiences from Supabase:', error)
          return
        }

        if (!isMounted) return

        const formattedExperiences = (data || []).map((item) => ({
          id: item.id,
          type: item.experience_type ?? item.type ?? 'Internship',
          experience_type: item.experience_type ?? 'Internship',
          title: item.role ?? item.title ?? '',
          role: item.role ?? '',
          organization: item.organization ?? '',
          startDate: item.start_date ?? item.startDate ?? '',
          endDate: item.end_date ?? item.endDate ?? '',
          start_date: item.start_date ?? null,
          end_date: item.end_date ?? null,
          description: item.description ?? '',
          certificateLink: item.certificate_url ?? item.certificateLink ?? '',
          certificate_url: item.certificate_url ?? '',
          skills: Array.isArray(item.skills) ? item.skills : [],
          student_id: item.student_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))

        setExperiences(formattedExperiences)
        writeStorage(experiencesStorageKey, formattedExperiences)
      } catch (error) {
        console.error('Unexpected error loading experiences:', error)
      }
    }

    loadExperiencesFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        loadExperiencesFromSupabase()
      } else if (!session?.user && isMounted) {
        setExperiences([])
        writeStorage(experiencesStorageKey, [])
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setExperience((currentExperience) => ({
      ...currentExperience,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        alert('Please sign in again.')
        return
      }

      const user = session.user
      const expType = experience.type || 'Internship'
      const roleTitle = experience.title.trim()
      const orgName = experience.organization.trim()
      const startDate = experience.startDate || null
      const endDate = experience.endDate || null
      const desc = experience.description.trim()
      const certUrl = experience.certificateLink.trim()

      if (!roleTitle || !orgName) {
        return
      }

      const skillsArray = Array.isArray(experience.skills)
        ? experience.skills
        : typeof experience.skills === 'string'
          ? experience.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : []

      const { data, error } = await supabase
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
        console.error('Experience insert error:', error)
        alert(error.message || 'Failed to add experience.')
        return
      }

      const formattedExperience = {
        id: data.id,
        type: data.experience_type ?? expType,
        experience_type: data.experience_type ?? expType,
        title: data.role ?? roleTitle,
        role: data.role ?? roleTitle,
        organization: data.organization ?? orgName,
        startDate: data.start_date ?? startDate ?? '',
        endDate: data.end_date ?? endDate ?? '',
        start_date: data.start_date ?? startDate,
        end_date: data.end_date ?? endDate,
        description: data.description ?? desc,
        certificateLink: data.certificate_url ?? certUrl,
        certificate_url: data.certificate_url ?? certUrl,
        skills: Array.isArray(data.skills) ? data.skills : skillsArray,
        student_id: data.student_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      // Sync experience skills to central skills table
      if (skillsArray.length > 0) {
        await syncStudentSkillsFromSource(user.id, skillsArray, { source: 'Experience' })
      }

      const updatedExperiences = [...experiences, formattedExperience]
      setExperiences(updatedExperiences)
      writeStorage(experiencesStorageKey, updatedExperiences)
      setExperience(initialExperience)
      notifyDataChange('experience-added')
    } catch (error) {
      console.error('Unexpected experience add error:', error)
      alert(error.message || 'Unable to add experience.')
    }
  }

  async function handleDelete(experienceId) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
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
        console.error('Experience delete error:', error)
        alert(error.message || 'Failed to delete experience.')
        return
      }

      const updatedExperiences = experiences.filter((item) => item.id !== experienceId)
      setExperiences(updatedExperiences)
      writeStorage(experiencesStorageKey, updatedExperiences)
      notifyDataChange('experience-deleted')
    } catch (error) {
      console.error('Unexpected experience delete error:', error)
      alert(error.message || 'Unable to delete experience.')
    }
  }

  return (
    <main className="experience-page">
      <div className="experience-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        <header className="experience-header">
          <p className="eyebrow">Learn by doing</p>
          <h1>Internships &amp; Workshops</h1>
          <p>Keep a clear record of the experiences shaping your professional journey.</p>
        </header>

        <section className="experience-panel" aria-labelledby="add-experience-heading">
          <div className="experience-panel-heading">
            <div>
              <h2 id="add-experience-heading">Add an experience</h2>
              <p>Capture the details of an internship or workshop.</p>
            </div>
            <span className="experience-count">
              {experiences.length} {experiences.length === 1 ? 'experience' : 'experiences'}
            </span>
          </div>

          <form className="experience-form" onSubmit={handleSubmit}>
            <label className="experience-field">
              Experience Type
              <select name="type" value={experience.type} onChange={handleChange}>
                {experienceTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="experience-field">
              Title
              <input
                name="title"
                type="text"
                value={experience.title}
                onChange={handleChange}
                placeholder="e.g. Product Design Intern"
                required
              />
            </label>

            <label className="experience-field experience-field-wide">
              Organization
              <input
                name="organization"
                type="text"
                value={experience.organization}
                onChange={handleChange}
                placeholder="e.g. Northstar Labs"
                required
              />
            </label>

            <label className="experience-field">
              Start Date
              <input
                name="startDate"
                type="date"
                value={experience.startDate}
                onChange={handleChange}
                required
              />
            </label>

            <label className="experience-field">
              End Date
              <input
                name="endDate"
                type="date"
                value={experience.endDate}
                onChange={handleChange}
                required
              />
            </label>

            <label className="experience-field experience-field-wide">
              Description
              <textarea
                name="description"
                value={experience.description}
                onChange={handleChange}
                placeholder="Describe what you learned and contributed"
                rows="4"
                required
              />
            </label>

            <label className="experience-field experience-field-wide">
              Certificate Link
              <input
                name="certificateLink"
                type="url"
                value={experience.certificateLink}
                onChange={handleChange}
                placeholder="https://..."
                required
              />
            </label>

            <button className="add-experience-button" type="submit">Add Experience</button>
          </form>
        </section>

        <section className="experience-list-section" aria-labelledby="experience-list-heading">
          <div className="experience-list-heading">
            <h2 id="experience-list-heading">Your experiences</h2>
            <span>{experiences.length ? 'Your journey, in one place' : 'No experiences added yet'}</span>
          </div>

          {experiences.length ? (
            <div className="experience-list">
              {experiences.map((item) => (
                <article className="experience-card" key={item.id}>
                  <div className="experience-card-topline">
                    <span className="experience-type">{item.type}</span>
                    <button
                      className="delete-experience-button"
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete ${item.title}`}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="experience-card-content">
                    <h3>{item.title}</h3>
                    <p className="experience-organization">{item.organization}</p>
                    <p className="experience-description">{item.description}</p>
                    <dl className="experience-details">
                      <div>
                        <dt>Start date</dt>
                        <dd>{item.startDate}</dd>
                      </div>
                      <div>
                        <dt>End date</dt>
                        <dd>{item.endDate}</dd>
                      </div>
                    </dl>
                    <a className="experience-certificate-link" href={item.certificateLink} target="_blank" rel="noreferrer">
                      View certificate <span aria-hidden="true">-&gt;</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-experience-state">
              <div className="empty-experience-mark" aria-hidden="true">+</div>
              <p>Your internships and workshops will appear here once you add them.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Experience
