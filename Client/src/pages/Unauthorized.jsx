import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function Unauthorized() {
  const { user } = useAuth()

  const backTo =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'parent'
        ? '/parent-dashboard'
        : '/teacher'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-3">Unauthorized</h1>
        <p className="text-muted-foreground text-sm">
          Your account doesn&apos;t have access to this area.
        </p>
        <div className="mt-6">
          <Link
            to={backTo}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

