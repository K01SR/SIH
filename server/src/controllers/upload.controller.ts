import { Request, Response } from 'express';
import { ok, fail } from '../utils/response';
import { recordAudit } from '../services/audit.service';
import { AppError } from '../utils/AppError';

/**
 * Handles multipart file uploads. Returns a server-relative path that can be
 * attached to documents, undertakings or evidence records. Files are stored
 * under the configured UPLOAD_DIR and served statically at /uploads.
 */
export async function uploadFile(req: Request, res: Response) {
  const file = req.file;
  if (!file) return fail(res, 400, 'No file provided');
  const url = `/uploads/${file.filename}`;
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'FILE_UPLOADED',
    entityType: 'File',
    entityId: file.filename,
    details: { originalName: file.originalname, size: file.size, mimeType: file.mimetype },
  });
  return ok(res, { url, filename: file.filename, originalName: file.originalname, size: file.size }, 'File uploaded');
}
