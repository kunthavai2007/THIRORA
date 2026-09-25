import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { readStorage, writeStorage } from '../utils/storage'

export default function Feedback() {
  const { currentUser } = useAuth()
  const feedbackStorageKey = `careerflow_user_feedbacks_${currentUser?.id || 'guest'}`

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState('Feature Request')
  const [comments, setComments] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [feedbacks, setFeedbacks] = useState(() => readStorage(feedbackStorageKey, [], Array.isArray))

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!']

  function handleSubmit(e) {
    e.preventDefault()
    if (!comments.trim()) {
      setValidationError('Please enter a feedback message before submitting.')
      return
    }

    setValidationError('')

    const newFeedback = {
      id: 'fb_' + Date.now().toString(36),
      userId: currentUser?.id || null,
      authorName: isAnonymous ? 'Anonymous Student' : 'You',
      rating,
      category,
      comments: comments.trim(),
      timestamp: new Date().toISOString(),
    }

    const updated = [newFeedback, ...feedbacks]
    setFeedbacks(updated)
    writeStorage(feedbackStorageKey, updated)

    setSubmitted(true)
    window.setTimeout(() => {
      setComments('')
      setSubmitted(false)
    }, 4000)
  }

  return (
    <div className="feedback-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Continuous Improvement</p>
          <h1>Share Your Feedback</h1>
          <p className="page-subtitle">
            Help us refine Thirora. Your input shapes our career roadmap features, assessments, and AI recommendations.
          </p>
        </div>
      </header>

      <div className="feedback-grid">
        {/* Feedback Submission Card */}
        <div className="feedback-form-card">
          <div className="card-section-header">
            <h2>Rate Your Experience</h2>
            <p>Tell us what you love or what we can build next.</p>
          </div>

          {submitted ? (
            <div className="feedback-success-card">
              <h3>Thank you for your feedback!</h3>
              <p>
                Your thoughts have been logged and will help us make Thirora even better for all students.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form">
              {/* Star Rating */}
              <div className="rating-field">
                <label>Overall Experience Rating</label>
                <div className="stars-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={`star-btn ${(hoverRating || rating) >= star ? 'star-btn-active' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} star`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-label-text">
                    {ratingLabels[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="form-field">
                <label htmlFor="fb-category">Feedback Category</label>
                <select
                  id="fb-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Feature Request">Feature Request</option>
                  <option value="User Experience / Design">User Experience &amp; Design</option>
                  <option value="Career & Placement Tools">Career &amp; Placement Tools</option>
                  <option value="Weekly Quiz & Assessments">Weekly Quiz &amp; Assessments</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="General Praise">General Praise</option>
                </select>
              </div>

              {/* Comments */}
              <div className="form-field">
                <label htmlFor="fb-comments">Your Thoughts / Suggestions *</label>
                <textarea
                  id="fb-comments"
                  rows={4}
                  required
                  placeholder="What worked well? What additional tools or quiz questions would help your career journey?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
                {validationError && <p className="form-error" role="alert">{validationError}</p>}
              </div>

              {/* Anonymous checkbox */}
              <div className="form-checkbox-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Submit anonymously without linking my student name</span>
                </label>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="primary-btn">
                  Submit Feedback &rarr;
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Feedback History & Community Highlights */}
        <div className="feedback-history-card">
          <div className="card-section-header">
            <h2>Recent Feedback Log</h2>
            <p>Submissions recorded on this workspace.</p>
          </div>

          <div className="feedback-list">
            {feedbacks.length === 0 ? (
              <p className="no-feedbacks-text">No feedback logged yet. Be the first to share!</p>
            ) : (
              feedbacks.slice(0, 5).map((fb) => (
                <div key={fb.id} className="feedback-log-item">
                  <div className="fb-item-header">
                    <strong>{fb.authorName}</strong>
                    <span className="fb-stars">{'★'.repeat(fb.rating)}</span>
                  </div>
                  <span className="fb-cat-badge">{fb.category}</span>
                  <p className="fb-comments-text">&ldquo;{fb.comments}&rdquo;</p>
                  <small className="fb-time">{new Date(fb.timestamp).toLocaleDateString()}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
