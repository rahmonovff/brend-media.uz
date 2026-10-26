import { load, update, type Editor, type Video, type VideoStatus } from "./store.js";

export const STATUS_LABELS: Record<VideoStatus, string> = {
  backlog: "📋 Navbatda",
  assigned: "🎯 Biriktirilgan",
  in_progress: "✂️ Montajda",
  review: "👀 Ko'rikda",
  done: "✅ Tayyor",
};

// --- Bildirishnoma ko'prigi ------------------------------------------------
// bot.ts shu callback'ni o'rnatadi; production hodisasi yuz berganda
// (masalan montaj tayyor bo'lganda) rejissyorga xabar ketadi.
type Notifier = (text: string) => void;
let notifier: Notifier = () => {};
export function setNotifier(fn: Notifier): void {
  notifier = fn;
}

// --- O'qish ----------------------------------------------------------------
export function listEditors(): Editor[] {
  return load().editors;
}

export function listVideos(filter?: { status?: VideoStatus; editorId?: string }): Video[] {
  let videos = load().videos;
  if (filter?.status) videos = videos.filter((v) => v.status === filter.status);
  if (filter?.editorId) videos = videos.filter((v) => v.editorId === filter.editorId);
  return videos;
}

export function editorById(id: string): Editor | undefined {
  return load().editors.find((e) => e.id === id);
}

export function editorByName(name: string): Editor | undefined {
  const q = name.trim().toLowerCase();
  return load().editors.find(
    (e) => e.name.toLowerCase() === q || e.telegram?.toLowerCase() === q,
  );
}

export function videoById(id: string): Video | undefined {
  return load().videos.find((v) => v.id === id);
}

export function workload(): Array<{ editor: Editor; active: number; videos: Video[] }> {
  const data = load();
  return data.editors.map((editor) => {
    const videos = data.videos.filter(
      (v) => v.editorId === editor.id && v.status !== "done",
    );
    return { editor, active: videos.length, videos };
  });
}

export function summary(): string {
  const data = load();
  const byStatus = (s: VideoStatus) => data.videos.filter((v) => v.status === s).length;
  const lines = [
    `🎬 4Prep Production — umumiy holat`,
    ``,
    `${STATUS_LABELS.backlog}: ${byStatus("backlog")}`,
    `${STATUS_LABELS.assigned}: ${byStatus("assigned")}`,
    `${STATUS_LABELS.in_progress}: ${byStatus("in_progress")}`,
    `${STATUS_LABELS.review}: ${byStatus("review")}`,
    `${STATUS_LABELS.done}: ${byStatus("done")}`,
    ``,
    `Montajchilar yuklamasi:`,
    ...workload().map((w) => `• ${w.editor.name} — ${w.active} ta faol`),
  ];
  return lines.join("\n");
}

// --- Yozish ----------------------------------------------------------------
function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, items: Array<{ id: string }>): string {
  let n = items.length + 1;
  while (items.some((i) => i.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function addEditor(name: string, telegram?: string, specialty?: string): Editor {
  let created!: Editor;
  update((data) => {
    created = { id: nextId("e", data.editors), name, telegram, specialty };
    data.editors.push(created);
  });
  return created;
}

export function addVideo(input: {
  title: string;
  priority?: Video["priority"];
  deadline?: string | null;
  notes?: string;
  editorId?: string | null;
}): Video {
  let created!: Video;
  update((data) => {
    created = {
      id: nextId("v", data.videos),
      title: input.title,
      editorId: input.editorId ?? null,
      status: input.editorId ? "assigned" : "backlog",
      priority: input.priority ?? "medium",
      deadline: input.deadline ?? null,
      notes: input.notes ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    data.videos.push(created);
  });
  return created;
}

export function assignVideo(videoId: string, editorId: string): Video {
  let updated!: Video;
  update((data) => {
    const video = data.videos.find((v) => v.id === videoId);
    if (!video) throw new Error(`Video topilmadi: ${videoId}`);
    const editor = data.editors.find((e) => e.id === editorId);
    if (!editor) throw new Error(`Montajchi topilmadi: ${editorId}`);
    video.editorId = editorId;
    if (video.status === "backlog") video.status = "assigned";
    video.updatedAt = nowIso();
    updated = video;
  });
  return updated;
}

export function setStatus(videoId: string, status: VideoStatus): Video {
  let updated!: Video;
  update((data) => {
    const video = data.videos.find((v) => v.id === videoId);
    if (!video) throw new Error(`Video topilmadi: ${videoId}`);
    video.status = status;
    video.updatedAt = nowIso();
    updated = video;
  });

  // Montaj tayyor yoki ko'rikka tushsa — rejissyorga avtomatik xabar.
  if (status === "review" || status === "done") {
    const editor = updated.editorId ? editorById(updated.editorId) : undefined;
    const who = editor ? editor.name : "Montajchi";
    const verb = status === "done" ? "montajni TUGATDI ✅" : "ko'rikka qo'ydi 👀";
    notifier(
      `🔔 ${who} "${updated.title}" videosini ${verb}\n\n` +
        `Keyingi qadam: ko'rib chiqing yoki yangi task bering.`,
    );
  }
  return updated;
}

export function setDirectorChatId(chatId: number): void {
  update((data) => {
    data.director.telegramChatId = chatId;
  });
}
