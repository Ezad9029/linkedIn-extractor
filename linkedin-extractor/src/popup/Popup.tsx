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
    // Create a new tab with the URL
    const newTab = await chrome.tabs.create({ url: urlInput, active: false })
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 7000))

    // Execute script to extract data
    const result = await chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      function: () => {
  return new Promise<any>(async (resolve) => {
    let name = 'Unknown'
    let title = 'Unknown'
    let company = 'Unknown'
    let timeInCompany = 'Unknown'

    // Extract name from h1
    const nameEl = document.querySelector('h1') as HTMLElement
    if (nameEl) {
      name = nameEl.textContent?.trim() || 'Unknown'
    }

    // Find experience section
    const findExperienceSection = () => {
      const sections = document.querySelectorAll('section')
      for (const section of sections) {
        const heading = section.querySelector('h2')
        if (heading && heading.innerText.toLowerCase().includes('experience')) {
          return section
        }
      }
      
      const cards = document.querySelectorAll('.artdeco-card.pv-profile-card')
      for (const card of cards) {
        const cardEl = card as HTMLElement
        if (cardEl.innerText.toLowerCase().includes('experience')) {
          return card
        }
      }
      
      return null
    }

    let experienceSection = findExperienceSection()
    
    if (!experienceSection) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        experienceSection = findExperienceSection()
        if (experienceSection) break
      }
    }

    if (experienceSection) {
      const sectionEl = experienceSection as HTMLElement
      const sectionText = sectionEl.innerText || sectionEl.textContent || ''
      const lines = sectionText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      
      let expHeaderIndex = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase() === 'experience') {
          expHeaderIndex = i
          break
        }
      }
      
      if (expHeaderIndex !== -1) {
        let validLines: string[] = []
        
        // Collect valid lines after Experience header, skipping junk
        for (let i = expHeaderIndex + 1; i < lines.length; i++) {
          const line = lines[i]
          
          // Skip very short lines, "logo" text, and section headers
          if (
            line.length < 2 || 
            line.toLowerCase().includes('logo') ||
            line.toLowerCase() === 'education' ||
            line.toLowerCase() === 'skills'
          ) {
            continue
          }
          
          validLines.push(line)
          
          // Stop when we hit next section
          if (line.toLowerCase() === 'education' || line.toLowerCase() === 'skills') {
            break
          }
        }
        
        // Extract from valid lines
        if (validLines.length > 0) title = validLines[0]
        if (validLines.length > 1) company = validLines[1]
        if (validLines.length > 2) timeInCompany = validLines[2]
      }
    }

    resolve({
      name,
      company,
      title,
      timeInCompany,
      extractedAt: new Date().toISOString(),
    })
  })
},
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
    console.error('Extraction error:', error)
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

// function waitForExperienceSection(timeout = 7000) {
//   return new Promise<Element | null>((resolve) => {
//     const findSection = () => {
//       // Look for section with h2 containing "Experience"
//       const sections = document.querySelectorAll('section')
//       for (const section of sections) {
//         const heading = section.querySelector('h2')
//         if (heading && heading.innerText.toLowerCase().includes('experience')) {
//           return section
//         }
//       }
      
//       // Also look for the artdeco-card with experience
//       const cards = document.querySelectorAll('.artdeco-card.pv-profile-card')
//       for (const card of cards) {
//         const cardEl = card as HTMLElement
//         if (cardEl.innerText.toLowerCase().includes('experience')) {
//           return card
//         }
//       }
      
//       return null
//     }

//     const existing = findSection()
//     if (existing) return resolve(existing)

//     const observer = new MutationObserver(() => {
//       const section = findSection()
//       if (section) {
//         observer.disconnect()
//         resolve(section)
//       }
//     })

//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//     })

//     setTimeout(() => {
//       observer.disconnect()
//       const section = findSection()
//       resolve(section)
//     }, timeout)
//   })
// }

// async function extractProfileData() {
//   let name = 'Unknown'
//   let title = 'Unknown'
//   let company = 'Unknown'
//   let timeInCompany = 'Unknown'

//   console.log('=== Starting extraction ===')

//   // Extract name from h1
//   const nameEl = document.querySelector('h1') as HTMLElement
//   if (nameEl) {
//     name = nameEl.textContent?.trim() || 'Unknown'
//     console.log('Name:', name)
//   }

//   // Wait for experience section to load
//   console.log('Waiting for experience section...')
//   const experienceSection = await waitForExperienceSection(7000)

//   if (experienceSection) {
//     console.log('Experience section found!')
    
//     const sectionEl = experienceSection as HTMLElement
//     const sectionText = sectionEl.innerText || sectionEl.textContent || ''
//     const lines = sectionText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
    
//     console.log('=== Experience Section Lines ===')
//     lines.forEach((line: string, i: number) => {
//       console.log(`${i}: "${line}"`)
//     })
    
//     // Find Experience header
//     let expHeaderIndex = -1
//     for (let i = 0; i < lines.length; i++) {
//       if (lines[i].toLowerCase() === 'experience') {
//         expHeaderIndex = i
//         console.log('Experience header at index:', i)
//         break
//       }
//     }
    
//     // Extract from lines after Experience header
//     if (expHeaderIndex !== -1) {
//       let lineCounter = 0
      
//       // Get next non-empty lines
//       for (let i = expHeaderIndex + 1; i < lines.length && lineCounter < 3; i++) {
//         const line = lines[i]
        
//         // Skip empty or very short lines
//         if (line.length < 2) continue
        
//         // Stop if we hit another section
//         if (line.toLowerCase() === 'education' || line.toLowerCase() === 'skills') break
        
//         if (lineCounter === 0) {
//           title = line
//           console.log('Title:', title)
//         } else if (lineCounter === 1) {
//           company = line
//           console.log('Company:', company)
//         } else if (lineCounter === 2) {
//           timeInCompany = line
//           console.log('Duration:', timeInCompany)
//         }
        
//         lineCounter++
//       }
//     }
//   } else {
//     console.log('Experience section NOT found after waiting')
//   }

//   console.log('=== Final Result ===')
//   console.log({ name, title, company, timeInCompany })

//   return {
//     name,
//     company,
//     title,
//     timeInCompany,
//     extractedAt: new Date().toISOString(),
//   }
// }