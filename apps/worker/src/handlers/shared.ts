import type { ClientSession, Db, Document } from 'mongodb';
import type { RuntimeMessage } from '../message.js';
import { tenantFilter } from '@easyinsights/core';
export function messageFilter(message: RuntimeMessage, extra: Document = {}): Document {
  return { ...tenantFilter(message.scope), ...extra };
}
export function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${name} is required`);
  return value;
}
export async function markRun(
  db: Db,
  session: ClientSession,
  collection: string,
  id: string,
  status: string,
  extra: Document = {},
): Promise<void> {
  await db
    .collection(collection)
    .updateOne({ id }, { $set: { status, updatedAt: new Date(), ...extra } }, { session });
}
