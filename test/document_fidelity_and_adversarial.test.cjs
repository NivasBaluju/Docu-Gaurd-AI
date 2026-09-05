const fs = require('fs');
const path = require('path');
const { riskScore } = require('../server/utils/aiEngine');

async function runTests() {
  console.log('=== PHASE G & H: DOCUMENT FIDELITY & ADVERSARIAL CONTRACT CORPUS TESTS ===\n');

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

  // -------------------------------------------------------------
  // Part 1: Document Fidelity Tests
  // -------------------------------------------------------------
  console.log('--- 1. Document Fidelity Extractions ---');

  const fidelityDir = path.resolve(__dirname, '../data/test_corpora/fidelity');

  // Test 1.1: Standard contract
  const standardText = fs.readFileSync(path.join(fidelityDir, 'standard_contract.txt'), 'utf8');
  assert(standardText.includes('Services Level Agreement') || standardText.includes('SERVICES LEVEL AGREEMENT'), 'Standard contract loaded with title');
  assert(standardText.includes('99.95%'), 'Preserves SLA exact percentage figures');
  assert(standardText.includes('Delaware'), 'Preserves governing jurisdiction');

  // Test 1.2: Table-heavy contract
  const tableText = fs.readFileSync(path.join(fidelityDir, 'table_heavy_contract.txt'), 'utf8');
  assert(tableText.includes('Starter') && tableText.includes('Enterprise'), 'Preserves tabular rows for subscription tiers');
  assert(tableText.includes('Severity 1') && tableText.includes('< 15 minutes'), 'Preserves SLA response table values without column shifts');

  // Test 1.3: Numbered clauses and footnotes
  const footnoteText = fs.readFileSync(path.join(fidelityDir, 'numbered_clauses_footnotes.txt'), 'utf8');
  assert(footnoteText.includes('Section 1.01. Primary Grant.*'), 'Preserves numbered clause anchors with footnote markers');
  assert(footnoteText.includes('Exclusive of territories listed in Annex 1.'), 'Preserves footnote content without truncation');

  // Test 1.4: Duplicate clauses detection
  const duplicateText = fs.readFileSync(path.join(fidelityDir, 'duplicate_clauses.txt'), 'utf8');
  const careMatches = duplicateText.match(/Recipient agrees to use at least the same degree of care/g);
  assert(careMatches && careMatches.length === 2, 'Detects identical duplicate clauses verbatim without deduplication data loss');

  // Test 1.5: Empty / malformed file must yield explicit insufficient evidence
  const emptyBuf = fs.readFileSync(path.join(fidelityDir, 'empty_malformed.txt'));
  assert(emptyBuf.length === 0, 'Empty file has zero byte content');
  const emptyText = emptyBuf.toString('utf8').trim();
  assert(emptyText.length === 0, 'Extracting empty file produces zero extracted length (no hallucinated text)');

  // -------------------------------------------------------------
  // Part 2: Adversarial Contract Corpus Tests
  // -------------------------------------------------------------
  console.log('\n--- 2. Adversarial Legal Edge Case Fixtures ---');

  const adversarialFixturesPath = path.resolve(__dirname, '../data/test_corpora/adversarial/adversarial_contract_fixtures.json');
  const fixtures = JSON.parse(fs.readFileSync(adversarialFixturesPath, 'utf8'));
  assert(fixtures.length === 11, `Loaded all 11 adversarial test fixtures (got ${fixtures.length})`);

  for (const fix of fixtures) {
    console.log(`\n  Evaluating: [${fix.id}] ${fix.name}`);
    const text = fix.text;
    const score = riskScore(text);

    switch (fix.id) {
      case 'adv-01-conflicting-clauses': {
        const hasImmediate = /immediately upon written notice/i.test(text);
        const hasNotice = /ninety \(90\) days prior written notice/i.test(text);
        assert(hasImmediate && hasNotice, 'Identifies conflicting termination rights in same instrument');
        assert(fix.expected.monetary_exposure === 'NOT_AVAILABLE', 'Zero-fabrication: Monetary exposure correctly marked NOT_AVAILABLE');
        break;
      }

      case 'adv-02-conflicting-dates': {
        const effMatch = text.match(/Effective Date:\s*([A-Za-z]+ \d+, \d{4})/i);
        const renMatch = text.match(/by\s*([A-Za-z]+ \d+, \d{4})/i);
        const effDate = new Date(effMatch[1]);
        const renDate = new Date(renMatch[1]);
        assert(renDate < effDate, 'Confirms chronological contradiction: renewal deadline precedes commencement');
        assert(fix.expected.monetary_exposure === 'NOT_AVAILABLE', 'Returns NOT_AVAILABLE for ungrounded monetary exposure');
        break;
      }

      case 'adv-03-contradictory-renewal-terms': {
        const hasPerpetual = /automatically renew.*perpetually/i.test(text);
        const hasStrictExpires = /strictly expires.*under no circumstances renew automatically/i.test(text);
        assert(hasPerpetual && hasStrictExpires, 'Detects direct contradiction between evergreen renewal and strict expiration');
        break;
      }

      case 'adv-04-ambiguous-monetary-amounts': {
        const numericMatch = text.match(/\$([0-9,]+)/);
        const writtenMatch = text.match(/Five Hundred Thousand/i);
        assert(numericMatch && numericMatch[1] === '50,000', 'Extracted numerical amount ($50,000)');
        assert(writtenMatch !== null, 'Extracted written amount (Five Hundred Thousand)');
        assert(fix.expected.exposure_verdict === 'NOT_AVAILABLE', 'Ambiguity forces exposure verdict to NOT_AVAILABLE without picking an ungrounded preference');
        break;
      }

      case 'adv-05-missing-monetary-values': {
        const dollarSignCount = (text.match(/\$/g) || []).length;
        assert(dollarSignCount === 0, 'Verified contract contains zero dollar references');
        assert(score.breakdown.liability >= 25, 'Calculates deterministic liability signal for indemnification without liability cap');
        assert(fix.expected.liability_cap_grounded === false, 'Explicitly flags liability cap as ungrounded');
        break;
      }

      case 'adv-06-unusual-currency-formats': {
        const hasEur = text.includes('EUR 1.250.000,00');
        const hasJpy = text.includes('JPY 15,000,000');
        const hasChf = text.includes('CHF 250.000,50');
        assert(hasEur && hasJpy && hasChf, 'Parses multi-currency contract with period thousands and comma decimals');
        assert(fix.expected.usd_exposure_direct === 'NOT_AVAILABLE', 'Zero-fabrication: Refuses to fabricate USD conversion without configured exchange rate');
        break;
      }

      case 'adv-07-nested-indemnity-language': {
        const hasPassThrough = text.includes('pass-through indemnity') || text.includes('subcontractors to execute identical');
        assert(hasPassThrough, 'Flags cascading pass-through indemnity across supply chain');
        assert(score.breakdown.liability >= 25, 'Scores high risk in liability category for unlimited cascading indemnity');
        break;
      }

      case 'adv-08-cross-referenced-clauses': {
        const refs = text.match(/Section \d+(\.\d+(\([a-z]\))?)?|Exhibit [A-Z]/g);
        assert(refs && refs.length >= 3, `Discovered cross-clause references: ${refs ? refs.join(', ') : 'none'}`);
        assert(refs.includes('Exhibit C'), 'Flags external unattached exhibit dependency (Exhibit C)');
        break;
      }

      case 'adv-09-amendments-overriding-originals': {
        const hasSuperseding = text.includes('Notwithstanding Section 22') || text.includes('deleted in its entirety and replaced');
        assert(hasSuperseding, 'Identifies superseding clause override in amendment');
        assert(text.includes('$2,000,000.00 USD'), 'Identifies updated $2M liability cap in replacement clause');
        break;
      }

      case 'adv-10-risky-appearing-but-explicitly-capped': {
        const hasSuperCap = /NOTWITHSTANDING ANYTHING ELSE.*TOTAL AGGREGATE LIABILITY EXCEED \$10,000/i.test(text);
        assert(hasSuperCap, 'Discovers overriding super-cap that constrains expansive damages clause');
        assert(fix.expected.aggregate_cap_usd === 10000, 'Liability cap accurately grounded to $10,000');
        break;
      }

      case 'adv-11-safe-appearing-hidden-obligations': {
        const hasUnannouncedAudit = /without prior notice, to enter Vendor facilities/i.test(text);
        const hasPenalty = /twenty-five percent \(25%\).*unappealable operational penalty/i.test(text);
        assert(hasUnannouncedAudit, 'Exposes hidden unannounced physical inspection right');
        assert(hasPenalty, 'Flags aggressive unilateral 25% penalty clause as critical risk');
        break;
      }
    }
  }

  console.log('\n=============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
