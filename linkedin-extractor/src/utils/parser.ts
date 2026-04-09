/**
 * DOM Parser Utility
 * Extracts LinkedIn profile data from the page DOM
 */

export interface LinkedInProfile {
  name: string
  company: string
  title: string
  timeInCompany: string
  extractedAt: string
}


/**
 * Get text content from DOM with fallback selectors
 */
const getTextContent = (selectors: string[]): string => {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    const text = element?.textContent?.trim()
    if (text && text.length > 0) {
      return text
    }
  }
  return ''
}

/**
 * Extract all text from multiple elements and join
 */
const getMultipleTexts = (selector: string): string[] => {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => el.textContent?.trim())
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
}

/**
 * Main function to extract all LinkedIn profile data
 */
export const extractProfileData = (): LinkedInProfile => {
  const name = getTextContent([
    'h1',
    '[data-test-id="top-card-title"]',
    '[class*="profile-title"]',
  ])

  // Extract experience - first entry is current company
  const experience = extractExperience()

  // Current company (first in experience list)
  const company = experience.length > 0 ? experience[0].company : ''

  // Current title (first in experience list)
  const title = experience.length > 0 ? experience[0].title : ''

  // Time in current organisation (first in experience list)
  const timeInCompany = experience.length > 0 ? experience[0].duration : ''

  return {
    name,
    company,
    title,
    timeInCompany,
    extractedAt: new Date().toISOString(),
  }
}



interface Experience {
  title: string
  company: string
  duration: string
}

/**
 * Extract experience from experience section
 */
const extractExperience = (): Experience[] => {
  const experiences: Experience[] = []

  const experienceItems = document.querySelectorAll('[data-test-id="experience-section"] li')

  experienceItems.forEach((item) => {
    const titleEl = item.querySelector('[data-test-id*="title"]')
    const companyEl = item.querySelector('[data-test-id*="company"]')
    const durationEl = item.querySelector('[data-test-id*="duration"]')

    const experience: Experience = {
      title: titleEl?.textContent?.trim() || '',
      company: companyEl?.textContent?.trim() || '',
      duration: durationEl?.textContent?.trim() || '',
    }

    if (experience.title && experience.company) {
      experiences.push(experience)
    }
  })

  return experiences.slice(0, 5) // Limit to 5 most recent
}


/**
 * Validate extracted profile has minimum required fields
 */
export const validateProfile = (profile: LinkedInProfile): boolean => {
  return profile.name.length > 0 && (profile.title.length > 0 || profile.company.length > 0)
}