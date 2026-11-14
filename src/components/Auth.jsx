
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Dumbbell, Mail, Lock, Eye, EyeOff, ArrowLeft, Activity, Target, TrendingUp } from 'lucide-react'
import './AuthPage.css'

const getAppRedirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).toString()

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const clearMessages = () => {
    setMessage('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (mode === 'register') {
        if (password.length < 8) {
          throw new Error('Password must contain at least 8 characters.')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAppRedirectUrl(),
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Account created successfully. You can now continue.')
        } else {
          setMessage('Registration successful! Please check your email to verify your account.')
        }
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAppRedirectUrl(),
        })

        if (error) throw error

        setMessage('Password recovery instructions have been sent to your email, if an account exists.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login: 'Welcome back',
    register: 'Create your account',
    forgot: 'Reset your password',
  }

  return (
    <div className="auth-screen">
      <aside className="auth-showcase" aria-label="LiftLab introduction">
        <div className="auth-showcase-brand"><div className="auth-brand-icon"><Dumbbell size={23} /></div><span>Lift<span style={{ color: 'var(--accent)' }}>Lab</span></span></div>
        <div className="auth-showcase-copy">
          <span className="auth-showcase-kicker"><Activity size={14} /> TRAIN WITH INTENTION</span>
          <h2>Build strength.<br /><span>Track progress.</span><br />Stay consistent.</h2>
          <p>Your training, workouts and progress come together in one focused space. Make every session count.</p>
        </div>
        <div className="auth-showcase-points">
          <div className="auth-showcase-point"><strong><Target size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Your plans</strong><span>Training built around you</span></div>
          <div className="auth-showcase-point"><strong><Activity size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Your sessions</strong><span>Log every set and rep</span></div>
          <div className="auth-showcase-point"><strong><TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Your progress</strong><span>See consistency add up</span></div>
        </div>
      </aside>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Dumbbell size={25} />
          </div>
          <span>Lift<span>Lab</span></span>
        </div>

        <div className="auth-heading">
          <h1>{titles[mode]}</h1>
          <p>
            {mode === 'login' && 'Sign in to continue your fitness journey.'}
            {mode === 'register' && 'Create an account to start tracking your progress.'}
            {mode === 'forgot' && 'Enter your email to receive password recovery instructions.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <div className="auth-input-wrap">
            <Mail size={18} />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <>
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-forgot"
              onClick={() => {
                clearMessages()
                setMode('forgot')
              }}
            >
              Forgot password?
            </button>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                  ? 'Create account'
                  : 'Send recovery email'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <>
              Don't have an account?{' '}
              <button onClick={() => { clearMessages(); setMode('register') }}>
                Create account
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              Already have an account?{' '}
              <button onClick={() => { clearMessages(); setMode('login') }}>
                Sign in
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <button onClick={() => { clearMessages(); setMode('login') }}>
              <ArrowLeft size={15} /> Back to sign in
            </button>
          )}
        </div>

        <div className="auth-footer">
          Your fitness journey, tracked.
        </div>
      </div>
    </div>
  )
}
