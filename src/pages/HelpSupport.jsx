import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const faqs = [
  {
    id: 'faq-1',
    category: 'auth',
    question: 'How does Thirora secure my password?',
    answer: 'Thirora implements client-side Web Crypto API with salted SHA-256 cryptographic hashing. Your raw password is never stored or transmitted in plain text.',
  },
  {
    id: 'faq-2',
    category: 'auth',
    question: 'Why does my account need Supabase for cross-device mobile & computer sync?',
    answer: 'Standard browser localStorage is sandboxed strictly to the current browser on one physical machine. It cannot communicate across devices over the internet. Supabase can provide the cloud database foundation for multi-device data, but realtime alerts still require configured backend event handling and a push delivery service.',
  },
  {
    id: 'faq-3',
    category: 'auth',
    question: 'How does new device login detection work?',
    answer: 'When you sign in, this prototype analyzes your browser signature, OS, and unique device identifier locally. If a login occurs from an unrecognized device, it adds a high-priority alert to this browser\'s Notifications center. It does not send a cross-device alert by itself.',
  },
  {
    id: 'faq-4',
    category: 'auth',
    question: 'Can I log out from my other computers and mobile phones remotely?',
    answer: 'Yes! Head to Settings -> Active Devices & Sessions. Click "Log Out From All Other Devices" to immediately revoke all other active sessions while keeping your current browser session active.',
  },
  {
    id: 'faq-5',
    category: 'academic',
    question: 'How do the 9 career modules integrate together?',
    answer: 'Your Academic Profile foundation, verified skills, certificates, and projects feed directly into the AI Skill Gap Analysis, Career Recommendations, and AI Resume Builder. Taking the Weekly Quiz dynamically tunes your skill gap metrics.',
  },
  {
    id: 'faq-6',
    category: 'quiz',
    question: 'How often should I take the Weekly Quiz?',
    answer: 'We recommend taking the indicative check-in once a week. Your score updates your skill proficiency scores and highlights areas that need more practice.',
  },
  {
    id: 'faq-7',
    category: 'resume',
    question: 'How does the AI Resume Builder generate my resume?',
    answer: 'The Resume Builder pulls your latest academic milestones, project bullet points, verified certificates, and skills from your profile into an ATS-friendly, professional format ready to export.',
  },
]

export default function HelpSupport() {
  const { currentUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [openFaq, setOpenFaq] = useState('faq-2')
  const [ticketCategory, setTicketCategory] = useState('General Question')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const [ticketError, setTicketError] = useState('')

  const filteredFaqs = faqs.filter((f) =>
    f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function toggleFaq(id) {
    setOpenFaq((prev) => (prev === id ? null : id))
  }

  function handleTicketSubmit(e) {
    e.preventDefault()
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setTicketError('Please enter both a subject and a detailed message.')
      return
    }

    setTicketError('')
    setTicketSubmitted(true)
    window.setTimeout(() => {
      setTicketSubject('')
      setTicketMessage('')
      setTicketSubmitted(false)
    }, 4500)
  }

  return (
    <div className="help-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Assistance &amp; Knowledge Base</p>
          <h1>Help &amp; Support</h1>
          <p className="page-subtitle">
            Find answers to common questions about authentication, cross-device sync, and career modules.
          </p>
        </div>
      </header>

      <div className="support-local-note" role="note">
        <strong>Prototype support form</strong>
        <p>This form demonstrates the support workflow in your browser. Real email support requires a backend endpoint connected to an email service such as Resend, SendGrid, or an institutional help desk.</p>
      </div>

      {/* Search Filter */}
      <div className="help-search-card">
        <div className="help-search-input-wrap">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search questions (e.g. Supabase, password security, multi-device, quiz, resume)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Guide Banners */}
      <div className="help-quick-cards">
        <div className="quick-card">
          <h3>Supabase Cloud Sync</h3>
          <p>Learn how to connect your Supabase database for real cross-device synchronization.</p>
          <Link to="/settings?tab=cloud" className="card-link">
            Configure Supabase &rarr;
          </Link>
        </div>

        <div className="quick-card">
          <h3>Session Security</h3>
          <p>Review active devices, new login alerts, and remote session revocations.</p>
          <Link to="/settings?tab=devices" className="card-link">
            Active Devices &rarr;
          </Link>
        </div>

        <div className="quick-card">
          <h3>AI CareerBot Assistant</h3>
          <p>Get instant 24/7 AI career counseling directly from the floating widget.</p>
          <span className="card-hint">Click the CareerBot icon in bottom-right corner</span>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>

        <div className="faq-list">
          {filteredFaqs.length === 0 ? (
            <p className="no-results-msg">No matching questions found for &ldquo;{searchTerm}&rdquo;.</p>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id
              return (
                <div key={faq.id} className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <span className="faq-arrow">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-body">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Contact Support / Ticket Form */}
      <section className="support-ticket-section">
        <div className="ticket-card">
          <div className="card-section-header">
            <h2>Contact Thirora Support / Counselor</h2>
            <p>Need specialized help with your career roadmap or technical setup? Submit a ticket below.</p>
          </div>

          {ticketSubmitted ? (
            <div className="ticket-success-box">
              <span>✓</span>
              <div>
                <strong>Support Ticket Logged!</strong>
                <p>
                  Thank you, {currentUser?.name || 'Student'}. Our advisor team has received your query and will respond shortly.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="ticket-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="ticket-cat">Query Category</label>
                  <select
                    id="ticket-cat"
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                  >
                    <option value="General Question">General Question</option>
                    <option value="Account & Security">Account &amp; Security</option>
                    <option value="Cloud Backend & Supabase">Cloud Backend &amp; Supabase</option>
                    <option value="Career & Placement Advice">Career &amp; Placement Advice</option>
                    <option value="Bug Report">Bug Report</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="ticket-subject">Subject</label>
                  <input
                    id="ticket-subject"
                    type="text"
                    required
                    placeholder="Brief summary of your query"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="ticket-msg">Detailed Message</label>
                <textarea
                  id="ticket-msg"
                  rows={4}
                  required
                  placeholder="Describe your question or issue in detail..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                />
              </div>

              {ticketError && <p className="form-error" role="alert">{ticketError}</p>}

              <div className="form-actions-bar">
                <button type="submit" className="primary-btn">
                  Submit Support Request &rarr;
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
