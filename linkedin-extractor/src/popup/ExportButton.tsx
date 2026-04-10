import { useState } from 'react'
import * as XLSX from 'xlsx'
import './ExportButton.css'
import type { LinkedInProfile } from '../utils/parser'
import { exportProfilesToExcel, exportProfilesToCSV } from '../utils/excelExporter'

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
      const filename = `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.xlsx`
      exportProfilesToExcel(profiles, filename)
      onExport?.()
      showMessage('Exported to Excel successfully', 'success')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      showMessage(`Export failed: ${errorMsg}`, 'error')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      exportProfilesToCSV(profiles)
      onExport?.()
      showMessage('Exported to CSV successfully', 'success')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      showMessage(`Export failed: ${errorMsg}`, 'error')
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