import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readStorage, writeStorage, notifyDataChange } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { syncStudentSkillsFromSource } from '../services/skillService'

const projectsStorageKey = 'projects'

const initialProject = {
  title: '',
  description: '',
  technologies: '',
  link: '',
}

function Projects() {
  const [project, setProject] = useState(initialProject)
  const [projects, setProjects] = useState(() =>
    readStorage(projectsStorageKey, [], Array.isArray)
  )

  useEffect(() => {
    let isMounted = true

    async function loadProjectsFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (isMounted) {
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
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading projects from Supabase:', error)
          return
        }

        if (!isMounted) return

        const formattedProjects = (data || []).map((item) => ({
          id: item.id,
          title: item.title ?? '',
          description: item.description ?? '',
          technologies: Array.isArray(item.technologies)
            ? item.technologies.join(', ')
            : (item.technologies ?? ''),
          link: item.project_url || item.github_url || '',
          project_url: item.project_url ?? '',
          github_url: item.github_url ?? '',
          start_date: item.start_date ?? null,
          end_date: item.end_date ?? null,
          role: item.role ?? '',
          student_id: item.student_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))

        setProjects(formattedProjects)
        writeStorage(projectsStorageKey, formattedProjects)
      } catch (error) {
        console.error('Unexpected error loading projects:', error)
      }
    }

    loadProjectsFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        loadProjectsFromSupabase()
      } else if (!session?.user && isMounted) {
        setProjects([])
        writeStorage(projectsStorageKey, [])
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setProject((currentProject) => ({
      ...currentProject,
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
      const projectTitle = project.title.trim()
      const projectDescription = project.description.trim()
      const projectTech = project.technologies.trim()
      const projectLink = project.link.trim()

      if (!projectTitle) {
        return
      }

      const technologiesArray = projectTech
        ? projectTech
            .split(',')
            .map((tech) => tech.trim())
            .filter(Boolean)
        : []

      const isGithub = projectLink.toLowerCase().includes('github.com')

      const { data, error } = await supabase
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
        console.error('Project insert error:', error)
        alert(error.message || 'Failed to add project.')
        return
      }

      const formattedProject = {
        id: data.id,
        title: data.title ?? projectTitle,
        description: data.description ?? projectDescription,
        technologies: Array.isArray(data.technologies)
          ? data.technologies.join(', ')
          : (data.technologies ?? projectTech),
        link: data.project_url || data.github_url || projectLink,
        project_url: data.project_url ?? projectLink,
        github_url: data.github_url ?? (isGithub ? projectLink : ''),
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        role: data.role ?? 'Contributor',
        student_id: data.student_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      // Sync technologies to central skills table
      if (technologiesArray.length > 0) {
        await syncStudentSkillsFromSource(user.id, technologiesArray, { source: 'Project' })
      }

      const updatedProjects = [...projects, formattedProject]
      setProjects(updatedProjects)
      writeStorage(projectsStorageKey, updatedProjects)
      setProject(initialProject)
      notifyDataChange('project-added')
    } catch (error) {
      console.error('Unexpected project add error:', error)
      alert(error.message || 'Unable to add project.')
    }
  }

  async function handleDelete(projectId) {
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
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('student_id', user.id)

      if (error) {
        console.error('Project delete error:', error)
        alert(error.message || 'Failed to delete project.')
        return
      }

      const updatedProjects = projects.filter((item) => item.id !== projectId)
      setProjects(updatedProjects)
      writeStorage(projectsStorageKey, updatedProjects)
      notifyDataChange('project-deleted')
    } catch (error) {
      console.error('Unexpected project delete error:', error)
      alert(error.message || 'Unable to delete project.')
    }
  }

  return (
    <main className="projects-page">
      <div className="projects-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        <header className="projects-header">
          <p className="eyebrow">Show your impact</p>
          <h1>Projects Management</h1>
          <p>Capture the work that turns your skills into meaningful experience.</p>
        </header>

        <section className="projects-panel" aria-labelledby="add-project-heading">
          <div className="projects-panel-heading">
            <div>
              <h2 id="add-project-heading">Add a project</h2>
              <p>Build a portfolio of work you are proud to share.</p>
            </div>
            <span className="projects-count">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <form className="project-form" onSubmit={handleSubmit}>
            <label className="project-field">
              Project Title
              <input
                name="title"
                type="text"
                value={project.title}
                onChange={handleChange}
                placeholder="e.g. Student Career Planner"
                required
              />
            </label>

            <label className="project-field">
              Technologies Used
              <input
                name="technologies"
                type="text"
                value={project.technologies}
                onChange={handleChange}
                placeholder="e.g. React, Node.js, PostgreSQL"
                required
              />
            </label>

            <label className="project-field project-field-wide">
              Project Description
              <textarea
                name="description"
                value={project.description}
                onChange={handleChange}
                placeholder="Describe what you built and the problem it solves"
                rows="4"
                required
              />
            </label>

            <label className="project-field project-field-wide">
              Project Link
              <input
                name="link"
                type="url"
                value={project.link}
                onChange={handleChange}
                placeholder="https://github.com/your-project"
                required
              />
            </label>

            <button className="add-project-button" type="submit">Add Project</button>
          </form>
        </section>

        <section className="project-list-section" aria-labelledby="project-list-heading">
          <div className="project-list-heading">
            <h2 id="project-list-heading">Your projects</h2>
            <span>{projects.length ? 'Your work, in one place' : 'No projects added yet'}</span>
          </div>

          {projects.length ? (
            <div className="project-list">
              {projects.map((item) => (
                <article className="project-card" key={item.id}>
                  <div className="project-card-topline">
                    <div className="project-card-mark" aria-hidden="true">PRJ</div>
                    <button
                      className="delete-project-button"
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete ${item.title}`}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="project-card-content">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="project-card-meta">
                      <div>
                        <span>Technologies</span>
                        <strong>{item.technologies}</strong>
                      </div>
                      <a className="project-link" href={item.link} target="_blank" rel="noreferrer">
                        View project <span aria-hidden="true">-&gt;</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-projects-state">
              <div className="empty-project-mark" aria-hidden="true">+</div>
              <p>Your projects will appear here once you add them.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Projects
