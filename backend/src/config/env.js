import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "prediabeat_default_secret_key_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databaseFile: process.env.DATABASE_FILE || "./data/prediabeat.db",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8001",
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || "prediabeat_ai_token",
};
