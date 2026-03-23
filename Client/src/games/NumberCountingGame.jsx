import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const ROUNDS = 5
const ICON = '🍎'

/** Count objects and pick the correct number. */
export function NumberCountingGame({ meta, onComplete }) {
  const color = meta?.color ?? '#22C55E'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [count, setCount] = useState(1)
  const [choices, setChoices] = useState([])

  useEffect(() => {
    const n = 1 + Math.floor(Math.random() * 10)
    setCount(n)
    const wrong = new Set()
    while (wrong.size < 3) {
      const w = 1 + Math.floor(Math.random() * 10)
      if (w !== n) wrong.add(w)
    }
    setChoices([n, ...[...wrong]].sort(() => Math.random() - 0.5))
  }, [round])

  function pick(n) {
    if (n !== count) return
    const next = score + 20
    setScore(next)
    if (round + 1 >= ROUNDS) onComplete(next)
    else setRound((r) => r + 1)
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-4">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS} — How many do you see?
      </p>
      <div
        className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 p-6 rounded-3xl mx-auto max-w-2xl"
        style={{ backgroundColor: `${color}18` }}
      >
        {Array.from({ length: count }, (_, i) => (
          <motion.span
            key={`${round}-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="text-4xl md:text-5xl"
          >
            {ICON}
          </motion.span>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
        {choices.map((n, index) => (
          <motion.button
            key={`${round}-c-${n}`}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => pick(n)}
            className="text-3xl font-bold py-5 rounded-2xl shadow-md text-white"
            style={{ backgroundColor: color }}
          >
            {n}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
