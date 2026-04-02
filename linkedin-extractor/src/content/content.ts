/**
 * Content Script - LinkedIn Profile Extractor
 * Runs on LinkedIn profile pages to extract profile data
 */

console.log('[LinkedIn Extractor] Content script loaded')

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProfile') {
    try {
      const profileData = extractProfileFromPage()
      sendResponse({ success: true, data: profileData })
    } catch (error) {
      console.error('[LinkedIn Extractor] Extraction error:', error)
      sendResponse({ success: false, error: error.message })
    }
  }
})

/**
 * Utility: Get text content from DOM with fallback selectors
 */
function getTextContent(selectors) {
  if (typeof selectors === 'string') {
    selectors = [selectors]
  }

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      const text = element?.textContent?.trim()
      if (text && text.length > 0) {
        return text
      }
    } catch (e) {
      // Skip invalid selectors
    }
  }
  return ''
}

/**
 * Utility: Get multiple text values from DOM
 */
function getMultipleTexts(selector) {
  try {
    return Array.from(document.querySelectorAll(selector))
      .map((el) => el.textContent?.trim())
      .filter((text) => text && text.length > 0)
  } catch (e) {
    return []
  }
}

/**
 * Extract company from various selectors
 */
function extractCompany() {
  // Try experience section first
  const expCompany = getTextContent('[data-test-id="experience-section"] li:first-child a')
  if (expCompany) return expCompany

  // Try company links
  const companyLinks = Array.from(document.querySelectorAll('a[href*="/company/"]'))
    .map((el) => el.textContent?.trim())
    .filter(Boolean)
  return companyLinks[0] || ''
}

/**
 * Extract skills from the page
 */
function extractSkills() {
  const skills = new Set()

  // Try multiple skill selectors
  const skillSelectors = [
    '[data-test-id*="skill"]',
    '[class*="skill"]',
    '.pvs-list__outer-container [data-test-id*="endorsement"]',
  ]

  for (const selector of skillSelectors) {
    getMultipleTexts(selector).forEach((skill) => {
      if (skill.length > 0 && skill.length < 50) {
        skills.add(skill)
      }
    })
  }

  return Array.from(skills).slice(0, 20) // Top 20 skills
}

/**
 * Extract experience section
 */
function extractExperience() {
  const experiences = []
  const items = document.querySelectorAll('[data-test-id="experience-section"] li')

  items.forEach((item) => {
    const titleEl = item.querySelector('[data-test-id*="title"]')
    const companyEl = item.querySelector('[data-test-id*="company"]')
    const durationEl = item.querySelector('[data-test-id*="duration"]')

    const experience = {
      title: titleEl?.textContent?.trim() || '',
      company: companyEl?.textContent?.trim() || '',
      duration: durationEl?.textContent?.trim() || '',
    }

    if (experience.title && experience.company) {
      experiences.push(experience)
    }
  })

  return experiences.slice(0, 5)
}

/**
 * Extract education section
 */
function extractEducation() {
  const educations = []
  const items = document.querySelectorAll('[data-test-id="education-section"] li')

  items.forEach((item) => {
    const schoolEl = item.querySelector('[data-test-id*="school"]')
    const degreeEl = item.querySelector('[data-test-id*="degree"]')
    const fieldEl = item.querySelector('[data-test-id*="field"]')

    const education = {
      school: schoolEl?.textContent?.trim() || '',
      degree: degreeEl?.textContent?.trim() || '',
      field: fieldEl?.textContent?.trim() || '',
    }

    if (education.school) {
      educations.push(education)
    }
  })

  return educations.slice(0, 3)
}

/**
 * Main extraction function
 */
function extractProfileFromPage() {
  // Basic info
  const name = getTextContent(['h1', '[data-test-id="top-card-title"]'])
  const title = getTextContent([
    '[data-test-id="top-card-headline"] span',
    '[class*="headline"]',
  ])
  const location = getTextContent(['[data-test-id="top-card-subline-one"]'])
  const company = extractCompany()

  // Bio/About
  const bio = getTextContent([
    '[data-test-id="about"]',
    '[class*="about"]',
    'section.show-more-less-html__markup',
  ])

  // Collections
  const skills = extractSkills()
  const experience = extractExperience()
  const education = extractEducation()

  return {
    name,
    title,
    company,
    location,
    bio,
    skills,
    experience,
    education,
    extractedAt: new Date().toISOString(),
  }
}