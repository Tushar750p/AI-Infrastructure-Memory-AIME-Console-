import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aime-enterprise-jwt-secret-key-2026-production-secure';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'aime-enterprise-refresh-secret-key-2026-production';

// Password complexity regex: at least 8 chars, at least 1 uppercase, 1 lowercase, 1 number
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

// Role Permissions Matrix
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Owner': ['*'],
  'Organization Admin': ['org:manage', 'users:manage', 'infra:read', 'infra:write', 'infra:delete', 'audit:read'],
  'DevOps Engineer': ['infra:read', 'infra:write', 'infra:deploy', 'logs:read', 'cmd:execute'],
  'SRE': ['infra:read', 'infra:write', 'incidents:manage', 'alerts:manage', 'logs:read', 'cmd:execute'],
  'Developer': ['infra:read', 'logs:read', 'cmd:read'],
  'Auditor': ['audit:read', 'infra:read', 'logs:read', 'reports:read'],
  'Viewer': ['infra:read', 'logs:read']
};

// Seed default enterprise operators if not exist
export async function ensureSeedUsers() {
  const users = getCollectionData('users', []);
  const now = new Date().toISOString();

  const presets = [
    {
      id: 'usr-sarah-01',
      email: 'sarah.sre@aime.internal',
      username: 'sre_sarah',
      fullName: 'Sarah Jenkins',
      pin: '4491',
      role: 'SRE',
      badgeId: 'OP-4491-SRH'
    },
    {
      id: 'usr-alex-02',
      email: 'alex.devops@aime.internal',
      username: 'devops_alex',
      fullName: 'Alex Rivera',
      pin: '1288',
      role: 'DevOps Engineer',
      badgeId: 'OP-1288-ALX'
    },
    {
      id: 'usr-clara-03',
      email: 'clara.sysadmin@aime.internal',
      username: 'sysadmin_clara',
      fullName: 'Clara Oswald',
      pin: '0941',
      role: 'Organization Admin',
      badgeId: 'OP-0941-CLR'
    }
  ];

  let updated = false;

  for (const preset of presets) {
    const exists = users.find((u: any) => u.email === preset.email || u.username === preset.username);
    if (!exists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(preset.pin, salt);

      users.push({
        id: preset.id,
        email: preset.email,
        username: preset.username,
        fullName: preset.fullName,
        passwordHash: hashedPassword,
        role: preset.role,
        organizationId: 'org-aime-01',
        organizationName: 'AIME Enterprise Ops',
        badgeId: preset.badgeId,
        isVerified: true,
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: [],
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(preset.fullName)}`,
        timezone: 'America/New_York',
        language: 'en-US',
        preferences: { theme: 'dark', notificationsEmail: true, notificationsSlack: true },
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
        createdBy: 'system'
      });
      updated = true;
    }
  }

  if (updated) {
    setCollectionData('users', users);
  }

  // Ensure default organization exists
  const orgs = getCollectionData('organizations', []);
  if (!orgs.some((o: any) => o.id === 'org-aime-01')) {
    orgs.push({
      id: 'org-aime-01',
      name: 'AIME Enterprise Ops',
      plan: 'Enterprise Pro',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'usr-sarah-01'
    });
    setCollectionData('organizations', orgs);
  }
}

// Generate JWT Tokens
export function generateTokens(user: any, sessionId: string) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'SRE',
    organizationId: user.organizationId || 'org-aime-01',
    sessionId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

// Verify JWT Access Token
export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

// Verify Refresh Token
export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET) as any;
  } catch (err) {
    return null;
  }
}

// Helper to write audit logs
export function logAuthAudit(action: string, userId: string, email: string, orgId: string, ip: string, details?: string) {
  const auditLogs = getCollectionData('auditLogs', []);
  const log = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action,
    userId,
    user: email,
    organizationId: orgId,
    ipAddress: ip || '127.0.0.1',
    details: details || `Action ${action} executed by ${email}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId
  };
  auditLogs.unshift(log);
  setCollectionData('auditLogs', auditLogs);
}
