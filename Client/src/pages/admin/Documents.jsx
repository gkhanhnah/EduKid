import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, FileText, Folder, FolderOpen, Plus, Search, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import { createFolder, getDocuments, getFolders, uploadDocument } from '../../services/document.service.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

function uploadsBaseUrl() {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'
  // If API URL ends with /api, point uploads to the parent server root.
  return api.replace(/\/api\/?$/, '') || 'http://localhost:3000'
}

function apiBaseUrl() {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'
}

function absoluteFileUrl(fileUrl) {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http')) return fileUrl
  return `${uploadsBaseUrl()}${fileUrl}`
}

/** Same-origin preview (PDF stream or HTML); `token` in query because iframes cannot send Authorization. */
function documentPreviewIframeSrc(documentId) {
  const id = documentId != null ? String(documentId) : ''
  if (!id) return ''
  const token = localStorage.getItem('token') || ''
  return `${apiBaseUrl()}/documents/preview/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`
}

function matchesSearch(text, q) {
  if (!q.trim()) return true
  return String(text ?? '')
    .toLowerCase()
    .includes(q.trim().toLowerCase())
}

function FolderModal({ open, title, children, onClose, closeLabel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function PreviewModal({ doc, onClose }) {
  const { t } = useTranslation()
  const frameSrc = doc?._id ? documentPreviewIframeSrc(doc._id) : ''
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label={t('common.close')} onClick={onClose} />
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
              {t('documentsPage.openFile')}
            </a>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label={t('common.close')}>
              {t('common.close')}
            </button>
          </div>
        </div>
        <div className="min-h-[50vh] flex-1 bg-zinc-100">
          {frameSrc ? (
            <iframe title={doc?.name} src={frameSrc} className="h-[min(90vh,720px)] w-full border-0 bg-white" />
          ) : (
            <div className="flex h-[min(40vh,400px)] items-center justify-center p-6 text-center text-sm text-zinc-600">
              {t('documentsPage.previewNotAvailable')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminDocuments() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [pathStack, setPathStack] = useState([{ id: null, name: t('documentsPage.allFiles') }])
  const currentFolderId = pathStack[pathStack.length - 1]?.id ?? null

  const [foldersLoading, setFoldersLoading] = useState(true)
  const [foldersError, setFoldersError] = useState('')
  const [folders, setFolders] = useState([])

  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [documents, setDocuments] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [createFolderError, setCreateFolderError] = useState('')

  const [previewDoc, setPreviewDoc] = useState(null)

  const canUpload = currentFolderId != null

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true)
    setFoldersError('')
    try {
      const params = currentFolderId == null ? { parentId: 'null' } : { parentId: currentFolderId }
      const data = await getFolders(params)
      setFolders(Array.isArray(data?.folders) ? data.folders : [])
    } catch (e) {
      setFoldersError(getUiErrorMessage(e, t('documentsPage.loadFoldersFailed')))
      setFolders([])
    } finally {
      setFoldersLoading(false)
    }
  }, [currentFolderId])

  const loadDocuments = useCallback(async () => {
    if (!currentFolderId) {
      setDocuments([])
      return
    }
    setDocsLoading(true)
    setDocsError('')
    try {
      const data = await getDocuments(currentFolderId)
      setDocuments(Array.isArray(data?.documents) ? data.documents : [])
    } catch (e) {
      setDocsError(getUiErrorMessage(e, t('documentsPage.loadDocumentsFailed')))
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }, [currentFolderId])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const filteredFolders = useMemo(() => folders.filter((f) => matchesSearch(f.name, searchTerm)), [folders, searchTerm])
  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (d) => matchesSearch(d.name, searchTerm) || matchesSearch(d.fileType, searchTerm),
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
      setCreateFolderError(t('documentsPage.folderNameRequired'))
      return
    }
    setCreatingFolder(true)
    try {
      const body = currentFolderId != null ? { name, parentId: currentFolderId } : { name }
      await createFolder(body)
      setNewFolderName('')
      setFolderModalOpen(false)
      await loadFolders()
    } catch (err) {
      setCreateFolderError(getUiErrorMessage(err, t('documentsPage.createFolderFailed')))
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentFolderId) return
    setDocsError('')
    setDocsLoading(true)
    try {
      const fd = new FormData()
      fd.append('folderId', currentFolderId)
      fd.append('file', file)
      await uploadDocument(fd)
      await loadDocuments()
    } catch (err) {
      setDocsError(getUiErrorMessage(err, t('documentsPage.uploadFailed')))
    } finally {
      setDocsLoading(false)
    }
  }

  if (user?.role && user.role !== 'admin') {
    // AdminLayout already guards; this is just a safe fallback.
    return <div className="text-muted-foreground text-sm">{t('common.notAuthorized')}</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('common.documents')}</h1>
          <p className="text-muted-foreground mt-1">{t('adminDocuments.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateFolderError('')
              setNewFolderName('')
              setFolderModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-100"
          >
            <Plus className="w-4 h-4" />
            {t('documentsPage.newFolder')}
          </button>

          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 ${
              !canUpload ? 'pointer-events-none opacity-45' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            {t('common.upload')}
            <input
              type="file"
              className="hidden"
              disabled={!canUpload}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('documentsPage.searchPlaceholder')}
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-4 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          {pathStack.length > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('documentsPage.back')}
            </button>
          ) : null}
        </div>

        {foldersLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : foldersError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive text-sm">{foldersError}</div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-0 overflow-hidden">
            <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 border-b border-zinc-100">
              {currentFolderId == null ? t('adminDocuments.folders') : t('adminDocuments.foldersIn', { name: pathStack[pathStack.length - 1]?.name })}
            </div>

            <div className="p-5">
              <div className="space-y-6">
                <div>
                  {filteredFolders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('adminDocuments.noFoldersFound')}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredFolders.map((f) => (
                        <button
                          key={f._id}
                          type="button"
                          onClick={() => enterFolder(f)}
                          className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 hover:bg-zinc-50 text-left"
                        >
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{f.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentFolderId != null ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('documentsPage.files')}</div>
                    {docsLoading ? (
                      <div className="text-center text-muted-foreground py-6">{t('documentsPage.loadingFiles')}</div>
                    ) : docsError ? (
                      <div className="text-destructive text-sm">{docsError}</div>
                    ) : filteredDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('adminDocuments.noFilesInFolder')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredDocuments.map((d) => (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            className="text-left flex gap-3 items-start rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 transition-colors"
                          >
                            <div className="mt-1">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{d.name}</div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {(d.fileType || '—').toUpperCase()}
                              </div>
                            </div>
                            <div className="text-muted-foreground mt-1">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <FolderModal
        open={folderModalOpen}
        title={t('documentsPage.newFolder')}
        closeLabel={t('common.close')}
        onClose={() => {
          if (creatingFolder) return
          setFolderModalOpen(false)
          setNewFolderName('')
          setCreateFolderError('')
        }}
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <p className="text-sm text-zinc-500">
            {currentFolderId == null ? t('documentsPage.createTopLevelFolder') : t('documentsPage.insideFolder', { name: pathStack[pathStack.length - 1]?.name })}
          </p>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">{t('documentsPage.name')}</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('documentsPage.folderNamePlaceholder')}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 mt-1"
              disabled={creatingFolder}
              autoFocus
            />
          </label>
          {createFolderError ? <p className="text-sm text-destructive">{createFolderError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => {
                if (creatingFolder) return
                setFolderModalOpen(false)
                setNewFolderName('')
                setCreateFolderError('')
              }}
              disabled={creatingFolder}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              disabled={creatingFolder}
            >
              {creatingFolder ? t('documentsPage.creating') : t('common.create')}
            </button>
          </div>
        </form>
      </FolderModal>

      {previewDoc ? <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} /> : null}
    </div>
  )
}

