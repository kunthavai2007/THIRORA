import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Notifications() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
  } = useAuth()

  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'security' | 'quiz' | 'placement' | 'system'

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'all') return true
    return notif.type === activeFilter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="notifications-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Activity &amp; Alerts</p>
          <h1>Notifications Center</h1>
          <p className="page-subtitle">
            Stay informed about security updates, new device logins, and academic progress milestones.
          </p>
        </div>

        <div className="header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={markAllNotificationsRead}
            >
              <span>Mark All as Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={clearAllNotifications}
            >
              <span>Clear All</span>
            </button>
          )}
        </div>
      </header>

      <div className="notification-local-note" role="note">
        <strong>Browser-only prototype</strong>
        <p>Notifications are stored safely for this signed-in profile in this browser. Local storage alone cannot deliver alerts between a phone and computer; that requires a backend such as Supabase Realtime or Firebase Cloud Messaging with server-side push delivery.</p>
      </div>

      {/* Filter Tabs */}
      <div className="notifications-filter-bar">
        <button
          type="button"
          className={`notif-filter-btn ${activeFilter === 'all' ? 'notif-filter-btn-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({notifications.length})
        </button>

        <button
          type="button"
          className={`notif-filter-btn ${activeFilter === 'security' ? 'notif-filter-btn-active' : ''}`}
          onClick={() => setActiveFilter('security')}
        >
          Security Alerts ({notifications.filter((n) => n.type === 'security').length})
        </button>

        <button
          type="button"
          className={`notif-filter-btn ${activeFilter === 'quiz' ? 'notif-filter-btn-active' : ''}`}
          onClick={() => setActiveFilter('quiz')}
        >
          Quiz &amp; Skills ({notifications.filter((n) => n.type === 'quiz').length})
        </button>

        <button
          type="button"
          className={`notif-filter-btn ${activeFilter === 'placement' ? 'notif-filter-btn-active' : ''}`}
          onClick={() => setActiveFilter('placement')}
        >
          Placements ({notifications.filter((n) => n.type === 'placement').length})
        </button>

        <button
          type="button"
          className={`notif-filter-btn ${activeFilter === 'system' ? 'notif-filter-btn-active' : ''}`}
          onClick={() => setActiveFilter('system')}
        >
          System ({notifications.filter((n) => n.type === 'system').length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-list-container">
        {filteredNotifications.length === 0 ? (
          <div className="notifications-empty-card">
            <h3>No notifications here</h3>
            <p>You are all caught up! New security events and career updates will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isSecurity = notif.type === 'security'

            return (
              <article
                key={notif.id}
                className={`notification-card ${!notif.read ? 'notification-unread' : ''} ${isSecurity ? 'notification-security' : ''}`}
              >
                <div className="notif-card-body">
                  <div className="notif-title-row">
                    <h3>{notif.title}</h3>
                    <div className="notif-badge-group">
                      {isSecurity && <span className="security-tag">Security Alert</span>}
                      {!notif.read && <span className="unread-dot-badge">New</span>}
                      <span className="notif-time">{new Date(notif.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="notif-message-text">{notif.message}</p>

                  <div className="notif-actions-row">
                    {notif.actionUrl && (
                      <Link
                        to={notif.actionUrl}
                        className="notif-action-link"
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        Take Action &rarr;
                      </Link>
                    )}

                    <div className="notif-card-btns">
                      {!notif.read && (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          Mark as read
                        </button>
                      )}

                      <button
                        type="button"
                        className="text-btn text-btn-delete"
                        onClick={() => deleteNotification(notif.id)}
                        title="Delete notification"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
