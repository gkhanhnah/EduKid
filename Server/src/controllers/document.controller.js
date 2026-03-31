import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { Folder } from '../models/Folder.js'
import { Document as DocumentModel } from '../models/Document.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCUMENTS_UPLOAD_DIR = path.join(__dirname, '../../uploads/documents')

const EXT_TO_TYPE = {
  '.pdf': 'pdf',
  '.doc': 'doc',
  '.docx': 'docx',
  '.ppt': 'ppt',
  '.pptx': 'pptx',
  '.xls': 'xls',
  '.xlsx': 'xlsx',
}

function fileTypeFromOriginalName(originalname) {
  const ext = path.extname(originalname || '').toLowerCase()
  return EXT_TO_TYPE[ext] || ext.replace(/^\./, '') || 'unknown'
}

function handleError(res, err) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function previewHtmlPage(title, innerHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:1.25rem;line-height:1.5;color:#18181b;max-width:52rem;margin:0 auto;}table{border-collapse:collapse;width:100%;margin:0.5rem 0;}td,th{border:1px solid #e4e4e7;padding:0.35rem 0.5rem;text-align:left;}th{background:#f4f4f5;}a{color:#2563eb;}</style></head><body>${innerHtml}</body></html>`
}

function resolveStoredFilePath(fileUrl) {
  const rel = String(fileUrl || '')
  const base = path.basename(rel)
  if (!base || base === '.' || base === '..' || base.includes('..')) {
    return null
  }
  const abs = path.join(DOCUMENTS_UPLOAD_DIR, base)
  const resolved = path.resolve(abs)
  const root = path.resolve(DOCUMENTS_UPLOAD_DIR)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null
  }
  if (!fs.existsSync(resolved)) {
    return null
  }
  return resolved
}

export async function createFolder(req, res) {
  try {
    const { name, parentId } = req.body || {}
    const n = String(name ?? '').trim()
    if (!n) {
      return res.status(400).json({ error: 'name is required' })
    }

    if (parentId != null && parentId !== '') {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ error: 'Invalid parentId' })
      }
      const parent = await Folder.findById(parentId).lean()
      if (!parent) {
        return res.status(404).json({ error: 'Parent folder not found' })
      }
    }

    const doc = await Folder.create({
      name: n,
      parentId: parentId && mongoose.Types.ObjectId.isValid(parentId) ? parentId : null,
      createdBy: req.user?.id || null,
    })
    res.status(201).json(doc.toObject())
  } catch (err) {
    handleError(res, err)
  }
}

export async function getFolders(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin'
    const { parentId } = req.query
    const filter = {}
    if (parentId === 'null' || parentId === '') {
      filter.parentId = null
    } else if (parentId != null && parentId !== undefined && parentId !== '') {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ error: 'Invalid parentId' })
      }
      filter.parentId = parentId
    }

    const folders = await Folder.find({
      ...filter,
      ...(isAdmin ? {} : { createdBy: req.user?.id || null }),
    })
      .sort({ name: 1 })
      .lean()
    res.json({ folders })
  } catch (err) {
    handleError(res, err)
  }
}

export async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { folderId } = req.body || {}
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'Valid folderId is required' })
    }

    const folder = await Folder.findById(folderId).lean()
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' })
    }
    if (req.user?.role !== 'admin' && String(folder.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const original = req.file.originalname || 'file'
    const fileType = fileTypeFromOriginalName(original)
    const rel = `/uploads/documents/${req.file.filename}`

    const created = await DocumentModel.create({
      name: original,
      fileUrl: rel,
      fileType,
      folderId,
      uploadedBy: req.user?.id || null,
    })

    const populated = await DocumentModel.findById(created._id)
      .populate('uploadedBy', 'name email')
      .lean()

    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getDocumentsByFolder(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin'
    const folderId = req.query?.folderId
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'folderId query is required' })
    }

    const folder = await Folder.findById(folderId).lean()
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    if (!isAdmin && String(folder.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const userId = req.user?.id || null
    const documents = await DocumentModel.find({
      folderId,
      ...(isAdmin
        ? {}
        : {
            // Allow legacy documents with uploadedBy=null, as long as the folder is owned.
            $or: [{ uploadedBy: userId }, { uploadedBy: null }],
          }),
    })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .lean()

    res.json({ folderId, documents })
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * Inline preview for iframe: PDF as stream; Word/Excel converted to HTML on the server.
 * Query `?token=` is supported because iframes cannot send Authorization headers.
 */
export async function previewDocument(req, res) {
  const sendFail = (status, msg) => {
    res.status(status).type('text/html; charset=utf-8').send(previewHtmlPage('Preview', `<p>${escapeHtml(msg)}</p>`))
  }

  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendFail(400, 'Invalid document id')
    }

    const doc = await DocumentModel.findById(id).lean()
    if (!doc) {
      return sendFail(404, 'Document not found')
    }
    const folder = await Folder.findById(doc.folderId).lean()
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const ownedByFolder = Boolean(folder && String(folder.createdBy) === String(req.user?.id))
      const ownedByDoc =
        Boolean(doc.uploadedBy) && String(doc.uploadedBy) === String(req.user?.id)
      if (!ownedByFolder && !ownedByDoc) {
        return sendFail(403, 'Forbidden')
      }
    }

    const filePath = resolveStoredFilePath(doc.fileUrl)
    if (!filePath) {
      return sendFail(404, 'File not found on server')
    }

    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.name || 'file.pdf')}`)
      return fs.createReadStream(filePath).pipe(res)
    }

    if (ext === '.docx') {
      try {
        const result = await mammoth.convertToHtml({ path: filePath })
        const body = result.value || '<p>(Empty document)</p>'
        if (result.messages?.length) {
          // optional: log mammoth warnings
        }
        res.type('text/html; charset=utf-8').send(previewHtmlPage(doc.name, body))
      } catch {
        return sendFail(500, 'Could not read this Word file.')
      }
      return
    }

    if (ext === '.doc') {
      return sendFail(
        415,
        'Legacy .doc preview is not supported. Download the file or convert to .docx.',
      )
    }

    if (ext === '.xlsx' || ext === '.xls') {
      try {
        const buf = fs.readFileSync(filePath)
        const workbook = XLSX.read(buf, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          return sendFail(200, 'This spreadsheet has no sheets.')
        }
        const sheet = workbook.Sheets[sheetName]
        const table = XLSX.utils.sheet_to_html(sheet)
        const body = `<p style="color:#71717a;font-size:0.875rem;">${escapeHtml(sheetName)}</p>${table}`
        res.type('text/html; charset=utf-8').send(previewHtmlPage(doc.name, body))
      } catch {
        return sendFail(500, 'Could not read this spreadsheet.')
      }
      return
    }

    if (ext === '.ppt' || ext === '.pptx') {
      const href = escapeHtml(doc.fileUrl || '#')
      res
        .type('text/html; charset=utf-8')
        .send(
          previewHtmlPage(
            doc.name,
            `<p>Slides cannot be previewed in the browser here.</p><p><a href="${href}" target="_blank" rel="noopener noreferrer">Open file</a> (may download depending on your browser).</p>`,
          ),
        )
      return
    }

    return sendFail(415, 'Preview is not available for this file type.')
  } catch (err) {
    console.error('previewDocument', err)
    return sendFail(500, 'Preview failed.')
  }
}
