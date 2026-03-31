import { useCallback, useEffect, useState } from 'react'
import { Download, FileText, CalendarDays } from 'lucide-react'
import { getClasses } from '../../services/classService.js'
import { getSubjects } from '../../services/grade.service.js'
import { exportGradesReportXlsx, exportAttendanceReportXlsx } from '../../services/adminService.js'

function dateInputValue(d = new Date()) {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

export default function AdminReports() {
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [classId, setClassId] = useState('')

  const [reportType, setReportType] = useState('grades') // grades | attendance

  const [subjects, setSubjects] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectId, setSubjectId] = useState('')

  const [from, setFrom] = useState(dateInputValue(new Date(Date.now() - 30 * 86400_000)))
  const [to, setTo] = useState(dateInputValue())

  const loadClasses = useCallback(async () => {
    setClassesLoading(true)
    try {
      const d = await getClasses()
      setClasses(Array.isArray(d) ? d : [])
    } catch {
      setClasses([])
    } finally {
      setClassesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    if (!classesLoading && !classId && classes.length) setClassId(classes[0]._id)
  }, [classesLoading, classes, classId])

  useEffect(() => {
    if (reportType !== 'grades') return
    if (!classId) return
    ;(async () => {
      setSubjectsLoading(true)
      try {
        const d = await getSubjects(classId)
        const list = Array.isArray(d?.subjects) ? d.subjects : Array.isArray(d) ? d : []
        setSubjects(list)
        setSubjectId(list?.[0]?._id ?? '')
      } catch {
        setSubjects([])
        setSubjectId('')
      } finally {
        setSubjectsLoading(false)
      }
    })()
  }, [reportType, classId])

  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function handleExport() {
    setError('')
    try {
      if (!classId) throw new Error('Select a class first')
      if (reportType === 'grades') {
        if (!subjectId) throw new Error('Select a subject first')
        const blob = await exportGradesReportXlsx({ classId, subjectId, from, to })
        await downloadBlob(blob, 'grades_report.xlsx')
      } else {
        const blob = await exportAttendanceReportXlsx({ classId, from, to })
        await downloadBlob(blob, 'attendance_report.xlsx')
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Export failed')
    }
  }

  const typeLabel = reportType === 'grades' ? 'Grades' : 'Attendance'
  const typeIcon = reportType === 'grades' ? <FileText className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Download Excel exports for grades and attendance.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 w-fit"
        >
          <Download className="w-4 h-4" />
          Export {typeLabel} (XLSX)
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {typeIcon}
            <span className="font-medium">Report type</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReportType('grades')}
              className={`px-3 py-2 rounded-xl border ${
                reportType === 'grades' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-background'
              }`}
            >
              Grades
            </button>
            <button
              type="button"
              onClick={() => setReportType('attendance')}
              className={`px-3 py-2 rounded-xl border ${
                reportType === 'attendance' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-background'
              }`}
            >
              Attendance
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Class</span>
            <select
              value={classId}
              disabled={classesLoading}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {reportType === 'grades' ? (
            <label className="block">
              <span className="text-sm font-medium">Subject</span>
              <select
                value={subjectId}
                disabled={subjectsLoading || !classId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
              >
                {(subjects ?? []).map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background" />
          </label>
        </div>

        <div className="text-sm text-muted-foreground">
          Exports use your backend report filters (XLSX).
        </div>
      </div>
    </div>
  )
}

