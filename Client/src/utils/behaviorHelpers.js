function idString(id) {
  if (id == null) return ''
  return typeof id === 'object' && id !== null && 'toString' in id
    ? String(id)
    : String(id)
}

export function attachStudentNames(behaviors, students) {
  const map = new Map(students.map((s) => [idString(s._id), s.name]))
  return behaviors.map((b) => ({
    ...b,
    studentName: map.get(idString(b.studentId)) ?? 'Unknown student',
  }))
}
