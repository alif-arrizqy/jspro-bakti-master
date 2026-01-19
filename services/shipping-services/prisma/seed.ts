import { PrismaClient, Province } from "@prisma/shipping-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

// Use SHIPPING_DATABASE_URL if available, otherwise fallback to DATABASE_URL
const databaseUrl = process.env.SHIPPING_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ DATABASE_URL or SHIPPING_DATABASE_URL must be set in environment");
    process.exit(1);
}

// Create connection pool and adapter (required for Prisma 7 with custom output)
const pool = new Pool({
    connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
});

async function main() {
    console.log("🌱 Starting seed...");

    // Seed Problem Master
    console.log("📝 Seeding problem_master...");
    const problems = [
        "SNMP Down",
        "SNMP Sensor Flat",
        "SCC Faulty",
        "Kontrol Panel Faulty",
        "Keperluan Stok",
        "Data Baterai Tidak Terbaca",
        "Baterai Cell Faulty",
        "Insiden Site Terbakar",
        "Kahar (Bencana Alam)",
    ];

    // Check existing problems to avoid duplicates
    const existingProblems = await prisma.problemMaster.findMany({
        select: { problem_name: true },
    });
    const existingProblemNames = new Set(existingProblems.map((p) => p.problem_name));

    for (const problemName of problems) {
        if (!existingProblemNames.has(problemName)) {
            await prisma.problemMaster.create({
                data: {
                    problem_name: problemName,
                },
            });
            console.log(`  ✓ Created problem: ${problemName}`);
        } else {
            console.log(`  ⊘ Skipped (already exists): ${problemName}`);
        }
    }

    // Seed Address
    console.log("📍 Seeding address...");
    const addressData = [
        {
            Provinsi: "PAPUA",
            Cluster: "SORONG",
            Alamat:
                "Jl. Basuki Rahmat km. 8. Belakang hotel meridien no. 3 samping penjual bibit ikan. Kel. Malaingkedi kec. Malaimsimsa Sorong Papua barat 98416\n\nPenerima:\nAgus supir 082338337379\nAndri Irawan 081287644652",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "BACAN",
            Alamat:
                "Bapak Abdullah Iskandar Alam\nDesa Tomori, Belakang Penginapan Pelangi \nKec. Bacan. Kab. Halmahera Selatan\nMaluku Utara 97791\nTel. 0853 4221 3276",
        },
        {
            Provinsi: "PAPUA",
            Cluster: "TELUK\nWONDAMA",
            Alamat:
                "Bpk Yudi Yusuf\nPelabuhan Wasior\nJl. Kuri Pasai Wasior, Kab. Teluk Wondama, Indonesia 98362\nNo. Hp 0823-7389-4406 ( Yudi )\n0813-7396-7018 (M.Kamil)\n( Barang dititip di Pos Pelabuhan Wasior/ Gudang ekspedisi )",
        },
        {
            Provinsi: "PAPUA",
            Cluster: "Merauke",
            Alamat:
                "PENERIMA:\nPak Tato (0821-2230-1171)\nPak Cipta (0852-2621-4522)\nALAMAT:\nJl. TMP Trikora Maro Kelurahan Karang Indah Kec. Merauke, Kab. Merauke (Belakang Kantor Kominfo) Kode Pos: 99614",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "HALMAHERA SELATAN",
            Alamat:
                "Bacan:\nUP. Bpk Abdullah Iskandar Alam\nDesa Tomori, Belakang Penginapan Pelangi\nKec. Bacan. Kab. Halmahera Selatan\nMaluku Utara 97791\nTel. 0853-4221-3276 / 0821-3323-3377 (Agus)",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "SERAM BAGIAN BARAT",
            Alamat:
                "Ambon:\nNama: Aisyah\nTelp: 0821-3323-3377 (Agus)\nAlamat: Jln. Perum air sakula Laha Penginapan dan Rumah makan Sabar Seroja Depan Band",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "KEPULAUAN ARU",
            Alamat:
                "Nama : Deodatus Naraha, S.Kom\nJabatan : staf bidang TIKP\nNo Kontak : +62 852-9821-7517\nDinas Komunikasi dan Informatika\nJl. Raya Pemda - Dobo\nKecamatan Pulau Pulau Aru\nKab. Aru - Maluku 97662\nTel.0853 1460 9998",
        },
        {
            Provinsi: "PAPUA",
            Cluster: "TELUK WONDAMA",
            Alamat:
                "Bpk Yudi Yusuf\nPelabuhan Wasior\nJl. Kuri Pasai Wasior, Kab. Teluk Wondama, Indonesia 98362\nNo. Hp 0823-7389-4406 ( Yudi )\n0813-7396-7018 (M.Kamil)\n( Barang dititip di Pos Pelabuhan Wasior/ Gudang ekspedisi )",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "TANIMBAR",
            Alamat:
                "Kantor Dinas Kominfo Kabupaten Kepulauan Tanimbar\nJl. Ir. Soekarno, Lantai 1 Kantor Bupati Kepulauan Tanimbar\nKec. Saumlaki, Kab. Tanimbar, Maluku\nBapak Aristoteles Batbual\nTel. 0813 4334 4567 / 0812 9523 1654\nPak Agus \n+62 821-3323-3377",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "AMBON",
            Alamat:
                "Nama: Aisyah untuk Pak Agus\n No Tekp : 082133233377\n Alamat: Jln. Perum air sakula Laha Penginapan dan Rumah makan Sabar Seroja Depan Bandara Lanud Pattimura Ambon. Teluk Ambon, Kota Ambon, Maluku, ID 97236",
        },
        {
            Provinsi: "MALUKU",
            Cluster: "BULA",
            Alamat:
                "Haris Tower\n A/N Bu Ica /Rumagutawan/ Haris Tower\n Jl. Unawekla Pangkalan Taxi Bula ( Samping Toko Betha Smart Kota Bula, Kab. Seram Bagian Timur, Bula, 97555)\n Telp +62 822-3819-7091 (haris tower) +62 821-3323-3377 (Agus Indrianto)",
        },
    ];

    // Helper function to map province string to enum
    function mapProvince(provinsi: string): Province {
        const provinceMap: Record<string, Province> = {
            PAPUA: Province.PAPUA,
            MALUKU: Province.MALUKU,
            "MALUKU UTARA": Province.MALUKU_UTARA,
            "PAPUA BARAT": Province.PAPUA_BARAT,
            "PAPUA BARAT DAYA": Province.PAPUA_BARAT_DAYA,
            "PAPUA SELATAN": Province.PAPUA_SELATAN,
        };

        // Normalize province name
        const normalized = provinsi.trim().toUpperCase();
        return provinceMap[normalized] || Province.PAPUA; // Default to PAPUA if not found
    }

    // Check existing addresses to avoid duplicates
    const existingAddresses = await prisma.address.findMany({
        select: { province: true, cluster: true, address_shipping: true },
    });

    for (const address of addressData) {
        // Clean cluster name (remove newlines)
        const cluster = address.Cluster.replace(/\n/g, " ").trim();
        const province = mapProvince(address.Provinsi);

        // Check if address already exists (by province, cluster, and address_shipping)
        const exists = existingAddresses.some(
            (existing) =>
                existing.province === province &&
                existing.cluster === cluster &&
                existing.address_shipping === address.Alamat
        );

        if (!exists) {
            await prisma.address.create({
                data: {
                    province: province,
                    cluster: cluster || null,
                    address_shipping: address.Alamat,
                },
            });
            console.log(`  ✓ Created address: ${address.Provinsi} - ${cluster}`);
        } else {
            console.log(`  ⊘ Skipped (already exists): ${address.Provinsi} - ${cluster}`);
        }
    }

    console.log("✅ Seed completed!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

