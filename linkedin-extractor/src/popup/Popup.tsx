import { useState, useEffect } from 'react'
import './Popup.css'
import ProfilesList from './ProfilesList'
import ExportButton from './ExportButton'
import type { LinkedInProfile } from '../utils/parser'

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

  useEffect(() => {
    chrome.storage.local.get(['profiles'], (result: any) => {
      if (result.profiles) {
        setProfiles(result.profiles)
      }
    })
  }, [])

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
    showMessage('Extracting...', 'info')

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        showMessage('No active tab', 'error')
        setLoading(false)
        return
      }

      if (!tab.url?.includes('linkedin.com')) {
        showMessage('Go to LinkedIn profile page', 'error')
        setLoading(false)
        return
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractLinkedInData,
      })

      if (result?.[0]?.result) {
        const profileData = result[0].result as LinkedInProfile
        
        const newProfile: StoredProfile = {
          ...profileData,
          id: `profile_${Date.now()}`,
        }

        const updatedProfiles = [...profiles, newProfile]
        setProfiles(updatedProfiles)
        chrome.storage.local.set({ profiles: updatedProfiles })
        showMessage(`✓ ${newProfile.name}`, 'success')
      } else {
        showMessage('Extraction failed', 'error')
      }
    } catch (error) {
      showMessage(`Error: ${error}`, 'error')
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
      showMessage('Cleared', 'info')
    }
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🔗 LinkedIn Extractor</h1>
        <p>{profiles.length} profiles</p>
      </header>

      <main className="popup-main">
        <button
          className="extract-btn"
          onClick={extractCurrentProfile}
          disabled={loading}
        >
          {loading ? '⏳' : '📄'} Extract Profile
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
                onExport={() => showMessage('Exported', 'success')}
                showMessage={showMessage}
              />
              <button
                className="advanced-btn"
                onClick={() => setShowAdvanced(!showAdvanced)}
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
            <p>No profiles yet</p>
          </div>
        )}
      </main>
    </div>
  )
}

function extractLinkedInData() {
  // Extract name from various possible selectors
  const nameEl = 
    document.querySelector('h1') ||
    document.querySelector('[data-test-id="top-card-title"]') ||
    document.querySelector('.profile-card h1')
  const name = nameEl?.textContent?.trim() || 'Unknown'

  // Extract experience section
  const experienceItems = document.querySelectorAll('[data-test-id="experience-section"] li')
  let company = 'Unknown'
  let title = 'Unknown'
  let timeInCompany = 'Unknown'

  if (experienceItems.length > 0) {
    const firstExp = experienceItems[0]
    const titleEl = firstExp.querySelector('[data-test-id*="title"]')
    const companyEl = firstExp.querySelector('[data-test-id*="company"]')
    const durationEl = firstExp.querySelector('[data-test-id*="duration"]')

    title = titleEl?.textContent?.trim() || 'Unknown'
    company = companyEl?.textContent?.trim() || 'Unknown'
    timeInCompany = durationEl?.textContent?.trim() || 'Unknown'
  }

  return {
    name,
    company,
    title,
    timeInCompany,
    extractedAt: new Date().toISOString(),
  }
}
