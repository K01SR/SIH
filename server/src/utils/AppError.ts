/**
 * Typed application error carrying an HTTP status code. Throwing this from
 * anywhere in the request pipeline produces a clean, structured API response.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Insufficient permissions') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, message, 'CONFLICT', details);
  }
  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, message, 'UNPROCESSABLE', details);
  }
}
