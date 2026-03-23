export function LoadingState({ label = 'Loading…' }) {
  return (
    <p className="state state-loading" role="status">
      {label}
    </p>
  )
}
