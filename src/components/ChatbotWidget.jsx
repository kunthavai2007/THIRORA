import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { readStorage } from '../utils/storage'
import thiroraChatbotLogo from '../assets/thirora-chatbot-logo.jpeg'

const quickPrompts = [
  'What is Thirora?',
  'How do I add a skill?',
  'How does the weekly quiz work?',
  'How is my skill score calculated?',
  'How do I create a resume?',
  'How do notifications work?',
  'How do I contact support?',
]

let msgCounter = 0
function generateUniqueId(prefix = 'msg') {
  msgCounter += 1
  return `${prefix}_${Date.now()}_${msgCounter}`
}

export default function ChatbotWidget() {
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const [messages, setMessages] = useState(() => [
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! I'm the **Thirora Website Assistant**. I can help you use the features and pages in this website.`,
      timestamp: new Date().toISOString(),
    },
  ])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Local, deterministic guidance based on the implemented routes and storage keys.
  function generateAIResponse(query) {
    const q = query.toLowerCase()
    const recordedSkills = readStorage('skills', [], Array.isArray)
      .map((skill) => skill.name)
      .filter(Boolean)
    const skills = recordedSkills.length > 0 ? recordedSkills.join(', ') : null
    const quizScore = readStorage('quizScore', null)
    const fallback = "I'm the Thirora assistant. I can help you with the features and usage of this website."
    const hasAny = (...terms) => terms.some((term) => q.includes(term))

    if (hasAny('what is thirora', 'about thirora', 'why was thirora', 'what is logro', 'platform', 'benefit', 'four-year', 'four year', 'journey')) {
      return `Thirora is a student career workspace that brings academic details, skills, certificates, projects, experiences, quizzes, learning guidance, resume preparation, and placement planning together.\n\nIt is created to help students keep evidence of their growth in one place and make clearer decisions across a four-year journey: foundation in year 1, skill development in year 2, projects and internships in year 3, and career preparation in year 4. The Dashboard and Overall Progress pages show this journey using the data you save.`
    }

    if (hasAny('create an account', 'create account', 'sign up', 'signup', 'register')) {
      return 'Open the Sign Up page, enter your name, email, and password, add the optional academic details, accept the terms, and submit. Passwords are hashed before they are stored by the prototype; do not enter secrets into profile fields.'
    }

    if (hasAny('sign in', 'login', 'log in', 'log out', 'logout', 'forgot password', 'reset password')) {
      return 'Use the Login page with your registered email and password. Use Forgot Password if needed. After signing in, use the profile menu in the top navigation and choose Sign Out to log out of the current browser session.'
    }

    if (hasAny('dashboard', 'home page')) {
      return 'Dashboard is the starting overview. It shows saved counts for skills, certificates, projects, experiences, and quiz score, plus quick actions for the main career tools. Values are marked as saved locally in this prototype.'
    }

    if (hasAny('academic profile', 'academic details', 'college', 'cgpa', 'semester')) {
      return 'Open Academic Profile. The Academic Details tab saves your name, contact, registration number, college, department, year, semester, CGPA, and graduation date. The same page also contains the Skills, Certificates, Projects, and Internships & Workshops tabs.'
    }

    if (hasAny('add a skill', 'add skills', 'edit skill', 'delete skill', 'remove skill', 'skill management')) {
      return 'Open Academic Profile -> Skills. Enter a skill name, choose Beginner, Intermediate, or Advanced, and submit it. Saved skills appear in the list and can be deleted with Delete. The current implementation adds and deletes skills; it does not provide a separate edit control.'
    }

    if (hasAny('certificate', 'certificates')) {
      return 'Open Academic Profile -> Certificates. Enter the certificate name, organization, completion date, and optional link, then submit. Saved certificates appear in the list and can be deleted. There is no separate edit control in the current page.'
    }

    if (hasAny('internship', 'internships', 'workshop', 'workshops', 'experience')) {
      return 'Open Academic Profile -> Internships & Workshops. Choose Internship or Workshop, enter the title, organization, dates, description, and optional certificate link, then submit. Saved experiences can be deleted; the current page does not expose a separate edit control.'
    }

    if (hasAny('add a project', 'edit project', 'delete project', 'remove project', 'projects')) {
      return 'Open Academic Profile -> Projects. Enter the title, description, technologies, and optional link, then submit. Saved projects can be deleted. The current page does not expose a separate edit control.'
    }

    if (hasAny('weekly quiz', 'quiz work', 'take a quiz', 'quiz score', 'quiz result')) {
      return quizScore !== null
        ? `Open Weekly Quiz and choose Start Skill Assessment. The current quiz selects 8 questions across HTML, CSS, JavaScript, Python, SQL, and Git at mixed difficulty. Check each answer, read the explanation, and finish to save the attempt, score, topic performance, and history. Your latest saved score is ${quizScore} / 5.`
        : 'Open Weekly Quiz and choose Start Skill Assessment. It selects 8 questions across HTML, CSS, JavaScript, Python, SQL, and Git at mixed difficulty. Check each answer, read the explanation, and finish to save the attempt, score, topic performance, and history.'
    }

    if (hasAny('how is my skill score', 'calculate my skill', 'skill score calculated', 'skill analysis', 'skill gap', 'analyze my skill')) {
      return `Open Skill Analysis. Saved skill levels map to indicative percentages: Beginner 35%, Intermediate 65%, and Advanced 90%. Quiz topic percentages come from correct answers across saved attempts; 70% or higher is treated as a strong topic. The page combines these signals with missing core topics to show strong areas, review areas, skills to learn next, and a learning order. It is guidance, not a guaranteed prediction.${skills ? ` Your recorded skills are: ${skills}.` : ''}`
    }

    if (hasAny('career recommendation', 'recommended career', 'recommended role', 'career path')) {
      return 'Career Recommendations uses saved skills, repeated quiz topic results, projects, certificates, experiences, and available academic or placement preference context. It ranks up to three learning directions from the implemented role set, such as Front-End Developer, Full-Stack Developer, Python Developer, Data Analyst, and Software Developer. These are learning directions, not guaranteed job predictions.'
    }

    if (hasAny('create a resume', 'build a resume', 'resume preparation', 'resume builder', 'resume')) {
      return 'Open Resume Builder. It auto-fills details from Academic Profile, Skills, Certificates, Projects, Experiences, and saved quiz highlights. Review or refine the fields, select Refresh Resume Preview, then use Print / Save as PDF. It is a local document preview; it is not connected to a real AI resume API or submission service.'
    }

    if (hasAny('placement preparation', 'prepare for placement', 'placement interview', 'job application', 'apply for a job', 'job matching')) {
      return 'Placement Preparation activates when your graduation date is within three months. It builds a demo resume preview, ranks clearly labelled demo opportunities by matching saved skills, and lets you choose a preferred role. You must grant permission before using the demo Share Resume or Apply with Permission actions. Real job applications require backend integration, job APIs, authentication, and an application service; this site does not submit to real employers.'
    }

    if (hasAny('notification', 'notifications', 'bell', 'unread')) {
      return 'Use the bell in the top navigation or open Notifications from the sidebar. The page lists titles, messages, timestamps, and read/unread state. Open an item, choose Mark as read, or use Mark All as Read. Notification preferences are in Settings -> Notifications. This prototype stores alerts in the current browser; real phone-to-computer delivery needs a backend such as Supabase Realtime plus push delivery or Firebase Cloud Messaging.'
    }

    if (hasAny('light mode', 'dark mode', 'theme', 'appearance')) {
      return 'Use the moon or sun button in the top navigation, or open Settings -> Appearance & Theme. The available modes are Light, Dark, and System, and the selected mode is saved in this browser.'
    }

    if (hasAny('profile', 'update my details', 'save profile')) {
      return 'Open Profile to edit account identity, contact, academic, career-goal, bio, and avatar details, then save the form. Academic foundation details are managed separately in Academic Profile -> Academic Details.'
    }

    if (hasAny('settings', 'password', 'active device', 'cloud sync')) {
      return 'Settings contains Account Security, Active Devices & Sessions, Appearance & Theme, Cloud Sync (Supabase), Notifications, and Data & Danger Zone. Use it to change your password, review or revoke sessions, manage theme and notification preferences, configure optional cloud sync, export a backup, or clear demo data.'
    }

    if (hasAny('submit feedback', 'give feedback', 'feedback', 'rating')) {
      return 'Open Feedback from the sidebar or profile menu. Choose a 1-5 star rating, select a category, write your message, optionally submit anonymously, and choose Submit Feedback. Empty feedback messages are rejected. The prototype stores submissions in this browser for the signed-in workspace.'
    }

    if (hasAny('contact support', 'help and support', 'help & support', 'help support', 'support form', 'contact help')) {
      return 'Open Help & Support from the sidebar or profile menu. Search the FAQ or expand a question, then use the support form with a category, subject, and detailed message. Empty subject or message fields are rejected. The current form demonstrates the workflow locally; real email support requires a backend endpoint connected to an email service or help desk.'
    }

    if (hasAny('project aim', 'aim of the project', 'problem statement', 'existing system', 'proposed system', 'objectives', 'objective')) {
      return 'Project aim: give students one place to organize career evidence and follow a four-year development path. Problem statement: student information and career preparation are often scattered across documents and tools. Proposed system: a React workspace that combines academic records, portfolio evidence, assessments, learning guidance, resume preparation, progress, notifications, feedback, and support. The main objective is clearer, evidence-based student planning.'
    }

    if (hasAny('technologies used', 'tech stack', 'technology')) {
      return 'The current project uses React, React DOM, React Router, Vite, JavaScript, CSS, and browser localStorage utilities. It includes optional Supabase configuration and sync services, but real cloud delivery is not assumed unless it is configured and connected.'
    }

    if (hasAny('system requirement', 'requirements')) {
      return 'The project requires a modern browser with JavaScript and localStorage enabled. Development uses Node.js with the project npm scripts: npm install, npm run dev, npm run lint, and npm run build. A backend is required for real cross-device sync, push notifications, email support, or real job submissions.'
    }

    if (hasAny('system workflow', 'workflow', 'architecture', 'system architecture')) {
      return 'Workflow: authenticate -> complete Academic Profile -> add portfolio evidence -> take Weekly Quiz -> review Skill Analysis -> explore Career Recommendations -> build a Resume -> review Overall Progress and Placement Preparation. The React app routes pages through App, shared layout components provide navigation, context manages auth and theme, and storage utilities persist prototype data. Supabase services are optional backend integration points.'
    }

    if (hasAny('future enhancement', 'future enhancements', 'limitations')) {
      return 'Future enhancements could include a connected AI service, server-side per-user storage, push notifications, email support, real job APIs, employer integrations, stronger validation, and richer analytics. Current limitations are that many records and prototype feedback or alerts are browser-local, the chatbot is deterministic rather than a real AI service, placement companies are demo data, and no real application is submitted.'
    }

    if (hasAny('patent', 'patent-related', 'patent related')) {
      return 'The website does not claim a patent or provide legal patent advice. Patentability depends on novelty, inventive step, jurisdiction, ownership, and a professional prior-art review. Discuss any filing decision with a qualified patent attorney or your institution\'s technology-transfer office.'
    }

    if (hasAny('git', 'branch', 'rebase')) {
      return 'Git is one of the Weekly Quiz topics and can be added as a saved skill. In general, a branch isolates work, merge combines histories, and rebase replays commits on a new base. This is general study guidance, not a separate Thirora workflow.'
    }

    if (hasAny('skill', 'gap', 'analysis')) {
      return skills
        ? `Your recorded skills are: **${skills}**. \n\n**Next steps:**\n1. Compare these skills with the gaps shown in **Skill Analysis**.\n2. Use the **Weekly Quiz** to benchmark your mastery.\n3. Add current projects and evidence to your profile.`
        : `I don't have any recorded skills in your profile yet, so I won't guess at your skill gaps. Add skills in **Academic Profile**, then return to **Skill Analysis** for a data-based review.`
    }

    return fallback
  }

  function handleSendMessage(textToSend) {
    const text = textToSend || inputMessage
    if (!text.trim()) return

    const userMsg = {
      id: generateUniqueId('msg_user'),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInputMessage('')
    setIsTyping(true)

    // Simulate AI thinking and response
    window.setTimeout(() => {
      const botResponseText = generateAIResponse(text)
      const botMsg = {
        id: generateUniqueId('msg_bot'),
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 700)
  }

  function handleClearChat() {
    setMessages([
      {
        id: generateUniqueId('msg_welcome_new'),
        sender: 'bot',
        text: `Chat cleared! How else can I help your career journey, ${currentUser?.name || 'Student'}?`,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  return (
    <div className="chatbot-widget-container">
      <button
        type="button"
        className={`chatbot-floating-btn${isOpen ? ' chatbot-floating-btn-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close Thirora assistant' : 'Open Thirora assistant'}
        aria-expanded={isOpen}
        title={isOpen ? 'Close assistant' : 'Ask Thirora assistant'}
      >
        <span className="chatbot-btn-icon" aria-hidden="true">
          <img src={thiroraChatbotLogo} alt="Thirora Assistant" className="chatbot-floating-logo-img" />
        </span>
        <span className="chatbot-pulse-dot" />
      </button>

      {/* Expandable Chat Modal Window */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="Thirora Website Assistant">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-circle">
                <img src={thiroraChatbotLogo} alt="Thirora Assistant" className="chatbot-avatar-img" />
              </div>
              <div>
                <strong>Thirora Assistant</strong>
                <span className="chatbot-status-sub">
                  <span className="online-dot" /> Website guide &bull; Uses your saved data when helpful
                </span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-action"
                onClick={handleClearChat}
                title="Clear conversation"
              >
                Clear
              </button>
              <button
                type="button"
                className="chatbot-icon-action"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="chatbot-quick-chips">
            {quickPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                className="quick-chip-btn"
                onClick={() => handleSendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-wrap ${msg.sender === 'user' ? 'chat-bubble-user-wrap' : 'chat-bubble-bot-wrap'}`}
              >
                {msg.sender === 'bot' && (
                  <span className="bot-inline-icon">
                    <img src={thiroraChatbotLogo} alt="Thirora Assistant" className="bot-inline-img" />
                  </span>
                )}
                <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                  <small className="chat-msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-bubble-wrap chat-bubble-bot-wrap">
                <span className="bot-inline-icon">
                  <img src={thiroraChatbotLogo} alt="Thirora Assistant" className="bot-inline-img" />
                </span>
                <div className="chat-bubble chat-bubble-bot chat-typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="chatbot-input-bar"
          >
            <input
              type="text"
              placeholder="Ask about any Thirora feature..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="chatbot-send-btn"
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
