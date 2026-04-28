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
  const [message, setMessage] = useState<MessageState | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [loading, setLoading] = useState(false)

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

  const extractFromURL = async () => {
    if (!urlInput.trim()) {
      showMessage('Please enter a LinkedIn profile URL', 'error')
      return
    }

    setLoading(true)
    showMessage('Fetching profile...', 'info')

    try {
      // Open the LinkedIn profile in a new tab and extract data
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      // Create a new tab with the URL
      const newTab = await chrome.tabs.create({ url: urlInput, active: false })
      
      // Wait for tab to load
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Execute script to extract data
      const result = await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        function: extractProfileData,
      })

      // Close the tab
      chrome.tabs.remove(newTab.id)

      if (result?.[0]?.result) {
        const profileData = result[0].result as LinkedInProfile
        
        const newProfile: StoredProfile = {
          ...profileData,
          id: `profile_${Date.now()}`,
        }

        if (!newProfile.name || newProfile.name === 'Unknown') {
          showMessage('Could not extract profile data. Check URL and try again.', 'error')
          setLoading(false)
          return
        }

        const updatedProfiles = [...profiles, newProfile]
        setProfiles(updatedProfiles)
        chrome.storage.local.set({ profiles: updatedProfiles })
        
        setUrlInput('')
        showMessage(`✓ ${newProfile.name} added`, 'success')
      } else {
        showMessage('Failed to extract profile', 'error')
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
      showMessage('All cleared', 'info')
    }
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🔗 LinkedIn Profiles</h1>
        <p>{profiles.length} profiles</p>
      </header>

      <main className="popup-main">
        <div className="url-input-container">
          <input
            type="text"
            placeholder="Paste LinkedIn profile URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="url-input"
            disabled={loading}
          />
          <button
            className="extract-btn"
            onClick={extractFromURL}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '➕ Add'}
          </button>
        </div>

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
                onClick={clearAll}
              >
                🗑️ Clear All
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No profiles yet</p>
            <p>Paste a LinkedIn profile URL above</p>
          </div>
        )}
      </main>
    </div>
  )
}

function waitForExperienceSection(timeout = 7000) {
  return new Promise<Element | null>((resolve) => {
    const findSection = () => {
      const sections = document.querySelectorAll('section')
      for (const section of sections) {
        const heading = section.querySelector('h2')
        if (heading && heading.innerText.toLowerCase().includes('experience')) {
          return section
        }
      }
      return null
    }

    const existing = findSection()
    if (existing) return resolve(existing)

    const observer = new MutationObserver(() => {
      const section = findSection()
      if (section) {
        observer.disconnect()
        resolve(section)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

async function extractProfileData() {
  let name = 'Unknown'
  let title = 'Unknown'
  let company = 'Unknown'
  let timeInCompany = 'Unknown'

  // ✅ Name (this part was already fine)
  const nameEl = document.querySelector('h1')
  if (nameEl) {
    name = nameEl.textContent?.trim() || 'Unknown'
  }

  // ✅ Wait for experience section (IMPORTANT)
  const experienceSection = await waitForExperienceSection()

  if (experienceSection) {
    const firstItem = experienceSection.querySelector('li')

    if (firstItem) {
      const text = firstItem.innerText

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

      // 🔍 Debug (you should keep this while developing)
      console.log('Experience lines:', lines)

      /*
        Typical LinkedIn structure:
        [
          "Software Engineer",
          "Google · Full-time",
          "Jan 2022 - Present · 2 yrs"
        ]
      */

      if (lines.length > 0) {
        title = lines[0]
      }

      if (lines.length > 1) {
        // Extract company before "·"
        company = lines[1].split('·')[0].trim()
      }

      if (lines.length > 2) {
        timeInCompany = lines[2]
      }
    }
  }

  return {
    name,
    title,
    company,
    timeInCompany,
    extractedAt: new Date().toISOString(),
  }
}