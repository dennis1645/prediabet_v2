import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data/reference");

class ReferenceService {
  constructor() {
    this.foods = [];
    this.activities = [];
    this.diets = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      this.loadFoods();
      this.loadActivities();
      this.loadDiets();
      this.initialized = true;
      console.log(`Reference datasets loaded: ${this.foods.length} foods, ${this.activities.length} activities, ${this.diets.length} diets.`);
    } catch (err) {
      console.error("Error loading reference datasets:", err);
    }
  }

  loadFoods() {
    const filePath = path.join(DATA_DIR, "food/master_makanan_kategori_flag_mealplan.csv");
    if (!fs.existsSync(filePath)) {
      console.warn("Food dataset CSV not found at:", filePath);
      return;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split(";").map((h) => h.trim());
    const parseNum = (val) => {
      if (!val) return 0;
      const clean = val.trim().replace(",", ".");
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const parseBool = (val) => {
      if (!val) return false;
      const clean = val.trim().toLowerCase();
      return clean === "true" || clean === "1" || clean === "ya";
    };

    const foods = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(";");
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j] ? cols[j].trim() : "";
      }

      if (!row.nama_makanan) continue;

      foods.push({
        id: parseInt(row.id, 10) || i,
        kode: row.kode || "",
        nama: row.nama_makanan,
        kelompok: row.kelompok_makanan || "Lainnya",
        jenis_bahan: row.jenis_bahan_utama || "",
        tingkat_proses: row.tingkat_proses || "Alami",
        slot_meal_plan: row.slot_meal_plan || "",
        porsi_gram: parseNum(row.gram_porsi) || 100,
        gambar: row.gambar || null,
        kalori: parseNum(row.kalori_kkal),
        karbo: parseNum(row.karbohidrat_g),
        protein: parseNum(row.protein_g),
        lemak: parseNum(row.lemak_g),
        serat: parseNum(row.serat_g),
        gula: parseNum(row.gula_g),
        natrium: parseNum(row.natrium_mg),
        gi: parseNum(row.indeks_glikemik) || parseNum(row.indeks_glikemik_estimasi) || (parseNum(row.gula_g) > 10 ? 65 : 35),
        flags: {
          susu: parseBool(row.mengandung_susu),
          telur: parseBool(row.mengandung_telur),
          seafood: parseBool(row.mengandung_seafood),
          kacang: parseBool(row.mengandung_kacang),
          babi: parseBool(row.mengandung_babi),
          santan: parseBool(row.mengandung_santan),
          alkohol: parseBool(row.mengandung_alkohol),
          sayur: parseBool(row.mengandung_sayur),
          gorengan: parseBool(row.adalah_gorengan),
        },
      });
    }

    this.foods = foods;
  }

  loadActivities() {
    const filePath = path.join(DATA_DIR, "activities.csv");
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length < 2) return;

    // Fast CSV parsing
    const activities = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Extract activity name
      const commaIdx = line.indexOf(",");
      if (commaIdx === -1) continue;
      const nama = line.substring(0, commaIdx).trim();

      activities.push({
        id: i,
        nama,
        kategori: "Olahraga & Kebugaran",
        met_default: nama.toLowerCase().includes("lari") ? 8.0 : nama.toLowerCase().includes("jalan") ? 3.5 : 5.0,
      });
    }

    this.activities = activities;
  }

  loadDiets() {
    const filePath = path.join(DATA_DIR, "diets/NutrinusaDatabase_InformationDiet.csv");
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const diets = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const firstComma = line.indexOf(",");
      if (firstComma === -1) continue;
      const nama = line.substring(0, firstComma).replace(/"/g, "").trim();

      diets.push({
        id: nama.toLowerCase().replace(/\s+/g, "_"),
        nama,
      });
    }

    this.diets = diets;
  }

  getFoods(filters = {}) {
    let result = this.foods;

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((f) => f.nama.toLowerCase().includes(s));
    }

    if (filters.kelompok) {
      result = result.filter((f) => f.kelompok.toLowerCase() === filters.kelompok.toLowerCase());
    }

    if (filters.maxGI) {
      result = result.filter((f) => f.gi <= filters.maxGI);
    }

    if (filters.excludeFlags && Array.isArray(filters.excludeFlags)) {
      result = result.filter((f) => {
        for (const flag of filters.excludeFlags) {
          if (f.flags[flag]) return false;
        }
        return true;
      });
    }

    return result;
  }
}

export const referenceService = new ReferenceService();
export default referenceService;
