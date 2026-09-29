import { Request } from 'express';

export interface TenantRequest extends Request {
  organizationId?: string;
}

export function getTenantId(req: TenantRequest): string {
  const organizationId = req.organizationId?.trim();
  if (!organizationId) {
    throw new Error('Authenticated organization context is required.');
  }
  return organizationId;
}

export function belongsToTenant(record: any, organizationId: string): boolean {
  return Boolean(record && record.organizationId === organizationId);
}

export function tenantRecords<T extends Record<string, any>>(records: T[], organizationId: string): T[] {
  return records.filter(record => belongsToTenant(record, organizationId));
}

export function findTenantRecord<T extends Record<string, any>>(
  records: T[],
  organizationId: string,
  predicate: (record: T) => boolean
): T | undefined {
  return records.find(record => belongsToTenant(record, organizationId) && predicate(record));
}

export function assertTenantRecord<T extends Record<string, any>>(
  records: T[],
  organizationId: string,
  predicate: (record: T) => boolean
): T | undefined {
  return findTenantRecord(records, organizationId, predicate);
}
