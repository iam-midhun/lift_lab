
import { useEffect, useState } from 'react'
import {
  Activity, Play, Pause, CheckCircle2, Circle, Clock,
  Plus, Trash2, SkipForward, Dumbbell, History,
  ChevronDown, ChevronUp, RefreshCw, Trophy, TrendingUp
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getExerciseActivation } from '../lib/muscleActivation'

export default function WorkoutLogger({ user }) {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [days, setDays] = useState([])
  const [selectedDay, setSelectedDay] = useState('')
  const [library, setLibrary] = useState([])
  const [session, setSession] = useState(null)
  const [sessionExercises, setSessionExercises] = useState([])
  const [sets, setSets] = useState({})
  const [history, setHistory] = useState([])
  const [previousPerformance, setPreviousPerformance] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState(null)

  const loadInitialData = async () => {
    setLoading(true)

    const [
      { data: planData, error: planError },
      { data: exerciseData, error: exerciseError },
      { data: sessionData, error: sessionError },
    ] = await Promise.all([
      supabase.from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      supabase.from('exercise_library')
        .select('*')
        .order('name'),

      supabase.from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(100),
    ])

    if (planError) alert('Unable to load plans: ' + planError.message)
    if (exerciseError) alert('Unable to load exercises: ' + exerciseError.message)
    if (sessionError) alert('Unable to load workout history: ' + sessionError.message)

    const loadedPlans = planData || []
    setPlans(loadedPlans)
    setLibrary(exerciseData || [])
    setHistory(sessionData || [])

    const activePlan = loadedPlans.find(plan => plan.is_active)
      || loadedPlans[0]

    if (activePlan) {
      setSelectedPlan(activePlan.id)
      await loadDays(activePlan.id, sessionData || [])
    }

    const activeSession = (sessionData || []).find(
      item => item.status === 'in_progress'
    )

    if (activeSession) {
      await loadSession(activeSession)
    }

    setLoading(false)
  }

  const loadDays = async (planId, sessions = history) => {
    const { data, error } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('plan_id', planId)
      .eq('user_id', user.id)
      .order('day_order')

    if (error) {
      alert('Unable to load workout days: ' + error.message)
      return
    }

    const loadedDays = data || []
    setDays(loadedDays)

    if (!loadedDays.length) {
      setSelectedDay('')
      return
    }

    const latestCompleted = sessions.find(
      item => item.plan_id === planId &&
        item.status === 'completed' &&
        item.workout_plan_day_id
    )

    let suggestedDay = loadedDays[0]

    if (latestCompleted) {
      const previousIndex = loadedDays.findIndex(
        day => day.id === latestCompleted.workout_plan_day_id
      )

      if (previousIndex >= 0) {
        suggestedDay = loadedDays[(previousIndex + 1) % loadedDays.length]
      }
    }

    setSelectedDay(suggestedDay.id)
  }

  // Load the most recent completed performance for each exercise.
  const loadPreviousPerformance = async (exercises, currentSession) => {
    if (!exercises.length || !currentSession?.started_at) {
      setPreviousPerformance({})
      return
    }

    const { data: previousSessions, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, completed_at, session_date')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .lt('completed_at', currentSession.started_at)
      .order('completed_at', { ascending: false })
      .limit(100)

    if (sessionError) {
      console.error('Previous workout lookup error:', sessionError)
      setPreviousPerformance({})
      return
    }

    if (!previousSessions?.length) {
      setPreviousPerformance({})
      return
    }

    const previousSessionIds = previousSessions.map(item => item.id)

    const exerciseNames = [
      ...new Set(
        exercises.map(item => item.exercise_name?.trim()).filter(Boolean)
      )
    ]

    const { data: previousExercises, error: exerciseError } = await supabase
      .from('session_exercises')
      .select('*')
      .in('session_id', previousSessionIds)
      .eq('user_id', user.id)
      .in('exercise_name', exerciseNames)

    if (exerciseError) {
      console.error('Previous exercise lookup error:', exerciseError)
      setPreviousPerformance({})
      return
    }

    if (!previousExercises?.length) {
      setPreviousPerformance({})
      return
    }

    const previousExerciseIds = previousExercises.map(item => item.id)

    const { data: previousSets, error: setsError } = await supabase
      .from('workout_sets')
      .select('*')
      .in('session_exercise_id', previousExerciseIds)
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('set_number')

    if (setsError) {
      console.error('Previous sets lookup error:', setsError)
      setPreviousPerformance({})
      return
    }

    const sessionMap = new Map(
      previousSessions.map(item => [item.id, item])
    )

    const performanceMap = {}

    exercises.forEach(currentExercise => {
      const matchingExercises = previousExercises
        .filter(item =>
          item.exercise_name?.trim().toLowerCase() ===
          currentExercise.exercise_name?.trim().toLowerCase()
        )
        .sort((a, b) => {
          const dateA = sessionMap.get(a.session_id)?.completed_at || ''
          const dateB = sessionMap.get(b.session_id)?.completed_at || ''
          return new Date(dateB) - new Date(dateA)
        })

      for (const previousExercise of matchingExercises) {
        const previousSession = sessionMap.get(previousExercise.session_id)

        const previousSetsForExercise = (previousSets || [])
          .filter(item => item.session_exercise_id === previousExercise.id)
          .sort((a, b) => a.set_number - b.set_number)

        if (!previousSetsForExercise.length) continue

        const weights = previousSetsForExercise
          .map(item => Number(item.weight_kg || 0))
          .filter(weight => weight > 0)

        performanceMap[currentExercise.id] = {
          date: previousSession?.session_date || previousSession?.completed_at,
          sets: previousSetsForExercise,
          bestWeight: weights.length ? Math.max(...weights) : 0,
          sessionId: previousSession?.id
        }

        break
      }
    })

    setPreviousPerformance(performanceMap)
  }

  const loadSession = async activeSession => {
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('session_exercises')
      .select('*')
      .eq('session_id', activeSession.id)
      .eq('user_id', user.id)
      .order('exercise_order')

    if (exerciseError) {
      alert('Unable to load active workout: ' + exerciseError.message)
      return
    }

    const loadedExercises = exerciseData || []
    setSession(activeSession)
    setSessionExercises(loadedExercises)

    if (loadedExercises.length) {
      const ids = loadedExercises.map(item => item.id)

      const { data: setData, error: setError } = await supabase
        .from('workout_sets')
        .select('*')
        .in('session_exercise_id', ids)
        .eq('user_id', user.id)
        .order('set_number')

      if (setError) {
        alert('Unable to load workout sets: ' + setError.message)
        return
      }

      const grouped = {}
      loadedExercises.forEach(item => { grouped[item.id] = [] })

      ;(setData || []).forEach(item => {
        if (!grouped[item.session_exercise_id]) {
          grouped[item.session_exercise_id] = []
        }
        grouped[item.session_exercise_id].push(item)
      })

      setSets(grouped)
    } else {
      setSets({})
    }

    setExpandedExercise(loadedExercises[0]?.id || null)

    await loadPreviousPerformance(loadedExercises, activeSession)
  }

  useEffect(() => {
    loadInitialData()
  }, [user.id])

  useEffect(() => {
    if (!timerRunning || restSeconds <= 0) return

    const timer = window.setInterval(() => {
      setRestSeconds(current => {
        if (current <= 1) {
          window.clearInterval(timer)
          setTimerRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [timerRunning, restSeconds > 0])

  const handlePlanChange = async planId => {
    setSelectedPlan(planId)
    await loadDays(planId)
  }

  const startWorkout = async () => {
    if (!selectedPlan || !selectedDay) {
      alert('Select a workout plan and day first.')
      return
    }

    if (session) {
      alert('Finish or cancel your current workout before starting another.')
      return
    }

    setSaving(true)

    const { data: plannedExercises, error: plannedError } = await supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('plan_day_id', selectedDay)
      .eq('user_id', user.id)
      .order('exercise_order')

    if (plannedError) {
      setSaving(false)
      alert('Unable to load planned exercises: ' + plannedError.message)
      return
    }

    const { data: newSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        plan_id: selectedPlan,
        workout_plan_day_id: selectedDay,
        started_at: new Date().toISOString(),
        session_date: localDate(),
        status: 'in_progress',
      })
      .select()
      .single()

    if (sessionError) {
      setSaving(false)
      alert('Unable to start workout: ' + sessionError.message)
      return
    }

    if (plannedExercises?.length) {
      const exerciseRows = plannedExercises.map((exercise, index) => ({
        session_id: newSession.id,
        user_id: user.id,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        exercise_order: index + 1,
        notes: exercise.notes || null,
      }))

      const { data: insertedExercises, error: insertExerciseError } =
        await supabase
          .from('session_exercises')
          .insert(exerciseRows)
          .select()

      if (insertExerciseError) {
        await supabase.from('workout_sessions')
          .update({ status: 'cancelled' })
          .eq('id', newSession.id)

        setSaving(false)
        alert('Unable to prepare workout exercises: ' + insertExerciseError.message)
        return
      }

      const setRows = []

      insertedExercises.forEach((item, index) => {
        const planned = plannedExercises[index]
        const count = Math.max(1, Number(planned.sets) || 3)
        const targetReps = parseInt(planned.reps, 10) || 10

        for (let number = 1; number <= count; number++) {
          setRows.push({
            session_exercise_id: item.id,
            user_id: user.id,
            set_number: number,
            reps: targetReps,
            weight_kg: null,
            completed: false,
            set_type: 'working',
          })
        }
      })

      if (setRows.length) {
        const { error: setError } = await supabase
          .from('workout_sets')
          .insert(setRows)

        if (setError) {
          setSaving(false)
          alert('Workout started, but sets could not be created: ' + setError.message)
          await loadSession(newSession)
          return
        }
      }
    }

    setSaving(false)
    await loadSession(newSession)
    setHistory(current => [newSession, ...current])
  }

  const updateSet = async (setId, field, value, exerciseId) => {
    const updatedValue = value === '' ? null : Number(value)

    const { error } = await supabase
      .from('workout_sets')
      .update({ [field]: updatedValue })
      .eq('id', setId)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to save set: ' + error.message)
      return
    }

    setSets(current => ({
      ...current,
      [exerciseId]: (current[exerciseId] || []).map(item =>
        item.id === setId ? { ...item, [field]: updatedValue } : item
      ),
    }))
  }

  const toggleSet = async (setItem, exerciseId) => {
    const nextValue = !setItem.completed

    const { error } = await supabase
      .from('workout_sets')
      .update({ completed: nextValue })
      .eq('id', setItem.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to update set: ' + error.message)
      return
    }

    setSets(current => ({
      ...current,
      [exerciseId]: (current[exerciseId] || []).map(item =>
        item.id === setItem.id
          ? { ...item, completed: nextValue }
          : item
      ),
    }))

    if (nextValue) {
      const exercise = sessionExercises.find(item => item.id === exerciseId)
      const plannedDay = days.find(item => item.id === session?.workout_plan_day_id)

      const { data: planExercise } = await supabase
        .from('workout_plan_exercises')
        .select('rest_seconds')
        .eq('plan_day_id', plannedDay?.id || '')
        .eq('exercise_name', exercise?.exercise_name)
        .eq('user_id', user.id)
        .maybeSingle()

      setRestSeconds(planExercise?.rest_seconds || 90)
      setTimerRunning(true)
    }
  }

  const addSet = async exerciseId => {
    const currentSets = sets[exerciseId] || []
    const nextNumber = currentSets.length
      ? Math.max(...currentSets.map(item => item.set_number)) + 1
      : 1

    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        session_exercise_id: exerciseId,
        user_id: user.id,
        set_number: nextNumber,
        reps: 10,
        weight_kg: null,
        completed: false,
        set_type: 'working',
      })
      .select()
      .single()

    if (error) {
      alert('Unable to add set: ' + error.message)
      return
    }

    setSets(current => ({
      ...current,
      [exerciseId]: [...(current[exerciseId] || []), data],
    }))
  }

  const removeSet = async (exerciseId, setItem) => {
    if (!window.confirm(`Remove set ${setItem.set_number}?`)) return

    const { error } = await supabase
      .from('workout_sets')
      .delete()
      .eq('id', setItem.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to remove set: ' + error.message)
      return
    }

    setSets(current => ({
      ...current,
      [exerciseId]: (current[exerciseId] || []).filter(
        item => item.id !== setItem.id
      ),
    }))
  }

  const skipExercise = async exercise => {
    if (!window.confirm(`Skip ${exercise.exercise_name} for this workout?`)) return

    const { error } = await supabase
      .from('session_exercises')
      .delete()
      .eq('id', exercise.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to skip exercise: ' + error.message)
      return
    }

    setSessionExercises(current => current.filter(item => item.id !== exercise.id))
    setSets(current => {
      const next = { ...current }
      delete next[exercise.id]
      return next
    })

    setPreviousPerformance(current => {
      const next = { ...current }
      delete next[exercise.id]
      return next
    })
  }

  const addExercise = async exerciseId => {
    const exercise = library.find(item => item.id === exerciseId)
    if (!exercise || !session) return

    const { data, error } = await supabase
      .from('session_exercises')
      .insert({
        session_id: session.id,
        user_id: user.id,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        exercise_order: sessionExercises.length + 1,
      })
      .select()
      .single()

    if (error) {
      alert('Unable to add exercise: ' + error.message)
      return
    }

    const count = exercise.suggested_sets || 3
    const reps = parseInt(exercise.suggested_reps, 10) || 10
    const rows = Array.from({ length: count }, (_, index) => ({
      session_exercise_id: data.id,
      user_id: user.id,
      set_number: index + 1,
      reps,
      weight_kg: null,
      completed: false,
      set_type: 'working',
    }))

    const { data: insertedSets, error: setError } = await supabase
      .from('workout_sets')
      .insert(rows)
      .select()

    if (setError) {
      alert('Exercise added, but sets could not be created: ' + setError.message)
      return
    }

    setSessionExercises(current => [...current, data])
    setSets(current => ({ ...current, [data.id]: insertedSets || [] }))
    setExpandedExercise(data.id)

    await loadPreviousPerformance([...sessionExercises, data], session)
  }

  const finishWorkout = async status => {
    const message = status === 'completed'
      ? 'Finish and save this workout?'
      : 'Cancel this workout?'

    if (!window.confirm(message)) return

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Unable to update workout: ' + error.message)
      return
    }

    setSession(null)
    setSessionExercises([])
    setSets({})
    setPreviousPerformance({})
    setRestSeconds(0)
    setTimerRunning(false)
    await loadInitialData()
  }

  const completedSets = Object.values(sets).flat()
    .filter(item => item.completed).length

  const totalSets = Object.values(sets).flat().length

  if (loading) {
    return <div className="panel loading-panel">Loading Workout Logger...</div>
  }

  return (
    <div className="feature-page workout-logger">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">TRAINING SESSION</p>
          <h1>Workout Logger</h1>
          <p className="subtitle">Track every set, record your performance and build consistency.</p>
        </div>
        <button className="secondary-button" onClick={() => setShowHistory(!showHistory)}>
          <History size={17} /> {showHistory ? 'Hide history' : 'Workout history'}
        </button>
      </div>

      {session ? (
        <>
          <section className="panel logger-active-header">
            <div>
              <span className="tag green-tag">Workout in progress</span>
              <h2>{days.find(day => day.id === session.workout_plan_day_id)?.day_name || 'Workout session'}</h2>
              <p>Started {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="logger-progress">
              <strong>{completedSets}/{totalSets}</strong>
              <span>Sets completed</span>
            </div>
          </section>

          <section className="panel rest-timer">
            <div className="rest-timer-info">
              <Clock size={20} />
              <div>
                <strong>Rest timer</strong>
                <span>{restSeconds > 0 ? 'Time remaining' : 'Ready when you are'}</span>
              </div>
            </div>
            <strong className="timer-display">
              {String(Math.floor(restSeconds / 60)).padStart(2, '0')}:{String(restSeconds % 60).padStart(2, '0')}
            </strong>
            <div className="timer-actions">
              <button className="secondary-button" onClick={() => { setRestSeconds(60); setTimerRunning(true) }}>60s</button>
              <button className="secondary-button" onClick={() => { setRestSeconds(90); setTimerRunning(true) }}>90s</button>
              <button className="secondary-button" onClick={() => { setRestSeconds(120); setTimerRunning(true) }}>120s</button>
              <button className="secondary-button" onClick={() => setTimerRunning(!timerRunning)} disabled={restSeconds === 0}>
                {timerRunning ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button className="secondary-button" onClick={() => { setTimerRunning(false); setRestSeconds(0) }}>Reset</button>
            </div>
          </section>

          <div className="logger-exercise-heading">
            <h2>Exercises</h2>
            <span>{sessionExercises.length} exercises</span>
          </div>

          {sessionExercises.map((exercise, index) => {
            const exerciseSets = sets[exercise.id] || []
            const isExpanded = expandedExercise === exercise.id
            const previous = previousPerformance[exercise.id]
            const libraryExercise = library.find(item => item.id === exercise.exercise_id)
              || library.find(item => item.name?.trim().toLowerCase() === exercise.exercise_name?.trim().toLowerCase())
            const exerciseActivation = libraryExercise ? getExerciseActivation(libraryExercise) : []

            return (
              <section className="panel logger-exercise-card" key={exercise.id}>
                <div className="logger-exercise-header">
                  <button
                    className="logger-exercise-toggle"
                    onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                  >
                    <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <strong>{exercise.exercise_name}</strong>
                      <small>{exerciseSets.filter(item => item.completed).length}/{exerciseSets.length} sets completed</small>
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button className="icon-button danger-icon" title="Skip exercise" onClick={() => skipExercise(exercise)}>
                    <SkipForward size={17} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="logger-set-area">
                    <div className="previous-performance">
                      <div className="previous-performance-heading">
                        <div>
                          <TrendingUp size={17} />
                          <strong>Previous Performance</strong>
                        </div>
                        {previous?.date && (
                          <span>
                            {new Date(previous.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>

                      {previous ? (
                        <>
                          <div className="previous-performance-summary">
                            <div>
                              <span>Previous best weight</span>
                              <strong>
                                {previous.bestWeight > 0
                                  ? `${previous.bestWeight} kg`
                                  : 'Not recorded'}
                              </strong>
                            </div>
                            <div>
                              <span>Previous completed sets</span>
                              <strong>{previous.sets.length}</strong>
                            </div>
                          </div>

                          <div className="previous-set-list">
                            {previous.sets.map((previousSet, previousIndex) => (
                              <div className="previous-set-row" key={previousSet.id}>
                                <span>Set {previousSet.set_number || previousIndex + 1}</span>
                                <strong>
                                  {previousSet.weight_kg != null
                                    ? `${previousSet.weight_kg} kg`
                                    : '—'}
                                </strong>
                                <strong>{previousSet.reps ?? '—'} reps</strong>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="previous-performance-empty">
                          No previous completed performance found. Your first workout will be recorded here.
                        </p>
                      )}
                    </div>

                    <div className="logger-muscle-breakdown">
                      <div className="logger-muscle-breakdown-heading">
                        <span><Activity size={15} /> Muscle activation</span>
                        <small>Estimated emphasis</small>
                      </div>
                      {exerciseActivation.length ? (
                        <div className="logger-muscle-targets">
                          {exerciseActivation.map((item, activationIndex) => (
                            <div className="logger-muscle-target" key={`${item.muscle}-${item.region}-${activationIndex}`}>
                              <span><i className={`activation-dot ${item.level || 'moderate'}`} />{item.region || item.muscle}</span>
                              <small className={`logger-muscle-level ${item.level || 'moderate'}`}>{item.level || 'moderate'}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="logger-muscle-empty">Muscle-region information is not available for this exercise yet.</p>
                      )}
                    </div>

                    <div className="logger-set-head">
                      <span>Set</span>
                      <span>Weight (kg)</span>
                      <span>Reps</span>
                      <span>Done</span>
                      <span />
                    </div>

                    {exerciseSets.map(setItem => (
                      <div className={`logger-set-row ${setItem.completed ? 'set-completed' : ''}`} key={setItem.id}>
                        <strong>{setItem.set_number}</strong>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          defaultValue={setItem.weight_kg ?? ''}
                          placeholder="0"
                          onBlur={event => {
                            const value = event.target.value
                            if (value !== String(setItem.weight_kg ?? '')) {
                              updateSet(setItem.id, 'weight_kg', value, exercise.id)
                            }
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          defaultValue={setItem.reps ?? ''}
                          onBlur={event => {
                            const value = event.target.value
                            if (value !== String(setItem.reps ?? '')) {
                              updateSet(setItem.id, 'reps', value, exercise.id)
                            }
                          }}
                        />
                        <button
                          className={`set-check ${setItem.completed ? 'done' : ''}`}
                          onClick={() => toggleSet(setItem, exercise.id)}
                          title={setItem.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {setItem.completed ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                        </button>
                        <button className="icon-button danger-icon" onClick={() => removeSet(exercise.id, setItem)} title="Remove set">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <button className="secondary-button add-set-button" onClick={() => addSet(exercise.id)}>
                      <Plus size={15} /> Add set
                    </button>
                  </div>
                )}
              </section>
            )
          })}

          <section className="panel logger-add-exercise">
            <label>
              <Dumbbell size={18} /> Add another exercise
              <select defaultValue="" onChange={event => {
                if (event.target.value) {
                  addExercise(event.target.value)
                  event.target.value = ''
                }
              }}>
                <option value="" disabled>Select from exercise library...</option>
                {library.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </section>

          <div className="logger-finish-actions">
            <button className="secondary-button" onClick={() => finishWorkout('cancelled')}>
              Cancel workout
            </button>
            <button className="primary-button" onClick={() => finishWorkout('completed')}>
              <CheckCircle2 size={17} /> Finish workout
            </button>
          </div>
        </>
      ) : (
        <section className="panel logger-start-panel">
          <div className="logger-start-icon"><Activity size={30} /></div>
          <h2>Ready to train?</h2>
          <p>Choose a plan and workout day to start recording your sets.</p>

          {plans.length === 0 ? (
            <p className="logger-warning">You don't have a workout plan yet. Create one in My Plans first.</p>
          ) : (
            <div className="logger-selectors">
              <label>
                Workout plan
                <select value={selectedPlan} onChange={event => handlePlanChange(event.target.value)}>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}{plan.is_active ? ' (Active)' : ''}</option>
                  ))}
                </select>
              </label>

              <label>
                Workout day
                <select value={selectedDay} onChange={event => setSelectedDay(event.target.value)}>
                  {days.map(day => (
                    <option key={day.id} value={day.id}>Day {day.day_order} — {day.day_name}</option>
                  ))}
                </select>
              </label>

              {!days.length && <p className="logger-warning">Add workout days to this plan before starting.</p>}

              <button className="primary-button full-button" onClick={startWorkout} disabled={saving || !selectedDay}>
                <Play size={17} /> {saving ? 'Preparing workout...' : 'Start workout'}
              </button>
            </div>
          )}
        </section>
      )}

      {showHistory && (
        <section className="panel logger-history">
          <div className="panel-header">
            <div>
              <h2>Recent workouts</h2>
              <p>Your latest training sessions</p>
            </div>
            <button className="icon-button" onClick={loadInitialData} title="Refresh history">
              <RefreshCw size={17} />
            </button>
          </div>

          {history.filter(item => item.status !== 'in_progress').length === 0 ? (
            <p className="day-empty">Completed workouts will appear here.</p>
          ) : (
            history.filter(item => item.status !== 'in_progress').map(item => (
              <div className="logger-history-row" key={item.id}>
                <div>
                  <strong>{plans.find(plan => plan.id === item.plan_id)?.name || 'Workout session'}</strong>
                  <span>{new Date(item.started_at).toLocaleDateString()} · {new Date(item.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className={`tag ${item.status === 'completed' ? 'green-tag' : ''}`}>
                  {item.status === 'completed' ? 'Completed' : 'Cancelled'}
                </span>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  )
}

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
