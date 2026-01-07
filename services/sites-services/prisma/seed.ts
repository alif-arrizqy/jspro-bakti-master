import { PrismaClient, Prisma } from '@prisma/client';
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

// ===========================================
// TRANSFORMERS (inline to avoid import issues in seed)
// ===========================================

/**
 * Transform SCC type: scc-srne -> scc_srne
 */
function transformSccType(value: string | null | undefined): 'scc_srne' | 'scc_epever' | null {
  if (!value) return null;
  
  const normalized = value.toLowerCase().trim();
  
  // Handle dash format (from site/field)
  if (normalized === 'scc-srne' || normalized.includes('srne')) return 'scc_srne';
  if (normalized === 'scc-epever' || normalized.includes('epever') || normalized.includes('epveper')) return 'scc_epever';
  
  // Handle underscore format
  if (normalized === 'scc_srne') return 'scc_srne';
  if (normalized === 'scc_epever') return 'scc_epever';
  
  return null;
}

/**
 * Transform status_sites: non-terestrial -> non_terestrial
 */
function transformStatusSites(value: string | null | undefined): 'terestrial' | 'non_terestrial' {
  if (!value) return 'non_terestrial';
  
  const normalized = value.toLowerCase().trim();
  
  // Handle various formats with dash or underscore
  if (normalized.includes('non')) {
    return 'non_terestrial';
  }
  
  if (normalized === 'terestrial' || normalized === 'terestrial') {
    return 'terestrial';
  }
  
  // Default
  return 'non_terestrial';
}

/**
 * Transform battery_version: FULL_TALIS5 -> talis5
 */
function transformBatteryVersion(value: string | null | undefined): 'talis5' | 'mix' | 'jspro' | null {
  if (!value) return null;
  
  const normalized = value.toUpperCase().trim();
  
  if (normalized.includes('TALIS') || normalized === 'FULL_TALIS5') return 'talis5';
  if (normalized.includes('MIX')) return 'mix';
  if (normalized.includes('JSPRO') || normalized === 'JSPRO') return 'jspro';
  
  return null;
}

/**
 * Transform panel2_type: new/old
 */
function transformPanel2Type(value: string | null | undefined): 'new' | 'old' | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'new') return 'new';
  if (normalized === 'old') return 'old';
  return null;
}

/**
 * Transform ehub_version: new/old
 */
function transformEhubVersion(value: string | null | undefined): 'new' | 'old' | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'new') return 'new';
  if (normalized === 'old') return 'old';
  return null;
}

// Helper to parse date
const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr || dateStr === '') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Type for JSON data
interface SiteJsonData {
  site_id: string;
  site_name: string;
  onair_date?: string;
  topo_sustain_date?: string;
  gs_sustain_date?: string;
  talis_installed?: string;
  longitude?: number;
  latitude?: number;
  province?: string;
  regency?: string;
  subdistrict?: string;
  village?: string;
  provider_gs?: string;
  kapsat?: string;
  cellular_operator?: string;
  project_phase?: string;
  build_year?: string;
  webapp_url?: string;
  mini_pc?: string | null;
  terminal_id?: string;
  scc?: string;
  scc_type?: string;
  ip_gw_lc?: string;
  ip_gw_gs?: string;
  ip_snmp?: string;
  subnet?: string;
  panel2_type?: string;
  ehub_version?: string;
  battery_version?: string;
  status_sites?: string;
  tvd_site?: boolean;
  contact_person?: Array<{ name: string; phone: string | null }>;
}

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('');
  console.log('📋 Transformation Rules:');
  console.log('   - scc-srne    → scc_srne');
  console.log('   - scc-epever  → scc_epever');
  console.log('   - non-terestrial → non_terestrial');
  console.log('   - terestrial → terestrial');
  console.log('   - FULL_TALIS5 → talis5');
  console.log('   - MIX_JSPRO   → mix');
  console.log('   - JSPRO       → jspro');
  console.log('');

  // Get current directory
  // Use process.cwd() for CommonJS compatibility
  const projectRoot = process.cwd();
  
  // Read JSON data
  const jsonPath = path.join(projectRoot, 'docs', 'newDatas.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log('❌ newDatas.json not found at:', jsonPath);
    console.log('Please make sure the file exists in the docs folder.');
    return;
  }

  const jsonData: SiteJsonData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📂 Found ${jsonData.length} sites in JSON file`);

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.siteInfoDetail.deleteMany();
  await prisma.siteInfo.deleteMany();

  // Insert data
  console.log('📥 Inserting sites...');
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ siteId: string; error: string }> = [];

  for (const site of jsonData) {
    try {
      // Transform enum values
      const sccType = transformSccType(site.scc_type);
      const statusSites = transformStatusSites(site.status_sites);
      const batteryVersion = transformBatteryVersion(site.battery_version);
      const panel2Type = transformPanel2Type(site.panel2_type);
      const ehubVersion = transformEhubVersion(site.ehub_version);

      await prisma.siteInfo.create({
        data: {
          siteId: site.site_id,
          siteName: site.site_name,
          terminalId: site.terminal_id || null,
          ipSnmp: site.ip_snmp || null,
          ipMiniPc: site.mini_pc || null,
          webappUrl: site.webapp_url || null,
          panel2Type: panel2Type,
          ehubVersion: ehubVersion,
          sccType: sccType,
          batteryVersion: batteryVersion,
          statusSites: statusSites,
          isActive: true,
          detail: {
            create: {
              village: site.village || null,
              subdistrict: site.subdistrict || null,
              regency: site.regency || null,
              province: site.province || 'UNKNOWN',
              longitude: site.longitude ? new Prisma.Decimal(site.longitude) : null,
              latitude: site.latitude ? new Prisma.Decimal(site.latitude) : null,
              ipGatewayGs: site.ip_gw_gs || null,
              ipGatewayLc: site.ip_gw_lc || null,
              subnet: site.subnet || null,
              buildYear: site.build_year || null,
              projectPhase: site.project_phase || null,
              onairDate: parseDate(site.onair_date),
              gsSustainDate: parseDate(site.gs_sustain_date),
              topoSustainDate: parseDate(site.topo_sustain_date),
              talisInstalled: parseDate(site.talis_installed),
              providerGs: site.provider_gs || null,
              beamProvider: site.kapsat || null,
              cellularOperator: site.cellular_operator || null,
              contactPerson: site.contact_person || [],
            },
          },
        },
      });

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`  ✅ Inserted ${successCount}/${jsonData.length} sites...`);
      }
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ siteId: site.site_id, error: errorMsg });
      console.error(`  ❌ Error inserting site ${site.site_id}:`, errorMsg);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Seed Summary:');
  console.log('='.repeat(50));
  console.log(`  ✅ Successfully inserted: ${successCount} sites`);
  console.log(`  ❌ Errors: ${errorCount} sites`);
  
  if (errors.length > 0) {
    console.log('\n  Error Details:');
    errors.forEach(({ siteId, error }) => {
      console.log(`    - ${siteId}: ${error.substring(0, 100)}...`);
    });
  }
  
  console.log('\n🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
