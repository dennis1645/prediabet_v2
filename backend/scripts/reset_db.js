import db from "../src/database/connection.js";
import { initDatabase } from "../src/database/initSchema.js";

const isFullReset = process.argv.includes("--all");

console.log("==================================================");
console.log("   🧹 PREDIA-BEAT DATABASE RESET UTILITY         ");
console.log("==================================================");

try {
  // Matikan sementara foreign keys agar truncating mulus
  db.exec("PRAGMA foreign_keys = OFF;");

  db.exec(`
    DELETE FROM chat_logs;
    DELETE FROM chat_sessions;
    DELETE FROM daily_progress_logs;
    DELETE FROM progress_days_v2;
    DELETE FROM assessment_history;
    DELETE FROM questionnaire_drafts;
    DELETE FROM onboarding_progress;
    DELETE FROM profiles;
  `);

  console.log("✅ Berhasil mengosongkan riwayat chat, sesi, progres harian, dan data profil/kuesioner.");

  if (isFullReset) {
    db.exec("DELETE FROM users;");
    console.log("✅ Berhasil mengosongkan tabel pengguna (users).");
  }

  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("VACUUM;");

  // Jalankan initDatabase untuk memastikan schema & default user siap jika users dikosongkan
  initDatabase();

  console.log("==================================================");
  console.log("🎉 Database PrediaBeat berhasil di-reset dengan bersih!");
  console.log("==================================================");
  process.exit(0);
} catch (error) {
  console.error("❌ Gagal mereset database:", error);
  process.exit(1);
}
