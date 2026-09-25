import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import { getSupabaseConfig, saveSupabaseConfig, syncUserDataToSupabase, testSupabaseConnection } from '../services/supabaseService'
import { readStorage, writeStorage } from '../utils/storage'

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'security'

  const { currentUser, changePassword, logoutOtherDevices, revokeDevice, activeDevices, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const notificationPreferencesKey = `careerflow_notification_preferences_${currentUser?.id || 'guest'}`

  // Change Password State
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmNewPass, setConfirmNewPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passStatus, setPassStatus] = useState({ type: '', message: '' })
  const [changingPass, setChangingPass] = useState(false)

  // Supabase State
  const [supabaseForm, setSupabaseForm] = useState(() => getSupabaseConfig())
  const [supabaseTestStatus, setSupabaseTestStatus] = useState(null)
  const [testingSupabase, setTestingSupabase] = useState(false)
  const [syncingCloud, setSyncingCloud] = useState(false)

  // Notification Preferences State with localStorage persistence
  const [notifPrefs, setNotifPrefs] = useState(() =>
    readStorage(`careerflow_notification_preferences_${currentUser?.id || 'guest'}`, {
      securityAlerts: true,
      quizReminders: true,
      placementAlerts: true,
      weeklyDigest: false,
    })
  )

  function handleToggleNotif(key, value) {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    writeStorage(notificationPreferencesKey, updated)
    showToast(`Notification preference for "${key}" updated!`)
  }

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null)
  function showToast(msg) {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 3800)
  }

  function handleTabChange(tab) {
    setSearchParams({ tab })
    setPassStatus({ type: '', message: '' })
    setSupabaseTestStatus(null)
  }

  // Handle password change
  async function handleChangePasswordSubmit(e) {
    e.preventDefault()
    setPassStatus({ type: '', message: '' })

    if (newPass !== confirmNewPass) {
      setPassStatus({ type: 'error', message: 'New passwords do not match.' })
      return
    }

    if (newPass.length < 8) {
      setPassStatus({ type: 'error', message: 'New password must be at least 8 characters long.' })
      return
    }

    try {
      setChangingPass(true)
      await changePassword(currentPass, newPass)
      setPassStatus({ type: 'success', message: 'Password updated successfully!' })
      setCurrentPass('')
      setNewPass('')
      setConfirmNewPass('')
      showToast('Account password changed securely.')
    } catch (err) {
      setPassStatus({ type: 'error', message: err.message || 'Failed to update password.' })
    } finally {
      setChangingPass(false)
    }
  }

  // Handle Supabase test connection
  async function handleTestSupabase() {
    setTestingSupabase(true)
    setSupabaseTestStatus(null)
    const res = await testSupabaseConnection(supabaseForm.url, supabaseForm.anonKey)
    setSupabaseTestStatus(res)
    setTestingSupabase(false)
  }

  function handleSaveSupabaseConfig(e) {
    e.preventDefault()
    saveSupabaseConfig(supabaseForm)
    showToast('Supabase cloud backend settings saved!')
  }

  async function handleCloudSync() {
    setSyncingCloud(true)
    const payload = {
      academicProfile: readStorage('academicProfile', null),
      skills: readStorage('skills', []),
      certificates: readStorage('certificates', []),
      projects: readStorage('projects', []),
      experiences: readStorage('experiences', []),
      quizScore: readStorage('quizScore', null),
      quizAttempts: readStorage('quizAttempts', []),
      placementConsent: readStorage('placementConsent', null),
    }

    const res = await syncUserDataToSupabase(currentUser, payload)
    setSyncingCloud(false)
    if (res.success) {
      showToast(res.message)
    } else {
      setSupabaseTestStatus({ success: false, message: res.message })
    }
  }

  // Export JSON backup
  function handleExportBackup() {
    const backupData = {
      user: currentUser,
      academicProfile: readStorage('academicProfile', null),
      skills: readStorage('skills', []),
      certificates: readStorage('certificates', []),
      projects: readStorage('projects', []),
      experiences: readStorage('experiences', []),
      quizScore: readStorage('quizScore', null),
      quizAttempts: readStorage('quizAttempts', []),
      placementConsent: readStorage('placementConsent', null),
      placementApplications: readStorage('placementApplications', []),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thirora_backup_${currentUser?.name?.replace(/\s+/g, '_') || 'student'}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Account data backup downloaded successfully!')
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Preferences &amp; Security</p>
          <h1>Account Settings</h1>
          <p className="page-subtitle">
            Manage your credentials, multi-device active sessions, themes, and cloud synchronization.
          </p>
        </div>
      </header>

      {toastMessage && (
        <div className="profile-toast" role="status">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'security' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('security')}
          >
            <span>Account Security</span>
          </button>

          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'devices' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('devices')}
          >
            <span>Active Devices &amp; Sessions</span>
            {activeDevices.filter((d) => d.status === 'active').length > 1 && (
              <span className="settings-badge-count">
                {activeDevices.filter((d) => d.status === 'active').length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'appearance' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('appearance')}
          >
            <span>Appearance &amp; Theme</span>
          </button>

          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'cloud' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('cloud')}
          >
            <span>Cloud Sync (Supabase)</span>
          </button>

          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'notifications' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('notifications')}
          >
            <span>Notifications</span>
          </button>

          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'danger' ? 'settings-nav-btn-active' : ''}`}
            onClick={() => handleTabChange('danger')}
          >
            <span>Data &amp; Danger Zone</span>
          </button>
        </nav>

        {/* Tab Content Panels */}
        <div className="settings-content-panel">
          {/* 1. SECURITY & PASSWORD TAB */}
          {activeTab === 'security' && (
            <div className="settings-card">
              <div className="card-section-header">
                <h2>Password &amp; Security</h2>
                <p>Update your password with salted SHA-256 cryptographic hashing.</p>
              </div>

              {passStatus.message && (
                <div className={`auth-alert ${passStatus.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`}>
                  <span>{passStatus.type === 'success' ? '✓' : '!'}</span>
                  <span>{passStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="settings-form">
                <div className="form-field">
                  <label htmlFor="current-pass">Current Password</label>
                  <input
                    id="current-pass"
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="new-pass">New Password (min 8 chars)</label>
                    <input
                      id="new-pass"
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="confirm-new-pass">Confirm New Password</label>
                    <input
                      id="confirm-new-pass"
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={confirmNewPass}
                      onChange={(e) => setConfirmNewPass(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-checkbox-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showPass}
                      onChange={(e) => setShowPass(e.target.checked)}
                    />
                    <span>Show passwords</span>
                  </label>
                </div>

                <div className="form-actions-bar">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="primary-btn"
                  >
                    {changingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              <hr className="settings-divider" />

              <div className="security-notice-box">
                <div>
                  <strong>Cryptographic Guarantee</strong>
                  <p>
                    Passwords are never saved in plain text. They are hashed using client-side Web Crypto API SHA-256 with unique 16-byte random salts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. ACTIVE DEVICES & MULTI-DEVICE SESSIONS */}
          {activeTab === 'devices' && (
            <div className="settings-card">
              <div className="card-section-header">
                <div className="devices-header-row">
                  <div>
                    <h2>Active Devices &amp; Multi-Device Sessions</h2>
                    <p>Review all physical devices and browsers currently signed into this account.</p>
                  </div>
                  <button
                    type="button"
                    className="danger-outline-btn"
                    onClick={() => {
                      logoutOtherDevices()
                      showToast('Logged out from all other active devices!')
                    }}
                    title="Terminate sessions on all other devices"
                  >
                    <span>Log Out From All Other Devices</span>
                  </button>
                </div>
              </div>

              {/* Devices Explanation Notice */}
              <div className="multi-device-info-box">
                <strong>Multi-Device Architecture:</strong>
                <p>
                  Thirora monitors browser fingerprints and device platforms. When you sign in from a new computer or smartphone, a security alert is dispatched immediately. You can revoke other sessions anytime.
                </p>
              </div>

              {/* Devices List */}
              <div className="devices-list">
                {activeDevices.map((device) => {
                  const isActive = device.status === 'active'
                  const isCurrent = device.isCurrentDevice

                  return (
                    <div
                      key={device.id}
                      className={`device-item-card ${isCurrent ? 'device-current-card' : ''} ${!isActive ? 'device-revoked-card' : ''}`}
                    >
                      <div className="device-item-left">
                        <div className="device-details">
                          <div className="device-title-row">
                            <strong>{device.deviceName}</strong>
                            {isCurrent && <span className="current-device-badge">Current Device</span>}
                            <span className={`device-status-badge ${isActive ? 'status-badge-active' : 'status-badge-revoked'}`}>
                              {isActive ? 'Active Session' : 'Revoked'}
                            </span>
                          </div>
                          <p className="device-meta">
                            <span>OS: {device.os}</span> &bull; <span>Browser: {device.browser}</span> &bull; <span>{device.location || 'Local Network'}</span>
                          </p>
                          <p className="device-timestamp">
                            Last active: {new Date(device.lastActive).toLocaleString()} &bull; First seen: {new Date(device.firstSeen).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="device-item-actions">
                        {!isCurrent && isActive && (
                          <button
                            type="button"
                            className="revoke-btn"
                            onClick={() => {
                              revokeDevice(device.id)
                              showToast(`Revoked session for ${device.deviceName}`)
                            }}
                          >
                            Revoke Session
                          </button>
                        )}
                        {isCurrent && (
                          <span className="device-this-label">This Browser</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. APPEARANCE & THEME TAB */}
          {activeTab === 'appearance' && (
            <div className="settings-card">
              <div className="card-section-header">
                <h2>Appearance &amp; Theme</h2>
                <p>Customize the interface aesthetics to match your work environment.</p>
              </div>

              <div className="theme-options-grid">
                {/* Light Mode Card */}
                <div
                  className={`theme-option-card ${theme === 'light' ? 'theme-option-card-selected' : ''}`}
                  onClick={() => setTheme('light')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="theme-preview-box theme-preview-light">
                    <div className="preview-nav-bar" />
                    <div className="preview-content-block" />
                  </div>
                  <div className="theme-option-info">
                    <strong>Light Mode</strong>
                    <p>Clean, crisp high-contrast layout for daytime productivity.</p>
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  className={`theme-option-card ${theme === 'dark' ? 'theme-option-card-selected' : ''}`}
                  onClick={() => setTheme('dark')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="theme-preview-box theme-preview-dark">
                    <div className="preview-nav-bar" />
                    <div className="preview-content-block" />
                  </div>
                  <div className="theme-option-info">
                    <strong>Dark Mode</strong>
                    <p>Deep slate and vibrant glowing accents for low-light focus.</p>
                  </div>
                </div>

                {/* System Mode Card */}
                <div
                  className={`theme-option-card ${theme === 'system' ? 'theme-option-card-selected' : ''}`}
                  onClick={() => setTheme('system')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="theme-preview-box theme-preview-system">
                    <div className="preview-nav-bar" />
                    <div className="preview-content-block" />
                  </div>
                  <div className="theme-option-info">
                    <strong>System Default</strong>
                    <p>Automatically synchronizes with your device operating system setting.</p>
                  </div>
                </div>
              </div>

              <div className="theme-status-indicator">
                <span>Current active rendering:</span>
                <strong>{resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
              </div>
            </div>
          )}

          {/* 4. CLOUD BACKEND & SUPABASE CONFIG */}
          {activeTab === 'cloud' && (
            <div className="settings-card">
              <div className="card-section-header">
                <h2>Supabase Cloud Backend &amp; Cross-Device Sync</h2>
                <p>Connect your Supabase project for real cross-device synchronization and PostgreSQL storage.</p>
              </div>

              <div className="cloud-explainer-banner">
                <div>
                  <strong>Why connect Supabase?</strong>
                  <p>
                    By design, standard browser <code>localStorage</code> cannot communicate across different physical phones and laptops over the internet. Connecting Supabase provides genuine cloud storage, realtime push alerts, and true cross-device sessions.
                  </p>
                </div>
              </div>

              {supabaseTestStatus && (
                <div className={`auth-alert ${supabaseTestStatus.success ? 'auth-alert-success' : 'auth-alert-error'}`}>
                  <span>{supabaseTestStatus.success ? '✓' : '!'}</span>
                  <span>{supabaseTestStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveSupabaseConfig} className="settings-form">
                <div className="form-field">
                  <label htmlFor="supa-url">Supabase Project URL</label>
                  <input
                    id="supa-url"
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseForm.url}
                    onChange={(e) => setSupabaseForm({ ...supabaseForm, url: e.target.value })}
                  />
                  <small className="field-hint">Found in Supabase Dashboard &rarr; Project Settings &rarr; API</small>
                </div>

                <div className="form-field">
                  <label htmlFor="supa-key">Supabase Anonymous API Key (anon / public)</label>
                  <input
                    id="supa-key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseForm.anonKey}
                    onChange={(e) => setSupabaseForm({ ...supabaseForm, anonKey: e.target.value })}
                  />
                  <small className="field-hint">Public safe client anon key with Row Level Security</small>
                </div>

                <div className="form-checkbox-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={supabaseForm.enabled}
                      onChange={(e) => setSupabaseForm({ ...supabaseForm, enabled: e.target.checked })}
                    />
                    <span>Enable Supabase Cloud Synchronization</span>
                  </label>
                </div>

                <div className="cloud-actions-row">
                  <button
                    type="button"
                    disabled={testingSupabase || !supabaseForm.url || !supabaseForm.anonKey}
                    className="secondary-btn"
                    onClick={handleTestSupabase}
                  >
                    {testingSupabase ? 'Testing Connection...' : 'Test Connection'}
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                  >
                    Save Cloud Settings
                  </button>

                  <button
                    type="button"
                    disabled={syncingCloud || !supabaseForm.enabled}
                    className="secondary-btn"
                    onClick={handleCloudSync}
                    title="Upload local academic portfolio to Supabase tables"
                  >
                    {syncingCloud ? 'Syncing...' : 'Sync Local Data to Cloud'}
                  </button>
                </div>
              </form>

              <div className="sql-setup-card">
                <strong>Database Schema Ready</strong>
                <p>
                  A complete migration script <code>supabase-schema.sql</code> is included in your workspace root. Simply copy and execute it in your Supabase SQL Editor to initialize all tables with Row-Level Security!
                </p>
              </div>
            </div>
          )}

          {/* 5. NOTIFICATIONS PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="settings-card">
              <div className="card-section-header">
                <h2>Notification Preferences</h2>
                <p>Control what security alerts and academic reminders you receive.</p>
              </div>

              <div className="toggle-list">
                <div className="toggle-item">
                  <div>
                    <strong>New Device Login Security Alerts</strong>
                    <p>Receive notifications whenever your account is accessed from an unrecognized browser or device.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={notifPrefs.securityAlerts}
                    onChange={(e) => handleToggleNotif('securityAlerts', e.target.checked)}
                  />
                </div>

                <div className="toggle-item">
                  <div>
                    <strong>Weekly Assessment Reminders</strong>
                    <p>Alerts when a new technical quiz is ready to update your AI skill gap analysis.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={notifPrefs.quizReminders}
                    onChange={(e) => handleToggleNotif('quizReminders', e.target.checked)}
                  />
                </div>

                <div className="toggle-item">
                  <div>
                    <strong>Placement &amp; Job Match Updates</strong>
                    <p>Notifications when your academic profile matches campus placement criteria.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={notifPrefs.placementAlerts}
                    onChange={(e) => handleToggleNotif('placementAlerts', e.target.checked)}
                  />
                </div>

                <div className="toggle-item">
                  <div>
                    <strong>Weekly Progress Digest &amp; Tips</strong>
                    <p>Weekly summary of roadmap achievements and new recommended certifications.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={notifPrefs.weeklyDigest}
                    onChange={(e) => handleToggleNotif('weeklyDigest', e.target.checked)}
                  />
                </div>
              </div>

              <div className="notification-local-note">
                <strong>Prototype delivery</strong>
                <p>These preferences and alerts are stored only in this browser. Real mobile-to-computer delivery requires a backend service such as Supabase Realtime or Firebase Cloud Messaging, plus server-side authentication and push notification delivery.</p>
              </div>
            </div>
          )}

          {/* 6. DANGER ZONE & DATA EXPORT */}
          {activeTab === 'danger' && (
            <div className="settings-card">
              <div className="card-section-header">
                <h2>Data Management &amp; Danger Zone</h2>
                <p>Export your full career records or manage workspace resets.</p>
              </div>

              <div className="danger-actions-list">
                <div className="danger-action-item">
                  <div>
                    <strong>Export Account &amp; Career Portfolio</strong>
                    <p>Download a complete JSON export of your profile, projects, quiz history, and credentials.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleExportBackup}
                  >
                    <span>Export JSON Backup</span>
                  </button>
                </div>

                <div className="danger-action-item danger-item-critical">
                  <div>
                    <strong>Log Out of Current Device</strong>
                    <p>Terminate your active session on this device.</p>
                  </div>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={logout}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
