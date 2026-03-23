import { useCallback, useRef, useState } from 'react'
import { Sidebar } from '../components/Sidebar.jsx'
import {
  Sparkles,
  Wand2,
  BookOpen,
  ClipboardList,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { generateLessonPlan } from '../services/aiLessonService.js'

const QUICK_TOPICS = [
  { topic: 'Letter A', icon: '🅰️' },
  { topic: 'Numbers 1-10', icon: '🔢' },
  { topic: 'Colors', icon: '🎨' },
  { topic: 'Shapes', icon: '🔷' },
  { topic: 'Animals', icon: '🦁' },
  { topic: 'Family', icon: '👨‍👩‍👧' },
  { topic: 'Weather', icon: '🌤️' },
  { topic: 'Fruits', icon: '🍎' },
]

function stripMeta(lesson) {
  if (!lesson || typeof lesson !== 'object') return lesson
  const { _meta, ...rest } = lesson
  return rest
}

function formatLessonForCopy(lesson) {
  const L = stripMeta(lesson)
  const lines = [
    L.title || 'Lesson plan',
    '',
    `Objective: ${L.objective || ''}`,
    '',
    'Materials:',
    ...(Array.isArray(L.materials) ? L.materials.map((m) => `• ${m}`) : []),
    '',
    `Warmup: ${L.warmup || ''}`,
    '',
    'Activities:',
  ]
  if (Array.isArray(L.activities)) {
    L.activities.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.name || 'Activity'}`)
      lines.push(`   ${a.description || ''}`)
      lines.push('')
    })
  }
  lines.push(`Assessment: ${L.assessment || ''}`)
  lines.push('')
  lines.push(`Homework: ${L.homework || ''}`)
  return lines.join('\n')
}

export function AILessonGenerator() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lessonPlan, setLessonPlan] = useState(null)
  const [copyDone, setCopyDone] = useState(false)

  /** Simple session cache: topic (lowercase) → last successful lesson */
  const cacheRef = useRef(new Map())

  const runGenerate = useCallback(
    async (opts = {}) => {
      const { skipCache = false } = opts
      const t = topic.trim()
      if (!t) return

      setError('')
      setCopyDone(false)

      const key = t.toLowerCase()
      if (!skipCache && cacheRef.current.has(key)) {
        setLessonPlan(cacheRef.current.get(key))
        return
      }

      setLoading(true)
      try {
        const data = await generateLessonPlan(t)
        cacheRef.current.set(key, data)
        setLessonPlan(data)
      } catch (e) {
        const msg =
          e?.response?.data?.error ||
          e?.message ||
          'Could not generate lesson plan.'
        setError(msg)
        setLessonPlan(null)
      } finally {
        setLoading(false)
      }
    },
    [topic],
  )

  async function handleCopy() {
    if (!lessonPlan) return
    const text = formatLessonForCopy(lessonPlan)
    try {
      await navigator.clipboard.writeText(text)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    } catch {
      setError('Clipboard access failed. Copy manually from the sections below.')
    }
  }

  function handleTryAgain() {
    const t = topic.trim()
    if (t) cacheRef.current.delete(t.toLowerCase())
    runGenerate({ skipCache: true })
  }

  const display = lessonPlan ? stripMeta(lessonPlan) : null
  const usedFallback = lessonPlan?._meta?.usedFallback

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2 flex items-center gap-3 text-2xl md:text-3xl font-bold">
              <Sparkles className="w-9 h-9 text-[#8B5CF6]" />
              AI Lesson Generator
            </h1>
            <p className="text-[1.05rem] text-muted-foreground">
              Generate structured Grade 1 lesson plans using OpenRouter.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg border border-border mb-8">
            <label htmlFor="topic" className="block mb-3 font-medium text-foreground">
              What topic would you like to teach?
            </label>
            <input
              id="topic"
              type="text"
              placeholder="e.g., Numbers 1-10, Colors, Shapes…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              className="w-full px-6 py-4 bg-background border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-[1.05rem] disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && topic.trim() && !loading) {
                  e.preventDefault()
                  runGenerate()
                }
              }}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runGenerate()}
                disabled={!topic.trim() || loading}
                className="flex-1 min-w-[200px] bg-gradient-to-r from-[#8B5CF6] to-primary text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <Wand2 className="w-6 h-6" />
                    </motion.span>
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Generate lesson plan
                  </>
                )}
              </button>
              {lessonPlan && !loading ? (
                <>
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {copyDone ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    {copyDone ? 'Copied!' : 'Copy lesson plan'}
                  </button>
                </>
              ) : null}
            </div>

            {error ? (
              <div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Something went wrong</p>
                  <p className="mt-1 opacity-90">{error}</p>
                  {topic.trim() ? (
                    <button
                      type="button"
                      onClick={handleTryAgain}
                      className="mt-3 text-sm underline font-medium"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {!lessonPlan ? (
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-border">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-lg">
                <BookOpen className="w-6 h-6 text-primary" />
                Quick topics
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Click to fill the topic field, then press Generate.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {QUICK_TOPICS.map((item) => (
                  <motion.button
                    key={item.topic}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTopic(item.topic)}
                    disabled={loading}
                    className="p-5 rounded-2xl bg-accent hover:bg-primary hover:text-white transition-all text-center disabled:opacity-50"
                  >
                    <div className="text-[2.5rem] mb-2">{item.icon}</div>
                    <div className="text-[0.9rem] font-medium">{item.topic}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : null}

          {display ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 mt-8"
            >
              {usedFallback ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  The model returned non-JSON text; a safe template was merged in. Try
                  &quot;Try again&quot; for a fresh completion.
                </p>
              ) : null}

              <div className="bg-gradient-to-r from-[#8B5CF6] to-primary text-white rounded-3xl p-8 shadow-lg">
                <h2 className="text-sm uppercase tracking-wide opacity-90 mb-2">Title</h2>
                <h3 className="text-2xl font-bold leading-tight">{display.title}</h3>
              </div>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Objective
                </h3>
                <p className="text-muted-foreground leading-relaxed">{display.objective}</p>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-4">Materials</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {(display.materials || []).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-3">Warmup</h3>
                <p className="text-muted-foreground leading-relaxed">{display.warmup}</p>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-6">Activities</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {(display.activities || []).map((act, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.06 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-[#E0E7FF]/80 to-[#FEF3C7]/80 border border-primary/15"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-8 h-8 rounded-full bg-primary text-white text-sm flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold">{act.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {act.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-3">Assessment</h3>
                <p className="text-muted-foreground leading-relaxed">{display.assessment}</p>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-lg border border-border">
                <h3 className="font-semibold text-lg mb-3">Homework</h3>
                <p className="text-muted-foreground leading-relaxed">{display.homework}</p>
              </section>

              <div className="flex flex-wrap gap-3 pb-8">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white shadow-md hover:opacity-95"
                >
                  <Copy className="w-5 h-5" />
                  Copy lesson plan
                </button>
                <button
                  type="button"
                  onClick={handleTryAgain}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-border hover:bg-muted disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLessonPlan(null)
                    setError('')
                    setCopyDone(false)
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-muted hover:bg-muted/80"
                >
                  New topic
                </button>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
