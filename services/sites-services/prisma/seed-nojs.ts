import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/sites_db',
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

interface SiteNojsData {
  site_id?: string;
  site_name?: string;
  nojs?: string | null;
}

async function main() {
  console.log('Starting NOJS seed (update/create site_info.no_js)...');

  const projectRoot = process.cwd();
  const jsonPath = path.join(projectRoot, 'docs', 'newDatas.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`newDatas.json not found at: ${jsonPath}`);
  }

  const jsonData: SiteNojsData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Found ${jsonData.length} records in JSON`);

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of jsonData) {
    const siteId = row.site_id?.trim();
    const siteName = row.site_name?.trim();
    const nojs = row.nojs?.trim();

    if (!siteId || !siteName || !nojs) {
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.siteInfo.findUnique({
        where: { siteId },
        select: { id: true },
      });

      if (existing) {
        await prisma.siteInfo.update({
          where: { siteId },
          data: { noJS: nojs },
        });
        updated++;
      } else {
        await prisma.siteInfo.create({
          data: {
            siteId,
            siteName,
            noJS: nojs,
          },
        });
        created++;
      }
    } catch (error) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed processing site_id=${siteId}: ${message}`);
    }
  }

  console.log('='.repeat(50));
  console.log('NOJS Seed Summary');
  console.log('='.repeat(50));
  console.log(`Updated : ${updated}`);
  console.log(`Created : ${created}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Errors  : ${errors}`);
}

main()
  .catch((e) => {
    console.error('NOJS seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
