/** Routes only parents should land on after login. */
export function isParentExclusivePath(pathname) {
  if (!pathname) return false
  if (pathname === '/parent-dashboard' || pathname.startsWith('/parent-dashboard/'))
    return true
  if (pathname === '/parent' || pathname.startsWith('/parent/')) return true
  return false
}

/** Routes a parent may return to after re-auth (shared app paths allowed). */
function isAllowedReturnPathForParent(pathname) {
  if (!pathname || pathname === '/login') return false
  if (pathname === '/') return true
  if (isParentExclusivePath(pathname)) return true
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true
  return false
}

export function homePathForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'parent') return '/parent-dashboard'
  return '/teacher'
}

/**
 * After login / session restore, pick a safe path: never send a teacher to
 * parent-only URLs (stale `location.state.from` from a previous parent session).
 */
export function pathAfterAuth(role, fromPathname) {
  const home = homePathForRole(role)
  if (!fromPathname || fromPathname === '/login') return home

  if (role === 'parent') {
    if (fromPathname === '/') return home
    return isAllowedReturnPathForParent(fromPathname) ? fromPathname : home
  }

  if (role === 'teacher') {
    if (isParentExclusivePath(fromPathname)) return home
    return fromPathname
  }

  if (role === 'admin') {
    if (isParentExclusivePath(fromPathname)) return home
    if (fromPathname === '/teacher' || fromPathname.startsWith('/teacher/')) return home
    return fromPathname
  }

  return home
}
