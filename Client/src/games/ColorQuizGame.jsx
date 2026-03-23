import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const ROUNDS = 5

const PALETTE = [
  { name: 'red', label: 'Red', hex: '#ef4444' },
  { name: 'blue', label: 'Blue', hex: '#3b82f6' },
  { name: 'green', label: 'Green', hex: '#22c55e' },
  { name: 'yellow', label: 'Yellow', hex: '#eab308' },
  { name: 'purple', label: 'Purple', hex: '#a855f7' },
  { name: 'orange', label: 'Orange', hex: '#f97316' },
]

/** “Which card is {color}?” */
export function ColorQuizGame({ meta, onComplete }) {
  const accent = meta?.color ?? '#8B5CF6'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [answerName, setAnswerName] = useState('red')
  const [options, setOptions] = useState([])

  useEffect(() => {
    const correct = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    setAnswerName(correct.name)
    const wrong = []
    while (wrong.length < 3) {
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      if (c.name !== correct.name && !wrong.some((w) => w.name === c.name)) {
        wrong.push(c)
      }
    }
    setOptions([correct, ...wrong].sort(() => Math.random() - 0.5))
  }, [round])

  const answerLabel = PALETTE.find((c) => c.name === answerName)?.label ?? answerName

  function pick(name) {
    if (name !== answerName) return
    const next = score + 20
    setScore(next)
    if (round + 1 >= ROUNDS) onComplete(next)
    else setRound((r) => r + 1)
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-2">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}
      </p>
      <h3 className="text-2xl font-semibold mb-8" style={{ color: accent }}>
        Which one is <span className="underline decoration-4">{answerLabel}</span>?
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {options.map((c, index) => (
          <motion.button
            key={`${round}-${c.name}`}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => pick(c.name)}
            className="h-32 md:h-40 rounded-2xl shadow-lg border-4 border-white ring-2 ring-black/5"
            style={{ backgroundColor: c.hex }}
            aria-label={c.label}
          />
        ))}
      </div>
    </div>
  )
}
