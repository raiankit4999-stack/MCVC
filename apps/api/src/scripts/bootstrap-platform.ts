/**
 * Production bootstrap: idempotently creates the community, Gujarat starter
 * cities/areas, business categories, membership plans and the super admin.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node dist/scripts/bootstrap-platform.js
 */
import { PrismaClient } from '@prisma/client';
import { seedPlatform } from '../seed/platform';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    console.log('bootstrap-platform: ADMIN_EMAIL / ADMIN_PASSWORD (12+ chars) not set — skipping');
    return;
  }
  const prisma = new PrismaClient();
  try {
    await seedPlatform(prisma, { adminEmail, adminPassword });
    console.log(`bootstrap-platform: ready (admin ${adminEmail})`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
