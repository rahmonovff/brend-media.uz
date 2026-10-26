import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "data");
const dataFile = path.join(dataDir, "production.json");
const sampleFile = path.join(dataDir, "production.sample.json");

export type VideoStatus =
  | "backlog"
  | "assigned"
  | "in_progress"
  | "review"
  | "done";

export interface Editor {
  id: string;
  name: string;
  telegram?: string;
  specialty?: string;
}

export interface Video {
  id: string;
  title: string;
  editorId: string | null;
  status: VideoStatus;
  priority: "low" | "medium" | "high";
  deadline: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Director {
  name: string;
  role?: string;
  telegramChatId: number | null;
}

export interface ProductionData {
  director: Director;
  editors: Editor[];
  videos: Video[];
}

let cache: ProductionData | null = null;

export function load(): ProductionData {
  if (cache) return cache;
  const source = fs.existsSync(dataFile) ? dataFile : sampleFile;
  cache = JSON.parse(fs.readFileSync(source, "utf-8")) as ProductionData;
  return cache;
}

export function save(data: ProductionData): void {
  cache = data;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
}

export function update(mutator: (data: ProductionData) => void): ProductionData {
  const data = load();
  mutator(data);
  save(data);
  return data;
}
