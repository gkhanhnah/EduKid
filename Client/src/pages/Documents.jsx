import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Folder,
  FileText,
  Plus,
  Upload,
  Search,
  LayoutList,
  LayoutGrid,
  FolderPlus,
  ArrowLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { homePathForRole } from '../utils/authPaths.js'
import { LoadingState } from '../components/LoadingState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import {
  getFolders,
  createFolder,
  uploadDocument,
  getDocuments,
} from '../services/document.service.js'

function uploadsBaseUrl() {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'
  return api.replace(/\/api\/?$/, '') || 'http://localhost:3000'
}

function absoluteFileUrl(fileUrl) {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http')) return fileUrl
  return `${uploadsBaseUrl()}${fileUrl}`
}

function apiBaseUrl() {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'
}

/** Same-origin preview (PDF stream or HTML); `token` in query because iframes cannot send Authorization. */
function documentPreviewIframeSrc(documentId) {
  const id = documentId != null ? String(documentId) : ''
  if (!id) return ''
  const token = localStorage.getItem('token') || ''
  return `${apiBaseUrl()}/documents/preview/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const sec = Math.round((Date.now() - d.getTime()) / 1000)
    if (sec < 60) return 'just now'
    const min = Math.round(sec / 60)
    if (min < 60) return `${min} min ago`
    const hr = Math.round(min / 60)
    if (hr < 48) return `${hr} hour${hr === 1 ? '' : 's'} ago`
    const day = Math.round(hr / 24)
    if (day < 14) return `${day} day${day === 1 ? '' : 's'} ago`
    return formatDate(iso)
  } catch {
    return ''
  }
}

function matchesSearch(text, q) {
  if (!q.trim()) return true
  return String(text ?? '')
    .toLowerCase()
    .includes(q.trim().toLowerCase())
}

function FolderModal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function PreviewModal({ doc, onClose }) {
  const frameSrc = doc?._id ? documentPreviewIframeSrc(doc._id) : ''

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-900">{doc?.name}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={absoluteFileUrl(doc?.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-zinc-100"
            >
              Open file
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-[50vh] flex-1 bg-zinc-100">
          {frameSrc ? (
            <iframe title={doc?.name} src={frameSrc} className="h-[min(90vh,720px)] w-full border-0 bg-white" />
          ) : (
            <div className="flex h-[min(40vh,400px)] items-center justify-center p-6 text-center text-sm text-zinc-600">
              Preview is not available.
            </div>
          )}
        </div>
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
          Preview is served by your app: PDF inline; Word (.docx) and Excel as HTML. Legacy .doc and
          PowerPoint show a short message; use Open file if needed.
        </p>
      </div>
    </div>
  )
}

export function Documents() {
  const { user } = useAuth()

  /** Navigation: stack[0] = root (All Files), last = current folder */
  const [pathStack, setPathStack] = useState([{ id: null, name: 'All Files' }])

  const [foldersLoading, setFoldersLoading] = useState(true)
  const [foldersError, setFoldersError] = useState('')
  const [folders, setFolders] = useState([])

  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [documents, setDocuments] = useState([])

  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [createFolderError, setCreateFolderError] = useState('')
  const [folderModalOpen, setFolderModalOpen] = useState(false)

  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('list')

  const [previewDoc, setPreviewDoc] = useState(null)

  const currentFolderId = pathStack[pathStack.length - 1]?.id ?? null
  const canUpload = currentFolderId != null

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true)
    setFoldersError('')
    try {
      const params =
        currentFolderId == null ? { parentId: 'null' } : { parentId: currentFolderId }
      const data = await getFolders(params)
      setFolders(Array.isArray(data?.folders) ? data.folders : [])
    } catch (e) {
      setFoldersError(e?.response?.data?.error || e?.message || 'Could not load folders')
      setFolders([])
    } finally {
      setFoldersLoading(false)
    }
  }, [currentFolderId])

  const loadDocuments = useCallback(async (folderId) => {
    if (!folderId) {
      setDocuments([])
      return
    }
    setDocsLoading(true)
    setDocsError('')
    try {
      const data = await getDocuments(folderId)
      setDocuments(Array.isArray(data?.documents) ? data.documents : [])
    } catch (e) {
      setDocsError(e?.response?.data?.error || e?.message || 'Could not load documents')
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  useEffect(() => {
    if (currentFolderId) {
      loadDocuments(currentFolderId)
    } else {
      setDocuments([])
    }
  }, [currentFolderId, loadDocuments])

  const filteredFolders = useMemo(
    () => folders.filter((f) => matchesSearch(f.name, searchTerm)),
    [folders, searchTerm],
  )

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (d) =>
          matchesSearch(d.name, searchTerm) || matchesSearch(d.fileType, searchTerm),
      ),
    [documents, searchTerm],
  )

  function enterFolder(f) {
    setPathStack((s) => [...s, { id: f._id, name: f.name }])
  }

  function goBack() {
    setPathStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }

  async function handleCreateFolder(e) {
    e.preventDefault()
    setCreateFolderError('')
    const name = newFolderName.trim()
    if (!name) {
      setCreateFolderError('Folder name is required.')
      return
    }
    setCreatingFolder(true)
    try {
      const body =
        currentFolderId != null ? { name, parentId: currentFolderId } : { name }
      await createFolder(body)
      setNewFolderName('')
      setFolderModalOpen(false)
      await loadFolders()
    } catch (err) {
      setCreateFolderError(err?.response?.data?.error || err?.message || 'Could not create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentFolderId) return

    setUploadBusy(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('folderId', currentFolderId)
      fd.append('file', file)
      await uploadDocument(fd)
      await loadDocuments(currentFolderId)
    } catch (err) {
      setUploadError(err?.response?.data?.error || err?.message || 'Upload failed')
    } finally {
      setUploadBusy(false)
    }
  }

  const listToggleClass = (active) =>
    `flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${active
      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
      : 'border-transparent bg-white text-zinc-500 hover:bg-zinc-50'
    }`

  const showEmpty =
    !foldersLoading &&
    !foldersError &&
    filteredFolders.length === 0 &&
    (!currentFolderId || (!docsLoading && filteredDocuments.length === 0))

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 min-h-screen overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Documents &amp; Drawings
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Manage project files and folders. PDF, Word, PowerPoint, Excel up to 10MB.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCreateFolderError('')
                  setNewFolderName('')
                  setFolderModalOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100 transition-colors"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </button>
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 ${!canUpload || uploadBusy ? 'pointer-events-none opacity-45' : ''
                  }`}
                title={!canUpload ? 'Open a folder to upload files' : undefined}
              >
                <Upload className="h-4 w-4" />
                {uploadBusy ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={!canUpload || uploadBusy}
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files and folders…"
                className="w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-4 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div className="flex gap-1 rounded-2xl p-1">
              <button
                type="button"
                aria-label="List view"
                className={listToggleClass(viewMode === 'list')}
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                className={listToggleClass(viewMode === 'grid')}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            {pathStack.length > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
          </div>

          {uploadError ? (
            <p className="mb-4 text-sm text-red-400">{uploadError}</p>
          ) : null}

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-0 shadow-sm overflow-hidden">
            {foldersLoading ? (
              <div className="px-5 py-8">
                <LoadingState label="Loading…" />
              </div>
            ) : foldersError ? (
              <div className="px-5 py-4">
                <ErrorBanner message={foldersError} onRetry={loadFolders} />
              </div>
            ) : showEmpty ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                {currentFolderId == null && folders.length === 0
                  ? 'No folders yet. Use New Folder to get started.'
                  : currentFolderId != null &&
                    folders.length === 0 &&
                    documents.length === 0
                    ? 'This folder is empty. Add subfolders or upload files.'
                    : 'No items match your search.'}
              </p>
            ) : viewMode === 'list' ? (
              <ul className="divide-y divide-zinc-100">
                {filteredFolders.map((f) => (
                  <li key={f._id}>
                    <button
                      type="button"
                      onClick={() => enterFolder(f)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                      <span className="text-[0.9375rem] text-zinc-800">{f.name}</span>
                    </button>
                  </li>
                ))}
                {currentFolderId != null ? (
                  <>
                    <li className="border-t border-zinc-200 bg-zinc-50/50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Files
                    </li>
                    {docsLoading ? (
                      <li className="px-5 py-6">
                        <LoadingState label="Loading files…" />
                      </li>
                    ) : docsError ? (
                      <li className="px-5 py-4">
                        <ErrorBanner
                          message={docsError}
                          onRetry={() => loadDocuments(currentFolderId)}
                        />
                      </li>
                    ) : filteredDocuments.length === 0 ? (
                      <li className="px-5 py-6 text-sm text-zinc-500">No files in this folder yet.</li>
                    ) : (
                      filteredDocuments.map((d) => (
                        <li key={d._id}>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-blue-50/50"
                          >
                            <FileText className="h-5 w-5 shrink-0 text-blue-500" strokeWidth={1.5} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-zinc-900">{d.name}</div>
                              <div className="text-xs text-zinc-500">
                                {(d.fileType || '—').toUpperCase()} · {formatRelativeTime(d.createdAt)}
                                {d.uploadedBy?.name ? ` · by ${d.uploadedBy.name}` : ''}
                              </div>
                            </div>
                            <Eye className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                          </button>
                        </li>
                      ))
                    )}
                  </>
                ) : null}
              </ul>
            ) : (
              <div className="p-4">
                {filteredFolders.length > 0 ? (
                  <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredFolders.map((f) => (
                      <li key={f._id}>
                        <button
                          type="button"
                          onClick={() => enterFolder(f)}
                          // Thêm h-full, justify-center vào đây:
                          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-5 text-center transition-colors hover:bg-zinc-100"
                        >
                          {/* Thêm shrink-0 để icon không bị bóp */}
                          <Folder className="h-8 w-8 shrink-0 text-zinc-400" strokeWidth={1.5} />
                          <span className="line-clamp-2 text-sm font-medium text-zinc-900">{f.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {currentFolderId != null ? (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Files
                    </p>
                    {docsLoading ? (
                      <LoadingState label="Loading files…" />
                    ) : docsError ? (
                      <ErrorBanner
                        message={docsError}
                        onRetry={() => loadDocuments(currentFolderId)}
                      />
                    ) : filteredDocuments.length === 0 ? (
                      <p className="text-sm text-zinc-500">No files in this folder yet.</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {filteredDocuments.map((d) => (
                          <li key={d._id}>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(d)}
                              className="flex w-full flex-col rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                            >
                              <div className="mb-3 flex items-start gap-3">
                                <FileText className="h-6 w-6 shrink-0 text-blue-500" strokeWidth={1.5} />
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 font-medium text-zinc-900">{d.name}</div>
                                  <div className="mt-1 text-xs text-zinc-500">
                                    {(d.fileType || '—').toUpperCase()} · {formatRelativeTime(d.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                                <Eye className="h-4 w-4" />
                                Preview
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                {currentFolderId == null && filteredFolders.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">No folders to show.</p>
                ) : null}
              </div>
            )}
          </div>

          {currentFolderId == null && !foldersLoading && !foldersError ? (
            <p className="mt-4 text-center text-sm text-zinc-500">
              Open a folder to view files and upload.
            </p>
          ) : null}
        </div>
      </div>

      <FolderModal
        open={folderModalOpen}
        title="New folder"
        onClose={() => {
          if (creatingFolder) return
          setFolderModalOpen(false)
          setCreateFolderError('')
          setNewFolderName('')
        }}
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <p className="text-sm text-zinc-500">
            {currentFolderId == null
              ? 'Create a folder at the top level.'
              : `Inside “${pathStack[pathStack.length - 1]?.name}”.`}
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Name</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={creatingFolder}
              autoFocus
            />
          </label>
          {createFolderError ? <p className="text-sm text-red-600">{createFolderError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              disabled={creatingFolder}
              onClick={() => {
                setFolderModalOpen(false)
                setCreateFolderError('')
                setNewFolderName('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              disabled={creatingFolder}
            >
              <Plus className="h-4 w-4" />
              {creatingFolder ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </FolderModal>

      {previewDoc ? <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} /> : null}
    </div>
  )
}
