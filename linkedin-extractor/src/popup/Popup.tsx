import { useState, useEffect } from 'react'
import './Popup.css'
import ProfilesList from './ProfilesList'
import ExportButton from './ExportButton'
import type { LinkedInProfile } from '../utils/parser'

const DELAY_MS = 2000 

// Declare chrome for TypeScript
declare const chrome: any

interface StoredProfile extends LinkedInProfile {
  id: string
}

interface MessageState {
  type: 'success' | 'error' | 'info'
  text: string
}

export default function Popup() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<MessageState | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load profiles from Chrome storage on mount
  useEffect(() => {
    chrome.storage.local.get(['profiles'], (result: any) => {
      if (result.profiles) {
        setProfiles(result.profiles)
      }
    })
  }, [])

  // Auto-clear message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ type, text })
  }

  const extractCurrentProfile = async () => {
    setLoading(true)
    showMessage('Waiting 2 seconds to avoid rate limiting...', 'info')

    try {
      // Wait before extracting to avoid LinkedIn blocking
      await new Promise(resolve => setTimeout(resolve, 2000))

      showMessage('Extracting profile...', 'info')

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        showMessage('Error: No active tab found', 'error')
        setLoading(false)
        return
      }

      // Check if on LinkedIn
      if (!tab.url?.includes('linkedin.com')) {
        showMessage('Please navigate to a LinkedIn profile page', 'error')
        setLoading(false)
        return
      }

      // Send message to content script to extract profile
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractProfile',
      })

      if (response.success && response.data) {
        const profileData = response.data as LinkedInProfile
        const newProfile: StoredProfile = {
          ...profileData,
          id: `profile_${Date.now()}`,
        }

        // Validate profile
        if (!newProfile.name) {
          showMessage('Could not extract profile name. Ensure you\'re on a LinkedIn profile page.', 'error')
          setLoading(false)
          return
        }

        const updatedProfiles = [...profiles, newProfile]
        setProfiles(updatedProfiles)
        chrome.storage.local.set({ profiles: updatedProfiles })

        showMessage(`✓ Profile extracted: ${newProfile.name}`, 'success')
      } else if (response.error) {
        showMessage(`Error: ${response.error}`, 'error')
      } else {
        showMessage('Failed to extract profile data', 'error')
      }
    } catch (error) {
      console.error('Extraction error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      showMessage(`Failed to extract: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const removeProfile = (id: string) => {
    const profile = profiles.find((p) => p.id === id)
    const updatedProfiles = profiles.filter((p) => p.id !== id)
    setProfiles(updatedProfiles)
    chrome.storage.local.set({ profiles: updatedProfiles })
    showMessage(`Removed: ${profile?.name}`, 'info')
  }

  const clearAll = () => {
    if (window.confirm(`Clear all ${profiles.length} profiles?`)) {
      setProfiles([])
      chrome.storage.local.set({ profiles: [] })
      showMessage('All profiles cleared', 'info')
    }
  }

  const duplicateCount = profiles.length > 0
    ? profiles.filter((p, idx) => 
        profiles.findIndex(x => x.name === p.name) !== idx
      ).length
    : 0

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🔗 LinkedIn Extractor</h1>
        <p>{profiles.length} profiles • {duplicateCount} potential duplicates</p>
      </header>

      <main className="popup-main">
        <button
          className="extract-btn"
          onClick={extractCurrentProfile}
          disabled={loading}
          title="Extract profile from current LinkedIn page"
        >
          {loading ? '⏳ Extracting...' : '📄 Extract Profile'}
        </button>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {profiles.length > 0 ? (
          <>
            <ProfilesList profiles={profiles} onRemove={removeProfile} />

            <div className="export-footer">
              <ExportButton 
  profiles={profiles}
  onExport={() => showMessage('Exported to Excel', 'success')}
  showMessage={showMessage}
/>
              <button
                className="advanced-btn"
                onClick={() => setShowAdvanced(!showAdvanced)}
                title="Show advanced options"
              >
                {showAdvanced ? '▼' : '▶'} Options
              </button>
            </div>

            {showAdvanced && (
              <div className="advanced-options">
                <button className="option-btn clear-btn" onClick={clearAll}>
                  🗑️ Clear All ({profiles.length})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>📋 No profiles extracted yet</p>
            <p>Navigate to any LinkedIn profile and click "Extract Profile" above</p>
            <small>💡 Tip: Works on /in/ profile URLs</small>
          </div>
        )}
      </main>

      <footer className="popup-footer">
        <small>v1.0 • Data saved locally in your browser</small>
      </footer>
    </div>
  )
}