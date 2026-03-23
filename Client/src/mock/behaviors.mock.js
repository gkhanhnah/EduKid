export const mockBehaviors = [
  {
    _id: '607f1f77bcf86cd799439021',
    student: { _id: '507f1f77bcf86cd799439011', name: 'Alex Nguyen' },
    studentId: { _id: '507f1f77bcf86cd799439011', name: 'Alex Nguyen' },
    type: 'GOOD',
    behaviorType: 'GOOD',
    note: 'Helped a classmate with an exercise.',
    description: 'Helped a classmate with an exercise.',
    date: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: '607f1f77bcf86cd799439022',
    student: { _id: '507f1f77bcf86cd799439012', name: 'Sam Patel' },
    studentId: { _id: '507f1f77bcf86cd799439012', name: 'Sam Patel' },
    type: 'ACTIVE',
    behaviorType: 'ACTIVE',
    note: 'Seemed tired during reading time.',
    description: 'Seemed tired during reading time.',
    date: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
]
