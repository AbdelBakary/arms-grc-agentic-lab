import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTransactions, train, predict, simulate, scoreRisk, sign, verify } from '../src/lab.js';
import { compliance } from '../src/compliance.js';

test('le modèle appris détecte les fraudes sur le holdout propre', () => {
  const model = train(makeTransactions(80));
  for (const row of makeTransactions(40, 101)) assert.equal(predict(model, row) >= 0.5, row.fraud);
});
test('la vérification détecte toute altération et les signatures mal formées', () => {
  const x = { amount: 100, velocity: 2 };
  assert.equal(verify(x, sign(x)), true);
  assert.equal(verify({ ...x, amount: 1 }, sign(x)), false);
  assert.equal(verify(x, 'malformed'), false);
});
test('cyber : falsification acceptée avant, quarantaine après', () => {
  const before = simulate('cyber', false);
  const after = simulate('cyber', true);
  assert.ok(before.metrics.falseNegatives > 0);
  assert.equal(after.metrics.falseNegatives, 0);
  assert.equal(after.metrics.integrityRejections, before.metrics.falseNegatives);
  assert.equal(after.metrics.falsePositives, 0);
});
test('poisoning : entraînement empoisonné dégrade le modèle, promotion non approuvée refusée', () => {
  const before = simulate('poisoning', false);
  const after = simulate('poisoning', true);
  assert.ok(before.metrics.falseNegatives > 0);
  assert.equal(after.metrics.falseNegatives, 0);
  assert.equal(after.metrics.trainingRejected, true);
  assert.equal(after.model.trainingHash, after.approvedHash);
});
test('l’exposition se réconcilie aux transactions manquées et le score reste borné', () => {
  const run = simulate('cyber', false);
  assert.equal(run.metrics.exposedEUR, run.observations.reduce((sum, x) => sum + x.amountAtRisk, 0));
  for (const row of scoreRisk([run])) {
    assert.ok(row.score >= 0 && row.score <= 1);
    assert.equal(row.stressLossEUR, row.exposureEUR * 0.25);
  }
});
test('les résultats sont reproductibles, MiCA et AI Act restent conditionnels', () => {
  const runs = [simulate('cyber', false), simulate('cyber', true), simulate('poisoning', false), simulate('poisoning', true)];
  assert.deepEqual(runs[0], simulate('cyber', false));
  const gaps = compliance(runs);
  assert.match(gaps.find(x => x.framework === 'MICA')!.status, /condition/);
  assert.match(gaps.find(x => x.framework === 'AI_ACT')!.status, /condition/);
});
