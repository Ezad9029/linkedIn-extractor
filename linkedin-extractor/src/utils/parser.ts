/**
 * DOM Parser Utility
 * Extracts LinkedIn profile data from the page DOM
 */

export interface LinkedInProfile {
  name: string
  title: string
  company: string
  location: string
  bio: string
  skills: string[]
  experience: Experience[]
  education: Education[]
  extractedAt: string
}

export interface Experience {
  title: string
  company: string
  duration: string
}

export interface Education {
  school: string
  degree: string
  field: string
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

  const title = getTextContent([
    '[data-test-id="top-card-headline"] span',
    '[class*="headline"]',
    '.text-body-medium',
  ])

  const location = getTextContent([
    '[data-test-id="top-card-subline-one"]',
    '[class*="location"]',
  ])

  // Extract bio/about section
  const bio = getTextContent([
    '[data-test-id="about"]',
    '[class*="about"]',
    'section.show-more-less-html__markup',
  ])

  // Extract company from experience or top card
  const company = extractCompany()

  // Extract skills
  const skills = extractSkills()

  // Extract experience
  const experience = extractExperience()

  // Extract education
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

/**
 * Extract company from various LinkedIn selectors
 */
const extractCompany = (): string => {
  // Try to get from experience section first
  const experienceTitle = getTextContent(['[data-test-id="experience-section"] li:first-child a'])
  if (experienceTitle) {
    return experienceTitle
  }

  // Try from company links
  const companyLink = Array.from(document.querySelectorAll('a[href*="/company/"]'))
    .map((el) => el.textContent?.trim())
    .filter(Boolean)[0]

  return companyLink || ''
}

/**
 * Extract all skills from the page
 */
const extractSkills = (): string[] => {
  const skills = new Set<string>()

  // Try multiple selectors for skills
  const skillSelectors = [
    '[data-test-id*="skill"]',
    '[class*="skill"]',
    '.pvs-list__outer-container [data-test-id*="endorsement"]',
  ]

  for (const selector of skillSelectors) {
    getMultipleTexts(selector).forEach((skill) => {
      if (skill.length > 0 && skill.length < 50) {
        // Filter out very long texts (likely not skills)
        skills.add(skill)
      }
    })
  }

  return Array.from(skills).slice(0, 20) // Limit to top 20 skills
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
 * Extract education from education section
 */
const extractEducation = (): Education[] => {
  const educations: Education[] = []

  const educationItems = document.querySelectorAll('[data-test-id="education-section"] li')

  educationItems.forEach((item) => {
    const schoolEl = item.querySelector('[data-test-id*="school"]')
    const degreeEl = item.querySelector('[data-test-id*="degree"]')
    const fieldEl = item.querySelector('[data-test-id*="field"]')

    const education: Education = {
      school: schoolEl?.textContent?.trim() || '',
      degree: degreeEl?.textContent?.trim() || '',
      field: fieldEl?.textContent?.trim() || '',
    }

    if (education.school) {
      educations.push(education)
    }
  })

  return educations.slice(0, 3) // Limit to 3 most recent
}

/**
 * Validate extracted profile has minimum required fields
 */
export const validateProfile = (profile: LinkedInProfile): boolean => {
  return profile.name.length > 0 && (profile.title.length > 0 || profile.company.length > 0)
}