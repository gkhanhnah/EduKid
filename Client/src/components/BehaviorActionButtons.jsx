const LABELS = {
  GOOD: 'Good 👍',
  BAD: 'Bad 👎',
  SLEEPY: 'Sleepy 😴',
}

export function BehaviorActionButtons({ busy, onAction }) {
  return (
    <div className="behavior-actions">
      {(['GOOD', 'BAD', 'SLEEPY']).map((type) => (
        <button
          key={type}
          type="button"
          className={`btn btn-behavior btn-behavior-${type.toLowerCase()}`}
          disabled={busy}
          onClick={() => onAction(type)}
        >
          {LABELS[type]}
        </button>
      ))}
    </div>
  )
}
