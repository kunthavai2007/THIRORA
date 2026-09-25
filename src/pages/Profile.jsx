import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const avatarColors = ['#173f70', '#0284c7', '#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626']

const presetAvatars = [
  { id: 'av1', label: 'Tech Pro', mark: 'TP' },
  { id: 'av2', label: 'Graduate', mark: 'GR' },
  { id: 'av3', label: 'Innovator', mark: 'IN' },
  { id: 'av4', label: 'Scientist', mark: 'SC' },
  { id: 'av5', label: 'Engineer', mark: 'EN' },
  { id: 'av6', label: 'Analyst', mark: 'AN' },
]

export default function Profile() {
  const { currentUser, updateProfile, activeDevices, skills: sharedSkills, careerData: sharedCareerData, careerContext } = useAuth()

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    collegeName: currentUser?.collegeName || '',
    department: currentUser?.department || '',
    currentYear: currentUser?.currentYear || '',
    graduationYear: currentUser?.graduationYear || '',
    careerGoal: currentUser?.careerGoal || '',
    targetRole: currentUser?.targetRole || '',
    cgpa: currentUser?.cgpa || '',
    bio: currentUser?.bio || '',
    avatarColor: currentUser?.avatarColor || '#173f70',
    avatarUrl: currentUser?.avatarUrl || '',
    avatarEmoji: /^[A-Z]{2}$/.test(currentUser?.avatarEmoji || '') ? currentUser.avatarEmoji : 'TP',
  })

  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        collegeName: currentUser.collegeName || '',
        department: currentUser.department || '',
        currentYear: currentUser.currentYear || '',
        graduationYear: currentUser.graduationYear || '',
        careerGoal: currentUser.careerGoal || '',
        targetRole: currentUser.targetRole || '',
        cgpa: currentUser.cgpa || '',
        bio: currentUser.bio || '',
        avatarColor: currentUser.avatarColor || '#173f70',
        avatarUrl: currentUser.avatarUrl || '',
        avatarEmoji: /^[A-Z]{2}$/.test(currentUser.avatarEmoji || '') ? currentUser.avatarEmoji : 'TP',
      })
    }
  }, [currentUser])

  const [toastMessage, setToastMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  // Compute stats
  const skillsCount = sharedSkills.length
  const certsCount = sharedCareerData.certificates.length
  const projectsCount = sharedCareerData.projects.length
  const expsCount = sharedCareerData.experiences.length

  function showToast(msg) {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 3500)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)

    try {
      await updateProfile(formData)
      showToast('Profile information saved successfully!')
    } catch (error) {
      console.error('Profile save error:', error)
      showToast(error.message || 'Error saving profile.')
    } finally {
      setSaving(false)
    }
  }

  function handleSyncAcademic() {
    const academicProfile = {
      studentName: currentUser?.name || '',
      phone: currentUser?.phone || '',
      collegeName: currentUser?.collegeName || '',
      department: currentUser?.department || '',
      currentYear: currentUser?.currentYear || '',
      graduationDate: currentUser?.graduationDate || '',
      currentCgpa: currentUser?.cgpa || '',
      careerGoal: currentUser?.careerGoal || '',
      targetRole: currentUser?.targetRole || '',
    }

    if (Object.values(academicProfile).some(Boolean)) {
      setFormData((prev) => ({
        ...prev,
        name: academicProfile.studentName || prev.name,
        phone: academicProfile.phone || prev.phone,
        collegeName: academicProfile.collegeName || prev.collegeName,
        department: academicProfile.department || prev.department,
        currentYear: academicProfile.currentYear || prev.currentYear,
        graduationYear: academicProfile.graduationDate
          ? academicProfile.graduationDate.split('-')[0]
          : prev.graduationYear,
        cgpa: academicProfile.currentCgpa || prev.cgpa,
      }))
      showToast('Synced profile details with the canonical profile data.')
    } else {
      showToast('No academic profile data found to sync.')
    }
  }

  // Get user initials
  const initials = (formData.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account Workspace</p>
          <h1>Student Profile</h1>
          <p className="page-subtitle">
            Manage your personal identity, academic milestones, and portfolio details.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleSyncAcademic}
            title="Import basic details entered in Academic Profile"
          >
            <span>Sync with Academic Profile</span>
          </button>
        </div>
      </header>

      {toastMessage && (
        <div className="profile-toast" role="status">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="profile-grid">
        {/* Left Card: Identity, Avatar & Summary */}
        <div className="profile-identity-card">
          <div className="profile-banner">
            <div
              className="profile-avatar-circle"
              style={{ backgroundColor: formData.avatarColor }}
              title="Profile avatar"
            >
              {formData.avatarEmoji ? (
                <span style={{ fontSize: '1.8rem' }}>{formData.avatarEmoji}</span>
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>

          <div className="profile-identity-info">
            <h2>{formData.name || 'Student Name'}</h2>
            <span className="profile-role-pill">{careerContext?.track || formData.careerGoal || formData.targetRole || 'Aspiring Professional'}</span>
            <p className="profile-email">{currentUser?.email || 'student@thirora.app'}</p>
          </div>

          {/* Avatar Preset Selector */}
          <div className="avatar-color-section">
            <label>Profile Avatar Icon</label>
            <div className="avatar-preset-options">
              {presetAvatars.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  className={`avatar-preset-btn ${formData.avatarEmoji === av.mark ? 'avatar-preset-selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, avatarEmoji: av.mark }))}
                  title={av.label}
                >
                  <span>{av.mark}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div className="avatar-color-section">
            <label>Background Accent Theme</label>
            <div className="avatar-color-options">
              {avatarColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`color-bubble ${formData.avatarColor === color ? 'color-bubble-active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData((prev) => ({ ...prev, avatarColor: color }))}
                  aria-label={`Select avatar color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Key Quick Metrics */}
          <div className="profile-metrics-list">
            <div className="profile-metric-row">
              <span>Institution</span>
              <strong>{formData.collegeName || 'Not specified'}</strong>
            </div>
            <div className="profile-metric-row">
              <span>Department</span>
              <strong>{formData.department || 'Not specified'}</strong>
            </div>
            <div className="profile-metric-row">
              <span>Current Year</span>
              <strong>{formData.currentYear || 'Not specified'}</strong>
            </div>
            <div className="profile-metric-row">
              <span>Graduation Year</span>
              <strong>{formData.graduationYear || 'Not specified'}</strong>
            </div>
            <div className="profile-metric-row">
              <span>Cumulative CGPA</span>
              <strong>{formData.cgpa ? `${formData.cgpa} / 10` : 'Not specified'}</strong>
            </div>
            <div className="profile-metric-row">
              <span>Active Sessions</span>
              <strong>{activeDevices.filter((d) => d.status === 'active').length || 1} connected</strong>
            </div>
          </div>

          <div className="profile-card-footer">
            <Link to="/settings" className="text-link">
              Go to Account Settings &rarr;
            </Link>
          </div>
        </div>

        {/* Right Section: Comprehensive Edit Form */}
        <div className="profile-details-column">
          <form onSubmit={handleSaveProfile} className="profile-edit-card">
            <div className="card-section-header">
              <div>
                <h2>Personal &amp; Academic Foundation</h2>
                <p>These details populate your AI Resume, Career Recommendations, and Job Matching.</p>
              </div>
            </div>

            {/* Basic details */}
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="prof-name">Full Student Name *</label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="prof-email">Registered Account Email</label>
                <input
                  id="prof-email"
                  type="email"
                  disabled
                  value={formData.email || currentUser?.email || ''}
                  title="Registered account email (managed in Settings)"
                  style={{ opacity: 0.75, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="prof-phone">Phone Number</label>
                <input
                  id="prof-phone"
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Institution and Department */}
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="prof-college">College / University Name</label>
                <input
                  id="prof-college"
                  type="text"
                  placeholder="Metropolitan Institute of Technology"
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="prof-dept">Department / Major</label>
                <input
                  id="prof-dept"
                  type="text"
                  placeholder="Computer Science & Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            {/* Year, Graduation Year, CGPA */}
            <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div className="form-field">
                <label htmlFor="prof-year">Current Academic Year</label>
                <select
                  id="prof-year"
                  value={formData.currentYear}
                  onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                >
                  <option value="1st Year">1st Year (Freshman)</option>
                  <option value="2nd Year">2nd Year (Sophomore)</option>
                  <option value="3rd Year">3rd Year (Junior)</option>
                  <option value="4th Year">4th Year (Senior)</option>
                  <option value="Postgraduate">Postgraduate / Masters</option>
                  <option value="Alumni">Alumni / Graduate</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="prof-grad-year">Graduation Year</label>
                <input
                  id="prof-grad-year"
                  type="text"
                  placeholder="e.g. 2026"
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="prof-cgpa">Cumulative CGPA</label>
                <input
                  id="prof-cgpa"
                  type="text"
                  placeholder="e.g. 8.75 / 10"
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="form-field">
              <label htmlFor="prof-bio">Professional Bio &amp; Career Objective</label>
              <textarea
                id="prof-bio"
                rows={3}
                placeholder="Brief summary of your academic interests, coding strengths, and target industry..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="form-actions-bar">
              <button
                type="submit"
                disabled={saving}
                className="primary-btn"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          {/* Connected Portfolio Quick Cards */}
          <div className="portfolio-stats-card">
            <h3>Connected Portfolio Evidence</h3>
            <div className="portfolio-stats-grid">
              <Link to="/academic-profile?tab=skills" className="stat-item-box">
                <span className="stat-count">{skillsCount}</span>
                <span className="stat-label">Verified Skills</span>
              </Link>
              <Link to="/academic-profile?tab=certificates" className="stat-item-box">
                <span className="stat-count">{certsCount}</span>
                <span className="stat-label">Certificates</span>
              </Link>
              <Link to="/academic-profile?tab=projects" className="stat-item-box">
                <span className="stat-count">{projectsCount}</span>
                <span className="stat-label">Projects</span>
              </Link>
              <Link to="/academic-profile?tab=experience" className="stat-item-box">
                <span className="stat-count">{expsCount}</span>
                <span className="stat-label">Experiences</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
