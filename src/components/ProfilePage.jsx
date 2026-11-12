import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, CalendarDays, Check, Dumbbell, Edit3, Mail, Ruler,
  Save, Scale, Target, UserRound, X, Award
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import './ProfilePage.css'

const DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

const GOALS = [
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'strength', label: 'Build strength' },
  { value: 'maintenance', label: 'Maintain fitness' },
  { value: 'general_fitness', label: 'General fitness' },
]

const EXPERIENCE = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const EMPTY_PROFILE = {
  display_name: '',
  height_cm: '',
  fitness_goal: 'general_fitness',
  training_experience: 'beginner',
  preferred_workout_days: [],
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function getInitials(value) {
  const words = String(value || 'LiftLab Member').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'LL'
}

function ProfileStat({ icon: Icon, label, value, detail }) {
  return (
    <div className="profile-stat-card">
      <span className="profile-stat-icon"><Icon size={18} /></span>
      <span className="profile-stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [draft, setDraft] = useState(EMPTY_PROFILE)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({ weight: null, workouts: 0, activePlan: 'No active plan' })

  const fallbackName = useMemo(() => {
    const metadataName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
    return metadataName || user?.email?.split('@')[0] || 'LiftLab Member'
  }, [user])

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const [profileResult, weightResult, workoutResult, planResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('body_weight_logs').select('weight_kg, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('workout_plans').select('name').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle(),
      ])

      if (profileResult.error) throw profileResult.error
      if (weightResult.error) throw weightResult.error
      if (workoutResult.error) throw workoutResult.error
      if (planResult.error) throw planResult.error

      const loaded = {
        ...EMPTY_PROFILE,
        ...(profileResult.data || {}),
        display_name: profileResult.data?.display_name || fallbackName,
        height_cm: profileResult.data?.height_cm ?? '',
        preferred_workout_days: Array.isArray(profileResult.data?.preferred_workout_days)
          ? profileResult.data.preferred_workout_days.map(Number)
          : [],
      }
      setProfile(loaded)
      setDraft(loaded)
      setStats({
        weight: weightResult.data?.weight_kg ?? null,
        workouts: workoutResult.count || 0,
        activePlan: planResult.data?.name || 'No active plan',
      })
    } catch (err) {
      console.error('Profile loading error:', err)
      setError(err.message || 'Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }, [user, fallbackName])

  // Load the signed-in user's profile and related training summary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProfile() }, [loadProfile])

  const updateDraft = (field, value) => setDraft(current => ({ ...current, [field]: value }))

  const toggleDay = day => {
    setDraft(current => {
      const selected = new Set(current.preferred_workout_days || [])
      if (selected.has(day)) selected.delete(day)
      else selected.add(day)
      return { ...current, preferred_workout_days: [...selected].sort((a, b) => DAYS.findIndex(d => d.value === a) - DAYS.findIndex(d => d.value === b)) }
    })
  }

  const saveProfile = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    const height = draft.height_cm === '' ? null : Number(draft.height_cm)
    if (height !== null && (!Number.isFinite(height) || height < 80 || height > 250)) {
      setError('Enter a valid height between 80 and 250 cm.')
      return
    }
    if (!draft.display_name.trim()) {
      setError('Please enter a display name.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        display_name: draft.display_name.trim(),
        height_cm: height,
        fitness_goal: draft.fitness_goal,
        training_experience: draft.training_experience,
        preferred_workout_days: draft.preferred_workout_days || [],
        updated_at: new Date().toISOString(),
      }
      const { error: saveError } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'user_id' })
      if (saveError) throw saveError
      setProfile({ ...draft, height_cm: height ?? '' })
      setDraft({ ...draft, height_cm: height ?? '' })
      setEditing(false)
      setMessage('Your profile has been updated.')
    } catch (err) {
      console.error('Profile save error:', err)
      setError(err.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setDraft(profile)
    setEditing(false)
    setError('')
  }

  const goalLabel = GOALS.find(item => item.value === profile.fitness_goal)?.label || 'General fitness'
  const experienceLabel = EXPERIENCE.find(item => item.value === profile.training_experience)?.label || 'Beginner'
  const preferredDays = DAYS.filter(day => profile.preferred_workout_days?.includes(day.value)).map(day => day.label)
  const displayName = profile.display_name || fallbackName

  if (loading) return <div className="loading-panel">Loading your profile...</div>

  return (
    <div className="feature-page profile-page">
      <div className="page-heading profile-page-heading">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1>My Profile</h1>
          <p>Manage your personal details and fitness preferences.</p>
        </div>
        {!editing ? (
          <button className="primary-button" onClick={() => { setMessage(''); setEditing(true) }}>
            <Edit3 size={15} /> Edit profile
          </button>
        ) : (
          <div className="profile-heading-actions">
            <button className="secondary-button" onClick={cancelEdit}><X size={15} /> Cancel</button>
            <button className="primary-button" type="submit" form="profile-edit-form" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="inline-error" role="alert">{error}</div>}
      {message && <div className="profile-success" role="status"><Check size={16} /> {message}</div>}

      <section className="profile-hero panel">
        <div className="profile-avatar">{getInitials(displayName)}</div>
        <div className="profile-hero-copy">
          <span className="profile-member-label">LIFTLAB MEMBER</span>
          <h2>{displayName}</h2>
          <p><Mail size={14} /> {user?.email || 'Email unavailable'}</p>
          <small>Joined {formatDate(user?.created_at)}</small>
        </div>
        <div className="profile-hero-badge"><Award size={16} /> Fitness journey in progress</div>
      </section>

      <div className="profile-stats-grid">
        <ProfileStat icon={Scale} label="Current weight" value={stats.weight == null ? '—' : `${Number(stats.weight).toFixed(1)} kg`} detail="Latest recorded weight" />
        <ProfileStat icon={Activity} label="Workouts completed" value={stats.workouts} detail="All-time completed sessions" />
        <ProfileStat icon={Dumbbell} label="Active plan" value={stats.activePlan} detail="Currently selected plan" />
      </div>

      <form id="profile-edit-form" onSubmit={saveProfile} className="profile-content-grid">
        <section className="panel profile-section">
          <div className="profile-section-heading"><span><UserRound size={18} /></span><div><h2>Personal information</h2><p>Your basic profile details.</p></div></div>
          <div className="profile-fields-grid">
            <label className="profile-field profile-field-full">Display name
              <input disabled={!editing} value={draft.display_name} onChange={event => updateDraft('display_name', event.target.value)} maxLength={60} placeholder="Your name" />
            </label>
            <label className="profile-field">Email address
              <input value={user?.email || ''} disabled readOnly />
              <small>Email is managed by your login account.</small>
            </label>
            <label className="profile-field">Height (cm)
              <input type="number" min="80" max="250" step="0.1" disabled={!editing} value={draft.height_cm} onChange={event => updateDraft('height_cm', event.target.value)} placeholder="e.g. 171" />
            </label>
          </div>
        </section>

        <section className="panel profile-section">
          <div className="profile-section-heading"><span><Target size={18} /></span><div><h2>Fitness profile</h2><p>Keep your training preferences up to date.</p></div></div>
          <div className="profile-fields-grid">
            <label className="profile-field">Fitness goal
              <select disabled={!editing} value={draft.fitness_goal} onChange={event => updateDraft('fitness_goal', event.target.value)}>
                {GOALS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="profile-field">Training experience
              <select disabled={!editing} value={draft.training_experience} onChange={event => updateDraft('training_experience', event.target.value)}>
                {EXPERIENCE.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          {!editing && <div className="profile-readonly-summary"><span>Goal: <strong>{goalLabel}</strong></span><span>Experience: <strong>{experienceLabel}</strong></span></div>}
        </section>

        <section className="panel profile-section profile-days-section">
          <div className="profile-section-heading"><span><CalendarDays size={18} /></span><div><h2>Preferred workout days</h2><p>Select the days you usually plan to train.</p></div></div>
          <div className="profile-day-options">
            {DAYS.map(day => {
              const selected = (draft.preferred_workout_days || []).includes(day.value)
              return (
                <button key={day.value} type="button" disabled={!editing} className={`profile-day-option ${selected ? 'selected' : ''}`} onClick={() => toggleDay(day.value)}>
                  {selected && <Check size={13} />}{day.label}
                </button>
              )
            })}
          </div>
          {!editing && <p className="profile-days-summary">{preferredDays.length ? preferredDays.join(' · ') : 'No preferred days selected yet.'}</p>}
        </section>
      </form>

      <p className="profile-privacy-note"><Ruler size={14} /> Your profile details are private to your LiftLab account. Your email address cannot be changed here.</p>
    </div>
  )
}
