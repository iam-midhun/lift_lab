import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Trash2, RotateCcw, ShieldAlert, X } from 'lucide-react'

const icons = {
  danger: Trash2,
  warning: AlertTriangle,
  reset: RotateCcw,
  security: ShieldAlert,
}

export default function ConfirmDialog({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  requireText,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const cancelRef = useRef(null)
  const inputRef = useRef(null)
  const onCancelRef = useRef(onCancel)
  const busyRef = useRef(busy)
  const Icon = icons[tone] || AlertTriangle

  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])
  useEffect(() => { busyRef.current = busy }, [busy])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const initialFocus = inputRef.current || cancelRef.current || closeRef.current
    initialFocus?.focus()

    const handleKeyDown = event => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        onCancelRef.current?.()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled)')
      const items = Array.from(focusable || [])
      if (!items.length) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  const handleConfirm = async () => {
    if (requireText && typed !== requireText) return
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err?.message || 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="ll-confirm-backdrop"
      onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}
    >
      <section
        ref={dialogRef}
        className={`ll-confirm-dialog tone-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby="ll-confirm-title"
        aria-describedby="ll-confirm-description"
      >
        <button ref={closeRef} type="button" className="ll-confirm-close" onClick={onCancel} disabled={busy} aria-label="Close confirmation">
          <X size={18} />
        </button>
        <div className="ll-confirm-icon"><Icon size={23} /></div>
        <p className="ll-confirm-eyebrow">{tone === 'danger' ? 'PLEASE CONFIRM' : tone === 'reset' ? 'DATA MANAGEMENT' : 'LIFTLAB NOTICE'}</p>
        <h2 id="ll-confirm-title">{title}</h2>
        <p className="ll-confirm-description" id="ll-confirm-description">{description}</p>
        {requireText && (
          <label className="ll-confirm-typed-label">
            Type <strong>{requireText}</strong> to confirm
            <input
              ref={inputRef}
              value={typed}
              onChange={event => setTyped(event.target.value)}
              placeholder={requireText}
              autoComplete="off"
              spellCheck="false"
            />
          </label>
        )}
        {error && <div className="ll-confirm-error" role="alert">{error}</div>}
        <div className="ll-confirm-actions">
          <button ref={cancelRef} type="button" className="ll-confirm-cancel" onClick={onCancel} disabled={busy}>{cancelText}</button>
          <button
            type="button"
            className="ll-confirm-submit"
            onClick={handleConfirm}
            disabled={busy || (requireText && typed !== requireText)}
          >
            {busy ? 'Please wait…' : confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}
