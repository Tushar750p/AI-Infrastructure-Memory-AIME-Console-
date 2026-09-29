import { Router, Response } from 'express';
import { AuthenticatedRequest } from './authRoutes.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { getTenantId, tenantRecords } from '../services/tenantAccess.js';
import { encryptSecret } from '../services/sshService.js';

export const awsAccountRouter = Router();

awsAccountRouter.get('/aws/accounts', (req: AuthenticatedRequest, res: Response) => {
  const accounts = tenantRecords(getCollectionData('awsAccounts', []), getTenantId(req))
    .map((account: any) => ({
      id: account.id,
      name: account.name,
      accountId: account.accountId,
      region: account.region,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }));
  res.json(accounts);
});

awsAccountRouter.post('/aws/accounts', (req: AuthenticatedRequest, res: Response) => {
  const { name, accountId, region, accessKeyId, secretAccessKey, sessionToken } = req.body;
  if (!name || !accountId || !region || !accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'name, accountId, region, accessKeyId and secretAccessKey are required.' });
  }

  const accounts = getCollectionData('awsAccounts', []);
  const duplicate = accounts.find((a: any) =>
    a.organizationId === getTenantId(req) && a.accountId === accountId
  );
  if (duplicate) return res.status(409).json({ error: 'AWS account is already connected to this organization.' });

  const now = new Date().toISOString();
  const account = {
    id: 'aws-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    organizationId: getTenantId(req),
    createdBy: req.user.id,
    name,
    accountId,
    region,
    status: 'CONFIGURED',
    accessKeyId: encryptSecret(accessKeyId),
    secretAccessKey: encryptSecret(secretAccessKey),
    sessionToken: sessionToken ? encryptSecret(sessionToken) : null,
    createdAt: now,
    updatedAt: now
  };
  accounts.push(account);
  setCollectionData('awsAccounts', accounts);
  res.status(201).json({
    id: account.id, name, accountId, region, status: account.status, createdAt: now
  });
});

awsAccountRouter.delete('/aws/accounts/:id', (req: AuthenticatedRequest, res: Response) => {
  const accounts = getCollectionData('awsAccounts', []);
  const exists = accounts.some((a: any) => a.id === req.params.id && a.organizationId === getTenantId(req));
  if (!exists) return res.status(404).json({ error: 'AWS account not found.' });
  setCollectionData('awsAccounts', accounts.filter((a: any) => !(a.id === req.params.id && a.organizationId === getTenantId(req))));
  res.status(204).send();
});
