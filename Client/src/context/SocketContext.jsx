/* eslint-disable react-hooks/set-state-in-effect -- sync socket + UI when auth token changes */
import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../hooks/useAuth.js'
import { getSocketUrl } from '../lib/socketUrl.js'
import { SocketContext } from './socketContext.js'

export function SocketProvider({ children }) {
  const { token } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [instanceId, setInstanceId] = useState(0)

  useEffect(() => {
    if (!token) {
      const prev = socketRef.current
      socketRef.current = null
      prev?.disconnect()
      setConnected(false)
      setInstanceId((n) => n + 1)
      return undefined
    }

    const s = io(getSocketUrl(), {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
    })

    socketRef.current = s
    setInstanceId((n) => n + 1)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.disconnect()
      if (socketRef.current === s) {
        socketRef.current = null
      }
      setConnected(false)
      setInstanceId((n) => n + 1)
    }
  }, [token])

  const value = useMemo(
    () => ({
      socketRef,
      connected,
      instanceId,
    }),
    [connected, instanceId],
  )

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}
