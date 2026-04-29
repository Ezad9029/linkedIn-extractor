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

function extractProfileData() {
  let name = 'Unknown'
  let title = 'Unknown'
  let company = 'Unknown'
  let timeInCompany = 'Unknown'

  // Try to get structured data from meta tags and JSON-LD
  console.log('=== Extracting from structured data ===')

  // Method 1: Extract from meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
  const ogDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  
  console.log('og:title:', ogTitle)
  console.log('description:', ogDescription)

  // Extract name from h1
  const nameEl = document.querySelector('h1') as HTMLElement
  if (nameEl) {
    name = nameEl.textContent?.trim() || 'Unknown'
  }

  // Method 2: Look for all text content with specific patterns
  const allText = document.body.innerText
  
  // Look for employment patterns like "Title at Company"
  const employmentPattern = /^(.+?)\s+at\s+(.+?)$/m
  const lines = allText.split('\n')
  
  console.log('=== Looking for employment patterns ===')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Look for "Title at Company" pattern
    if (line.includes(' at ') && !line.includes('linkedin.com')) {
      const match = line.match(/^(.+?)\s+at\s+(.+?)$/)
      if (match && title === 'Unknown') {
        title = match[1].trim()
        company = match[2].trim()
        console.log('Found employment pattern:', { title, company })
        break
      }
    }
  }

  // Method 3: If still not found, look for experience section differently
  if (title === 'Unknown') {
    console.log('=== Trying alternative experience extraction ===')
    
    // Look for any element with "experience" text
    const allElements = document.querySelectorAll('*')
    let foundExperience = false
    
    for (let el of allElements) {
      if (el.textContent?.includes('Experience') && el.textContent.length < 500) {
        console.log('Found element with Experience:', el.textContent?.substring(0, 200))
        
        // Get text nodes after this element
        const parent = el.parentElement
        if (parent) {
          const text = parent.innerText
          const experienceLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          
          let expIndex = experienceLines.findIndex(l => l.toLowerCase().includes('experience'))
          
          if (expIndex !== -1) {
            // Try to extract from next few lines
            if (expIndex + 1 < experienceLines.length) {
              title = experienceLines[expIndex + 1]
            }
            if (expIndex + 2 < experienceLines.length) {
              company = experienceLines[expIndex + 2]
            }
            if (expIndex + 3 < experienceLines.length) {
              timeInCompany = experienceLines[expIndex + 3]
            }
            
            console.log('Extracted from experience element:', { title, company, timeInCompany })
            break
          }
        }
      }
    }
  }

  console.log('=== Final Result ===')
  console.log({ name, title, company, timeInCompany })

  return {
    name,
    company,
    title,
    timeInCompany,
    extractedAt: new Date().toISOString(),
  }
}