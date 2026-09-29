import {
  initializeMemoryStore,
  storeMemoryItem,
  searchMemory,
  getTimeline,
  getRootCauseAnalysis,
  getAIRecommendations,
  getSummaryReports,
  deleteMemoryItem,
  cosineSimilarity,
  generateEmbedding
} from './src/services/memoryEngine.js';

async function runMemoryEngineTests() {
  console.log('====================================================');
  console.log('AIME ENTERPRISE AI MEMORY ENGINE - INTEGRATION TESTS');
  console.log('====================================================');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedTests++;
    }
  }

  try {
    // TEST 1: Initialization & Seed Verification
    console.log('\n--- Test 1: Memory Engine Initialization ---');
    const items = await initializeMemoryStore();
    assert(items.length >= 8, 'Memory store initialized with 8+ pre-seeded memories', `Count: ${items.length}`);

    // TEST 2: Store New Memory Item
    console.log('\n--- Test 2: Store New Memory Item ---');
    const testMem = await storeMemoryItem({
      memoryType: 'Incident Memory',
      eventType: 'K8S_POD_CRASH_LOOP',
      severity: 'critical',
      user: 'test_operator',
      serverName: 'srv-k8s-node-01',
      cluster: 'k8s-us-central-prod',
      tags: ['test', 'k8s', 'crash'],
      aiSummary: 'Test Pod crashloopbackoff in payment-gateway namespace',
      rootCause: 'Database connection string secret missing in pod environment variables',
      suggestedFix: 'Update Kubernetes secret bank-conn-secret and redeploy',
      details: 'Payment service failed readiness probe 5 times.'
    });

    assert(Boolean(testMem && testMem.id), 'Successfully stored new memory item with ID', `ID: ${testMem.id}`);
    assert(Boolean(testMem.vectorEmbedding && testMem.vectorEmbedding.length > 0), 'Generated 768-dim vector embedding', `Vector length: ${testMem.vectorEmbedding?.length}`);

    // TEST 3: Semantic Natural Language Search
    console.log('\n--- Test 3: Natural Language Semantic Search ---');
    const queries = [
      'Why did nginx fail yesterday?',
      'Show Docker crashes.',
      'Find previous EC2 restart.',
      'Show Kubernetes deployment failures.',
      'Show SSH commands executed last week.'
    ];

    for (const q of queries) {
      const searchRes = await searchMemory({ query: q, limit: 3 });
      assert(searchRes.results.length > 0, `Search query "${q}" returned matches`, `Top match score: ${searchRes.results[0]?.similarityScore}`);
    }

    // TEST 4: Infrastructure Timeline Aggregation
    console.log('\n--- Test 4: Infrastructure Timeline ---');
    const timeline = getTimeline({ limit: 10 });
    assert(timeline.length > 0, 'Timeline aggregation generated non-empty event list', `Timeline length: ${timeline.length}`);
    assert(Boolean(timeline[0].title && timeline[0].timestamp), 'Timeline items contain required fields title and timestamp');

    // TEST 5: Root Cause Analysis Generator
    console.log('\n--- Test 5: Root Cause Analysis Generator ---');
    const rca = await getRootCauseAnalysis('Nginx connection pool exhaustion');
    assert(Boolean(rca.detectedRootCause), 'Root cause analysis generated root cause explanation', `Root Cause: ${rca.detectedRootCause}`);
    assert(Boolean(rca.suggestedFix), 'RCA provided suggested fix instructions');
    assert(rca.preventativeMeasures.length > 0, 'RCA provided preventative measures');

    // TEST 6: AI Recommendations Categorization
    console.log('\n--- Test 6: AI Recommendations Categorization ---');
    const recs = getAIRecommendations();
    assert(recs.totalRecommendations > 0, 'Fetched total AI recommendations');
    assert(Array.isArray(recs.infrastructureOptimization), 'Infrastructure Optimization category array exists');
    assert(Array.isArray(recs.securityImprovements), 'Security Improvements category array exists');
    assert(Array.isArray(recs.costOptimization), 'Cost Optimization category array exists');

    // TEST 7: Summary Reports Generation
    console.log('\n--- Test 7: Daily & Weekly Summary Reports ---');
    const reports = getSummaryReports();
    assert(Boolean(reports.dailySummary && reports.dailySummary.healthScore), 'Daily summary includes health score', `Score: ${reports.dailySummary.healthScore}`);
    assert(reports.weeklySummary.mostCommonErrors.length > 0, 'Weekly summary includes most common errors');

    // TEST 8: Vector Math & Cosine Similarity Verification
    console.log('\n--- Test 8: Cosine Similarity Vector Math ---');
    const vecA = [1, 0, 0, 0];
    const vecB = [1, 0, 0, 0];
    const vecC = [0, 1, 0, 0];
    const simIdentical = cosineSimilarity(vecA, vecB);
    const simOrthogonal = cosineSimilarity(vecA, vecC);

    assert(Math.abs(simIdentical - 1.0) < 0.001, 'Identical vectors yield cosine similarity ~ 1.0', `Val: ${simIdentical}`);
    assert(Math.abs(simOrthogonal - 0.0) < 0.001, 'Orthogonal vectors yield cosine similarity ~ 0.0', `Val: ${simOrthogonal}`);

    // TEST 9: Memory Deletion
    console.log('\n--- Test 9: Memory Deletion ---');
    const deleted = deleteMemoryItem(testMem.id);
    assert(deleted, `Successfully deleted memory item ID ${testMem.id}`);

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal error during integration test execution:', err);
    process.exit(1);
  }
}

runMemoryEngineTests();
