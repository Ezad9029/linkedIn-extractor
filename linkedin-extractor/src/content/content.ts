/**
 * Content Script - LinkedIn Profile Extractor
 */

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extractProfile') {
    try {
      const profileData = extractProfileFromPage()
      sendResponse({ success: true, data: profileData })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      sendResponse({ success: false, error: errorMessage })
    }
  }
})

function getTextContent(selectors: string | string[]): string {
  if (typeof selectors === 'string') {
    selectors = [selectors]
  }

  for (const selector of selectors as string[]) {
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

function extractExperience(): Array<{ title: string; company: string; duration: string }> {
  const experiences: Array<{ title: string; company: string; duration: string }> = []
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

function extractProfileFromPage() {
  const name = getTextContent(['h1', '[data-test-id="top-card-title"]'])
  
  const experience = extractExperience()
  
  const company = experience.length > 0 ? experience[0].company : ''
  const title = experience.length > 0 ? experience[0].title : ''
  const timeInCompany = experience.length > 0 ? experience[0].duration : ''

  return {
    name,
    company,
    title,
    timeInCompany,
    extractedAt: new Date().toISOString(),
  }
}
