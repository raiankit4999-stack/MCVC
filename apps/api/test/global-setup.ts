import { execSync } from 'node:child_process';

export default async function globalSetup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://mcvc:mcvc@localhost:5432/mcvc_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env, cwd: __dirname + '/..' });
}
