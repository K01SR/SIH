import { Response } from 'express';

export const ok = <T>(res: Response, data: T, message = 'Success') =>
  res.json({ success: true, message, data });

export const created = <T>(res: Response, data: T, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

export const fail = (res: Response, status: number, message: string, errors?: unknown) =>
  res.status(status).json({ success: false, message, errors });
