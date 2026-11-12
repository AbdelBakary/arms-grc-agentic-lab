import 'dotenv/config';
import { mkdir, writeFile, rename, open, unlink } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runAgents } from './agents.js';
import { architecture, digest } from './lab.js';
import { sources } from './compliance.js';

const { values } = parseArgs({ options: { mode: { type: 'string', default: 'deterministic' } } });
if (values.mode !== 'deterministic' && values.mode !== 'ollama') throw new Error('Mode invalide');
await mkdir('reports', { recursive: true });
let lock;
try { lock = await open('reports/.run.lock', 'wx'); } catch { throw new Error('Un run est déjà actif. Après arrêt anormal seulement, supprimer reports/.run.lock.'); }
try {
  const startedAt = new Date().toISOString();
  const log: { at: string; message: string }[] = [];
  const progress = (message: string) => { log.push({ at: new Date().toISOString(), message }); console.log(message); };
  const result = await runAgents(values.mode, progress);
  const report = { schemaVersion: 1, runId: startedAt.replaceAll(/[:.]/g, '-'), startedAt, finishedAt: new Date().toISOString(),
    mode: values.mode, fictional: true, architecture, ...result, sources,
    limitations: ['Aucun système réel testé.', 'Modèle logistique pédagogique et échantillon synthétique limité.',
      'Deux scénarios illustratifs, aucune validation complète DORA, MiCA, RGPD ou AI Act.',
      'Commentaires LLM non autoritatifs. Les mesures des outils constituent les preuves.'] };
  const json = JSON.stringify(report, null, 2);
  const dir = `reports/${report.runId}`;
  await mkdir(dir);
  await writeFile(`${dir}/report.json`, json);
  await writeFile(`${dir}/events.jsonl`, log.map(x => JSON.stringify(x)).join('\n') + '\n');
  await writeFile(`${dir}/manifest.json`, JSON.stringify({ reportSHA256: digest(report), mode: values.mode }, null, 2));
  await writeFile('reports/latest.tmp', json);
  await rename('reports/latest.tmp', 'reports/latest.json');
  const csv = ['scenario,hardened,tested,detected,falseNegatives,falsePositives,detectionRate,exposedEUR', ...result.runs.map(x => [x.scenario, x.hardened, x.metrics.tested, x.metrics.detected, x.metrics.falseNegatives, x.metrics.falsePositives, x.metrics.detectionRate, x.metrics.exposedEUR].join(','))].join('\n');
  await writeFile(`${dir}/metrics.csv`, csv + '\n');
  await writeFile('reports/metrics.csv', csv + '\n');
  await writeFile('data/architecture.json', JSON.stringify(architecture, null, 2));
  console.log(`Rapport enregistré : ${dir}/report.json`);
  console.table(result.runs.map(x => ({ scenario: x.scenario, hardened: x.hardened, ...x.metrics })));
} catch (error) {
  await writeFile('reports/last-error.json', JSON.stringify({ at: new Date().toISOString(), message: String(error) }, null, 2));
  throw error;
} finally { await lock.close(); await unlink('reports/.run.lock'); }
