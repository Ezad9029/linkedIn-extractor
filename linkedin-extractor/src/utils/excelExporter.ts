/**
 * Excel Exporter Utility
 * Exports extracted LinkedIn profiles to Excel format
 */

import * as XLSX from 'xlsx'
import type { LinkedInProfile, Experience, Education } from './parser'

export interface ExportOptions {
  includeExperience?: boolean
  includeEducation?: boolean
  filename?: string
}

/**
 * Transform single profile to Excel row format
 */
const profileToExcelRow = (profile: LinkedInProfile) => {
  return {
    Name: profile.name,
    Title: profile.title,
    Company: profile.company,
    Location: profile.location,
    'Top Skills': profile.skills.slice(0, 5).join('; '),
    'All Skills': profile.skills.join('; '),
    Bio: profile.bio,
    'Extracted At': profile.extractedAt,
  }
}

/**
 * Transform experience array to Excel row format
 */
const experienceToExcelRows = (
  experience: Experience[],
  profileName: string
) => {
  return experience.map((exp, idx) => ({
    'Profile Name': profileName,
    'Entry Type': 'Experience',
    'Job Title': exp.title,
    'Company': exp.company,
    'Duration': exp.duration,
    'Order': idx + 1,
  }))
}

/**
 * Transform education array to Excel row format
 */
const educationToExcelRows = (
  education: Education[],
  profileName: string
) => {
  return education.map((edu, idx) => ({
    'Profile Name': profileName,
    'Entry Type': 'Education',
    'School': edu.school,
    'Degree': edu.degree,
    'Field of Study': edu.field,
    'Order': idx + 1,
  }))
}

/**
 * Export single profile to Excel
 */
export const exportSingleProfileToExcel = (
  profile: LinkedInProfile,
  filename?: string
) => {
  const data = [profileToExcelRow(profile)]
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Profile')

  // Auto-fit column widths
  const colWidths = [20, 25, 25, 20, 30, 40, 50, 20]
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))

  const file = filename || `LinkedIn_Profile_${profile.name.replace(/\s+/g, '_')}.xlsx`
  XLSX.writeFile(wb, file)
}

/**
 * Export multiple profiles to Excel with summary sheet
 */
export const exportMultipleProfilesToExcel = (
  profiles: LinkedInProfile[],
  options: ExportOptions = {}
) => {
  const {
    includeExperience = true,
    includeEducation = true,
    filename = `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.xlsx`,
  } = options

  const wb = XLSX.utils.book_new()

  // Sheet 1: Profiles Summary
  const profilesData = profiles.map(profileToExcelRow)
  const wsProfiles = XLSX.utils.json_to_sheet(profilesData)
  wsProfiles['!cols'] = [20, 25, 25, 20, 30, 40, 50, 20].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsProfiles, 'Profiles')

  // Sheet 2: All Experience (if enabled)
  if (includeExperience) {
    const experienceData: any[] = []
    profiles.forEach((profile) => {
      experienceData.push(
        ...experienceToExcelRows(profile.experience, profile.name)
      )
    })

    if (experienceData.length > 0) {
      const wsExperience = XLSX.utils.json_to_sheet(experienceData)
      wsExperience['!cols'] = [20, 15, 25, 25, 20, 10].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, wsExperience, 'Experience')
    }
  }

  // Sheet 3: All Education (if enabled)
  if (includeEducation) {
    const educationData: any[] = []
    profiles.forEach((profile) => {
      educationData.push(
        ...educationToExcelRows(profile.education, profile.name)
      )
    })

    if (educationData.length > 0) {
      const wsEducation = XLSX.utils.json_to_sheet(educationData)
      wsEducation['!cols'] = [20, 15, 20, 20, 20, 10].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, wsEducation, 'Education')
    }
  }

  // Sheet 4: Skills Summary
  const skillsMap = new Map<string, number>()
  profiles.forEach((profile) => {
    profile.skills.forEach((skill) => {
      skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1)
    })
  })

  const skillsData = Array.from(skillsMap.entries())
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([skill, count]) => ({
      'Skill': skill,
      'Frequency': count,
      'Found in % Profiles': `${((count / profiles.length) * 100).toFixed(1)}%`,
    }))

  const wsSkills = XLSX.utils.json_to_sheet(skillsData)
  wsSkills['!cols'] = [30, 10, 20].map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsSkills, 'Skills Summary')

  XLSX.writeFile(wb, filename)
}

/**
 * Export profiles to CSV format
 */
export const exportProfilesToCSV = (
  profiles: LinkedInProfile[],
  filename?: string
) => {
  const data = profiles.map(profileToExcelRow)
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Profiles')

  const file = filename || `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.csv`
  XLSX.writeFile(wb, file)
}

/**
 * Export profiles to JSON format
 */
export const exportProfilesToJSON = (
  profiles: LinkedInProfile[],
  filename?: string
) => {
  const dataStr = JSON.stringify(profiles, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}