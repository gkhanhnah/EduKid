import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Sidebar } from '../../components/Sidebar.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useSocket } from '../../hooks/useSocket.js'
import { fetchClassChat } from '../../services/chat.service.js'
import { ArrowLeft, Send, AtSign } from 'lucide-react'

const MENTION_REGEX = /(?:^|\s)@([\p{L}\d_.-]*)$/u // typing "@..." at the end
const MENTIONS_IN_TEXT = /(?:^|\s)@([\p{L}\d_.-]+)/gu // extracting "@name" tokens

function firstNameHandle(name) {
  const s = (name ?? '').trim()
  if (!s) return ''
  return s.split(/\s+/)[0].toLowerCase()
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function mergeDedupe(prev, msg) {
  const id = msg?._id != null ? String(msg._id) : null
  const cid =
    typeof msg?.clientMessageId === 'string' && msg.clientMessageId.trim()
      ? String(msg.clientMessageId).trim()
      : null
  if (id || cid) {
    const exists = prev.some((m) => {
      if (id && String(m._id) === id) return true
      if (!cid) return false
      const mc =
        typeof m?.clientMessageId === 'string' ? String(m.clientMessageId).trim() : ''
      return mc === cid
    })
    return exists ? prev : [...prev, msg]
  }
  return [...prev, msg]
}

function renderContentWithHighlights({ content, msgMentions, isTagAll, meId }) {
  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return text

  const mentionHandles = new Set((msgMentions || []).map((u) => firstNameHandle(u?.name)))
  const parts = text.split(/(\s+)/) // keep whitespace tokens

  return parts.map((part, i) => {
    const isMentionToken = part.startsWith('@')
    if (!isMentionToken) return <span key={i}>{part}</span>

    const rawHandle = part.slice(1).toLowerCase()
    if (isTagAll && rawHandle === 'all') {
      return (
        <span key={i} className="px-1 rounded bg-primary/15 text-primary font-medium">
          {part}
        </span>
      )
    }

    if (mentionHandles.has(rawHandle)) {
      const isMeMention = (msgMentions || []).some((u) => String(u._id) === String(meId))
      return (
        <span
          key={i}
          className={`px-1 rounded font-medium ${
            isMeMention ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-foreground'
          }`}
        >
          {part}
        </span>
      )
    }

    return <span key={i}>{part}</span>
  })
}

export function GroupChat() {
  const { classId } = useParams()
  const { user } = useAuth()
  const { socketRef, connected, instanceId } = useSocket()

  const meId = user?.id ?? user?._id
  const backHref = user?.role === 'parent' ? '/parent-dashboard' : `/classes/${classId}`

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classInfo, setClassInfo] = useState(null)
  const [participants, setParticipants] = useState([])
  const [viewerIsMainTeacher, setViewerIsMainTeacher] = useState(false)

  const [messages, setMessages] = useState([])

  const [messageText, setMessageText] = useState('')
  /** Keeps latest draft in sync with the textarea DOM (Enter can fire before React commits last onChange). */
  const messageTextRef = useRef('')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)

  // Dedupe guard: prevents duplicated messages when socket listener runs twice (dev/StrictMode).
  const seenMessageIdsRef = useRef(new Set())

  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  const listEndRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchClassChat(classId)
      setClassInfo(data?.class || null)
      setParticipants(Array.isArray(data?.participants) ? data.participants : [])
      setViewerIsMainTeacher(Boolean(data?.viewer?.isMainTeacher))
      const list = Array.isArray(data?.messages) ? data.messages : []
      const seen = new Set()
      for (const m of list) {
        if (m?._id != null) seen.add(String(m._id))
        const cid =
          typeof m?.clientMessageId === 'string' && m.clientMessageId.trim()
            ? String(m.clientMessageId).trim()
            : ''
        if (cid) seen.add(`cid:${cid}`)
      }
      seenMessageIdsRef.current = seen
      setMessages(list)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load chat')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    load()
  }, [load])

  const participantHandles = useMemo(() => {
    return participants.map((p) => ({
      ...p,
      handle: firstNameHandle(p?.name),
    }))
  }, [participants])

  const derivedMention = useMemo(() => {
    if (!messageText) return null
    const m = messageText.match(MENTION_REGEX)
    if (!m) return null
    const q = m[1] || ''
    return { q: q.trim().toLowerCase() }
  }, [messageText])

  useEffect(() => {
    const d = derivedMention
    if (!d) {
      setMentionOpen(false)
      setMentionQuery('')
      return
    }
    setMentionOpen(true)
    setMentionQuery(d.q)
  }, [derivedMention])

  const filteredMentions = useMemo(() => {
    if (!mentionOpen) return []
    const q = mentionQuery
    const list = participantHandles.filter((p) => {
      if (!p.handle) return false
      if (!q) return true
      return p.handle.includes(q)
    })
    return list
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 8)
  }, [mentionOpen, mentionQuery, participantHandles])

  const scrollToBottom = useCallback(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Join room when socket is ready.
  useEffect(() => {
    const s = socketRef.current
    if (!s || !classId) return undefined

    s.emit('JOIN_CLASS_ROOM', { classId }, (res) => {
      if (!res?.ok) {
        // keep UI in error state only if user can't access.
        setError(res?.error || 'Forbidden')
      }
    })
    return undefined
  }, [socketRef, instanceId, classId])

  useEffect(() => {
    const s = socketRef.current
    if (!s || !meId) return undefined

    function onReceive(msg) {
      const mid = msg?._id != null ? String(msg._id) : null
      const cid =
        typeof msg?.clientMessageId === 'string' && msg.clientMessageId.trim()
          ? String(msg.clientMessageId).trim()
          : null
      if (mid && seenMessageIdsRef.current.has(mid)) return
      if (cid && seenMessageIdsRef.current.has(`cid:${cid}`)) return
      if (mid) seenMessageIdsRef.current.add(mid)
      if (cid) seenMessageIdsRef.current.add(`cid:${cid}`)
      setMessages((prev) => mergeDedupe(prev, msg))
    }

    s.on('RECEIVE_GROUP_MESSAGE', onReceive)
    return () => {
      s.off('RECEIVE_GROUP_MESSAGE', onReceive)
    }
  }, [socketRef, instanceId, meId])

  function computeMentionsAndTagAllFromText(text) {
    const raw = typeof text === 'string' ? text : ''
    const mentions = new Set()
    let tagAllRequested = false

    for (const match of raw.matchAll(MENTIONS_IN_TEXT)) {
      const token = match[1] || ''
      const t = token.trim().toLowerCase()
      if (!t) continue
      if (t === 'all') {
        tagAllRequested = true
        continue
      }

      const found = participantHandles.find(
        (p) => p.handle && p.handle.toLowerCase() === t,
      )
      if (found?._id) {
        mentions.add(String(found._id))
      }
    }

    const isTagAll = viewerIsMainTeacher && tagAllRequested
    return { mentions: [...mentions], isTagAll }
  }

  const handleSend = useCallback(async () => {
    if (sending || sendingRef.current) return
    const s = socketRef.current
    if (!s) return
    if (!connected) return
    if (!classId) return

    const raw = typeof messageTextRef.current === 'string' ? messageTextRef.current : ''
    const text = raw.trim()
    if (!text) {
      setSendError('Message is required')
      return
    }

    setSendError('')
    setSending(true)
    sendingRef.current = true

    const clientMessageId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    const { mentions, isTagAll } = computeMentionsAndTagAllFromText(text)

    const releaseSend = () => {
      sendingRef.current = false
      setSending(false)
    }

    const ackTimeout = setTimeout(() => {
      releaseSend()
    }, 12_000)

    messageTextRef.current = ''
    setMessageText('')
    setMentionOpen(false)
    setMentionQuery('')

    s.emit(
      'SEND_GROUP_MESSAGE',
      {
        classId,
        message: text,
        mentions,
        isTagAll,
        clientMessageId,
      },
      (res) => {
        clearTimeout(ackTimeout)
        if (!res?.ok) {
          setSendError(res?.error || 'Could not send message')
          messageTextRef.current = text
          setMessageText(text)
        }
        releaseSend()
      },
    )
  }, [sending, socketRef, connected, classId, participantHandles, viewerIsMainTeacher])

  function insertMention(handle) {
    const raw = messageText || ''
    const lastAt = raw.lastIndexOf('@')
    if (lastAt < 0) {
      const next = `${raw} @${handle} `
      messageTextRef.current = next
      setMessageText(next)
      return
    }
    const before = raw.slice(0, lastAt)
    const next = `${before}@${handle} `
    messageTextRef.current = next
    setMessageText(next)
    setMentionOpen(false)
    setMentionQuery('')
  }

  function toggleTagAll() {
    if (!viewerIsMainTeacher) return
    const raw = messageText || ''
    if (/(?:^|\s)@all\b/i.test(raw)) return
    const next = raw.trimEnd()
    const tag = next ? `${next} @all ` : '@all '
    messageTextRef.current = tag
    setMessageText(tag)
  }

  const myIdStr = meId != null ? String(meId) : ''

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              Loading chat…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
              {error}
              <div className="mt-4">
                <button type="button" className="underline text-sm" onClick={load}>
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold">
                      Class chat
                      {classInfo?.grade !== undefined &&
                      classInfo?.grade !== null &&
                      classInfo?.grade !== '' ? (
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                          · Grade {classInfo.grade}
                        </span>
                      ) : null}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {participants.length} participants
                    </p>
                  </div>

                  {viewerIsMainTeacher ? (
                    <button
                      type="button"
                      onClick={toggleTagAll}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm hover:bg-accent"
                    >
                      <AtSign className="w-4 h-4" />
                      @all
                    </button>
                  ) : (
                    <div className="text-xs text-muted-foreground pt-2">
                      Read/write chat · @all disabled
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="text-xs text-muted-foreground">
                    Type <span className="font-medium text-foreground">@</span> to mention users.
                  </div>
                </div>

                <div
                  className="h-[520px] overflow-auto p-4"
                >
                  {messages.length ? (
                    <ul className="space-y-3">
                      {messages.map((m) => {
                        const senderId = m?.sender?._id ? String(m.sender._id) : ''
                        const isMine = senderId && senderId === myIdStr
                        const meMentioned =
                          m?.isTagAll ||
                          (Array.isArray(m?.mentions) &&
                            m.mentions.some((u) => String(u._id) === myIdStr))

                        return (
                          <li key={m._id} className={isMine ? 'text-right' : 'text-left'}>
                            <div
                              className={[
                                'inline-block max-w-[82%] rounded-2xl border p-3 shadow-sm',
                                isMine
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'bg-white border-border',
                                m?.isTagAll ? 'ring-1 ring-primary/20' : '',
                                meMentioned ? 'ring-1 ring-primary/30' : '',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <div className="text-xs text-muted-foreground">
                                  {m?.sender?.name || 'Unknown'}
                                </div>
                                <div className="text-[11px] text-muted-foreground shrink-0">
                                  {formatTime(m?.createdAt)}
                                </div>
                              </div>
                              <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {renderContentWithHighlights({
                                  content: m?.message,
                                  msgMentions: m?.mentions,
                                  isTagAll: Boolean(m?.isTagAll),
                                  meId: myIdStr,
                                })}
                              </div>
                            </div>
                            {meMentioned && !isMine ? (
                              <div className="text-[11px] text-primary mt-1">You were mentioned</div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No messages yet.
                    </div>
                  )}
                  <div ref={listEndRef} />
                </div>

                <div className="p-4 border-t border-border">
                  <div className="relative">
                    {mentionOpen && filteredMentions.length ? (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-10">
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Mention users
                        </div>
                        <ul className="max-h-56 overflow-auto">
                          {filteredMentions.map((p) => (
                            <li key={p._id}>
                              <button
                                type="button"
                                onClick={() => insertMention(p.handle)}
                                className="w-full text-left px-3 py-2 hover:bg-accent"
                              >
                                <div className="text-sm font-medium">
                                  @{p.handle} <span className="text-muted-foreground font-normal">· {p.role}</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {p.name}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <textarea
                        value={messageText}
                        onChange={(e) => {
                          const v = e.target.value
                          messageTextRef.current = v
                          setMessageText(v)
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing)
                            return
                          e.preventDefault()
                          void handleSend()
                        }}
                        placeholder="Write a message…"
                        className="flex-1 min-h-[48px] max-h-40 p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !connected}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-white disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                    {sendError ? (
                      <div className="mt-2 text-sm text-destructive">{sendError}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

