
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Dumbbell, CalendarDays, ChartNoAxesCombined,
  UserRound, Settings, Plus, Flame, TrendingUp, ChevronRight, Scale,
  CheckCircle2, Circle, Weight, Sun, Moon, Menu, X,
  Monitor, Check, LogOut, Search, Trash2, Edit2, Copy,
  ArrowLeft, Clock, Activity, Target, Zap, Info, Layers, ArrowUpRight,
  Dumbbell as DumbbellIcon, ShieldAlert, AlertTriangle
} from 'lucide-react'

import './App.css'
import './AppFeatures.css'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'
import { getExerciseActivation } from './lib/muscleActivation'
import WorkoutLogger from './components/WorkoutLogger'
import ProgressPage from './components/ProgressPage'
import BodyAttendancePage from './components/BodyAttendancePage'
import ProfilePage from './components/ProfilePage'
import ConfirmDialog from './components/ConfirmDialog'

const themes = [
  { id: 'blue', name: 'Electric Blue', color: '#3B82F6', description: 'Modern and professional' },
  { id: 'orange', name: 'Inferno', color: '#F97316', description: 'Energetic orange' },
  { id: 'mono', name: 'Monochrome', color: '#D1D5DB', description: 'Minimal grey' },
  { id: 'lime', name: 'Lime', color: '#A3E635', description: 'Original LiftLab green' },
]

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileName, setProfileName] = useState('')

useEffect(() => {
  if (!user?.id) {
    setProfileName('')
    return
  }

  let cancelled = false

  const loadProfileName = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!cancelled) {
      setProfileName(
        data?.display_name?.trim() ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'User'
      )
    }

    if (error) console.error('Profile name loading failed:', error.message)
  }

  loadProfileName()

  return () => {
    cancelled = true
  }
}, [user])
  const [activePage, setActivePage] = useState('Dashboard')
  const [appearance, setAppearance] = useState(
    () => localStorage.getItem('liftlab-appearance') || 'dark'
  )
  const [accent, setAccent] = useState(
    () => localStorage.getItem('liftlab-accent') || 'blue'
  )
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) console.error('Session check failed:', error.message)

      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('liftlab-appearance', appearance)
  }, [appearance])

  useEffect(() => {
    localStorage.setItem('liftlab-accent', accent)
  }, [accent])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = event => setSystemDark(event.matches)
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) alert('Unable to sign out: ' + error.message)
  }

  const isDark = appearance === 'system' ? systemDark : appearance === 'dark'

  const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'My Plans', icon: CalendarDays },
  { name: 'Workout Logger', icon: Activity },
  { name: 'Exercises', icon: Dumbbell },
  { name: 'Progress', icon: ChartNoAxesCombined },
  { name: 'Body & Attendance', icon: Scale },
  { name: 'Profile', icon: UserRound },
]

  return (
    <div className={`app ${isDark ? 'dark' : 'light'} accent-${accent}`}>
      {authLoading ? (
        <div className="auth-screen">
          <div className="auth-loading">Loading LiftLab...</div>
        </div>
      ) : !user ? (
        <Auth />
      ) : (
        <>
          <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
            <div className="brand">
              <div className="brand-icon"><Dumbbell size={22} /></div>
              <span>Lift<span className="brand-highlight">Lab</span></span>
              <button className="mobile-close" onClick={() => setMenuOpen(false)}>
                <X />
              </button>
            </div>

            <div className="nav-label">MENU</div>

            <nav>
              {navigation.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  className={`nav-item ${activePage === name ? 'active' : ''}`}
                  onClick={() => {
                    setActivePage(name)
                    setMenuOpen(false)
                  }}
                >
                  <Icon size={19} />
                  <span>{name}</span>
                  {activePage === name && <span className="active-indicator" />}
                </button>
              ))}
            </nav>

            <div className="sidebar-bottom">
              <button
                className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
                onClick={() => {
                  setActivePage('Settings')
                  setMenuOpen(false)
                }}
              >
                <Settings size={19} />
                <span>Settings</span>
              </button>

              <div className="user-card">
                <div className="avatar">
                  {(profileName?.[0] || 'U').toUpperCase()}
                </div>

                <div className="user-info">
                  <strong>{profileName || 'User'}</strong>
                  <span>Fitness journey</span>
                </div>

                <button
                  className="logout-button"
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </aside>

          {menuOpen && (
            <div
              className="mobile-overlay"
              onClick={() => setMenuOpen(false)}
            />
          )}

          <main className="main">
            <header className="topbar">
              <button className="mobile-menu" onClick={() => setMenuOpen(true)}>
                <Menu />
              </button>

              <div className="breadcrumb">
                Workspace <ChevronRight size={15} />
                <strong>{activePage}</strong>
              </div>

              <div className="topbar-right">
                <button
                  className="theme-button"
                  onClick={() => setAppearance(isDark ? 'light' : 'dark')}
                  title="Toggle appearance"
                >
                  {isDark ? <Sun size={19} /> : <Moon size={19} />}
                </button>
              </div>
            </header>

            <div className="content">
              {activePage === 'Settings' ? (
                <SettingsPage
                  appearance={appearance}
                  setAppearance={setAppearance}
                  accent={accent}
                  setAccent={setAccent}
                  user={user}
                />
              ) : activePage === 'Dashboard' ? (
                <DashboardPage
                 user={user}
                 displayName={profileName}
                 setActivePage={setActivePage}
                />
              ) : activePage === 'Exercises' ? (
                <ExercisesPage user={user} />
              ) : activePage === 'My Plans' ? (
                <PlansPage user={user} />
              ) : activePage === 'Workout Logger' ? (
                <WorkoutLogger user={user} />
              ) : activePage === 'Progress' ? (
                <ProgressPage user={user} />
              ) : activePage === 'Body & Attendance' ? (
                <BodyAttendancePage user={user} />
              ) : activePage === 'Profile' ? (
                <ProfilePage
                  user={user}
                  onProfileUpdated={setProfileName}
                />
              ) : (
                <PlaceholderPage
                  page={activePage}
                  onBack={() => setActivePage('Dashboard')}
                />
              )}

              <footer>
                LiftLab <span>·</span> Your fitness journey, tracked.
              </footer>
            </div>
          </main>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

function DashboardPage({ user, displayName, setActivePage }) {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState({
    gymDays: 0, weight: null, completed: 0, streak: 0,
    week: [], activePlan: null, lastWorkout: null,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const dateKey = date => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const loadDashboard = async () => {
      setLoading(true)
      setError('')
      const today = new Date()
      const todayKey = dateKey(today)
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      const monday = new Date(today)
      monday.setHours(0, 0, 0, 0)
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

      const [attendanceResult, weightResult, sessionsResult, planResult, latestResult] = await Promise.all([
        supabase.from('gym_attendance').select('attendance_date,status')
          .eq('user_id', user.id).order('attendance_date', { ascending: false }),
        supabase.from('body_weight_logs').select('weight_kg,logged_at')
          .eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workout_sessions').select('id,completed_at,status')
          .eq('user_id', user.id).eq('status', 'completed')
          .gte('completed_at', `${monthStart}T00:00:00`).order('completed_at', { ascending: false }),
        supabase.from('workout_plans').select('id,name,description')
          .eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workout_sessions').select('id,completed_at,session_date')
          .eq('user_id', user.id).eq('status', 'completed')
          .order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      const firstError = attendanceResult.error || weightResult.error || sessionsResult.error || planResult.error || latestResult.error
      if (firstError) {
        if (active) setError(firstError.message)
      }

      const attendance = attendanceResult.data || []
      const attendanceMap = new Map(attendance.map(item => [item.attendance_date, item.status]))
      const monthAttendance = attendance.filter(item =>
        item.attendance_date >= monthStart && item.attendance_date <= todayKey
      )
      const gymDays = monthAttendance.filter(item => item.status === 'gym').length
      const trackedDays = monthAttendance.filter(item => ['gym', 'skipped'].includes(item.status)).length

      let streak = 0
      const cursor = new Date(today)
      cursor.setHours(0, 0, 0, 0)
      if (!attendanceMap.has(todayKey)) cursor.setDate(cursor.getDate() - 1)
      while (attendanceMap.get(dateKey(cursor)) === 'gym') {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
      }

      const week = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(monday)
        day.setDate(monday.getDate() + index)
        const key = dateKey(day)
        return {
          key,
          day: day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase(),
          completed: attendanceMap.get(key) === 'gym',
          status: attendanceMap.get(key) || 'untracked',
        }
      })

      if (active) {
        setDashboard({
          gymDays,
          weight: weightResult.data || null,
          completed: (sessionsResult.data || []).length,
          streak,
          week,
          activePlan: planResult.data || null,
          lastWorkout: latestResult.data || null,
          attendanceRate: trackedDays ? Math.round((gymDays / trackedDays) * 100) : 0,
        })
        setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [user.id])

  const latestWeight = dashboard.weight
    ? `${Number(dashboard.weight.weight_kg).toFixed(1)} kg`
    : '—'

  return (
    <div className="dashboard-v2">
      <div className="welcome-row dashboard-welcome">
        <div>
          <p className="eyebrow">YOUR FITNESS WORKSPACE</p>
          <h1>Welcome back, {displayName || 'Athlete'}</h1>
          <p className="subtitle">Your training, consistency and progress at a glance.</p>
          <span className="dashboard-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="dashboard-welcome-actions">
          <button className="primary-button" onClick={() => setActivePage('Workout Logger')}>
            <Activity size={17} /> Start workout
          </button>
          <button className="secondary-button" onClick={() => setActivePage('Body & Attendance')}>
            <Scale size={17} /> Track weight
          </button>
        </div>
      </div>

      {error && <div className="dashboard-error" role="alert">Some dashboard information could not be loaded: {error}</div>}

      <div className="stats-grid dashboard-stats">
        <StatCard icon={Flame} label="Gym days" value={loading ? '—' : `${dashboard.gymDays}`} detail="This month" />
        <StatCard icon={Weight} label="Current weight" value={loading ? '—' : latestWeight} detail={dashboard.weight ? `Updated ${new Date(dashboard.weight.logged_at).toLocaleDateString()}` : 'No weight entry yet'} />
        <StatCard icon={TrendingUp} label="Workouts completed" value={loading ? '—' : dashboard.completed} detail="This month" />
        <StatCard icon={CheckCircle2} label="Current streak" value={loading ? '—' : `${dashboard.streak} days`} detail={`${dashboard.attendanceRate || 0}% attendance rate`} />
      </div>

      <div className="dashboard-v2-grid">
        <section className="panel dashboard-week-panel">
          <div className="panel-header">
            <div><h2>Weekly consistency</h2><p>Recorded gym attendance, Monday to Sunday</p></div>
            <span className="tag">{loading ? 'This week' : `${dashboard.week.filter(day => day.status === 'gym').length} gym days`}</span>
          </div>
          {loading ? <div className="dashboard-skeleton" /> : (
            <div className="week-grid">
              {dashboard.week.map(day => (
                <div className="week-day" key={day.key}>
                  <span>{day.day}</span>
                  <div className={`day-circle ${day.completed ? 'done' : ''}`}>
                    {day.completed ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                  </div>
                  <small>{day.completed ? 'Gym' : day.status === 'rest' ? 'Rest' : day.status === 'skipped' ? 'Skipped' : '—'}</small>
                </div>
              ))}
            </div>
          )}
          <div className="attendance-footer">
            <span><span className="legend-dot green" /> Gym completed</span>
            <button className="dashboard-inline-link" onClick={() => setActivePage('Body & Attendance')}>View calendar <ChevronRight size={14} /></button>
          </div>
        </section>

        <section className="panel dashboard-plan-panel">
          <div className="panel-header">
            <div><h2>Active workout plan</h2><p>Your current training programme</p></div>
            <CalendarDays size={19} />
          </div>
          {dashboard.activePlan ? (
            <>
              <div className="dashboard-plan-name">{dashboard.activePlan.name}</div>
              <p className="dashboard-plan-description">{dashboard.activePlan.description || 'Your active training plan is ready.'}</p>
            </>
          ) : (
            <div className="dashboard-empty-plan"><CalendarDays size={25} /><strong>No active plan</strong><span>Create or activate a workout plan to get started.</span></div>
          )}
          <button className="secondary-button" onClick={() => setActivePage('My Plans')}>{dashboard.activePlan ? 'Manage plan' : 'Create a plan'} <ChevronRight size={16} /></button>
        </section>

        <section className="panel dashboard-last-workout">
          <div className="panel-header"><div><h2>Training activity</h2><p>Your latest completed workout</p></div><Activity size={19} /></div>
          {dashboard.lastWorkout ? (
            <div className="dashboard-last-workout-content">
              <strong>{new Date(dashboard.lastWorkout.completed_at || dashboard.lastWorkout.session_date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              <span>Last completed session</span>
            </div>
          ) : <div className="dashboard-empty-plan"><Dumbbell size={25} /><strong>No completed workouts yet</strong><span>Your completed sessions will appear here.</span></div>}
          <button className="secondary-button" onClick={() => setActivePage('Progress')}>View progress <ChevronRight size={16} /></button>
        </section>

        <section className="panel dashboard-weight-panel">
          <div className="panel-header"><div><h2>Body weight</h2><p>Your latest recorded measurement</p></div><Scale size={19} /></div>
          <div className="dashboard-weight-value">{loading ? '—' : latestWeight}</div>
          <p>{dashboard.weight ? 'Keep logging consistently to follow your trend.' : 'Add your first measurement to start tracking.'}</p>
          <button className="secondary-button" onClick={() => setActivePage('Body & Attendance')}>Track body weight <ChevronRight size={16} /></button>
        </section>
      </div>
    </div>
  )
}


/* -------------------------------------------------------
   EXERCISE LIBRARY
------------------------------------------------------- */

function ExercisesPage({ user }) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [muscleFilter, setMuscleFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [confirmExercise, setConfirmExercise] = useState(null)

  const loadExercises = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Exercise loading failed:', error.message)
      alert('Unable to load exercises: ' + error.message)
    } else {
      setLibrary(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadExercises() }, [user.id])

  const muscleGroups = [...new Set(library.flatMap(item => item.primary_muscles || []))]
    .filter(Boolean).sort((a, b) => a.localeCompare(b))
  const equipmentTypes = [...new Set(library.flatMap(item => item.equipment || []))]
    .filter(Boolean).sort((a, b) => a.localeCompare(b))

  const filteredExercises = library.filter(exercise => {
    const term = search.trim().toLowerCase()
    const activationText = Array.isArray(exercise.muscle_activation)
      ? exercise.muscle_activation.map(item => `${item.muscle || ''} ${item.region || ''}`).join(' ')
      : ''
    const matchesSearch = !term || [
      exercise.name,
      ...(exercise.primary_muscles || []),
      ...(exercise.secondary_muscles || []),
      ...(exercise.equipment || []),
      activationText,
    ].join(' ').toLowerCase().includes(term)
    const matchesType = filter === 'all' ||
      (filter === 'builtin' && exercise.is_builtin) ||
      (filter === 'custom' && !exercise.is_builtin)
    const matchesMuscle = muscleFilter === 'all' || (exercise.primary_muscles || []).includes(muscleFilter)
    const matchesEquipment = equipmentFilter === 'all' || (exercise.equipment || []).includes(equipmentFilter)
    return matchesSearch && matchesType && matchesMuscle && matchesEquipment
  })

  const deleteCustomExercise = exercise => {
    if (exercise.is_builtin) return
    setConfirmExercise(exercise)
  }

  const performDeleteCustomExercise = async () => {
    if (!confirmExercise) return
    const { error } = await supabase
      .from('exercise_library')
      .delete()
      .eq('id', confirmExercise.id)
      .eq('owner_id', user.id)
    if (error) throw new Error(`Unable to delete exercise: ${error.message}`)
    setSelectedExercise(null)
    setConfirmExercise(null)
    await loadExercises()
  }

  return (
    <div className="feature-page exercise-library-page">
      <div className="exercise-library-hero">
        <div className="exercise-library-hero-copy">
          <p className="eyebrow">YOUR TRAINING DATABASE</p>
          <h1>Exercise Library</h1>
          <p className="subtitle">Explore movements, understand the muscles involved, and build smarter workouts.</p>
          <div className="exercise-library-hero-stats">
            <span><strong>{library.length}</strong> exercises</span>
            <span><strong>{library.filter(item => item.is_builtin).length}</strong> built-in</span>
            <span><strong>{library.filter(item => !item.is_builtin).length}</strong> custom</span>
          </div>
        </div>
        <div className="exercise-library-hero-art" aria-hidden="true">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <div className="hero-art-core"><DumbbellIcon size={48} strokeWidth={1.5} /></div>
          <span className="hero-art-label hero-art-label-top">TRAIN SMARTER</span>
          <span className="hero-art-label hero-art-label-bottom">MOVE STRONGER</span>
        </div>
        <button className="primary-button exercise-add-button" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Add exercise
        </button>
      </div>

      <section className="panel exercise-filter-panel">
        <div className="exercise-search-box">
          <Search size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercise, muscle or equipment..." />
          {search && <button className="exercise-clear-search" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}
        </div>
        <div className="exercise-filter-selects">
          <label><span>Library</span><select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All exercises</option><option value="builtin">Built-in</option><option value="custom">My exercises</option>
          </select></label>
          <label><span>Muscle group</span><select value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)}>
            <option value="all">All muscle groups</option>{muscleGroups.map(item => <option key={item} value={item}>{item}</option>)}
          </select></label>
          <label><span>Equipment</span><select value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}>
            <option value="all">All equipment</option>{equipmentTypes.map(item => <option key={item} value={item}>{item}</option>)}
          </select></label>
        </div>
      </section>

      <div className="exercise-results-heading">
        <div><h2>Browse exercises</h2><p>{filteredExercises.length} movements match your filters</p></div>
        {(filter !== 'all' || muscleFilter !== 'all' || equipmentFilter !== 'all' || search) &&
          <button className="exercise-reset-filters" onClick={() => { setSearch(''); setFilter('all'); setMuscleFilter('all'); setEquipmentFilter('all') }}>Clear filters</button>}
      </div>

      {loading ? <div className="panel loading-panel">Loading exercise library...</div> : filteredExercises.length === 0 ? (
        <div className="panel empty-state"><Dumbbell size={32} /><h3>No exercises found</h3><p>Try changing your filters or add a custom exercise.</p></div>
      ) : (
        <div className="exercise-modern-grid">
          {filteredExercises.map((exercise, index) => {
            const activations = getExerciseActivation(exercise)
            const topTargets = activations.filter(item => item.role !== 'secondary').slice(0, 3)
            return (
              <button type="button" className="exercise-modern-card" key={exercise.id} onClick={() => setSelectedExercise(exercise)}>
                <div className="exercise-card-visual">
                  <div className="exercise-card-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="exercise-card-glyph"><DumbbellIcon size={31} strokeWidth={1.65} /></div>
                  <span className={`exercise-library-type ${exercise.is_builtin ? 'builtin' : 'custom'}`}>{exercise.is_builtin ? 'DATABASE' : 'CUSTOM'}</span>
                  <span className="exercise-card-open"><ArrowUpRight size={17} /></span>
                </div>
                <div className="exercise-card-content">
                  <div className="exercise-card-title-row"><h3>{exercise.name}</h3></div>
                  <div className="exercise-card-muscles">{(exercise.primary_muscles || []).slice(0, 3).map(muscle => <span key={muscle}>{muscle}</span>)}</div>
                  <div className="exercise-card-activation">
                    <div className="exercise-card-section-label"><Target size={13} /> MUSCLE FOCUS</div>
                    {topTargets.length ? topTargets.map((item, i) => <div className="exercise-card-target" key={`${item.muscle}-${item.region}-${i}`}><span>{item.region || item.muscle}</span><b className={`activation-dot ${item.level || 'moderate'}`} /></div>) : <span className="exercise-card-no-target">Muscle details available in exercise view</span>}
                  </div>
                  <div className="exercise-card-footer">
                    <span><Layers size={13} /> {exercise.category || 'Compound'}</span>
                    <span><Clock size={13} /> {exercise.rest_seconds || 90}s rest</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && <ExerciseModal user={user} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadExercises() }} />}
      {selectedExercise && <ExerciseDetailsModal exercise={selectedExercise} user={user} onClose={() => setSelectedExercise(null)} onDelete={deleteCustomExercise} />}
      {confirmExercise && <ConfirmDialog
        title="Delete custom exercise?"
        description={`"${confirmExercise.name}" will be removed from your exercise library. Existing workout history will not be deleted.`}
        confirmText="Delete exercise"
        onCancel={() => setConfirmExercise(null)}
        onConfirm={performDeleteCustomExercise}
      />}
    </div>
  )
}


function ExerciseDetailsModal({ exercise, onClose, onDelete }) {
  const activation = getExerciseActivation(exercise)
  const highCount = activation.filter(item => item.level === 'high').length
  const mediumCount = activation.filter(item => item.level === 'moderate').length

  return (
    <div className="exercise-detail-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="exercise-detail-modal" role="dialog" aria-modal="true" aria-label={`${exercise.name} details`}>
        <div className="exercise-detail-hero">
          <button className="exercise-detail-close" onClick={onClose} aria-label="Close details"><X size={20} /></button>
          <span className="exercise-detail-kicker"><DumbbellIcon size={14} /> EXERCISE PROFILE</span>
          <div className="exercise-detail-hero-icon"><DumbbellIcon size={44} strokeWidth={1.5} /></div>
          <div className="exercise-detail-title"><h2>{exercise.name}</h2><p>{(exercise.primary_muscles || []).join(' · ') || 'Muscle targets not specified'}</p></div>
          <div className="exercise-detail-quickstats">
            <span><strong>{exercise.suggested_sets || 3}</strong><small>SETS</small></span>
            <span><strong>{exercise.suggested_reps || '8–12'}</strong><small>REPS</small></span>
            <span><strong>{exercise.rest_seconds || 90}s</strong><small>REST</small></span>
            <span><strong>{exercise.difficulty || 'Beginner'}</strong><small>LEVEL</small></span>
          </div>
        </div>

        <div className="exercise-detail-body">
          <div className="exercise-detail-section-heading"><div><span className="exercise-section-icon"><Target size={17} /></span><div><h3>Muscle activation breakdown</h3><p>Estimated emphasis for this movement</p></div></div><span className="exercise-activation-count">{activation.length} regions</span></div>
          <div className="exercise-activation-summary">
            <span><i className="activation-dot high" /> {highCount} high emphasis</span>
            <span><i className="activation-dot moderate" /> {mediumCount} moderate</span>
            <span><i className="activation-dot low" /> {activation.length - highCount - mediumCount} low</span>
          </div>
          <div className="exercise-activation-list">
            {activation.length ? activation.map((item, index) => (
              <div className="exercise-activation-row" key={`${item.muscle}-${item.region}-${index}`}>
                <div className="exercise-activation-row-icon"><Activity size={16} /></div>
                <div className="exercise-activation-row-copy"><strong>{item.region || item.muscle}</strong><span>{item.muscle}{item.role === 'secondary' ? ' · Supporting muscle' : ' · Primary target'}</span></div>
                <span className={`exercise-activation-level ${item.level || 'moderate'}`}>{(item.level || 'moderate').toUpperCase()}</span>
              </div>
            )) : <p className="exercise-activation-empty">Detailed muscle regions have not been added for this exercise yet.</p>}
          </div>
          <div className="exercise-detail-note"><Info size={16} /><p>Activation levels are general training estimates, not measured percentages. Grip, range of motion, technique and individual anatomy can change which muscles receive the most emphasis.</p></div>

          <div className="exercise-detail-two-col">
            <section><h4><Layers size={15} /> Equipment</h4><div className="exercise-detail-tags">{(exercise.equipment || []).length ? exercise.equipment.map(item => <span key={item}>{item}</span>) : <span>Not specified</span>}</div></section>
            <section><h4><Zap size={15} /> Exercise type</h4><div className="exercise-detail-tags"><span>{exercise.category || 'Compound'}</span><span>{exercise.difficulty || 'Beginner'}</span></div></section>
          </div>

          {exercise.instructions && <div className="exercise-instructions"><h4>How to perform</h4><p>{exercise.instructions}</p></div>}
          {exercise.common_mistakes && <div className="exercise-mistakes"><h4>Common mistakes to avoid</h4><p>{exercise.common_mistakes}</p></div>}
          <div className="exercise-detail-actions">
            {!exercise.is_builtin && <button className="exercise-delete-detail" onClick={() => onDelete(exercise)}><Trash2 size={15} /> Delete custom exercise</button>}
            <button className="primary-button" onClick={onClose}>Done</button>
          </div>
        </div>
      </section>
    </div>
  )
}

/* -------------------------------------------------------
   CREATE CUSTOM EXERCISE
------------------------------------------------------- */

function ExerciseModal({ user, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [primaryMuscles, setPrimaryMuscles] = useState('')
  const [secondaryMuscles, setSecondaryMuscles] = useState('')
  const [equipment, setEquipment] = useState('')
  const [category, setCategory] = useState('compound')
  const [difficulty, setDifficulty] = useState('beginner')
  const [instructions, setInstructions] = useState('')
  const [mistakes, setMistakes] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('8-12')
  const [rest, setRest] = useState('90')
  const [activationDetails, setActivationDetails] = useState('')
  const [saving, setSaving] = useState(false)

  const splitValues = value =>
    value.split(',').map(item => item.trim()).filter(Boolean)

  const handleSubmit = async event => {
    event.preventDefault()

    if (!name.trim() || !primaryMuscles.trim()) {
      alert('Exercise name and primary muscles are required.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('exercise_library')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        primary_muscles: splitValues(primaryMuscles),
        secondary_muscles: splitValues(secondaryMuscles),
        equipment: splitValues(equipment),
        exercise_type: 'strength',
        category,
        difficulty,
        instructions: instructions.trim(),
        common_mistakes: mistakes.trim(),
        suggested_sets: Number(sets) || 3,
        suggested_reps: reps.trim() || '8-12',
        rest_seconds: Number(rest) || 90,
        muscle_activation: activationDetails.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts.length >= 3 && parts[0] && parts[1]).map(parts => ({ muscle: parts[0], region: parts[1], level: ['high', 'moderate', 'low'].includes((parts[2] || '').toLowerCase()) ? parts[2].toLowerCase() : 'moderate', role: (parts[3] || 'primary').toLowerCase() === 'secondary' ? 'secondary' : 'primary' })),
        is_builtin: false,
      })

    setSaving(false)

    if (error) {
      alert('Unable to create exercise: ' + error.message)
      return
    }

    onClose()
    onCreated()
  }

  return (
    <Modal title="Create custom exercise" onClose={onClose}>
      <form className="feature-form" onSubmit={handleSubmit}>
        <label>
          Exercise name *
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Smith Machine Shoulder Press" />
        </label>

        <label>
          Primary muscles *
          <input value={primaryMuscles} onChange={e => setPrimaryMuscles(e.target.value)} required placeholder="e.g. Shoulders, Front Delts" />
        </label>

        <label>
          Secondary muscles
          <input value={secondaryMuscles} onChange={e => setSecondaryMuscles(e.target.value)} placeholder="e.g. Triceps" />
        </label>

        <label>
          Equipment
          <input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="e.g. Smith Machine, Bench" />
        </label>

        <div className="form-two-column">
          <label>
            Exercise category
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
            </select>
          </label>

          <label>
            Difficulty
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>

        <div className="form-three-column">
          <label>
            Sets
            <input type="number" min="1" max="20" value={sets} onChange={e => setSets(e.target.value)} />
          </label>

          <label>
            Reps
            <input value={reps} onChange={e => setReps(e.target.value)} placeholder="8-12" />
          </label>

          <label>
            Rest (sec)
            <input type="number" min="0" value={rest} onChange={e => setRest(e.target.value)} />
          </label>
        </div>

        <label>
          Instructions
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="How to perform this exercise..." rows="3" />
        </label>

        <label>
          Common mistakes
          <textarea value={mistakes} onChange={e => setMistakes(e.target.value)} placeholder="Common mistakes to avoid..." rows="3" />
        </label>

        <label>
          Muscle activation details (optional)
          <textarea value={activationDetails} onChange={e => setActivationDetails(e.target.value)} placeholder={'One region per line: Muscle | Region | high/moderate/low | primary/secondary\nExample: Biceps brachii | Long head | high | primary'} rows="4" />
          <small className="exercise-form-hint">Add specific heads or regions when known. These details appear in the exercise profile.</small>
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save exercise'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


/* -------------------------------------------------------
   WORKOUT PLANS
------------------------------------------------------- */

function PlansPage({ user }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [confirmPlan, setConfirmPlan] = useState(null)

  const loadPlans = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Plan loading failed:', error.message)
      alert('Unable to load workout plans: ' + error.message)
    } else {
      setPlans(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [user.id])

  const activatePlan = async plan => {
    const { error: deactivateError } = await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)

    if (deactivateError) {
      alert('Unable to update plans: ' + deactivateError.message)
      return
    }

    const { error } = await supabase
      .from('workout_plans')
      .update({ is_active: true })
      .eq('id', plan.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to activate plan: ' + error.message)
    } else {
      loadPlans()
    }
  }

  const deletePlan = plan => setConfirmPlan(plan)

  const performDeletePlan = async () => {
    if (!confirmPlan) return
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', confirmPlan.id)
      .eq('user_id', user.id)

    if (error) throw new Error(`Unable to delete plan: ${error.message}`)
    setConfirmPlan(null)
    await loadPlans()
  }

  const duplicatePlan = async plan => {
    const { data: newPlan, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: `${plan.name} (Copy)`,
        description: plan.description,
        is_active: false,
      })
      .select()
      .single()

    if (error) {
      alert('Unable to duplicate plan: ' + error.message)
      return
    }

    const { data: days, error: daysError } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('user_id', user.id)
      .order('day_order')

    if (daysError) {
      alert('Plan copied, but days could not be copied: ' + daysError.message)
      loadPlans()
      return
    }

    for (const day of days || []) {
      const { data: newDay, error: newDayError } = await supabase
        .from('workout_plan_days')
        .insert({
          plan_id: newPlan.id,
          user_id: user.id,
          day_name: day.day_name,
          day_order: day.day_order,
          notes: day.notes,
        })
        .select()
        .single()

      if (newDayError) {
        alert('Plan copied, but a workout day could not be copied: ' + newDayError.message)
        loadPlans()
        return
      }

      const { data: exercises, error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .select('*')
        .eq('plan_day_id', day.id)
        .eq('user_id', user.id)
        .order('exercise_order')

      if (exercisesError) {
        alert('Plan copied, but some exercises could not be copied: ' + exercisesError.message)
        loadPlans()
        return
      }

      if (exercises?.length) {
        const copiedExercises = exercises.map(exercise => ({
          plan_day_id: newDay.id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.rest_seconds,
          exercise_order: exercise.exercise_order,
          notes: exercise.notes,
        }))

        const { error: insertError } = await supabase
          .from('workout_plan_exercises')
          .insert(copiedExercises)

        if (insertError) {
          alert('Plan copied, but some exercises could not be copied: ' + insertError.message)
          loadPlans()
          return
        }
      }
    }

    loadPlans()
  }

  const renamePlan = async plan => {
    const newName = window.prompt('Enter the new plan name:', plan.name)
    if (!newName?.trim() || newName.trim() === plan.name) return

    const { error } = await supabase
      .from('workout_plans')
      .update({ name: newName.trim() })
      .eq('id', plan.id)
      .eq('user_id', user.id)

    if (error) alert('Unable to rename plan: ' + error.message)
    else loadPlans()
  }

  if (editingPlan) {
    return (
      <PlanEditor
        plan={editingPlan}
        user={user}
        onBack={() => {
          setEditingPlan(null)
          loadPlans()
        }}
      />
    )
  }

  return (
    <div className="feature-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">YOUR TRAINING PROGRAMS</p>
          <h1>My Workout Plans</h1>
          <p className="subtitle">
            Create and manage your workout routines.
          </p>
        </div>

        <button className="primary-button" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Create plan
        </button>
      </div>

      {loading ? (
        <div className="panel loading-panel">Loading workout plans...</div>
      ) : plans.length === 0 ? (
        <div className="panel empty-state">
          <CalendarDays size={34} />
          <h3>No workout plans yet</h3>
          <p>Create your first plan and start building your training routine.</p>
          <button className="primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> Create your first plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <section className="panel plan-card" key={plan.id}>
              <div className="plan-card-top">
                <span className="tag">
                  {plan.is_active ? 'Active plan' : 'Inactive'}
                </span>
                <button
                  className="icon-button danger-icon"
                  title="Delete plan"
                  onClick={() => deletePlan(plan)}
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <h2>{plan.name}</h2>
              <p>{plan.description || 'No description added.'}</p>

              <div className="plan-card-actions">
                <button className="primary-button" onClick={() => setEditingPlan(plan)}>
                  <Edit2 size={16} /> Build plan
                </button>

                <button
                  className="secondary-button"
                  onClick={() => duplicatePlan(plan)}
                  title="Duplicate plan"
                >
                  <Copy size={16} />
                </button>

                <button
                  className="secondary-button"
                  onClick={() => renamePlan(plan)}
                  title="Rename plan"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {!plan.is_active && (
                <button
                  className="activate-plan-button"
                  onClick={() => activatePlan(plan)}
                >
                  <CheckCircle2 size={16} /> Set as active plan
                </button>
              )}
            </section>
          ))}
        </div>
      )}

      {showCreate && (
        <PlanModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={loadPlans}
        />
      )}
      {confirmPlan && <ConfirmDialog
        title="Delete workout plan?"
        description={`"${confirmPlan.name}" and its workout days and planned exercises will be permanently removed. Completed workout history will remain.`}
        confirmText="Delete plan"
        onCancel={() => setConfirmPlan(null)}
        onConfirm={performDeletePlan}
      />}
    </div>
  )
}

/* -------------------------------------------------------
   CREATE WORKOUT PLAN
------------------------------------------------------- */

function PlanModal({ user, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()

    if (!name.trim()) return

    setSaving(true)

    const { error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim(),
        is_active: false,
      })

    setSaving(false)

    if (error) {
      alert('Unable to create plan: ' + error.message)
      return
    }

    onClose()
    onCreated()
  }

  return (
    <Modal title="Create workout plan" onClose={onClose}>
      <form className="feature-form" onSubmit={handleSubmit}>
        <label>
          Plan name *
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. 5-Day Training Split"
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your workout plan..."
            rows="3"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Creating...' : 'Create plan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------
   WORKOUT PLAN BUILDER
------------------------------------------------------- */

function PlanEditor({ plan, user, onBack }) {
  const [days, setDays] = useState([])
  const [planExercises, setPlanExercises] = useState({})
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dayName, setDayName] = useState('')
  const [addingExerciseTo, setAddingExerciseTo] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const load = async () => {
    setLoading(true)

    const { data: dayData, error: dayError } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('user_id', user.id)
      .order('day_order')

    if (dayError) {
      alert('Unable to load workout days: ' + dayError.message)
      setLoading(false)
      return
    }

    const loadedDays = dayData || []
    setDays(loadedDays)

    if (loadedDays.length === 0) {
      setPlanExercises({})
    } else {
      const dayIds = loadedDays.map(day => day.id)

      const { data: exerciseData, error: exerciseError } = await supabase
        .from('workout_plan_exercises')
        .select('*')
        .in('plan_day_id', dayIds)
        .eq('user_id', user.id)
        .order('exercise_order')

      if (exerciseError) {
        alert('Unable to load planned exercises: ' + exerciseError.message)
      } else {
        const grouped = {}

        loadedDays.forEach(day => {
          grouped[day.id] = []
        })

        ;(exerciseData || []).forEach(exercise => {
          if (!grouped[exercise.plan_day_id]) {
            grouped[exercise.plan_day_id] = []
          }

          grouped[exercise.plan_day_id].push(exercise)
        })

        setPlanExercises(grouped)
      }
    }

    const { data: libraryData, error: libraryError } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name')

    if (libraryError) {
      alert('Unable to load exercise library: ' + libraryError.message)
    } else {
      setLibrary(libraryData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [plan.id, user.id])

  const addDay = async event => {
    event.preventDefault()

    if (!dayName.trim()) return

    setBusy(true)

    const { error } = await supabase
      .from('workout_plan_days')
      .insert({
        plan_id: plan.id,
        user_id: user.id,
        day_name: dayName.trim(),
        day_order: days.length + 1,
      })

    setBusy(false)

    if (error) {
      alert('Unable to add workout day: ' + error.message)
    } else {
      setDayName('')
      load()
    }
  }

  const removeDay = day => setConfirmAction({
    title: 'Delete workout day?',
    description: `${day.day_name} and all exercises assigned to this day will be removed from the plan.`,
    confirmText: 'Delete day',
    run: async () => {
      const { error } = await supabase.from('workout_plan_days')
        .delete().eq('id', day.id).eq('user_id', user.id)
      if (error) throw new Error(error.message)
      await load()
    },
  })

  const addExercise = async (day, exerciseId) => {
    const exercise = library.find(x => x.id === exerciseId)
    if (!exercise) return

    const current = planExercises[day.id] || []

    const { error } = await supabase
      .from('workout_plan_exercises')
      .insert({
        plan_day_id: day.id,
        user_id: user.id,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        sets: exercise.suggested_sets || 3,
        reps: exercise.suggested_reps || '8-12',
        rest_seconds: exercise.rest_seconds || 90,
        exercise_order: current.length + 1,
      })

    if (error) {
      alert('Unable to add exercise: ' + error.message)
    } else {
      setAddingExerciseTo(null)
      load()
    }
  }

  const updateExercise = async (exercise, field, value) => {
    const numeric = ['sets', 'rest_seconds'].includes(field)
      ? Number(value)
      : value

    const { error } = await supabase
      .from('workout_plan_exercises')
      .update({ [field]: numeric })
      .eq('id', exercise.id)
      .eq('user_id', user.id)

    if (error) {
      alert(error.message)
    } else {
      load()
    }
  }

  const removeExercise = exercise => setConfirmAction({
    title: 'Remove exercise?',
    description: `${exercise.exercise_name} will be removed from this workout day. Saved workout history will remain unchanged.`,
    confirmText: 'Remove exercise',
    run: async () => {
      const { error } = await supabase.from('workout_plan_exercises')
        .delete().eq('id', exercise.id).eq('user_id', user.id)
      if (error) throw new Error(error.message)
      await load()
    },
  })

  return (
    <div className="feature-page">
      <div className="plan-editor-heading">
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={16} /> All plans
        </button>

        <div>
          <p className="eyebrow">WORKOUT PLAN BUILDER</p>
          <h1>{plan.name}</h1>
          <p className="subtitle">
            {plan.description || 'Build your training days and exercises.'}
          </p>
        </div>
      </div>

      <section className="panel add-day-panel">
        <form className="add-day-form" onSubmit={addDay}>
          <label>
            Add a workout day
            <input
              value={dayName}
              onChange={e => setDayName(e.target.value)}
              placeholder={`e.g. Day ${days.length + 1} — Chest + Triceps`}
            />
          </label>

          <button className="primary-button" disabled={busy}>
            <Plus size={17} /> Add day
          </button>
        </form>
      </section>

      {loading ? (
        <div className="panel loading-panel">Loading plan...</div>
      ) : days.length === 0 ? (
        <div className="panel empty-state">
          <CalendarDays size={30} />
          <h3>No workout days</h3>
          <p>Add your first day using the field above.</p>
        </div>
      ) : (
        <div className="plan-day-list">
          {days.map(day => (
            <section className="panel plan-day-editor" key={day.id}>
              <div className="plan-day-editor-header">
                <div>
                  <span className="tag">DAY {day.day_order}</span>
                  <h2>{day.day_name}</h2>
                  <p>{(planExercises[day.id] || []).length} exercises</p>
                </div>

                <div className="plan-day-controls">
                  <button
                    className="secondary-button"
                    onClick={() => setAddingExerciseTo(
                      addingExerciseTo === day.id ? null : day.id
                    )}
                  >
                    <Plus size={16} /> Add exercise
                  </button>

                  <button
                    className="icon-button danger-icon"
                    title="Delete day"
                    onClick={() => removeDay(day)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {addingExerciseTo === day.id && (
                <div className="add-exercise-row">
                  <select
                    defaultValue=""
                    onChange={e => e.target.value && addExercise(day, e.target.value)}
                  >
                    <option value="" disabled>Select an exercise...</option>
                    {library.map(ex => (
                      <option value={ex.id} key={ex.id}>
                        {ex.name} — {(ex.primary_muscles || []).join(', ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(planExercises[day.id] || []).length === 0 ? (
                <p className="day-empty">No exercises added to this day yet.</p>
              ) : (
                <div className="plan-exercise-table">
                  <div className="plan-exercise-table-head">
                    <span>Exercise</span>
                    <span>Sets</span>
                    <span>Reps</span>
                    <span>Rest (sec)</span>
                    <span />
                  </div>

                  {(planExercises[day.id] || []).map(ex => (
                    <div className="plan-exercise-row" key={ex.id}>
                      <strong>{ex.exercise_name}</strong>

                      <input
                        aria-label={`${ex.exercise_name} sets`}
                        type="number"
                        min="1"
                        max="20"
                        defaultValue={ex.sets}
                        onBlur={e =>
                          e.target.value !== String(ex.sets) &&
                          updateExercise(ex, 'sets', e.target.value)
                        }
                      />

                      <input
                        aria-label={`${ex.exercise_name} reps`}
                        defaultValue={ex.reps}
                        onBlur={e =>
                          e.target.value !== String(ex.reps) &&
                          updateExercise(ex, 'reps', e.target.value)
                        }
                      />

                      <input
                        aria-label={`${ex.exercise_name} rest`}
                        type="number"
                        min="0"
                        defaultValue={ex.rest_seconds}
                        onBlur={e =>
                          e.target.value !== String(ex.rest_seconds) &&
                          updateExercise(ex, 'rest_seconds', e.target.value)
                        }
                      />

                      <button
                        className="icon-button danger-icon"
                        title="Remove exercise"
                        onClick={() => removeExercise(ex)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {confirmAction && <ConfirmDialog
        title={confirmAction.title}
        description={confirmAction.description}
        confirmText={confirmAction.confirmText}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          await confirmAction.run()
          setConfirmAction(null)
        }}
      />}
    </div>
  )
}

/* -------------------------------------------------------
   SETTINGS
------------------------------------------------------- */

function SettingsPage({ appearance, setAppearance, accent, setAccent, user }) {
  const [resetType, setResetType] = useState(null)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  const appearances = [
    { id: 'light', name: 'Light', icon: Sun, description: 'Bright interface' },
    { id: 'dark', name: 'Dark', icon: Moon, description: 'Dark interface' },
    { id: 'system', name: 'System', icon: Monitor, description: 'Follow device settings' },
  ]

  const deleteUserRows = async (table, column = 'user_id') => {
    const { error } = await supabase.from(table).delete().eq(column, user.id)
    if (error) throw new Error(`${table}: ${error.message}`)
  }

  const runReset = async () => {
    setResetError('')
    setResetMessage('')

    try {
      // Delete child records before their parent records.
      const tables = [
        'workout_sets',
        'session_exercises',
        'workout_sessions',
        'workout_plan_exercises',
        'workout_plan_days',
        'workout_plans',
        'body_weight_logs',
        'gym_attendance',
      ]

      for (const table of tables) await deleteUserRows(table)

      if (resetType === 'complete') {
        await deleteUserRows('exercise_library', 'owner_id')
        await deleteUserRows('user_preferences')
        setAppearance('dark')
        setAccent('blue')
      }

      setResetType(null)
      setResetMessage(
        resetType === 'complete'
          ? 'Complete reset finished. Your account and built-in exercises are still available.'
          : 'Workout data reset finished. Your profile, preferences and exercise library were kept.'
      )
    } catch (error) {
      const message = `Reset stopped: ${error.message}. Some earlier deletions may already have completed.`
      setResetError(message)
      throw new Error(message, { cause: error })
    }
  }

  return (
    <div className="settings-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">PERSONALIZATION</p>
          <h1>Settings</h1>
          <p className="subtitle">Customize how LiftLab looks and manage your workout data.</p>
        </div>
      </div>

      <section className="settings-account-card">
        <span className="settings-account-icon"><UserRound size={20} /></span>
        <div className="settings-account-copy"><span>Signed in as</span><strong>{user.email}</strong></div>
        <span className="settings-account-status"><CheckCircle2 size={14} /> Account active</span>
      </section>

      <section className="panel settings-section">
        <div className="settings-heading">
          <div>
            <h2>Appearance</h2>
            <p>Choose light, dark or follow your device preference.</p>
          </div>
        </div>
        <div className="appearance-options">
          {appearances.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                className={`appearance-option ${appearance === option.id ? 'selected' : ''}`}
                onClick={() => setAppearance(option.id)}
              >
                <Icon size={22} />
                <strong>{option.name}</strong>
                <span>{option.description}</span>
                {appearance === option.id && <Check size={17} className="option-check" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel settings-section">
        <div className="settings-heading">
          <div>
            <h2>Accent colour</h2>
            <p>Choose the highlight colour used across LiftLab.</p>
          </div>
        </div>
        <div className="accent-options">
          {themes.map(theme => (
            <button
              key={theme.id}
              className={`accent-option ${accent === theme.id ? 'selected' : ''}`}
              onClick={() => setAccent(theme.id)}
            >
              <span className="accent-swatch" style={{ background: theme.color }} />
              <span className="accent-name">{theme.name}</span>
              {accent === theme.id && <Check size={17} className="option-check" />}
              <span className="accent-description">{theme.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-section reset-settings-section">
        <div className="settings-heading">
          <div>
            <h2>Data management</h2>
            <p>Reset your training records without deleting your LiftLab login.</p>
          </div>
          <span className="reset-section-icon"><ShieldAlert size={20} /></span>
        </div>
        <div className="reset-option">
          <div>
            <strong>Reset workout data</strong>
            <p>Deletes workout plans, workout history, body-weight records and gym attendance. Keeps your profile, preferences and exercise library.</p>
          </div>
          <button className="reset-outline-button" onClick={() => setResetType('workouts')}>Reset workout data</button>
        </div>
        <div className="reset-option reset-option-danger">
          <div>
            <strong>Complete reset</strong>
            <p>Also deletes your custom exercises and restores appearance preferences to defaults. Your login account and built-in exercises remain.</p>
          </div>
          <button className="reset-danger-button" onClick={() => setResetType('complete')}>Complete reset</button>
        </div>
        {resetMessage && <div className="reset-feedback success" role="status"><CheckCircle2 size={17} />{resetMessage}</div>}
        {resetError && <div className="reset-feedback error" role="alert"><AlertTriangle size={17} />{resetError}</div>}
      </section>

      <p className="settings-note">
        Appearance and accent preferences are saved automatically on this device.
      </p>

      {resetType && (
        <ConfirmDialog
          title={resetType === 'complete' ? 'Complete LiftLab reset?' : 'Reset workout data?'}
          description={resetType === 'complete'
            ? 'This permanently deletes your workout plans, sessions, set logs, body-weight history, gym attendance and all custom exercises. Your login and built-in exercise library will remain. Type RESET to continue.'
            : 'This permanently deletes all workout plans, workout history, set logs, body-weight records and gym attendance. Your profile, settings and exercise library will remain.'}
          confirmText={resetType === 'complete' ? 'Complete reset' : 'Reset workout data'}
          tone={resetType === 'complete' ? 'danger' : 'warning'}
          requireText={resetType === 'complete' ? 'RESET' : undefined}
          onCancel={() => setResetType(null)}
          onConfirm={runReset}
        />
      )}
    </div>
  )
}
/* -------------------------------------------------------
   PLACEHOLDER PAGES
------------------------------------------------------- */

function PlaceholderPage({ page, onBack }) {
  const Icon = page === 'Progress' ? ChartNoAxesCombined : UserRound

  return (
    <section className="panel placeholder-panel">
      <div className="placeholder-icon"><Icon /></div>
      <h2>{page}</h2>
      <p>This section will be developed in the next stage of LiftLab.</p>
      <button className="primary-button" onClick={onBack}>
        Back to dashboard
      </button>
    </section>
  )
}

/* -------------------------------------------------------
   SHARED COMPONENTS
------------------------------------------------------- */

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="panel stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon"><Icon size={19} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <section
        className="panel feature-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="feature-modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </section>
    </div>
  )
}

export default App
