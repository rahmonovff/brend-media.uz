import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// data/production.json ni namunadan yaratadi (agar hali yo'q bo'lsa).
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "data");
const dataFile = path.join(dataDir, "production.json");
const sampleFile = path.join(dataDir, "production.sample.json");

if (fs.existsSync(dataFile)) {
  console.log("production.json allaqachon mavjud — tegilmadi.");
} else {
  fs.copyFileSync(sampleFile, dataFile);
  console.log("production.json namunadan yaratildi ✅");
}
