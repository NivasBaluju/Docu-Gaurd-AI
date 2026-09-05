const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { calculateCalibratedDocumentRisk } = require('../server/utils/aiEngine');

async function runParityTests() {
  console.log('=== PHASE N: ARCHITECTURE SPLIT-BRAIN REDUCTION & PARITY SUITE ===\n');

  const rulesPath = path.resolve(__dirname, '../data/canonical_risk_rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

  console.log(`Canonical Formula Version: ${rules.formula_version}`);
  console.log(`Loaded ${rules.canonical_test_vectors.length} canonical test vectors.\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  for (const vector of rules.canonical_test_vectors) {
    console.log(`--- Evaluating Vector: [${vector.id}] ---`);

    // 1. Run Node calculation
    const nodeResult = calculateCalibratedDocumentRisk(vector.text, vector.missing_omissions);

    // 2. Run Python calculation via micro-process
    let pythonResult;
    try {
      const inputJson = JSON.stringify({ text: vector.text, missing: vector.missing_omissions });
      const pyOutput = execSync('python backend/tests/eval_risk_parity.py', {
        cwd: path.resolve(__dirname, '..'),
        input: inputJson,
        encoding: 'utf8'
      });
      pythonResult = JSON.parse(pyOutput.trim());
      if (pythonResult.error) {
        throw new Error(pythonResult.error);
      }
    } catch (err) {
      console.error(`  ❌ Python execution error on vector ${vector.id}:`, err.message);
      failed++;
      continue;
    }

    // 3. Compare Node vs Python Parity
    assert(nodeResult.score === pythonResult.score, `[${vector.id}] Score parity: Node=${nodeResult.score}, Python=${pythonResult.score}`);
    assert(nodeResult.level === pythonResult.level, `[${vector.id}] Level parity: Node=${nodeResult.level}, Python=${pythonResult.level}`);
    assert(nodeResult.hazardPoints === pythonResult.hazardPoints, `[${vector.id}] Hazard points parity: Node=${nodeResult.hazardPoints}, Python=${pythonResult.hazardPoints}`);
    assert(nodeResult.omissionPoints === pythonResult.omissionPoints, `[${vector.id}] Omission points parity: Node=${nodeResult.omissionPoints}, Python=${pythonResult.omissionPoints}`);

    // 4. Compare against canonical fixture ground truth
    assert(nodeResult.score === vector.expected.score, `[${vector.id}] Ground truth score match: got=${nodeResult.score}, expected=${vector.expected.score}`);
    assert(nodeResult.level === vector.expected.level, `[${vector.id}] Ground truth level match: got=${nodeResult.level}, expected=${vector.expected.level}`);

    const nodeMatchedHazards = nodeResult.factors.filter(f => f.category === 'CONFIRMED_HAZARD').map(f => f.riskType).sort();
    const expectedHazards = [...vector.expected.hazardsMatched].sort();
    assert(
      JSON.stringify(nodeMatchedHazards) === JSON.stringify(expectedHazards),
      `[${vector.id}] Matched hazards exact match: [${nodeMatchedHazards.join(', ')}]`
    );
  }

  // Drift detection assertion
  console.log('\n--- Drift Detection Verification ---');
  assert(rules.formula_version === '2.0.0', 'Formula version is anchored to 2.0.0');
  assert(rules.parameters.minimum_baseline_score === 5, 'Baseline score anchored to 5');
  assert(rules.parameters.moderated_omissions_ceiling === 35, 'Moderated omissions ceiling anchored to 35');

  console.log('\n=============================================================');
  console.log(`TOTAL PARITY CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runParityTests().catch(err => {
  console.error('Parity test execution error:', err);
  process.exit(1);
});
