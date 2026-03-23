import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const ROUNDS = 4
const WORDS = ['CAT', 'DOG', 'SUN', 'MAP']

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/** Drag letters into slots to spell the word (HTML5 DnD). */
export function WordBuilderGame({ meta, onComplete }) {
  const color = meta?.color ?? '#06B6D4'
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [word, setWord] = useState('CAT')
  const [pool, setPool] = useState([])
  const [slots, setSlots] = useState(['', '', ''])

  const resetRound = useCallback((w, rIndex) => {
    setWord(w)
    const letters = w.split('')
    setPool(
      shuffle(
        letters.map((letter, i) => ({
          id: `p-${rIndex}-${i}-${letter}-${Math.random().toString(36).slice(2, 7)}`,
          letter,
        })),
      ),
    )
    setSlots(Array(letters.length).fill(''))
  }, [])

  useEffect(() => {
    const w = WORDS[round % WORDS.length]
    resetRound(w, round)
  }, [round, resetRound])

  function dragStartPool(e, item) {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ source: 'pool', id: item.id, letter: item.letter }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  function dragStartSlot(e, index) {
    if (!slots[index]) return
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ source: 'slot', index }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  function dropSlot(e, index) {
    e.preventDefault()
    let data
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return
    }
    if (data.source === 'pool') {
      if (slots[index]) return
      setPool((p) => p.filter((x) => x.id !== data.id))
      setSlots((s) => {
        const n = [...s]
        n[index] = data.letter
        return n
      })
    } else if (data.source === 'slot') {
      const from = data.index
      if (from === index || !slots[from]) return
      setSlots((s) => {
        const n = [...s]
        const t = n[index]
        n[index] = n[from]
        n[from] = t
        return n
      })
    }
  }

  function dropPool(e) {
    e.preventDefault()
    let data
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return
    }
    if (data.source !== 'slot') return
    const letter = slots[data.index]
    if (!letter) return
    setSlots((s) => {
      const n = [...s]
      n[data.index] = ''
      return n
    })
    setPool((p) => [
      ...p,
      {
        id: `back-${Date.now()}-${letter}`,
        letter,
      },
    ])
  }

  function checkWord() {
    const built = slots.join('')
    if (built !== word) return
    const next = score + 25
    setScore(next)
    if (round + 1 >= ROUNDS) onComplete(next)
    else setRound((r) => r + 1)
  }

  return (
    <div className="text-center max-w-xl mx-auto">
      <p className="text-muted-foreground mb-4">
        Round {Math.min(round + 1, ROUNDS)} / {ROUNDS} — Spell the word
      </p>
      <p className="text-2xl font-bold mb-6 tracking-widest" style={{ color }}>
        {word.split('').map(() => '•').join(' ')}
      </p>
      <div className="flex justify-center gap-2 mb-8">
        {slots.map((ch, i) => (
          <div
            key={i}
            role="presentation"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dropSlot(e, i)}
            draggable={!!ch}
            onDragStart={(e) => dragStartSlot(e, i)}
            className="w-14 h-16 md:w-16 md:h-20 rounded-xl border-2 border-dashed border-primary/40 flex items-center justify-center text-3xl font-bold bg-white shadow-inner select-none"
          >
            {ch || '—'}
          </div>
        ))}
      </div>
      <div
        role="presentation"
        onDragOver={(e) => e.preventDefault()}
        onDrop={dropPool}
        className="flex flex-wrap justify-center gap-2 min-h-[4rem] p-4 rounded-2xl mb-6"
        style={{ backgroundColor: `${color}14` }}
      >
        {pool.map((item) => (
          <motion.span
            key={item.id}
            draggable
            onDragStart={(e) => dragStartPool(e, item)}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-xl font-bold cursor-grab active:cursor-grabbing bg-white shadow border border-border"
          >
            {item.letter}
          </motion.span>
        ))}
      </div>
      <button
        type="button"
        onClick={checkWord}
        disabled={slots.some((c) => !c)}
        className="px-8 py-3 rounded-2xl text-white font-medium disabled:opacity-40 shadow-lg"
        style={{ backgroundColor: color }}
      >
        Check word
      </button>
      <p className="text-xs text-muted-foreground mt-6">
        Drag letters into the boxes. Drag from a box to the letter row to put it back.
      </p>
    </div>
  )
}
