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
  let name = ''
  let title = ''
  let company = ''
  let timeInCompany = ''

  // Extract name - get first h1
  const h1 = document.querySelector('h1')
  if (h1?.textContent) {
    name = h1.textContent.trim()
  }

  // Extract job details from the entire page text
  const pageText = document.body.innerText
  const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  // Find the Experience section and get the first job entry
  let foundExperience = false
  let jobStartIndex = -1
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Experience') {
      foundExperience = true
      jobStartIndex = i + 1
      break
    }
  }

  // If we found experience section, get the next non-empty lines as job info
  if (foundExperience && jobStartIndex >= 0) {
    let jobLinesCount = 0
    for (let i = jobStartIndex; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip empty lines and known section headers
      if (line.length === 0 || line === 'Education' || line === 'Skills') {
        break
      }
      
      // Skip logo/image text and other unwanted lines
      if (line.includes('Logo') || line.length > 200) {
        continue
      }
      
      if (jobLinesCount === 0) {
        title = line
        jobLinesCount++
      } else if (jobLinesCount === 1) {
        // Company line - extract just the company name (before · or any special char)
        company = line.split('·')[0].trim()
        jobLinesCount++
      } else if (jobLinesCount === 2) {
        // Duration line
        timeInCompany = line
        break
      }
    }
  }

  return {
    name: name || 'Unknown',
    company: company || 'Unknown',
    title: title || 'Unknown',
    timeInCompany: timeInCompany || 'Unknown',
    extractedAt: new Date().toISOString(),
  }
}