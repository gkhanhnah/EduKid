import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Image as ImageIcon, MoreVertical, Paperclip, Search, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import { useSocket } from '../../hooks/useSocket.js'
import { Link, useLocation } from 'react-router-dom'
import {
  fetchMessageContacts,
  fetchMessageHistory,
  uploadMessageFile,
} from '../../services/messageService.js'
import { fetchClassChat } from '../../services/chat.service.js'
import { getClasses as fetchTeacherClasses } from '../../services/classService.js'
import { getMyChildren } from '../../services/api.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'
import { formatDateTime } from '../../utils/locale.js'

function idPart(v) {
  if (v == null) return ''
  if (typeof v === 'object' && v._id != null) return String(v._id)
  if (typeof v === 'object' && v.id != null) return String(v.id)
  return String(v)
}

function convKey(c) {
  return `${c.peerUserId}:${c.studentId}`
}

function isBetweenPeers(msg, meId, peerId) {
  const a = idPart(msg.senderId)
  const b = idPart(msg.receiverId)
  const me = String(meId)
  const peer = String(peerId)
  return (
    (a === me && b === peer) || (a === peer && b === me)
  )
}

function mergeDedupe(prev, msg) {
  const id = msg?._id != null ? String(msg._id) : null
  if (id) {
    const exists = prev.some((m) => String(m._id) === id)
    if (exists) return prev
  }
  return [...prev, msg]
}

function isImageMime(mime) {
  return typeof mime === 'string' && mime.startsWith('image/')
}

const MESSAGE_PAGE_SIZE = 50
/** When scrollTop is below this, fetch older messages (lazy load). */
const SCROLL_LOAD_OLDER_PX = 120

export function Messages() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { socketRef, connected, instanceId } = useSocket()
  const meId = user?.id ?? user?._id
  const location = useLocation()
  const isInParentDashboard = location.pathname.startsWith('/parent-dashboard')

  const [chatMode, setChatMode] = useState('direct') // direct | class
  const [classChats, setClassChats] = useState([])
  const [groupSelected, setGroupSelected] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [groupHistoryLoading, setGroupHistoryLoading] = useState(false)
  const [groupHistoryError, setGroupHistoryError] = useState('')
  const [groupHasMoreOlder, setGroupHasMoreOlder] = useState(false)
  const [groupLoadingOlder, setGroupLoadingOlder] = useState(false)

  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState('')

  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const [messageText, setMessageText] = useState('')
  const [sendError, setSendError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [fileDraft, setFileDraft] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [outgoing, setOutgoing] = useState(false)

  const listEndRef = useRef(null)
  const scrollRef = useRef(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const groupSelectedRef = useRef(groupSelected)
  groupSelectedRef.current = groupSelected
  const fileInputRef = useRef(null)
  /** Skip auto-scroll after prepending older messages (direct chat). */
  const skipScrollToBottomRef = useRef(false)
  /** Skip auto-scroll after prepending older messages (class chat). */
  const skipGroupScrollToBottomRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
      return
    }
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (chatMode === 'class') return
    if (skipScrollToBottomRef.current) {
      skipScrollToBottomRef.current = false
      return
    }
    scrollToBottom()
  }, [messages, scrollToBottom, chatMode])

  useEffect(() => {
    if (chatMode !== 'class') return
    if (skipGroupScrollToBottomRef.current) {
      skipGroupScrollToBottomRef.current = false
      return
    }
    scrollToBottom()
  }, [groupMessages, scrollToBottom, chatMode])

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    setContactsError('')
    try {
      const list = await fetchMessageContacts()
      setContacts(list)
      setSelected((prev) => {
        if (!prev) return list[0] ?? null
        const k = convKey(prev)
        const found = list.find((c) => convKey(c) === k)
        return found ?? list[0] ?? null
      })
    } catch (e) {
      setContactsError(
        getUiErrorMessage(e, t('messagesPage.loadContactsFailed')),
      )
      setContacts([])
    } finally {
      setContactsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const loadClassChats = useCallback(async () => {
    setGroupLoading(true)
    setGroupError('')
    try {
      if (user?.role === 'teacher') {
        const list = await fetchTeacherClasses()
        const classes = Array.isArray(list) ? list : []
        setClassChats(
          classes.map((c) => ({
            classId: c._id,
            name: c.name,
            grade: c.grade,
          })),
        )
        return
      }

      if (user?.role === 'parent') {
        const kids = await getMyChildren()
        const map = new Map()
        for (const item of kids || []) {
          const cls = item?.student?.classId
          const cid = cls?._id ?? cls
          if (!cid) continue
          if (!map.has(String(cid))) {
            map.set(String(cid), {
              classId: String(cid),
              name: cls?.name || t('messagesPage.classFallback'),
              grade: cls?.grade,
            })
          }
        }
        setClassChats([...map.values()])
      }
    } catch (e) {
      setClassChats([])
      setGroupError(getUiErrorMessage(e, t('messagesPage.loadClassChatsFailed')))
    } finally {
      setGroupLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (chatMode !== 'class') return
    loadClassChats()
    // Reset selection when switching modes.
    setGroupSelected(null)
    setGroupMessages([])
    setGroupHasMoreOlder(false)
    setGroupHistoryLoading(false)
    setGroupHistoryError('')
  }, [chatMode, loadClassChats])

  useEffect(() => {
    if (!connected) setOutgoing(false)
  }, [connected])

  const loadHistory = useCallback(async (peerUserId) => {
    if (!peerUserId) {
      setMessages([])
      setHasMoreOlder(false)
      return
    }
    setHistoryLoading(true)
    setHistoryError('')
    setHasMoreOlder(false)
    try {
      const { messages: list, hasMore } = await fetchMessageHistory(peerUserId, {
        limit: MESSAGE_PAGE_SIZE,
      })
      setMessages(list)
      setHasMoreOlder(hasMore)
    } catch (e) {
      setHistoryError(
        getUiErrorMessage(e, t('messagesPage.loadMessagesFailed')),
      )
      setMessages([])
      setHasMoreOlder(false)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const loadOlderDirect = useCallback(async () => {
    const peer = selected?.peerUserId
    if (
      !peer ||
      !hasMoreOlder ||
      loadingOlder ||
      historyLoading ||
      messages.length === 0
    ) {
      return
    }
    const oldest = messages[0]
    const before = oldest?.createdAt
    if (!before) return

    setLoadingOlder(true)
    try {
      const el = scrollRef.current
      const prevScrollHeight = el?.scrollHeight ?? 0
      const prevScrollTop = el?.scrollTop ?? 0

      const { messages: older, hasMore } = await fetchMessageHistory(peer, {
        limit: MESSAGE_PAGE_SIZE,
        before,
      })

      skipScrollToBottomRef.current = true
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => String(m._id)))
        const merged = [
          ...older.filter((m) => !seen.has(String(m._id))),
          ...prev,
        ]
        return merged
      })
      setHasMoreOlder(hasMore)

      requestAnimationFrame(() => {
        const box = scrollRef.current
        if (!box) return
        const newHeight = box.scrollHeight
        box.scrollTop = newHeight - prevScrollHeight + prevScrollTop
      })
    } catch {
      // keep existing messages; user can scroll again to retry
    } finally {
      setLoadingOlder(false)
    }
  }, [
    selected?.peerUserId,
    hasMoreOlder,
    loadingOlder,
    historyLoading,
    messages,
  ])

  useEffect(() => {
    if (chatMode !== 'direct') return
    if (selected?.peerUserId) {
      loadHistory(selected.peerUserId)
    } else {
      setMessages([])
      setHasMoreOlder(false)
    }
  }, [selected, loadHistory, chatMode])

  useEffect(() => {
    const s = socketRef.current
    if (!s || !meId) return undefined
    if (chatMode !== 'direct') return undefined

    function onReceive(msg) {
      const sel = selectedRef.current
      if (!sel) return
      if (!isBetweenPeers(msg, meId, sel.peerUserId)) return
      setMessages((prev) => mergeDedupe(prev, msg))
    }

    s.on('receive_message', onReceive)
    return () => {
      s.off('receive_message', onReceive)
    }
  }, [socketRef, instanceId, meId, chatMode])

  // ===== Group class chat (GroupMessage) =====
  useEffect(() => {
    if (chatMode !== 'class') return
    if (!groupSelected) return

    const s = socketRef.current
    if (!s) return

    // Join class room for realtime updates.
    s.emit('JOIN_CLASS_ROOM', { classId: groupSelected })
  }, [chatMode, groupSelected, socketRef])

  const groupSelectedIdStr = groupSelected != null ? String(groupSelected) : ''

  useEffect(() => {
    if (chatMode !== 'class') return undefined
    if (!socketRef.current || !meId) return undefined

    function onReceive(msg) {
      if (!msg?.class) return
      const midClass = String(msg.class)
      if (midClass !== groupSelectedIdStr) return
      setGroupMessages((prev) => mergeDedupe(prev, msg))
    }

    socketRef.current.on('RECEIVE_GROUP_MESSAGE', onReceive)
    return () => {
      socketRef.current.off('RECEIVE_GROUP_MESSAGE', onReceive)
    }
  }, [chatMode, socketRef, instanceId, meId, groupSelectedIdStr])

  const loadGroupHistory = useCallback(async () => {
    if (chatMode !== 'class') return
    if (!groupSelected) return

    setGroupHistoryLoading(true)
    setGroupHistoryError('')
    setGroupHasMoreOlder(false)
    try {
      const data = await fetchClassChat(groupSelected, {
        limit: MESSAGE_PAGE_SIZE,
      })
      setGroupMessages(data.messages)
      setGroupHasMoreOlder(data.hasMore)
    } catch (e) {
      setGroupHistoryError(
        getUiErrorMessage(e, t('messagesPage.loadClassChatFailed')),
      )
      setGroupMessages([])
      setGroupHasMoreOlder(false)
    } finally {
      setGroupHistoryLoading(false)
    }
  }, [chatMode, groupSelected])

  const loadOlderGroup = useCallback(async () => {
    if (
      !groupSelected ||
      !groupHasMoreOlder ||
      groupLoadingOlder ||
      groupHistoryLoading ||
      groupMessages.length === 0
    ) {
      return
    }
    const oldest = groupMessages[0]
    const before = oldest?.createdAt
    if (!before) return

    setGroupLoadingOlder(true)
    try {
      const el = scrollRef.current
      const prevScrollHeight = el?.scrollHeight ?? 0
      const prevScrollTop = el?.scrollTop ?? 0

      const data = await fetchClassChat(groupSelected, {
        limit: MESSAGE_PAGE_SIZE,
        before,
      })
      const older = data.messages

      skipGroupScrollToBottomRef.current = true
      setGroupMessages((prev) => {
        const seen = new Set(prev.map((m) => String(m._id)))
        return [...older.filter((m) => !seen.has(String(m._id))), ...prev]
      })
      setGroupHasMoreOlder(data.hasMore)

      requestAnimationFrame(() => {
        const box = scrollRef.current
        if (!box) return
        box.scrollTop = box.scrollHeight - prevScrollHeight + prevScrollTop
      })
    } catch {
      // keep existing messages
    } finally {
      setGroupLoadingOlder(false)
    }
  }, [
    groupSelected,
    groupHasMoreOlder,
    groupLoadingOlder,
    groupHistoryLoading,
    groupMessages,
  ])

  useEffect(() => {
    if (chatMode !== 'class') return
    loadGroupHistory()
  }, [chatMode, groupSelected, loadGroupHistory])

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop > SCROLL_LOAD_OLDER_PX) return

    if (chatMode === 'class') {
      if (
        groupHistoryLoading ||
        groupLoadingOlder ||
        !groupHasMoreOlder ||
        !groupSelected ||
        groupMessages.length === 0
      ) {
        return
      }
      void loadOlderGroup()
    } else {
      if (
        historyLoading ||
        loadingOlder ||
        !hasMoreOlder ||
        !selected?.peerUserId ||
        messages.length === 0
      ) {
        return
      }
      void loadOlderDirect()
    }
  }, [
    chatMode,
    groupHistoryLoading,
    groupLoadingOlder,
    groupHasMoreOlder,
    groupSelected,
    groupMessages.length,
    loadOlderGroup,
    historyLoading,
    loadingOlder,
    hasMoreOlder,
    selected?.peerUserId,
    messages.length,
    loadOlderDirect,
  ])

  const filteredContacts = useMemo(() => {
    if (chatMode !== 'direct') return []
    const q = searchTerm.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        (c.peerName || '').toLowerCase().includes(q) ||
        (c.studentName || '').toLowerCase().includes(q),
    )
  }, [contacts, searchTerm])

  const filteredClassChats = useMemo(() => {
    if (chatMode !== 'class') return []
    const q = searchTerm.trim().toLowerCase()
    if (!q) return classChats
    return classChats.filter((c) => (c.name || '').toLowerCase().includes(q))
  }, [classChats, searchTerm, chatMode])

  const handleSendMessage = useCallback(async () => {
    if (outgoing) return
    const text = messageText.trim()
    const s = socketRef.current
    if (!s || !selected || !meId) return
    if (!text && !fileDraft) return

    setOutgoing(true)
    setSendError('')

    let attachmentMeta = null
    try {
      if (fileDraft) {
        setUploading(true)
        attachmentMeta = await uploadMessageFile(fileDraft)
        setFileDraft(null)
        setUploading(false)
      }

      s.emit(
        'send_message',
        {
          receiverId: selected.peerUserId,
          content: text,
          studentId: selected.studentId,
          ...(attachmentMeta && {
            attachmentUrl: attachmentMeta.url,
            attachmentMime: attachmentMeta.mime,
            attachmentName: attachmentMeta.name,
          }),
        },
        (res) => {
          setOutgoing(false)
          if (!res?.ok) {
            setSendError(res?.error || t('messagesPage.sendMessageFailed'))
            return
          }
          if (res.message) {
            setMessages((prev) => mergeDedupe(prev, res.message))
          }
        },
      )
      setMessageText('')
    } catch (e) {
      setOutgoing(false)
      setUploading(false)
      setSendError(
        getUiErrorMessage(e, t('messagesPage.uploadFailed')),
      )
    }
  }, [outgoing, messageText, fileDraft, selected, meId, socketRef])

  const activePeerName = selected?.peerName ?? t('messagesPage.conversation')
  const contextLine = selected
    ? selected.peerRole === 'parent'
      ? t('messagesPage.parentContext', { studentName: selected.studentName ?? t('common.student') })
      : t('messagesPage.teacherContext', { studentName: selected.studentName ?? t('common.yourChild') })
    : ''

  const canSend =
    selected &&
    connected &&
    socketRef.current &&
    !uploading &&
    !outgoing &&
    (Boolean(messageText.trim()) || Boolean(fileDraft))

  const hasActiveConversation =
    chatMode === 'class' ? Boolean(groupSelected) : Boolean(selected)
  const showListPane = !hasActiveConversation
  const showThreadPane = hasActiveConversation

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[32rem] min-w-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-sm md:h-[calc(100dvh-8.5rem)]">
      <div className="flex h-full min-h-0 flex-1 min-w-0 flex-col overflow-hidden md:flex-row">
        <div className={`${showListPane ? 'flex' : 'hidden'} h-full min-h-0 w-full shrink-0 flex-col border-r border-border bg-white md:flex md:w-96`}>
          <div className="shrink-0 border-b border-border p-6">
            <h2 className="mb-1 text-lg font-semibold">{t('messagesPage.title')}</h2>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  chatMode === 'direct'
                    ? 'bg-accent border-border text-foreground'
                    : 'bg-background border-border/60 text-muted-foreground hover:bg-accent/40'
                }`}
                onClick={() => setChatMode('direct')}
              >
                {t('messagesPage.direct')}
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  chatMode === 'class'
                    ? 'bg-accent border-border text-foreground'
                    : 'bg-background border-border/60 text-muted-foreground hover:bg-accent/40'
                }`}
                onClick={() => setChatMode('class')}
              >
                {t('messagesPage.classChat')}
              </button>
            </div>
            {!connected ? (
              <p className="text-xs text-amber-700 mb-3">
                {t('messagesPage.connecting')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                {t('messagesPage.liveTeacherParent')}
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="search"
                placeholder={
                  chatMode === 'class'
                    ? t('messagesPage.searchClasses')
                    : t('messagesPage.searchConversations')
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {chatMode === 'direct' ? (
              contactsLoading ? (
                <p className="p-5 text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : contactsError ? (
                <p className="p-5 text-sm text-destructive">{contactsError}</p>
              ) : filteredContacts.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  {t('messagesPage.noConversationsYet')}
                </p>
              ) : (
                filteredContacts.map((c) => {
                  const active = selected && convKey(selected) === convKey(c)
                  const initial = (c.peerName || '?').charAt(0).toUpperCase()
                  return (
                    <motion.button
                      key={convKey(c)}
                      type="button"
                      whileHover={{ backgroundColor: '#F3F4F6' }}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left p-5 border-b border-border transition-all ${
                        active ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-semibold text-white shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[0.9375rem] font-medium truncate pr-2">
                            {c.peerName}
                          </h4>
                          <p className="text-[0.875rem] text-muted-foreground truncate">
                            {c.studentName}
                            {c.className ? ` · ${c.className}` : ''}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )
                })
              )
            ) : (
              <>
                {groupLoading ? (
                  <p className="p-5 text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : groupError ? (
                  <p className="p-5 text-sm text-destructive">{groupError}</p>
                ) : filteredClassChats.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    {t('messagesPage.noClassChatsAvailable')}
                  </p>
                ) : (
                  filteredClassChats.map((c) => {
                    const active =
                      groupSelected != null &&
                      String(groupSelected) === String(c.classId)
                    const initial = (c.name || '?').charAt(0).toUpperCase()
                    return (
                      <motion.button
                        key={String(c.classId)}
                        type="button"
                        whileHover={{ backgroundColor: '#F3F4F6' }}
                        onClick={() => setGroupSelected(c.classId)}
                        className={`w-full text-left p-5 border-b border-border transition-all ${
                          active ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-semibold text-white shrink-0">
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[0.9375rem] font-medium truncate pr-2">
                              {c.name}
                            </h4>
                            <p className="text-[0.875rem] text-muted-foreground truncate">
                              {c.grade != null && c.grade !== '' ? t('messagesPage.gradeLabel', { grade: c.grade }) : ''}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })
                )}
              </>
            )}
          </div>
        </div>

        <div className={`${showThreadPane ? 'flex' : 'hidden'} h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:flex`}>
          <div className="shrink-0 border-b border-border bg-white p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (chatMode === 'class') {
                      setGroupSelected(null)
                    } else {
                      setSelected(null)
                    }
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border text-muted-foreground transition-colors hover:bg-accent md:hidden"
                  aria-label={t('common.back')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-semibold text-white shrink-0">
                  {(chatMode === 'class'
                    ? (classChats.find(
                        (c) => String(c.classId) === String(groupSelected),
                      )?.name || '?')
                    : activePeerName || '?'
                  ).charAt(0).toUpperCase()}
                </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {chatMode === 'class'
                        ? t('messagesPage.classChat')
                        : activePeerName}
                    </h3>
                    <p className="text-[0.875rem] text-muted-foreground truncate">
                      {chatMode === 'class'
                        ? (classChats.find(
                            (c) => String(c.classId) === String(groupSelected),
                          )?.name || t('messagesPage.selectClass'))
                        : (contextLine || t('messagesPage.selectConversation'))}
                    </p>
                </div>
              </div>
              <button
                type="button"
                className="p-3 hover:bg-accent rounded-2xl transition-all shrink-0"
                aria-label={t('messagesPage.more')}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleMessagesScroll}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 md:p-6"
          >
            {(chatMode === 'class' ? groupLoadingOlder : loadingOlder) ? (
              <p className="text-xs text-center text-muted-foreground py-1">
                {t('messagesPage.loadingOlderMessages')}
              </p>
            ) : null}
            {chatMode === 'class' ? (
              groupHistoryLoading ? (
                <p className="text-sm text-muted-foreground">{t('messagesPage.loadingClassChat')}</p>
              ) : groupHistoryError ? (
                <p className="text-sm text-destructive">{groupHistoryError}</p>
              ) : !groupSelected ? (
                <p className="text-sm text-muted-foreground">
                  {t('messagesPage.chooseClassToView')}
                </p>
              ) : groupMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('messagesPage.noMessagesInClassChat')}
                </p>
              ) : (
                groupMessages.map((m, index) => {
                  const senderId = m?.sender?._id ? String(m.sender._id) : ''
                  const fromMe = senderId && senderId === String(meId)
                  const meMentioned =
                    Boolean(m?.isTagAll) ||
                    (Array.isArray(m?.mentions) &&
                      m.mentions.some((u) => String(u?._id) === String(meId)))
                  const ts = m?.createdAt ? new Date(m.createdAt) : null
                  return (
                    <motion.div
                      key={m._id ?? `${index}-${m.createdAt}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[min(100%,28rem)] px-5 py-3 rounded-3xl ${
                          fromMe
                            ? 'bg-primary/5 border border-primary/20'
                            : 'bg-white border border-border'
                        } ${meMentioned ? 'ring-1 ring-primary/30' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="text-xs text-muted-foreground">
                            {m?.sender?.name || t('messagesPage.unknown')}
                          </div>
                          <div className="text-[11px] text-muted-foreground shrink-0">
                            {ts
                              ? formatDateTime(ts, { dateStyle: 'short', timeStyle: 'short' })
                              : ''}
                          </div>
                        </div>
                        <p className="text-[0.9375rem] whitespace-pre-wrap break-words">
                          {m?.message}
                        </p>
                        {meMentioned && !fromMe ? (
                          <div className="text-[11px] text-primary mt-1">
                            {t('messagesPage.youWereMentioned')}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )
                })
              )
            ) : historyLoading ? (
              <p className="text-sm text-muted-foreground">{t('messagesPage.loadingMessages')}</p>
            ) : historyError ? (
              <p className="text-sm text-destructive">{historyError}</p>
            ) : !selected ? (
              <p className="text-sm text-muted-foreground">
                {t('messagesPage.chooseSomeone')}
              </p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('messagesPage.noMessagesYet')}
              </p>
            ) : (
              messages.map((message, index) => {
                const fromMe = idPart(message.senderId) === String(meId)
                const ts = message.createdAt
                  ? new Date(message.createdAt)
                  : null
                const url = message.attachmentUrl
                const mime = message.attachmentMime
                const fname = message.attachmentName || t('messagesPage.attachment')
                return (
                  <motion.div
                    key={message._id ?? `${index}-${message.createdAt}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[min(100%,28rem)] px-5 py-3 rounded-3xl ${
                        fromMe
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-white border border-border rounded-bl-md'
                      }`}
                    >
                      {url && isImageMime(mime) ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-2 rounded-xl overflow-hidden border border-white/20"
                        >
                          <img
                            src={url}
                            alt={fname}
                            className="max-h-56 w-full object-cover"
                          />
                        </a>
                      ) : null}
                      {url && !isImageMime(mime) ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium underline break-all block mb-2 ${
                            fromMe ? 'text-white' : 'text-primary'
                          }`}
                        >
                          📎 {fname}
                        </a>
                      ) : null}
                      {message.content ? (
                        <p className="text-[0.9375rem] whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      ) : null}
                      <p
                        className={`text-[0.75rem] mt-2 ${
                          fromMe ? 'text-white/75' : 'text-muted-foreground'
                        }`}
                      >
                        {ts
                          ? formatDateTime(ts, { dateStyle: 'short', timeStyle: 'short' })
                          : ''}
                      </p>
                    </div>
                  </motion.div>
                )
              })
            )}
            <div ref={listEndRef} />
          </div>

          <div className="shrink-0 border-t border-border bg-white p-6">
            {chatMode === 'class' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('messagesPage.classChatViewOnly')}
                </div>
                {groupSelected ? (
                  <Link
                    to={`/classes/${groupSelected}/chat`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-white text-sm hover:bg-primary/90"
                  >
                    {t('messagesPage.openClassChat')}
                  </Link>
                ) : (
                  <div className="text-xs text-muted-foreground">{t('messagesPage.selectClassFirst')}</div>
                )}
              </div>
            ) : (
              <>
                {sendError ? (
                  <p className="text-sm text-destructive mb-2">{sendError}</p>
                ) : null}
                {fileDraft ? (
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{fileDraft.name}</span>
                    <button
                      type="button"
                      className="text-destructive text-xs shrink-0"
                      onClick={() => setFileDraft(null)}
                    >
                      {t('messagesPage.remove')}
                    </button>
                  </div>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) setFileDraft(f)
                  }}
                />
                <div className="flex items-end gap-4">
                  <button
                    type="button"
                    className="p-4 hover:bg-accent rounded-2xl transition-all text-muted-foreground disabled:opacity-40"
                    aria-label={t('messagesPage.attachFile')}
                    disabled={!selected || !connected || uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-6 h-6" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <textarea
                      placeholder={
                        selected
                          ? t('messagesPage.typeMessage')
                          : t('messagesPage.selectConversationFirst')
                      }
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (canSend) handleSendMessage()
                        }
                      }}
                      disabled={!selected || !connected || uploading}
                      rows={1}
                      className="w-full px-5 py-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[52px] max-h-40 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!canSend}
                    className="p-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0"
                    aria-label={t('messagesPage.send')}
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-2 ml-16">
                  {uploading
                    ? t('messagesPage.uploadingAttachment')
                    : t('messagesPage.sendHint')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
