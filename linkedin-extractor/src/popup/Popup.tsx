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
  const [debugInfo, setDebugInfo] = useState<string>('')

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
    setDebugInfo('')
    showMessage('Fetching profile...', 'info')

    try {
      const newTab = await chrome.tabs.create({ url: urlInput, active: false })
      
      await new Promise(resolve => setTimeout(resolve, 7000))

      const result = await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        function: () => {
          return new Promise<any>(async (resolve) => {
            let name = 'Unknown'
            let title = 'Unknown'
            let company = 'Unknown'
            let timeInCompany = 'Unknown'
            let debugOutput = ''

            // Extract name
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
              
              debugOutput += 'ALL LINES:\n'
              lines.forEach((line: string, i: number) => {
                debugOutput += `[${i}]: "${line}"\n`
              })
              
              let expHeaderIndex = -1
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase() === 'experience') {
                  expHeaderIndex = i
                  break
                }
              }
              
              if (expHeaderIndex !== -1) {
                debugOutput += `\nExperience header at: ${expHeaderIndex}\n`
                debugOutput += 'NEXT 15 LINES:\n'
                
                const nextLines = []
                for (let i = expHeaderIndex + 1; i < Math.min(expHeaderIndex + 16, lines.length); i++) {
                  nextLines.push(lines[i])
                  debugOutput += `[${i}]: "${lines[i]}"\n`
                }
                
                // Filter valid lines and remove duplicates
                debugOutput += '\nFILTERED LINES:\n'
                const seenLines = new Set<string>()
                const validLines = nextLines.filter((line: string) => {
                  if (line.toLowerCase() === 'experience') {
                    debugOutput += `✗ SKIP: "${line}" (Experience header)\n`
                    return false
                  }
                  if (line.length < 2) {
                    debugOutput += `✗ SKIP: "${line}" (too short)\n`
                    return false
                  }
                  if (line.toLowerCase() === 'education' || line.toLowerCase() === 'skills') {
                    debugOutput += `✗ SKIP: "${line}" (section header)\n`
                    return false
                  }
                  if (line.length > 150 || line.includes('→') || line.includes('see more')) {
                    debugOutput += `✗ SKIP: "${line}" (description)\n`
                    return false
                  }
                  // Skip if we've already seen this exact line
                  if (seenLines.has(line)) {
                    debugOutput += `✗ SKIP: "${line}" (duplicate)\n`
                    return false
                  }
                  seenLines.add(line)
                  debugOutput += `✓ KEEP: "${line}"\n`
                  return true
                })
                
                if (validLines.length > 0) title = validLines[0]
                if (validLines.length > 1) company = validLines[1]
                if (validLines.length > 2) timeInCompany = validLines[2]
                
                debugOutput += `\nRESULT:\nTitle: "${title}"\nCompany: "${company}"\nDuration: "${timeInCompany}"`
              }
            }

            resolve({
              name,
              company,
              title,
              timeInCompany,
              extractedAt: new Date().toISOString(),
              debugOutput,
            })
          })
        },
      })

      chrome.tabs.remove(newTab.id)

      if (result?.[0]?.result) {
        const profileData = result[0].result as any
        
        setDebugInfo(profileData.debugOutput || '')

        const newProfile: StoredProfile = {
          name: profileData.name,
          company: profileData.company,
          title: profileData.title,
          timeInCompany: profileData.timeInCompany,
          extractedAt: profileData.extractedAt,
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

        {debugInfo && (
          <div style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#333',
          }}>
            {debugInfo}
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