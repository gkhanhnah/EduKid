import { useState } from 'react'

export function StudentForm({ onSubmit, submitLabel = 'Add student' }) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        classId: classId.trim() || undefined,
        parentEmail: parentEmail.trim() || undefined,
      })
      setName('')
      setClassId('')
      setParentEmail('')
    } catch (err) {
      setError(err.message || 'Could not save student.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card student-form" onSubmit={handleSubmit}>
      <h2 className="card-title">Add student</h2>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        <span>Name</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      </label>
      <label className="field">
        <span>Class ID</span>
        <input
          name="classId"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="field">
        <span>Parent email</span>
        <input
          name="parentEmail"
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
