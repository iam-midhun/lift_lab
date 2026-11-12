
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Clock,
  Dumbbell,
  RefreshCw,
  Trophy,
  TrendingUp,
  Weight,
  ChevronRight,
  ArrowLeft,
  Target
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

import { supabase } from '../lib/supabase'

function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(start, end) {
  if (!start || !end) return '—'

  const minutes = Math.max(
    0,
    Math.round((new Date(end) - new Date(start)) / 60000)
  )

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

function calculateOneRepMax(weight, reps) {
  const w = Number(weight)
  const r = Number(reps)

  if (!w || !r || r <= 0) return 0
  if (r === 1) return w

  return w * (1 + r / 30)
}

function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="progress-stat-card">
      <div className="progress-stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <span className="progress-stat-label">{label}</span>
        <strong className="progress-stat-value">{value}</strong>
        {subtitle && (
          <span className="progress-stat-subtitle">{subtitle}</span>
        )}
      </div>
    </div>
  )
}

export default function ProgressPage({ user }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [sessionExercises, setSessionExercises] = useState([])
  const [sets, setSets] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const loadProgress = useCallback(async (isRefresh = false) => {
    if (!user?.id) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (sessionError) throw sessionError

      const completedSessions = sessionData || []
      setSessions(completedSessions)

      if (completedSessions.length === 0) {
        setSessionExercises([])
        setSets([])
        setSelectedSession(null)
        setLoading(false)
        setRefreshing(false)
        return
      }

      const sessionIds = completedSessions.map(session => session.id)

      const { data: exerciseData, error: exerciseError } = await supabase
        .from('session_exercises')
        .select('*')
        .in('session_id', sessionIds)
        .eq('user_id', user.id)
        .order('exercise_order', { ascending: true })

      if (exerciseError) throw exerciseError

      const exercises = exerciseData || []
      setSessionExercises(exercises)

      const exerciseIds = exercises.map(exercise => exercise.id)

      if (exerciseIds.length === 0) {
        setSets([])
      } else {
        const { data: setData, error: setsError } = await supabase
          .from('workout_sets')
          .select('*')
          .in('session_exercise_id', exerciseIds)
          .eq('user_id', user.id)
          .order('set_number', { ascending: true })

        if (setsError) throw setsError

        setSets(setData || [])
      }
    } catch (err) {
      console.error('Progress loading error:', err)
      setError(err.message || 'Unable to load workout progress.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const completedSets = useMemo(
    () => sets.filter(set => set.completed),
    [sets]
  )

  const totalVolume = useMemo(
    () =>
      completedSets.reduce(
        (total, set) =>
          total +
          Number(set.weight_kg || 0) * Number(set.reps || 0),
        0
      ),
    [completedSets]
  )

  const totalExercises = useMemo(
    () => sessionExercises.length,
    [sessionExercises]
  )

  const averageDuration = useMemo(() => {
    const durations = sessions
      .filter(session => session.started_at && session.completed_at)
      .map(session =>
        (new Date(session.completed_at) - new Date(session.started_at)) / 60000
      )
      .filter(duration => Number.isFinite(duration) && duration >= 0)

    if (!durations.length) return '—'

    const average = Math.round(
      durations.reduce((sum, duration) => sum + duration, 0) /
      durations.length
    )

    return `${average} min`
  }, [sessions])

  const exerciseProgress = useMemo(() => {
    const exerciseMap = new Map()

    sessionExercises.forEach(exercise => {
      exerciseMap.set(exercise.id, {
        id: exercise.id,
        name: exercise.exercise_name,
        sessionId: exercise.session_id,
        records: []
      })
    })

    completedSets.forEach(set => {
      const exercise = sessionExercises.find(
        item => item.id === set.session_exercise_id
      )

      if (!exercise) return

      const entry = exerciseMap.get(exercise.id)
      const session = sessions.find(
        item => item.id === exercise.session_id
      )

      if (!entry || !session) return

      entry.records.push({
        date: session.session_date || session.completed_at,
        weight: Number(set.weight_kg || 0),
        reps: Number(set.reps || 0),
        volume:
          Number(set.weight_kg || 0) * Number(set.reps || 0),
        estimatedMax: calculateOneRepMax(
          set.weight_kg,
          set.reps
        )
      })
    })

    return Array.from(exerciseMap.values())
      .map(exercise => ({
        ...exercise,
        records: exercise.records.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        )
      }))
      .filter(exercise => exercise.records.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [sessionExercises, completedSets, sessions])

  const personalRecords = useMemo(() => {
    return exerciseProgress.map(exercise => {
      const maxWeight = Math.max(
        ...exercise.records.map(record => record.weight)
      )

      const maxReps = Math.max(
        ...exercise.records.map(record => record.reps)
      )

      const maxEstimated = Math.max(
        ...exercise.records.map(record => record.estimatedMax)
      )

      return {
        name: exercise.name,
        maxWeight,
        maxReps,
        maxEstimated
      }
    })
  }, [exerciseProgress])

  const chartData = useMemo(() => {
    if (!selectedExercise) return []

    const exercise = exerciseProgress.find(
      item => item.name === selectedExercise
    )

    if (!exercise) return []

    return exercise.records.map((record, index) => ({
      date: `${formatDate(record.date)} #${index + 1}`,
      weight: record.weight,
      estimatedMax: Number(record.estimatedMax.toFixed(1))
    }))
  }, [exerciseProgress, selectedExercise])

  const selectedSessionExercises = useMemo(() => {
    if (!selectedSession) return []

    return sessionExercises
      .filter(exercise => exercise.session_id === selectedSession.id)
      .map(exercise => ({
        ...exercise,
        sets: sets.filter(
          set => set.session_exercise_id === exercise.id
        )
      }))
  }, [selectedSession, sessionExercises, sets])

  if (loading) {
    return (
      <div className="loading-panel">
        <Activity size={24} />
        <p>Loading your workout progress...</p>
      </div>
    )
  }

  if (selectedSession) {
    return (
      <div className="feature-page progress-page">
        <div className="progress-page-heading">
          <button
            className="secondary-button"
            onClick={() => setSelectedSession(null)}
          >
            <ArrowLeft size={16} />
            Back to Progress
          </button>

          <h2>Workout Details</h2>
          <p>{formatDateTime(selectedSession.completed_at)}</p>
        </div>

        <div className="progress-detail-stats">
          <StatCard
            icon={Clock}
            label="Duration"
            value={formatDuration(
              selectedSession.started_at,
              selectedSession.completed_at
            )}
          />

          <StatCard
            icon={Dumbbell}
            label="Exercises"
            value={selectedSessionExercises.length}
          />

          <StatCard
            icon={Target}
            label="Completed sets"
            value={selectedSessionExercises.reduce(
              (total, exercise) =>
                total + exercise.sets.filter(set => set.completed).length,
              0
            )}
          />
        </div>

        <div className="progress-history-list">
          {selectedSessionExercises.map(exercise => (
            <div className="progress-history-card" key={exercise.id}>
              <div className="progress-history-card-heading">
                <h3>{exercise.exercise_name}</h3>
                <span>
                  {exercise.sets.filter(set => set.completed).length} sets
                </span>
              </div>

              {exercise.sets.length === 0 ? (
                <p>No sets recorded.</p>
              ) : (
                <div className="progress-set-table">
                  <div className="progress-set-row progress-set-header">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>Status</span>
                  </div>

                  {exercise.sets.map(set => (
                    <div className="progress-set-row" key={set.id}>
                      <span>{set.set_number}</span>
                      <span>{Number(set.weight_kg || 0)} kg</span>
                      <span>{set.reps ?? '—'}</span>
                      <span>
                        {set.completed ? 'Completed' : 'Skipped'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="feature-page progress-page">
      <div className="progress-page-heading">
        <div>
          <h2>Progress & History</h2>
          <p>Track your training performance and personal records.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => loadProgress(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'spin' : ''}
          />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="progress-error">
          {error}
        </div>
      )}

      <div className="progress-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>

        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Workout History
        </button>

        <button
          className={activeTab === 'records' ? 'active' : ''}
          onClick={() => setActiveTab('records')}
        >
          Personal Records
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <ChartNoAxesCombined size={36} />
          <h3>No workout history yet</h3>
          <p>Complete a workout using Workout Logger to see your progress here.</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="progress-stats-grid">
                <StatCard
                  icon={CalendarDays}
                  label="Completed workouts"
                  value={sessions.length}
                  subtitle="All-time"
                />

                <StatCard
                  icon={Dumbbell}
                  label="Exercises recorded"
                  value={totalExercises}
                />

                <StatCard
                  icon={Activity}
                  label="Completed sets"
                  value={completedSets.length}
                />

                <StatCard
                  icon={Weight}
                  label="Training volume"
                  value={`${Math.round(totalVolume).toLocaleString('en-IN')} kg`}
                  subtitle="Weight × reps"
                />

                <StatCard
                  icon={Clock}
                  label="Average duration"
                  value={averageDuration}
                />
              </div>

              <section className="progress-section">
                <div className="progress-section-heading">
                  <div>
                    <h3>Exercise Progress</h3>
                    <p>Track your working weight over time.</p>
                  </div>
                </div>

                {exerciseProgress.length === 0 ? (
                  <div className="empty-state">
                    <p>No completed exercise sets recorded yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="progress-exercise-select">
                      <label htmlFor="progress-exercise">
                        Select exercise
                      </label>

                      <select
                        id="progress-exercise"
                        value={selectedExercise || exerciseProgress[0].name}
                        onChange={event =>
                          setSelectedExercise(event.target.value)
                        }
                      >
                        {exerciseProgress.map(exercise => (
                          <option
                            key={exercise.name}
                            value={exercise.name}
                          >
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="progress-chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            width={45}
                          />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            name="Weight (kg)"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="progress-chart-note">
                      The chart shows the weight used in each completed set.
                    </p>
                  </>
                )}
              </section>

              <section className="progress-section">
                <div className="progress-section-heading">
                  <div>
                    <h3>Recent Workouts</h3>
                    <p>Your latest completed sessions.</p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setActiveTab('history')}
                  >
                    View all <ChevronRight size={15} />
                  </button>
                </div>

                <div className="progress-history-list">
                  {sessions.slice(0, 5).map(session => (
                    <button
                      className="progress-history-card progress-history-button"
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div>
                        <h3>
                          {formatDate(session.session_date || session.completed_at)}
                        </h3>
                        <p>
                          {formatDuration(
                            session.started_at,
                            session.completed_at
                          )}
                        </p>
                      </div>

                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'history' && (
            <section className="progress-section">
              <div className="progress-section-heading">
                <div>
                  <h3>Workout History</h3>
                  <p>{sessions.length} completed workouts</p>
                </div>
              </div>

              <div className="progress-history-list">
                {sessions.map(session => {
                  const exerciseCount = sessionExercises.filter(
                    exercise => exercise.session_id === session.id
                  ).length

                  return (
                    <button
                      className="progress-history-card progress-history-button"
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="progress-history-main">
                        <h3>
                          {formatDate(session.session_date || session.completed_at)}
                        </h3>

                        <p>
                          {exerciseCount} exercises
                          {' · '}
                          {formatDuration(
                            session.started_at,
                            session.completed_at
                          )}
                        </p>
                      </div>

                      <ChevronRight size={18} />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {activeTab === 'records' && (
            <section className="progress-section">
              <div className="progress-section-heading">
                <div>
                  <h3>Personal Records</h3>
                  <p>Your best recorded performance for each exercise.</p>
                </div>
              </div>

              {personalRecords.length === 0 ? (
                <div className="empty-state">
                  <Trophy size={32} />
                  <p>Complete sets with recorded weights to build your records.</p>
                </div>
              ) : (
                <div className="progress-records-grid">
                  {personalRecords.map(record => (
                    <div
                      className="progress-record-card"
                      key={record.name}
                    >
                      <div className="progress-record-icon">
                        <Trophy size={19} />
                      </div>

                      <h3>{record.name}</h3>

                      <div className="progress-record-values">
                        <div>
                          <span>Max weight</span>
                          <strong>{record.maxWeight} kg</strong>
                        </div>

                        <div>
                          <span>Max reps</span>
                          <strong>{record.maxReps}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
