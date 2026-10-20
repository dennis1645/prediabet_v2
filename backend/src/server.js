import app from "./app.js";
import { config } from "./config/env.js";
import { initDatabase } from "./database/initSchema.js";
import referenceService from "./services/referenceService.js";

async function startServer() {
  try {
    console.log("==================================================");
    console.log("   🚀 Memulai Server Backend PrediaBeat Express   ");
    console.log("==================================================");

    // 1. Inisialisasi Database SQLite
    initDatabase();

    // 2. Load Reference Datasets ke Memory
    referenceService.init();

    // 3. Jalankan HTTP Server
    app.listen(config.port, () => {
      console.log(`✅ Server berjalan aktif di: http://localhost:${config.port}`);
      console.log(`🩺 Health Check: http://localhost:${config.port}/api/health`);
      console.log(`🔒 JWT Authentication & Protected Middleware siap`);
      console.log("==================================================");
    });
  } catch (error) {
    console.error("❌ Gagal memulai server:", error);
    process.exit(1);
  }
}

startServer();
