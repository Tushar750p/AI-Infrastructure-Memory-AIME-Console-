import {
  validatePasswordStrength,
  ensureSeedUsers,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  ROLE_PERMISSIONS
} from '../src/services/authService.js';
import bcrypt from 'bcryptjs';

async function runAuthSuite() {
  console.log('----------------------------------------------------');
  console.log('⚡ STARTING PRODUCTION AUTHENTICATION TEST SUITE ⚡');
  console.log('----------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password Complexity Unit Tests
  console.log('\n[UNIT TEST] Password Complexity Validation');
  assert(!validatePasswordStrength('short').valid, 'Rejects password shorter than 8 chars');
  assert(!validatePasswordStrength('alllowercase123').valid, 'Rejects password without uppercase letter');
  assert(!validatePasswordStrength('ALLUPPERCASE123').valid, 'Rejects password without lowercase letter');
  assert(!validatePasswordStrength('NoNumbersHere!').valid, 'Rejects password without numbers');
  assert(validatePasswordStrength('ValidPass123!').valid, 'Accepts valid strong password');

  // 2. Password Hashing & Verification Tests
  console.log('\n[UNIT TEST] Bcrypt Hashing & Salt Verification');
  const rawPass = 'SecretPass123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPass, salt);
  assert(await bcrypt.compare(rawPass, hash), 'Correct password matches bcrypt hash');
  assert(!(await bcrypt.compare('WrongPass123!', hash)), 'Incorrect password rejected by bcrypt hash');

  // 3. JWT & Session Token Lifecycle Tests
  console.log('\n[AUTH TEST] JWT & Refresh Token Issuance & Verification');
  const mockUser = { id: 'usr-test-99', email: 'test@aime.internal', role: 'DevOps Engineer', organizationId: 'org-test-01' };
  const mockSessionId = 'sess-test-888';

  const tokens = generateTokens(mockUser, mockSessionId, 'family-test-01');
  assert(typeof tokens.accessToken === 'string', 'Generated valid access token string');
  assert(typeof tokens.refreshToken === 'string', 'Generated valid refresh token string');

  const decodedAccess = verifyAccessToken(tokens.accessToken);
  assert(decodedAccess !== null && decodedAccess.userId === mockUser.id, 'Verified Access Token payload');
  assert(decodedAccess.organizationId === 'org-test-01', 'Access Token includes organizationId');
  assert(decodedAccess.familyId === 'family-test-01', 'Access Token includes refresh token family ID');
  assert(verifyRefreshToken(tokens.refreshToken)?.familyId === 'family-test-01', 'Refresh Token includes refresh token family ID');

  const decodedRefresh = verifyRefreshToken(tokens.refreshToken);
  assert(decodedRefresh !== null && decodedRefresh.type === 'refresh', 'Verified Refresh Token payload');

  // 4. Role Based Access Control (RBAC) Tests
  console.log('\n[ROLE TEST] RBAC Roles & Permissions Matrix');
  assert(ROLE_PERMISSIONS['Owner'].includes('*'), 'Owner has root wildcard permissions');
  assert(ROLE_PERMISSIONS['SRE'].includes('incidents:manage'), 'SRE role includes incident management');
  assert(ROLE_PERMISSIONS['Auditor'].includes('audit:read'), 'Auditor role includes audit logs access');
  assert(!ROLE_PERMISSIONS['Viewer'].includes('infra:delete'), 'Viewer role restricted from deleting infrastructure');
  assert(!ROLE_PERMISSIONS['Viewer'].includes('infra:write'), 'Viewer role restricted from infrastructure mutations');
  assert(!ROLE_PERMISSIONS['Developer'].includes('infra:deploy'), 'Developer role restricted from deployments');
  assert(!ROLE_PERMISSIONS['Developer'].includes('cmd:execute'), 'Developer role restricted from command execution');
  assert(!ROLE_PERMISSIONS['Auditor'].includes('infra:write'), 'Auditor role restricted from infrastructure mutations');
  assert(ROLE_PERMISSIONS['DevOps Engineer'].includes('infra:deploy'), 'DevOps Engineer can perform approved deployments');
  assert(ROLE_PERMISSIONS['Organization Admin'].includes('users:manage'), 'Organization Admin can manage users');

  console.log('\n----------------------------------------------------');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
