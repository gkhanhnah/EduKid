import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export function ToastViewport() {
  const [items, setItems] = useState([])

  useEffect(() => {
    function handleToast(event) {
      const next = event?.detail
      if (!next?.id) return
      setItems((prev) => [...prev, next])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== next.id))
      }, 2800)
    }

    window.addEventListener('app:toast', handleToast)
    return () => {
      window.removeEventListener('app:toast', handleToast)
    }
  }, [])

  if (!items.length) return null

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      {items.map((item) => {
        const isError = item.type === 'error'
        const Icon = isError ? XCircle : CheckCircle2
        return (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur bg-white ${
              isError ? 'border-destructive/30 text-destructive' : 'border-emerald-200 text-emerald-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium leading-6">{item.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
