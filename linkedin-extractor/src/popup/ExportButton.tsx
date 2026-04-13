import { useState } from 'react'
import * as XLSX from 'xlsx'
import './ExportButton.css'
import type { LinkedInProfile } from '../utils/parser'

interface ExportButtonProps {
  profiles: (LinkedInProfile & { id: string })[]
  onExport?: () => void
  showMessage: (text: string, type: 'success' | 'error' | 'info') => void
}

export default function ExportButton({ profiles, onExport, showMessage }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const formatProfileForExcel = (profile: LinkedInProfile) => {
    return {
      Name: profile.name,
      Company: profile.company,
      Title: profile.title,
      'Time in Company': profile.timeInCompany,
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
      ws['!cols'] = [20, 20, 20, 20, 20].map((w) => ({
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