import './ProfilesList.css'
import type { LinkedInProfile } from '../utils/parser'

interface StoredProfile extends LinkedInProfile {
  id: string
}

interface ProfilesListProps {
  profiles: StoredProfile[]
  onRemove: (id: string) => void
}

export default function ProfilesList({ profiles, onRemove }: ProfilesListProps) {
  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="profiles-list">
      <div className="list-header">
        <h2>{profiles.length} Profile{profiles.length !== 1 ? 's' : ''}</h2>
      </div>

      {profiles.map((profile) => (
        <div key={profile.id} className="profile-card">
          <div className="profile-header">
            <div className="profile-title">
              <h3>{profile.name || '(No name)'}</h3>
              {profile.title && <p className="profile-position">📍 {profile.title}</p>}
            </div>
            <button
              className="remove-btn"
              onClick={() => onRemove(profile.id)}
              title="Remove this profile"
            >
              ✕
            </button>
          </div>

          <div className="profile-details">
            {profile.company && (
              <div className="detail-row">
                <span className="detail-label">🏢</span>
                <span>{profile.company}</span>
              </div>
            )}

            {profile.location && (
              <div className="detail-row">
                <span className="detail-label">📌</span>
                <span>{profile.location}</span>
              </div>
            )}

            {profile.skills.length > 0 && (
              <div className="detail-section">
                <p className="detail-label">💡 Top Skills:</p>
                <div className="skills-list">
                  {profile.skills.slice(0, 6).map((skill, idx) => (
                    <span key={idx} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                  {profile.skills.length > 6 && (
                    <span className="skill-tag more">+{profile.skills.length - 6}</span>
                  )}
                </div>
              </div>
            )}

            {profile.experience.length > 0 && (
              <div className="detail-section">
                <p className="detail-label">💼 Experience ({profile.experience.length}):</p>
                <div className="exp-list">
                  {profile.experience.slice(0, 2).map((exp, idx) => (
                    <div key={idx} className="exp-item">
                      <strong>{exp.title}</strong> at {exp.company}
                      {exp.duration && <span className="duration">{exp.duration}</span>}
                    </div>
                  ))}
                  {profile.experience.length > 2 && (
                    <p className="more-text">+{profile.experience.length - 2} more</p>
                  )}
                </div>
              </div>
            )}

            {profile.education.length > 0 && (
              <div className="detail-section">
                <p className="detail-label">🎓 Education ({profile.education.length}):</p>
                <div className="edu-list">
                  {profile.education.slice(0, 2).map((edu, idx) => (
                    <div key={idx} className="edu-item">
                      <strong>{edu.school}</strong>
                      {edu.degree && <span>{edu.degree}</span>}
                    </div>
                  ))}
                  {profile.education.length > 2 && (
                    <p className="more-text">+{profile.education.length - 2} more</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="profile-timestamp">
            Extracted: {formatDate(profile.extractedAt)}
          </p>
        </div>
      ))}
    </div>
  )
}