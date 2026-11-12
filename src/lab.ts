import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type Scenario = 'cyber' | 'poisoning';
export type Transaction = { id: string; amount: number; velocity: number; fraud: boolean; group: 'A' | 'B' };
export type Observation = { id: string; expectedFraud: boolean; probability: number; blocked: boolean; reason: string; amountAtRisk: number; group: string };
export const architecture = {
  fictional: true,
  purpose: 'Laboratoire ARMS de détection de fraude, sans décision de crédit ni exécution de paiement.',
  assets: [
    { id: 'gateway', role: 'Réception des événements synthétiques', critical: true },
    { id: 'crypto-api', role: 'Fournisseur externe simulé', critical: true },
    { id: 'feature-store', role: 'Montant et vélocité signés', critical: true },
    { id: 'training', role: 'Jeu de données versionné et labels', critical: true },
    { id: 'model', role: 'Régression logistique entraînée localement', critical: true },
    { id: 'audit', role: 'Journal des décisions et versions', critical: true },
  ],
  flows: [
    ['crypto-api', 'gateway', 'Transaction non fiable à vérifier'],
    ['gateway', 'feature-store', 'Caractéristiques de transaction'],
    ['training', 'model', 'Apprentissage et promotion du modèle'],
    ['feature-store', 'model', 'Évaluation du risque de fraude'],
    ['model', 'audit', 'Décision, version, motifs et preuve'],
  ],
  providers: [{ id: 'crypto-api', service: 'API crypto fictive', fallback: 'Revue humaine et mise en quarantaine' }],
};

export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const labKey = 'PUBLIC-TEST-KEY-DO-NOT-USE-IN-PRODUCTION';
export function sign(value: unknown) { return createHmac('sha256', labKey).update(JSON.stringify(value)).digest('hex'); }
export function verify(value: unknown, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(sign(value), 'hex'), Buffer.from(signature, 'hex'));
}

export function makeTransactions(count = 40, offset = 0): Transaction[] {
  return Array.from({ length: count }, (_, i) => {
    const fraud = i % 2 === 1;
    const n = i + offset;
    return { id: `TX-${n.toString().padStart(3, '0')}`, fraud,
      amount: fraud ? 12000 + (n % 7) * 2500 : 100 + (n % 9) * 150,
      velocity: fraud ? 8 + n % 6 : 1 + n % 3,
      group: Math.floor(i / 2) % 2 === 0 ? 'A' : 'B' };
  });
}

const features = (t: Transaction) => [1, t.amount / 30000, t.velocity / 15];
const sigmoid = (n: number) => 1 / (1 + Math.exp(-n));
export function train(rows: Transaction[]) {
  const weights = [0, 0, 0];
  for (let epoch = 0; epoch < 500; epoch++) {
    const grad = [0, 0, 0];
    for (const row of rows) {
      const x = features(row);
      const error = sigmoid(x.reduce((s, v, i) => s + v * weights[i], 0)) - Number(row.fraud);
      x.forEach((v, i) => grad[i] += error * v);
    }
    weights.forEach((_, i) => weights[i] -= 0.5 * grad[i] / rows.length);
  }
  return { weights, trainingHash: digest(rows) };
}
export function predict(model: ReturnType<typeof train>, row: Transaction) {
  return sigmoid(features(row).reduce((s, v, i) => s + v * model.weights[i], 0));
}

export function simulate(scenario: Scenario, hardened: boolean) {
  const original = makeTransactions(80);
  const alteredTraining = original.map(t => ({ ...t, fraud: false }));
  const candidate = scenario === 'poisoning' ? alteredTraining : original;
  // A trusted release digest is anchored before the untrusted candidate arrives.
  const approvedHash = digest(original);
  const trainingRejected = hardened && digest(candidate) !== approvedHash;
  const model = train(trainingRejected ? original : candidate);
  const holdout = makeTransactions(40, 101);
  const observations: Observation[] = holdout.map((truth, i) => {
    const { fraud, group, ...payload } = truth;
    const signature = sign(payload);
    const tamper = scenario === 'cyber' && fraud && i % 5 !== 0;
    const incoming = tamper ? { ...payload, amount: 120, velocity: 1 } : payload;
    const integrityRejected = hardened && !verify(incoming, signature);
    // The oracle fraud label never enters prediction features.
    const probability = predict(model, { ...incoming, fraud: false, group });
    const blocked = integrityRejected || probability >= 0.5;
    return { id: truth.id, expectedFraud: fraud, probability: Number(probability.toFixed(6)), blocked,
      reason: integrityRejected ? 'Signature invalide : quarantaine' : blocked ? 'Alerte modèle : revue humaine' : 'Aucune alerte',
      amountAtRisk: fraud && !blocked ? truth.amount : 0, group };
  });
  const frauds = observations.filter(x => x.expectedFraud);
  const legitimate = observations.filter(x => !x.expectedFraud);
  const missed = frauds.filter(x => !x.blocked);
  const metrics = {
    tested: observations.length, fraudulent: frauds.length,
    detected: frauds.length - missed.length, falseNegatives: missed.length,
    falsePositives: legitimate.filter(x => x.blocked).length,
    detectionRate: (frauds.length - missed.length) / frauds.length,
    exposedEUR: missed.reduce((n, x) => n + x.amountAtRisk, 0),
    integrityRejections: observations.filter(x => x.reason.startsWith('Signature')).length,
    trainingRejected,
  };
  return { scenario, hardened, model, approvedHash, candidateHash: digest(candidate), metrics, observations,
    limitation: 'Données synthétiques et modèle pédagogique. Les résultats ne caractérisent aucun système bancaire réel.' };
}
export type Simulation = ReturnType<typeof simulate>;

export function scoreRisk(runs: Simulation[]) {
  return runs.map(run => {
    const impact = Math.min(1, run.metrics.exposedEUR / 400000);
    const likelihoodAssumption = 0.6;
    const score = Number((impact * likelihoodAssumption).toFixed(3));
    return { scenario: run.scenario, hardened: run.hardened, exposureEUR: run.metrics.exposedEUR,
      stressLossEUR: run.metrics.exposedEUR * 0.25, lossGivenFraudAssumption: 0.25,
      likelihoodAssumption, impact, score, level: score >= 0.4 ? 'Élevé' : score >= 0.15 ? 'Moyen' : 'Faible',
      reputation: run.metrics.falseNegatives > 0 ? 'Risque qualitatif de perte de confiance, non mesuré' : 'Aucun faux négatif dans cet échantillon',
      caveat: 'Score de priorisation pédagogique. La probabilité et le taux de perte sont des hypothèses, pas des fréquences observées.' };
  }).sort((a, b) => b.score - a.score);
}
