import { useState } from 'react'
import * as XLSX from 'xlsx'
import './ExportButton.css'
import type { LinkedInProfile } from '../utils/parser'

interface ExportButtonProps {
  profiles: (LinkedInProfile & { id: string })[]
  onExport?: () => void
}

export default function ExportButton({ profiles, onExport }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const formatProfileForExcel = (profile: LinkedInProfile) => {
    return {
      Name: profile.name,
      Title: profile.title,
      Company: profile.company,
      Location: profile.location,
      'Top 5 Skills': profile.skills.slice(0, 5).join('; '),
      'All Skills': profile.skills.join('; '),
      Bio: profile.bio,
      'Experience Count': profile.experience.length,
      'Education Count': profile.education.length,
      'Extracted At': new Date(profile.extractedAt).toLocaleString('en-IN'),
    }
  }

  const exportBasicExcel = async () => {
    setExporting(true)
    try {
      const data = profiles.map(formatProfileForExcel)
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Profiles')

      // Set column widths
      ws['!cols'] = [20, 25, 25, 20, 35, 50, 50, 12, 12, 20].map((w) => ({
        wch: w,
      }))

      const filename = `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, filename)

      onExport?.()
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export to Excel')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportDetailedExcel = async () => {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Profiles summary
      const profileData = profiles.map(formatProfileForExcel)
      const wsProfiles = XLSX.utils.json_to_sheet(profileData)
      wsProfiles['!cols'] = [20, 25, 25, 20, 35, 50, 50, 12, 12, 20].map((w) => ({
        wch: w,
      }))
      XLSX.utils.book_append_sheet(wb, wsProfiles, 'Profiles')

      // Sheet 2: Experience details
      const experienceData: any[] = []
      profiles.forEach((profile) => {
        profile.experience.forEach((exp, idx) => {
          experienceData.push({
            'Profile Name': profile.name,
            'Job Title': exp.title,
            Company: exp.company,
            Duration: exp.duration,
            'Order': idx + 1,
          })
        })
      })

      if (experienceData.length > 0) {
        const wsExp = XLSX.utils.json_to_sheet(experienceData)
        wsExp['!cols'] = [20, 25, 25, 20, 8].map((w) => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsExp, 'Experience')
      }

      // Sheet 3: Education details
      const educationData: any[] = []
      profiles.forEach((profile) => {
        profile.education.forEach((edu, idx) => {
          educationData.push({
            'Profile Name': profile.name,
            School: edu.school,
            Degree: edu.degree,
            'Field of Study': edu.field,
            Order: idx + 1,
          })
        })
      })

      if (educationData.length > 0) {
        const wsEdu = XLSX.utils.json_to_sheet(educationData)
        wsEdu['!cols'] = [20, 25, 20, 25, 8].map((w) => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsEdu, 'Education')
      }

      // Sheet 4: Skills frequency
      const skillsMap = new Map<string, number>()
      profiles.forEach((profile) => {
        profile.skills.forEach((skill) => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1)
        })
      })

      const skillsData = Array.from(skillsMap.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([skill, count]) => ({
          Skill: skill,
          Frequency: count,
          'In % of Profiles': `${((count / profiles.length) * 100).toFixed(1)}%`,
        }))

      const wsSkills = XLSX.utils.json_to_sheet(skillsData)
      wsSkills['!cols'] = [30, 10, 15].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, wsSkills, 'Skills Summary')

      const filename = `LinkedIn_Profiles_Detailed_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, filename)

      onExport?.()
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export detailed Excel')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const data = profiles.map(formatProfileForExcel)
      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onExport?.()
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export to CSV')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  return (
    <div className="export-container">
      <button
        className="export-btn"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        title="Export profiles to Excel or CSV"
      >
        {exporting ? '⏳ Exporting...' : '📊 Export'}
      </button>

      {showMenu && (
        <div className="export-menu">
          <button
            className="export-menu-item"
            onClick={exportBasicExcel}
            disabled={exporting}
          >
            📋 Basic Excel (.xlsx)
          </button>
          <button
            className="export-menu-item"
            onClick={exportDetailedExcel}
            disabled={exporting}
          >
            📑 Detailed Excel (4 sheets)
          </button>
          <button
            className="export-menu-item"
            onClick={exportCSV}
            disabled={exporting}
          >
            📄 CSV Format
          </button>
        </div>
      )}
    </div>
  )
}