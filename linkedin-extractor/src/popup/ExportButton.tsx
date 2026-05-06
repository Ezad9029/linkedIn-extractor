import { useState } from 'react'
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

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const filename = `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.xlsx`
      exportProfilesToExcel(profiles, filename)
      showMessage('Exported to Excel', 'success')
      onExport?.()
    } catch (error) {
      showMessage(`Export failed: ${error}`, 'error')
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      exportProfilesToCSV(profiles)
      showMessage('Exported to CSV', 'success')
      onExport?.()
    } catch (error) {
      showMessage(`Export failed: ${error}`, 'error')
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
      >
        {exporting ? '⏳' : '📊'} Export
      </button>

      {showMenu && (
        <div className="export-menu">
          <button className="export-menu-item" onClick={handleExportExcel} disabled={exporting}>
            📋 Excel
          </button>
          <button className="export-menu-item" onClick={handleExportCSV} disabled={exporting}>
            📄 CSV
          </button>
        </div>
      )}
    </div>
  )
}