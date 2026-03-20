import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/client';

export interface AuthenticatedRequest extends Request {
  userId: string;
  householdId: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  const userId = data.user.id;

  // Look up household for this user
  const { data: userRow } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', userId)
    .single();

  if (!userRow?.household_id) {
    res.status(403).json({ success: false, error: 'No household found for this user' });
    return;
  }

  (req as AuthenticatedRequest).userId = userId;
  (req as AuthenticatedRequest).householdId = userRow.household_id as string;
  next();
}
