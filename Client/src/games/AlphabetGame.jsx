import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

const ROUNDS = 5
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Pick the matching letter — {ROUNDS} correct answers, then onComplete(totalScore). */
export function AlphabetGame({ meta, onComplete }) {
  const color = meta?.color ?? '#4F46E5'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [currentLetter, setCurrentLetter] = useState('A')
  const [options, setOptions] = useState([])

  const nextQuestion = useCallback(() => {
    const ri = Math.floor(Math.random() * 26)
    const correct = LETTERS[ri]
    setCurrentLetter(correct)
    const wrong = []
    while (wrong.length < 3) {
      const w = LETTERS[Math.floor(Math.random() * 26)]
      if (w !== correct && !wrong.includes(w)) wrong.push(w)
    }
    setOptions([correct, ...wrong].sort(() => Math.random() - 0.5))
  }, [])

  useEffect(() => {
    nextQuestion()
  }, [round, nextQuestion])

  function pick(letter) {
    if (letter !== currentLetter) return
    const nextScore = score + 20
    setScore(nextScore)
    confetti({ particleCount: 55, spread: 55, origin: { y: 0.62 } })
    if (round + 1 >= ROUNDS) {
      onComplete(nextScore)
    } else {
      setRound((r) => r + 1)
    }
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-2">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}
      </p>
      <motion.div
        key={currentLetter}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-10"
      >
        <div
          className="inline-block text-[6rem] md:text-[8rem] p-10 md:p-12 rounded-[2.5rem] shadow-xl"
          style={{ backgroundColor: `${color}22` }}
        >
          {currentLetter}
        </div>
        <p className="text-xl mt-6 text-muted-foreground">
          Tap the matching letter:{' '}
          <span className="font-bold" style={{ color }}>
            {currentLetter}
          </span>
        </p>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {options.map((letter, index) => (
          <motion.button
            key={`${round}-${letter}`}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => pick(letter)}
            className="text-4xl md:text-5xl py-6 rounded-2xl shadow-md border-2 border-transparent hover:border-primary transition-all"
            style={{ backgroundColor: `${color}12` }}
          >
            {letter}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
