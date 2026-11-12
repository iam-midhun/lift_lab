import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, CalendarDays, Check, ChevronLeft,
  ChevronRight, Dumbbell, Plus, RefreshCw, Scale, Target, Trash2, X
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import './BodyAttendancePage.css'

const ATTENDANCE_OPTIONS = [
  { value: 'gym', label: 'Gym completed', short: 'Gym' },
  { value: 'rest', label: 'Rest day', short: 'Rest' },
  { value: 'skipped', label: 'Skipped', short: 'Skipped' },
  { value: 'planned', label: 'Planned', short: 'Planned' },
]

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateKey(value)
    : new Date(value)
  return date.toLocaleDateString('en-IN', options)
}

function getMonthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="ba-stat-card">
      <span className="ba-stat-icon"><Icon size={19} /></span>
      <div className="ba-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

export default function BodyAttendancePage({ user }) {
  const userId = user?.id
  const [weights, setWeights] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [weightValue, setWeightValue] = useState('')
  const [weightDate, setWeightDate] = useState(localDateKey(new Date()))
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [chartRange, setChartRange] = useState('90')
  const [deleteWeight, setDeleteWeight] = useState(null)

  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('gym')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [confirmClearAttendance, setConfirmClearAttendance] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (!userId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const [weightResult, attendanceResult] = await Promise.all([
        supabase.from('body_weight_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
        supabase.from('gym_attendance').select('*').eq('user_id', userId).order('attendance_date', { ascending: false }),
      ])

      if (weightResult.error) throw weightResult.error
      if (attendanceResult.error) throw attendanceResult.error
      setWeights(weightResult.data || [])
      setAttendance(attendanceResult.data || [])
    } catch (err) {
      console.error('Body and attendance loading error:', err)
      setError(err.message || 'Unable to load body and attendance data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  // Initial data load is intentionally triggered when the signed-in user changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  const orderedWeights = useMemo(
    () => [...weights].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)),
    [weights]
  )

  const chartWeights = useMemo(() => {
    if (chartRange === 'all') return orderedWeights
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - Number(chartRange))
    return orderedWeights.filter(item => new Date(item.logged_at) >= cutoff)
  }, [orderedWeights, chartRange])

  const chartData = useMemo(() => chartWeights.map(item => ({
    date: formatDate(item.logged_at, { day: '2-digit', month: 'short' }),
    weight: Number(item.weight_kg),
  })), [chartWeights])

  const latestWeight = orderedWeights.at(-1)
  const firstWeight = orderedWeights[0]
  const weightChange = latestWeight && firstWeight
    ? Number(latestWeight.weight_kg) - Number(firstWeight.weight_kg)
    : 0

  const attendanceByDate = useMemo(() => {
    const map = new Map()
    attendance.forEach(item => map.set(item.attendance_date, item))
    return map
  }, [attendance])

  const currentMonthStats = useMemo(() => {
    const today = new Date()
    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const thisMonth = attendance.filter(item => item.attendance_date.startsWith(monthPrefix))
    const gymDays = thisMonth.filter(item => item.status === 'gym').length
    const tracked = thisMonth.filter(item => ['gym', 'skipped'].includes(item.status)).length
    const rate = tracked ? Math.round((gymDays / tracked) * 100) : 0

    let streak = 0
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (!attendanceByDate.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (true) {
      const record = attendanceByDate.get(localDateKey(cursor))
      if (record?.status !== 'gym') break
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return { gymDays, rate, streak }
  }, [attendance, attendanceByDate])

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const key = localDateKey(date)
      cells.push({ key, day, record: attendanceByDate.get(key) })
    }
    return cells
  }, [visibleMonth, attendanceByDate])

  const saveWeight = async event => {
    event.preventDefault()
    const value = Number(weightValue)
    if (!Number.isFinite(value) || value < 20 || value > 400) {
      setError('Enter a valid body weight between 20 and 400 kg.')
      return
    }
    setSavingWeight(true)
    setError('')
    const loggedAt = new Date(`${weightDate}T12:00:00`).toISOString()
    const { error: insertError } = await supabase.from('body_weight_logs').insert({
      user_id: userId,
      weight_kg: value,
      logged_at: loggedAt,
      notes: weightNotes.trim() || null,
    })
    setSavingWeight(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setWeightValue('')
    setWeightNotes('')
    await loadData(true)
  }

  const confirmDeleteWeight = async () => {
    if (!deleteWeight) return
    const { error: deleteError } = await supabase.from('body_weight_logs')
      .delete().eq('id', deleteWeight.id).eq('user_id', userId)
    if (deleteError) throw new Error(deleteError.message)
    setDeleteWeight(null)
    await loadData(true)
  }

  const openAttendanceEditor = cell => {
    if (!cell) return
    setSelectedDate(cell.key)
    setSelectedStatus(cell.record?.status || 'gym')
    setAttendanceNotes(cell.record?.notes || '')
  }

  const saveAttendance = async () => {
    if (!selectedDate) return
    setSavingAttendance(true)
    setError('')
    const { error: saveError } = await supabase.from('gym_attendance').upsert({
      user_id: userId,
      attendance_date: selectedDate,
      status: selectedStatus,
      notes: attendanceNotes.trim() || null,
    }, { onConflict: 'user_id,attendance_date' })
    setSavingAttendance(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setSelectedDate('')
    await loadData(true)
  }

  const clearAttendance = async () => {
    if (!selectedDate) return
    setSavingAttendance(true)
    const { error: clearError } = await supabase.from('gym_attendance').delete()
      .eq('user_id', userId).eq('attendance_date', selectedDate)
    setSavingAttendance(false)
    if (clearError) throw new Error(`Unable to clear attendance: ${clearError.message}`)
    setConfirmClearAttendance(false)
    setSelectedDate('')
    await loadData(true)
  }

  if (loading) return <div className="panel ba-loading">Loading body and attendance data...</div>

  return (
    <div className="feature-page ba-page">
      <div className="welcome-row ba-welcome">
        <div>
          <p className="eyebrow">YOUR BODY, YOUR CONSISTENCY</p>
          <h1>Body & Attendance</h1>
          <p className="subtitle">Track your body-weight trend and keep a clear record of your gym routine.</p>
        </div>
        <button className="secondary-button" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'ba-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="ba-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}

      <section className="ba-stats-grid">
        <Stat icon={Scale} label="Current weight" value={latestWeight ? `${Number(latestWeight.weight_kg).toFixed(1)} kg` : '—'} detail={latestWeight ? `Logged ${formatDate(latestWeight.logged_at)}` : 'Add your first entry'} />
        <Stat icon={Activity} label="Overall change" value={latestWeight && firstWeight ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : '—'} detail={weights.length > 1 ? `Across ${weights.length} entries` : 'Need more entries'} />
        <Stat icon={Dumbbell} label="Gym days this month" value={currentMonthStats.gymDays} detail="Completed sessions" />
        <Stat icon={Target} label="Current streak" value={`${currentMonthStats.streak} days`} detail={`${currentMonthStats.rate}% gym attendance rate this month`} />
      </section>

      <div className="ba-main-grid">
        <section className="panel ba-panel ba-weight-panel">
          <div className="ba-section-heading">
            <div><span className="ba-section-icon"><Scale size={18} /></span><div><h2>Body weight</h2><p>Your progress over time</p></div></div>
          </div>

          <form className="ba-weight-form" onSubmit={saveWeight}>
            <label>Weight (kg)<input type="number" min="20" max="400" step="0.1" required value={weightValue} onChange={e => setWeightValue(e.target.value)} placeholder="e.g. 79.5" /></label>
            <label>Date<input type="date" required value={weightDate} max={localDateKey(new Date())} onChange={e => setWeightDate(e.target.value)} /></label>
            <label className="ba-notes-field">Note (optional)<input value={weightNotes} onChange={e => setWeightNotes(e.target.value)} placeholder="Morning, fasted, etc." /></label>
            <button className="primary-button" type="submit" disabled={savingWeight}><Plus size={16} />{savingWeight ? 'Saving...' : 'Add entry'}</button>
          </form>

          <div className="ba-chart-heading"><strong>Weight trend</strong><div className="ba-range-switch">{[{ value: '30', label: '30D' }, { value: '90', label: '90D' }, { value: '365', label: '1Y' }, { value: 'all', label: 'All' }].map(option => <button key={option.value} className={chartRange === option.value ? 'active' : ''} onClick={() => setChartRange(option.value)}>{option.label}</button>)}</div></div>
          {chartData.length > 1 ? (
            <div className="ba-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 14, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} formatter={value => [`${Number(value).toFixed(1)} kg`, 'Weight']} /><Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
          ) : <div className="ba-chart-empty"><Scale size={25} /><strong>{chartData.length ? 'Add another entry to see your trend' : 'Your weight chart will appear here'}</strong><span>Log your weight consistently to see changes over time.</span></div>}

          <div className="ba-history-heading"><strong>Recent entries</strong><span>{weights.length} total</span></div>
          {weights.length ? <div className="ba-weight-history">{weights.slice(0, 8).map(item => <div className="ba-weight-row" key={item.id}><div><strong>{Number(item.weight_kg).toFixed(1)} kg</strong><span>{formatDate(item.logged_at)}</span>{item.notes && <small>{item.notes}</small>}</div><button className="ba-icon-button" onClick={() => setDeleteWeight(item)} aria-label={`Delete ${item.weight_kg} kg entry`}><Trash2 size={16} /></button></div>)}</div> : <p className="ba-muted">No weight entries yet.</p>}
        </section>

        <section className="panel ba-panel ba-attendance-panel">
          <div className="ba-section-heading"><div><span className="ba-section-icon"><CalendarDays size={18} /></span><div><h2>Gym attendance</h2><p>Tap a date to record your day</p></div></div></div>
          <div className="ba-calendar-heading"><button className="ba-icon-button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={19} /></button><strong>{getMonthLabel(visibleMonth)}</strong><button className="ba-icon-button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={19} /></button></div>
          <div className="ba-calendar-grid ba-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="ba-calendar-grid">{calendarCells.map((cell, index) => cell ? <button key={cell.key} className={`ba-calendar-day ${cell.record ? `status-${cell.record.status}` : ''} ${cell.key === localDateKey(new Date()) ? 'is-today' : ''}`} onClick={() => openAttendanceEditor(cell)} title={cell.record ? `${cell.record.status} — edit` : 'Add attendance'}><span>{cell.day}</span>{cell.record && <i />}</button> : <span className="ba-calendar-blank" key={`blank-${index}`} />)}</div>
          <div className="ba-calendar-legend">{ATTENDANCE_OPTIONS.map(option => <span key={option.value}><i className={`legend-${option.value}`} />{option.short}</span>)}</div>
          <div className="ba-attendance-tip"><Activity size={16} /><span>Mark completed gym days, rest days, skipped days or planned sessions to build an honest consistency record.</span></div>
        </section>
      </div>

      {selectedDate && <div className="ba-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setSelectedDate('')}><section className="ba-modal" role="dialog" aria-modal="true" aria-labelledby="ba-attendance-title"><div className="ba-modal-head"><div><span className="ba-modal-icon"><CalendarDays size={19} /></span><div><h3 id="ba-attendance-title">Update attendance</h3><p>{formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div><button className="ba-icon-button" onClick={() => setSelectedDate('')} aria-label="Close"><X size={18} /></button></div><div className="ba-status-options">{ATTENDANCE_OPTIONS.map(option => <button key={option.value} className={`ba-status-option ${selectedStatus === option.value ? 'selected' : ''}`} onClick={() => setSelectedStatus(option.value)}><span className={`ba-status-dot status-${option.value}`} /><span>{option.label}</span>{selectedStatus === option.value && <Check size={17} />}</button>)}</div><label className="ba-modal-notes">Notes (optional)<textarea rows="2" value={attendanceNotes} onChange={e => setAttendanceNotes(e.target.value)} placeholder="Add a note for this day..." /></label><div className="ba-modal-actions">{attendanceByDate.has(selectedDate) && <button className="ba-text-danger" onClick={() => setConfirmClearAttendance(true)} disabled={savingAttendance}>Clear</button>}<span /><button className="secondary-button" onClick={() => setSelectedDate('')}>Cancel</button><button className="primary-button" onClick={saveAttendance} disabled={savingAttendance}>{savingAttendance ? 'Saving...' : 'Save day'}</button></div></section></div>}

      {confirmClearAttendance && selectedDate && <ConfirmDialog
        title="Clear attendance record?"
        description={`This removes the ${attendanceByDate.get(selectedDate)?.status || 'saved'} status for ${formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. You can add a new status for this date later.`}
        confirmText="Clear record"
        cancelText="Keep record"
        onCancel={() => setConfirmClearAttendance(false)}
        onConfirm={clearAttendance}
      />}

      {deleteWeight && <ConfirmDialog
        title="Delete weight entry?"
        description={`This permanently removes the ${Number(deleteWeight.weight_kg).toFixed(1)} kg entry from ${formatDate(deleteWeight.logged_at)}. Your other records will remain unchanged.`}
        confirmText="Delete entry"
        cancelText="Keep entry"
        onCancel={() => setDeleteWeight(null)}
        onConfirm={confirmDeleteWeight}
      />}
    </div>
  )
}
