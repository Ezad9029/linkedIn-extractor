import * as XLSX from 'xlsx'
import type { LinkedInProfile } from './parser'

export const exportProfilesToExcel = (profiles: (LinkedInProfile & { id: string })[], filename: string) => {
  const data = profiles.map((profile) => ({
    Name: profile.name,
    Company: profile.company,
    Title: profile.title,
    'Time in Company': profile.timeInCompany,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Profiles')
  XLSX.writeFile(wb, filename)
}

export const exportProfilesToCSV = (profiles: (LinkedInProfile & { id: string })[]) => {
  const csvContent = [
    ['Name', 'Company', 'Title', 'Time in Company'],
    ...profiles.map((p) => [p.name, p.company, p.title, p.timeInCompany]),
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `LinkedIn_Profiles_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}