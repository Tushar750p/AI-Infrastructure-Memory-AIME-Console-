import { consumeAuthRateLimit } from '../src/services/authRateLimitService.js';

async function runRateLimitSuite() {
  const key = 'test-' + Date.now();
  const first = await consumeAuthRateLimit({ key, limit: 2, windowMs: 60_000 });
  const second = await consumeAuthRateLimit({ key, limit: 2, windowMs: 60_000 });
  const third = await consumeAuthRateLimit({ key, limit: 2, windowMs: 60_000 });

  if (!first.allowed || !second.allowed || third.allowed) {
    throw new Error('Authentication rate limiter did not enforce the configured limit');
  }

  console.log('AUTH RATE LIMIT TEST: PASS');
}

runRateLimitSuite().catch(error => {
  console.error('AUTH RATE LIMIT TEST: FAIL', error);
  process.exit(1);
});
