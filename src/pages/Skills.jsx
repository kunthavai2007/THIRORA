import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const skillLevels = ['Beginner', 'Intermediate', 'Advanced']

function Skills() {
  const {
    currentUser,
    skills,
    addStudentSkill,
    deleteStudentSkill,
  } = useAuth()

  const [skillName, setSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState('Beginner')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    const trimmedName = skillName.trim()

    if (!trimmedName) {
      return
    }

    if (!currentUser?.id) {
      setErrorMessage('Please sign in to manage your skills.')
      return
    }

    setSubmitting(true)
    try {
      await addStudentSkill({
        name: trimmedName,
        level: skillLevel,
      })

      setSkillName('')
      setSkillLevel('Beginner')
    } catch (err) {
      setErrorMessage(err.message || 'Unable to add skill.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(skill) {
    setErrorMessage('')
    try {
      await deleteStudentSkill(skill.id, skill.name || skill.skill_name)
    } catch (err) {
      console.error('Error deleting skill:', err)
      setErrorMessage(err.message || 'Failed to delete skill.')
    }
  }

  return (
    <main className="skills-page">
      <div className="skills-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        <header className="skills-header">
          <p className="eyebrow">Build your edge</p>
          <h1>Skills Management</h1>
          <p>Track the abilities you are building for your future career.</p>
        </header>

        <section className="skills-panel" aria-labelledby="add-skill-heading">
          <div className="skills-panel-heading">
            <div>
              <h2 id="add-skill-heading">Add a skill</h2>
              <p>Record a skill and set your current level.</p>
            </div>
            <span className="skills-count">{skills.length} {skills.length === 1 ? 'skill' : 'skills'}</span>
          </div>

          {errorMessage && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem' }}>
              {errorMessage}
            </div>
          )}

          <form className="skill-form" onSubmit={handleSubmit}>
            <label className="skill-field skill-name-field">
              Skill name
              <input
                type="text"
                value={skillName}
                onChange={(event) => {
                  setSkillName(event.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="e.g. JavaScript"
                required
              />
            </label>

            <label className="skill-field">
              Skill level
              <select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)}>
                {skillLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>

            <button className="add-skill-button" type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Skill'}
            </button>
          </form>
        </section>

        <section className="skills-list-section" aria-labelledby="skills-list-heading">
          <div className="skills-list-heading">
            <h2 id="skills-list-heading">Your skills</h2>
            <span>{skills.length ? 'Keep growing' : 'No skills added yet'}</span>
          </div>

          {skills.length ? (
            <div className="skills-list">
              {skills.map((skill) => (
                <article className="skill-card" key={skill.id || skill.name}>
                  <div className="skill-card-mark" aria-hidden="true">SK</div>
                  <div className="skill-card-details">
                    <h3>{skill.name}</h3>
                    <span>{skill.level}</span>
                  </div>
                  <button
                    className="delete-skill-button"
                    type="button"
                    onClick={() => handleDelete(skill)}
                    aria-label={`Delete ${skill.name}`}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-skills-state">
              <div className="empty-state-mark" aria-hidden="true">+</div>
              <p>Your added skills will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Skills
