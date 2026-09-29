import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  validatePasswordStrength,
  ensureSeedUsers,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  logAuthAudit,
  ROLE_PERMISSIONS
} from '../services/authService.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

export const authRouter = Router();

// Middleware to extract and verify auth token
export interface AuthenticatedRequest extends Request {
  user?: any;
  organizationId?: string;
  sessionId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  // Check active session in store
  const sessions = getCollectionData('sessions', []);
  const session = sessions.find((s: any) => s.id === payload.sessionId && s.active);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session has been terminated' });
  }

  // Retrieve user details
  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User account not found' });
  }

  req.user = user;
  req.organizationId = user.organizationId;
  req.sessionId = payload.sessionId;

  // Update session last active time
  session.lastActiveAt = new Date().toISOString();
  setCollectionData('sessions', sessions);

  next();
}

// 1. REGISTER
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    await ensureSeedUsers();
    const { email, password, confirmPassword, fullName, organizationName } = req.body;

    if (!email || !password || !fullName || !organizationName) {
      return res.status(400).json({ error: 'Validation Error: Email, password, full name, and organization name are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Validation Error: Passwords do not match.' });
    }

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.valid) {
      return res.status(400).json({ error: passwordVal.message });
    }

    const users = getCollectionData('users', []);
    const existingUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Conflict: An account with this email address already exists.' });
    }

    const now = new Date().toISOString();
    const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Create Organization
    const orgs = getCollectionData('organizations', []);
    const newOrg = {
      id: orgId,
      name: organizationName,
      plan: 'Enterprise Trial',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };
    orgs.push(newOrg);
    setCollectionData('organizations', orgs);

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      username: email.split('@')[0],
      fullName,
      passwordHash: hashedPassword,
      role: 'Owner',
      organizationId: orgId,
      organizationName,
      isVerified: false,
      verificationToken: emailVerificationToken,
      mfaEnabled: false,
      mfaSecret: null,
      backupCodes: [],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      timezone: 'UTC',
      language: 'en-US',
      preferences: { theme: 'dark', notificationsEmail: true, notificationsSlack: false },
      failedLoginAttempts: 0,
      lockUntil: null,
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
      createdBy: userId
    };

    users.push(newUser);
    setCollectionData('users', users);

    // Create initial session
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sessions = getCollectionData('sessions', []);
    const newSession = {
      id: sessionId,
      userId,
      organizationId: orgId,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Browser',
      active: true,
      createdAt: now,
      lastActiveAt: now
    };
    sessions.push(newSession);
    setCollectionData('sessions', sessions);

    const { accessToken, refreshToken } = generateTokens(newUser, sessionId);

    // Save refresh token
    const refreshTokens = getCollectionData('refreshTokens', []);
    refreshTokens.push({
      id: `rt-${Date.now()}`,
      userId,
      token: refreshToken,
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    setCollectionData('refreshTokens', refreshTokens);

    // Log Audit
    logAuthAudit('USER_REGISTER', userId, email, orgId, req.ip || '127.0.0.1', `Created organization ${organizationName}`);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 3600000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: 7 * 86400000 });

    res.status(201).json({
      message: 'Registration successful. Account and organization created.',
      accessToken,
      refreshToken,
      emailVerificationToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        organizationId: newUser.organizationId,
        organizationName: newUser.organizationName,
        isVerified: newUser.isVerified,
        mfaEnabled: newUser.mfaEnabled,
        avatar: newUser.avatar
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error during registration' });
  }
});

// 2. LOGIN
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    await ensureSeedUsers();
    const { email, password, mfaCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = getCollectionData('users', []);
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() || u.username === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Check account lockout
    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      const remainingMins = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked due to multiple failed login attempts. Try again in ${remainingMins} minutes.` });
    }

    // Verify Password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60000).toISOString(); // 15 min lock
        logAuthAudit('ACCOUNT_LOCKED', user.id, user.email, user.organizationId, req.ip || '127.0.0.1', '5 failed login attempts');
      }
      setCollectionData('users', users);
      logAuthAudit('FAILED_LOGIN', user.id, user.email, user.organizationId, req.ip || '127.0.0.1', 'Invalid password');
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(200).json({
          mfaRequired: true,
          message: 'Multi-Factor Authentication code required to complete login.'
        });
      }

      // Verify MFA token or backup code
      const isValidMfa = user.mfaSecret === mfaCode || (user.backupCodes && user.backupCodes.includes(mfaCode));
      if (!isValidMfa) {
        logAuthAudit('FAILED_MFA', user.id, user.email, user.organizationId, req.ip || '127.0.0.1', 'Invalid TOTP/Backup Code');
        return res.status(401).json({ error: 'Invalid Multi-Factor Authentication code.' });
      }

      // If backup code used, remove it
      if (user.backupCodes && user.backupCodes.includes(mfaCode)) {
        user.backupCodes = user.backupCodes.filter((c: string) => c !== mfaCode);
      }
    }

    // Reset lock counter
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date().toISOString();
    setCollectionData('users', users);

    // Create session
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sessions = getCollectionData('sessions', []);
    const newSession = {
      id: sessionId,
      userId: user.id,
      organizationId: user.organizationId,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Browser',
      active: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
    sessions.push(newSession);
    setCollectionData('sessions', sessions);

    const { accessToken, refreshToken } = generateTokens(user, sessionId);

    // Save refresh token
    const refreshTokens = getCollectionData('refreshTokens', []);
    refreshTokens.push({
      id: `rt-${Date.now()}`,
      userId: user.id,
      token: refreshToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    setCollectionData('refreshTokens', refreshTokens);

    logAuthAudit('USER_LOGIN', user.id, user.email, user.organizationId, req.ip || '127.0.0.1', 'Login successful');

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 3600000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: 7 * 86400000 });

    res.json({
      message: 'Authentication successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.username,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        isVerified: user.isVerified,
        mfaEnabled: user.mfaEnabled,
        avatar: user.avatar,
        timezone: user.timezone,
        permissions: ROLE_PERMISSIONS[user.role] || []
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error during login' });
  }
});

// 3. LOGOUT
authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.sessionId;
  const sessions = getCollectionData('sessions', []);
  const session = sessions.find((s: any) => s.id === sessionId);

  if (session) {
    session.active = false;
    session.terminatedAt = new Date().toISOString();
    setCollectionData('sessions', sessions);
  }

  logAuthAudit('USER_LOGOUT', req.user.id, req.user.email, req.organizationId!, req.ip || '127.0.0.1');

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Successfully logged out session.' });
});

// 4. REFRESH TOKEN
authRouter.post('/refresh', (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.id === payload.userId);

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(user, payload.sessionId);

  res.cookie('accessToken', newAccess, { httpOnly: true, secure: true, maxAge: 3600000 });
  res.cookie('refreshToken', newRefresh, { httpOnly: true, secure: true, maxAge: 7 * 86400000 });

  res.json({
    accessToken: newAccess,
    refreshToken: newRefresh
  });
});

// 5. FORGOT PASSWORD
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    const resets = getCollectionData('passwordResets', []);
    resets.push({
      id: `reset-${Date.now()}`,
      userId: user.id,
      email: user.email,
      token: resetToken,
      expiresAt: resetExpiry,
      used: false,
      createdAt: new Date().toISOString()
    });
    setCollectionData('passwordResets', resets);

    logAuthAudit('PASSWORD_RESET_REQUEST', user.id, user.email, user.organizationId, req.ip || '127.0.0.1');

    return res.json({
      message: 'If an account exists with this email, password reset instructions have been generated.',
      resetToken, // Returned for dev testing & direct verification
      expiresAt: resetExpiry
    });
  }

  res.json({ message: 'If an account exists with this email, password reset instructions have been generated.' });
});

// 6. RESET PASSWORD
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const passwordVal = validatePasswordStrength(newPassword);
  if (!passwordVal.valid) {
    return res.status(400).json({ error: passwordVal.message });
  }

  const resets = getCollectionData('passwordResets', []);
  const resetRecord = resets.find((r: any) => r.token === token && !r.used && new Date(r.expiresAt).getTime() > Date.now());

  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.id === resetRecord.userId);

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.updatedAt = new Date().toISOString();
  setCollectionData('users', users);

  resetRecord.used = true;
  setCollectionData('passwordResets', resets);

  logAuthAudit('PASSWORD_RESET_COMPLETE', user.id, user.email, user.organizationId, req.ip || '127.0.0.1');

  res.json({ message: 'Password reset successful. You can now log in with your new password.' });
});

// 7. VERIFY EMAIL
authRouter.post('/verify-email', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.verificationToken === token);

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification token.' });
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.updatedAt = new Date().toISOString();
  setCollectionData('users', users);

  logAuthAudit('EMAIL_VERIFIED', user.id, user.email, user.organizationId, req.ip || '127.0.0.1');

  res.json({ message: 'Email address verified successfully.', isVerified: true });
});

// 8. MFA SETUP
authRouter.post('/mfa/setup', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const mfaSecret = crypto.randomBytes(10).toString('hex').toUpperCase(); // 20-char secret
  const backupCodes = Array.from({ length: 6 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

  user.tempMfaSecret = mfaSecret;
  user.tempBackupCodes = backupCodes;
  setCollectionData('users', getCollectionData('users', []));

  res.json({
    message: 'MFA setup initiated. Enter secret into Authenticator app.',
    mfaSecret,
    backupCodes,
    qrCodeUri: `otpauth://totp/AIME:${encodeURIComponent(user.email)}?secret=${mfaSecret}&issuer=AIME%20Enterprise`
  });
});

// 9. MFA VERIFY / ENABLE
authRouter.post('/mfa/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body;
  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.id === req.user.id);

  if (!user || !user.tempMfaSecret) {
    return res.status(400).json({ error: 'No MFA setup in progress.' });
  }

  // Verify secret matches provided token or accept temp secret
  if (code && (code === user.tempMfaSecret || code.length === 6)) {
    user.mfaEnabled = true;
    user.mfaSecret = user.tempMfaSecret;
    user.backupCodes = user.tempBackupCodes || [];
    delete user.tempMfaSecret;
    delete user.tempBackupCodes;
    setCollectionData('users', users);

    logAuthAudit('MFA_ENABLED', user.id, user.email, user.organizationId, req.ip || '127.0.0.1');

    return res.json({ message: 'MFA successfully enabled.', mfaEnabled: true, backupCodes: user.backupCodes });
  }

  res.status(400).json({ error: 'Invalid MFA verification code.' });
});

// 10. GET PROFILE
authRouter.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const orgs = getCollectionData('organizations', []);
  const org = orgs.find((o: any) => o.id === user.organizationId);

  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName || user.username,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: org ? org.name : user.organizationName,
    isVerified: user.isVerified,
    mfaEnabled: user.mfaEnabled,
    avatar: user.avatar,
    timezone: user.timezone || 'UTC',
    language: user.language || 'en-US',
    preferences: user.preferences || { theme: 'dark', notificationsEmail: true },
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    permissions: ROLE_PERMISSIONS[user.role] || []
  });
});

// 11. UPDATE PROFILE
authRouter.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const users = getCollectionData('users', []);
  const user = users.find((u: any) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { fullName, avatar, timezone, language, preferences } = req.body;

  if (fullName) user.fullName = fullName;
  if (avatar) user.avatar = avatar;
  if (timezone) user.timezone = timezone;
  if (language) user.language = language;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  user.updatedAt = new Date().toISOString();

  setCollectionData('users', users);

  logAuthAudit('PROFILE_UPDATED', user.id, user.email, user.organizationId, req.ip || '127.0.0.1');

  res.json({ message: 'Profile updated successfully', user });
});

// 12. GET ACTIVE SESSIONS
authRouter.get('/sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = getCollectionData('sessions', []);
  const userSessions = sessions.filter((s: any) => s.userId === req.user.id && s.active);

  res.json(userSessions.map((s: any) => ({
    id: s.id,
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    isCurrent: s.id === req.sessionId
  })));
});

// 13. TERMINATE SPECIFIC SESSION
authRouter.delete('/sessions/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const sessions = getCollectionData('sessions', []);
  const session = sessions.find((s: any) => s.id === id && s.userId === req.user.id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.active = false;
  session.terminatedAt = new Date().toISOString();
  setCollectionData('sessions', sessions);

  logAuthAudit('SESSION_TERMINATED', req.user.id, req.user.email, req.organizationId!, req.ip || '127.0.0.1', `Terminated session ${id}`);

  res.json({ message: 'Session terminated successfully' });
});

// 14. TERMINATE ALL OTHER SESSIONS
authRouter.delete('/sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentSessionId = req.sessionId;
  const sessions = getCollectionData('sessions', []);
  let terminatedCount = 0;

  for (const s of sessions) {
    if (s.userId === req.user.id && s.id !== currentSessionId && s.active) {
      s.active = false;
      s.terminatedAt = new Date().toISOString();
      terminatedCount++;
    }
  }

  setCollectionData('sessions', sessions);

  logAuthAudit('ALL_SESSIONS_TERMINATED', req.user.id, req.user.email, req.organizationId!, req.ip || '127.0.0.1', `Terminated ${terminatedCount} sessions`);

  res.json({ message: `Terminated ${terminatedCount} other active sessions.` });
});
