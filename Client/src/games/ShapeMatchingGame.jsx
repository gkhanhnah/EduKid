import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const ROUNDS = 5

const SHAPES = [
  {
    id: 'circle',
    label: 'Circle',
    Filled: () => <div className="w-20 h-20 rounded-full bg-amber-500 mx-auto" />,
    Outline: ({ active }) => (
      <div
        className={`w-20 h-20 rounded-full border-4 mx-auto ${
          active ? 'border-primary bg-primary/10' : 'border-amber-600'
        }`}
      />
    ),
  },
  {
    id: 'square',
    label: 'Square',
    Filled: () => <div className="w-20 h-20 bg-sky-500 mx-auto" />,
    Outline: ({ active }) => (
      <div
        className={`w-20 h-20 border-4 mx-auto ${
          active ? 'border-primary bg-primary/10' : 'border-sky-700'
        }`}
      />
    ),
  },
  {
    id: 'triangle',
    label: 'Triangle',
    Filled: () => (
      <div className="w-0 h-0 border-l-[40px] border-r-[40px] border-b-[70px] border-l-transparent border-r-transparent border-b-violet-600 mx-auto" />
    ),
    Outline: ({ active }) => (
      <div
        className={`w-0 h-0 border-l-[40px] border-r-[40px] border-b-[70px] border-l-transparent border-r-transparent mx-auto ${
          active ? 'border-b-primary' : 'border-b-violet-800'
        }`}
      />
    ),
  },
]

/** Match the solid shape to the correct outline. */
export function ShapeMatchingGame({ meta, onComplete }) {
  const color = meta?.color ?? '#F59E0B'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [targetId, setTargetId] = useState('circle')
  const [order, setOrder] = useState([])

  useEffect(() => {
    const t = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    setTargetId(t.id)
    const rest = SHAPES.filter((s) => s.id !== t.id)
    const shuffled = [t, ...rest].sort(() => Math.random() - 0.5)
    setOrder(shuffled.map((s) => s.id))
  }, [round])

  const target = SHAPES.find((s) => s.id === targetId)
  const Filled = target?.Filled

  function pick(id) {
    if (id !== targetId) return
    const next = score + 20
    setScore(next)
    if (round + 1 >= ROUNDS) onComplete(next)
    else setRound((r) => r + 1)
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-6">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS} — Tap the outline that matches
      </p>
      <div
        className="rounded-3xl p-8 mb-10 mx-auto max-w-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <p className="text-sm font-medium text-muted-foreground mb-4">{target?.label}</p>
        {Filled ? (
          <motion.div
            key={targetId + round}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Filled />
          </motion.div>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {order.map((id, index) => {
          const s = SHAPES.find((x) => x.id === id)
          if (!s) return null
          const O = s.Outline
          return (
            <motion.button
              key={`${round}-${id}`}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => pick(id)}
              className="p-6 rounded-2xl border-2 border-border bg-white shadow-sm hover:border-primary/40 transition-colors"
            >
              <O active={false} />
              <span className="text-xs text-muted-foreground mt-3 block">{s.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
