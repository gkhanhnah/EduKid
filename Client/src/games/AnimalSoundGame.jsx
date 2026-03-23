import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const ROUNDS = 5

const ANIMALS = [
  { id: 'dog', label: 'Dog', emoji: '🐕', phrase: 'Woof! Woof!' },
  { id: 'cat', label: 'Cat', emoji: '🐈', phrase: 'Meow!' },
  { id: 'cow', label: 'Cow', emoji: '🐄', phrase: 'Moo!' },
  { id: 'duck', label: 'Duck', emoji: '🦆', phrase: 'Quack quack!' },
  { id: 'bird', label: 'Bird', emoji: '🐦', phrase: 'Tweet tweet!' },
  { id: 'lion', label: 'Lion', emoji: '🦁', phrase: 'Roar!' },
]

/** Listen to the spoken cue and pick the animal. */
export function AnimalSoundGame({ meta, onComplete }) {
  const color = meta?.color ?? '#EF4444'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [targetId, setTargetId] = useState('dog')
  const [options, setOptions] = useState([])

  useEffect(() => {
    const correct = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    setTargetId(correct.id)
    const wrong = []
    while (wrong.length < 3) {
      const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
      if (a.id !== correct.id && !wrong.some((w) => w.id === a.id)) {
        wrong.push(a)
      }
    }
    setOptions([correct, ...wrong].sort(() => Math.random() - 0.5))
  }, [round])

  const target = ANIMALS.find((a) => a.id === targetId)

  useEffect(() => {
    if (!target?.phrase || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(
      `Which animal says this? ${target.phrase}`,
    )
    u.rate = 0.95
    window.speechSynthesis.speak(u)
    return () => window.speechSynthesis.cancel()
  }, [round, target?.phrase])

  function replay() {
    if (!target?.phrase || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(target.phrase)
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  }

  function pick(id) {
    if (id !== targetId) return
    const next = score + 20
    setScore(next)
    if (typeof window !== 'undefined') window.speechSynthesis.cancel()
    if (round + 1 >= ROUNDS) onComplete(next)
    else setRound((r) => r + 1)
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-4">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={replay}
        className="mb-8 px-6 py-3 rounded-2xl text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        🔊 Play sound again
      </motion.button>
      <p className="text-lg text-muted-foreground mb-8">Which animal makes that sound?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {options.map((a, index) => (
          <motion.button
            key={`${round}-${a.id}`}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => pick(a.id)}
            className="p-6 rounded-2xl border-2 border-border bg-white shadow-md text-5xl hover:border-primary/30"
          >
            {a.emoji}
            <span className="block text-sm text-muted-foreground mt-2">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
