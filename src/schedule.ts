import 'dotenv/config';
import { spawn } from 'node:child_process';
// Standalone scheduler for the lab. No OS task is registered by installing it.
const minutes = Number(process.env.RUN_EVERY_MINUTES || 1440);
if (!Number.isFinite(minutes) || minutes < 1 || minutes > 10080) throw new Error('RUN_EVERY_MINUTES doit être entre 1 et 10080.');
let active = false;
let child: ReturnType<typeof spawn> | undefined;
function run() {
  if (active) return;
  active = true;
  child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', '--mode', 'ollama'], { stdio: 'inherit' });
  child.on('error', error => { active = false; console.error(error); });
  child.on('exit', code => { active = false; console.log(`Run terminé : ${code}. Prochain dans ${minutes} min.`); });
}
run();
const timer = setInterval(run, minutes * 60000);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { clearInterval(timer); child?.kill(signal); process.exit(0); });
