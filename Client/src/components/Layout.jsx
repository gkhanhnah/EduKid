import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-brand">EduKid</p>
        <h1 className="app-title">Classroom management</h1>
        <nav className="app-nav" aria-label="Main">
          <NavLink to="/" end>
            Classroom
          </NavLink>
          <NavLink to="/students">Student management</NavLink>
          <NavLink to="/behaviors">Behavior history</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
