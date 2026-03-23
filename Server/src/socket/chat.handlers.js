import { createAndPopulateMessage } from '../services/messaging.service.js'

export function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(`user:${userId}`)

    socket.on('send_message', async (payload, cb) => {
      const reply =
        typeof cb === 'function'
          ? cb
          : () => {
              /* no ack */
            }

      try {
        const {
          receiverId,
          content,
          studentId,
          attachmentUrl,
          attachmentMime,
          attachmentName,
        } = payload || {}

        if (!receiverId) {
          reply({ ok: false, error: 'receiverId is required' })
          return
        }

        const text = typeof content === 'string' ? content.trim() : ''
        const hasFile = Boolean(
          attachmentUrl && String(attachmentUrl).trim(),
        )
        if (!text && !hasFile) {
          reply({
            ok: false,
            error: 'Provide message text and/or an attachment',
          })
          return
        }

        const result = await createAndPopulateMessage({
          senderId: userId,
          receiverId,
          content: text,
          studentId: studentId || undefined,
          attachmentUrl: hasFile ? String(attachmentUrl).trim() : null,
          attachmentMime: hasFile ? attachmentMime || null : null,
          attachmentName: hasFile ? attachmentName || null : null,
        })

        if (!result.ok) {
          reply({ ok: false, error: result.error })
          return
        }

        const msg = result.message
        /** Receiver + other tabs of same user; omit emitting to this socket to avoid dup on sender tab */
        io.to(`user:${receiverId}`).emit('receive_message', msg)
        socket.to(`user:${userId}`).emit('receive_message', msg)
        reply({ ok: true, message: msg })
      } catch {
        reply({ ok: false, error: 'Server error' })
      }
    })
  })
}
