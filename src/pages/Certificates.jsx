import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readStorage, writeStorage, notifyDataChange } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { syncStudentSkillsFromSource } from '../services/skillService'

const certificatesStorageKey = 'certificates'

const initialCertificate = {
  name: '',
  organization: '',
  completionDate: '',
  link: '',
  skills: '',
}

function Certificates() {
  const [certificate, setCertificate] = useState(initialCertificate)
  const [certificates, setCertificates] = useState(() =>
    readStorage(certificatesStorageKey, [], Array.isArray)
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadCertificatesFromSupabase() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (isMounted) {
            setCertificates([])
            writeStorage(certificatesStorageKey, [])
          }
          return
        }

        const user = session.user

        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading certificates from Supabase:', error)
          return
        }

        if (!isMounted) return

        const formattedCertificates = (data || []).map((item) => ({
          id: item.id,
          name: item.certificate_name ?? '',
          organization: item.issuing_organization ?? '',
          completionDate: item.issue_date ?? '',
          link: item.credential_url ?? '',
          skills: Array.isArray(item.skills)
            ? item.skills
            : typeof item.skills === 'string' && item.skills
            ? item.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          student_id: item.student_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))

        setCertificates(formattedCertificates)
        writeStorage(certificatesStorageKey, formattedCertificates)
      } catch (error) {
        console.error('Unexpected error loading certificates:', error)
      }
    }

    loadCertificatesFromSupabase()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        loadCertificatesFromSupabase()
      } else if (!session?.user && isMounted) {
        setCertificates([])
        writeStorage(certificatesStorageKey, [])
      }
    })

    const refresh = () => {
      if (isMounted) loadCertificatesFromSupabase()
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('careerflow:data-update', refresh)
    window.addEventListener('focus', refresh)

    return () => {
      isMounted = false
      subscription?.unsubscribe()
      window.removeEventListener('storage', refresh)
      window.removeEventListener('careerflow:data-update', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setCertificate((currentCertificate) => ({
      ...currentCertificate,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        alert('Please sign in to save your certificate.')
        setLoading(false)
        return
      }

      const user = session.user
      const certName = certificate.name.trim()
      const orgName = certificate.organization.trim()
      const issueDate = certificate.completionDate
      const certLink = certificate.link.trim()
      const rawSkills = certificate.skills || ''

      if (!certName || !orgName || !issueDate || !certLink) {
        setLoading(false)
        return
      }

      const skillsArray = Array.isArray(rawSkills)
        ? rawSkills
        : typeof rawSkills === 'string'
        ? rawSkills.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
        : []

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          student_id: user.id,
          certificate_name: certName,
          issuing_organization: orgName,
          issue_date: issueDate,
          credential_url: certLink,
          credential_id: '',
          skills: skillsArray,
        })
        .select('*')
        .single()

      if (error) {
        console.error('Certificate insert error:', error)
        alert(error.message || 'Failed to add certificate.')
        setLoading(false)
        return
      }

      const formattedCertificate = {
        id: data.id,
        name: data.certificate_name ?? certName,
        organization: data.issuing_organization ?? orgName,
        completionDate: data.issue_date ?? issueDate,
        link: data.credential_url ?? certLink,
        skills: Array.isArray(data.skills) ? data.skills : skillsArray,
        student_id: data.student_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      // Sync skills from certificate into central student skills
      if (skillsArray.length > 0) {
        await syncStudentSkillsFromSource(user.id, skillsArray, { source: 'Certificate' })
      }

      const updatedCertificates = [...certificates, formattedCertificate]
      setCertificates(updatedCertificates)
      writeStorage(certificatesStorageKey, updatedCertificates)
      setCertificate(initialCertificate)
      notifyDataChange('certificate-added')
    } catch (error) {
      console.error('Unexpected certificate add error:', error)
      alert(error.message || 'Unable to add certificate.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(certificateId) {
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
        .from('certificates')
        .delete()
        .eq('id', certificateId)
        .eq('student_id', user.id)

      if (error) {
        console.error('Certificate delete error:', error)
        alert(error.message || 'Failed to delete certificate.')
        return
      }

      const updatedCertificates = certificates.filter((item) => item.id !== certificateId)
      setCertificates(updatedCertificates)
      writeStorage(certificatesStorageKey, updatedCertificates)
      notifyDataChange('certificate-deleted')
    } catch (error) {
      console.error('Unexpected certificate delete error:', error)
      alert(error.message || 'Unable to delete certificate.')
    }
  }

  return (
    <main className="certificates-page">
      <div className="certificates-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;-</span> Back to Dashboard
        </Link>

        <header className="certificates-header">
          <p className="eyebrow">Proof of progress</p>
          <h1>Certificates Management</h1>
          <p>Keep your professional achievements organized and ready to share.</p>
        </header>

        <section className="certificates-panel" aria-labelledby="add-certificate-heading">
          <div className="certificates-panel-heading">
            <div>
              <h2 id="add-certificate-heading">Add a certificate</h2>
              <p>Capture the details of each credential you have earned.</p>
            </div>
            <span className="certificates-count">
              {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'}
            </span>
          </div>

          <form className="certificate-form" onSubmit={handleSubmit}>
            <label className="certificate-field">
              Certificate Name
              <input
                name="name"
                type="text"
                value={certificate.name}
                onChange={handleChange}
                placeholder="e.g. AWS Certified Cloud Practitioner"
                required
              />
            </label>

            <label className="certificate-field">
              Issuing Organization
              <input
                name="organization"
                type="text"
                value={certificate.organization}
                onChange={handleChange}
                placeholder="e.g. Amazon Web Services"
                required
              />
            </label>

            <label className="certificate-field">
              Date of Completion
              <input
                name="completionDate"
                type="date"
                value={certificate.completionDate}
                onChange={handleChange}
                required
              />
            </label>

            <label className="certificate-field">
              Certificate Link
              <input
                name="link"
                type="url"
                value={certificate.link}
                onChange={handleChange}
                placeholder="https://..."
                required
              />
            </label>

            <label className="certificate-field">
              Skills / Technologies Covered (optional)
              <input
                name="skills"
                type="text"
                value={certificate.skills}
                onChange={handleChange}
                placeholder="e.g. AWS, Cloud Computing, Linux"
              />
            </label>

            <button className="add-certificate-button" type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Certificate'}
            </button>
          </form>
        </section>

        <section className="certificate-list-section" aria-labelledby="certificate-list-heading">
          <div className="certificate-list-heading">
            <h2 id="certificate-list-heading">Your certificates</h2>
            <span>{certificates.length ? 'A record of your achievements' : 'No certificates added yet'}</span>
          </div>

          {certificates.length ? (
            <div className="certificate-list">
              {certificates.map((item) => (
                <article className="certificate-card" key={item.id}>
                  <div className="certificate-card-mark" aria-hidden="true">CERT</div>
                  <div className="certificate-card-content">
                    <h3>{item.name}</h3>
                    <dl className="certificate-details">
                      <div>
                        <dt>Issued by</dt>
                        <dd>{item.organization}</dd>
                      </div>
                      <div>
                        <dt>Completed</dt>
                        <dd>{item.completionDate}</dd>
                      </div>
                      {Array.isArray(item.skills) && item.skills.length > 0 && (
                        <div>
                          <dt>Skills</dt>
                          <dd>{item.skills.join(', ')}</dd>
                        </div>
                      )}
                    </dl>
                    <a className="certificate-link" href={item.link} target="_blank" rel="noreferrer">
                      View certificate <span aria-hidden="true">-&gt;</span>
                    </a>
                  </div>
                  <button
                    className="delete-certificate-button"
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Delete ${item.name}`}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-certificates-state">
              <div className="empty-certificate-mark" aria-hidden="true">+</div>
              <p>Your certificates will appear here once you add them.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Certificates
