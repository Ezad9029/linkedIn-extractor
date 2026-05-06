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
            <div className="detail-row">
              <span className="detail-label">🏢</span>
              <span>{profile.company}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">📍</span>
              <span>{profile.title}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">⏱️</span>
              <span>{profile.timeInCompany}</span>
            </div>
          </div>

          <p className="profile-timestamp">
            Extracted: {formatDate(profile.extractedAt)}
          </p>
        </div>
      ))}
    </div>
  )
}