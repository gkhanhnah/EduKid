let toastId = 0

function dispatchToast(type, message) {
  if (!message) return
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: {
        id: ++toastId,
        type,
        message,
      },
    }),
  )
}

export function toastSuccess(message) {
  dispatchToast('success', message)
}

export function toastError(message) {
  dispatchToast('error', message)
}
