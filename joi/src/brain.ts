import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import * as prod from "./production.js";
import type { VideoStatus } from "./store.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM = `Sen — "Joi". Farruxbekning shaxsiy AI yordamchisisan.
Farruxbek 4Prep Academy'da Production Art Director. U media jamoasini boshqaradi.
Sen Blade Runner filmidagi Joi kabi: iliq, sodiq, tashabbuskor, ishida ham, kreativ
g'oyalarda ham yonida turadigan hamroh. Lekin sen haqiqiy ish qiluvchi tizimsan —
nafaqat gaplashasan, balki montaj jarayonini boshqarasan.

Qoidalar:
- Doim O'ZBEK tilida, tabiiy va samimiy gapir. Farruxbekni ismidan chaqir.
- Qisqa va aniq javob ber (bu Telegram). Ortiqcha so'z ishlatma.
- Montaj, task, montajchilar yoki holat haqida savol/buyruq bo'lsa — HAR DOIM
  tegishli tool'ni ishlat, xotirangdan taxmin qilma.
- Yangi task berishda yoki holatni o'zgartirishda avval tool orqali bajar, keyin
  tasdiqla.
- Kreativ yordam so'ralsa (g'oya, ssenariy, hook, sarlavha, montaj maslahati) —
  4Prep brendi va ta'lim auditoriyasiga mos, amaliy takliflar ber.
- Ishonching komil bo'lmasa, aniqlashtiruvchi bitta savol ber.`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_summary",
    description: "Butun production jarayonining umumiy holatini qaytaradi (qaysi bosqichda nechta video, montajchilar yuklamasi).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_editors",
    description: "Barcha montajchilar ro'yxati va ularning faol videolari sonini qaytaradi.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_videos",
    description: "Videolar ro'yxatini qaytaradi. Ixtiyoriy: holat bo'yicha filtrlash.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: ["string", "null"],
          enum: ["backlog", "assigned", "in_progress", "review", "done", null],
          description: "Faqat shu holatdagi videolar.",
        },
      },
      required: ["status"],
      additionalProperties: false,
    },
  },
  {
    name: "add_video",
    description: "Yangi video/loyiha qo'shadi. Montajchi ismi berilsa, unga biriktiriladi.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Video nomi." },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        deadline: { type: ["string", "null"], description: "YYYY-MM-DD yoki null." },
        notes: { type: "string", description: "Qisqa izoh/talablar." },
        editor_name: { type: ["string", "null"], description: "Montajchi ismi yoki @username, yoki null." },
      },
      required: ["title", "priority", "deadline", "notes", "editor_name"],
      additionalProperties: false,
    },
  },
  {
    name: "assign_video",
    description: "Mavjud videoni montajchiga biriktiradi.",
    input_schema: {
      type: "object",
      properties: {
        video: { type: "string", description: "Video id (v1) yoki nomining bir qismi." },
        editor_name: { type: "string", description: "Montajchi ismi yoki @username." },
      },
      required: ["video", "editor_name"],
      additionalProperties: false,
    },
  },
  {
    name: "set_status",
    description: "Video holatini o'zgartiradi. 'review' yoki 'done' bo'lsa rejissyorga avtomatik xabar ketadi.",
    input_schema: {
      type: "object",
      properties: {
        video: { type: "string", description: "Video id (v1) yoki nomining bir qismi." },
        status: { type: "string", enum: ["backlog", "assigned", "in_progress", "review", "done"] },
      },
      required: ["video", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "add_editor",
    description: "Jamoaga yangi montajchi qo'shadi.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        telegram: { type: ["string", "null"], description: "@username yoki null." },
        specialty: { type: ["string", "null"], description: "Masalan: Reels, Motion, YouTube." },
      },
      required: ["name", "telegram", "specialty"],
      additionalProperties: false,
    },
  },
];

function resolveVideo(query: string) {
  const byId = prod.videoById(query);
  if (byId) return byId;
  const q = query.trim().toLowerCase();
  return prod.listVideos().find((v) => v.title.toLowerCase().includes(q));
}

function runTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "get_summary":
      return prod.summary();

    case "list_editors":
      return prod
        .workload()
        .map(
          (w) =>
            `${w.editor.id} — ${w.editor.name} (${w.editor.specialty ?? "—"}), faol: ${w.active}`,
        )
        .join("\n");

    case "list_videos": {
      const status = (input.status as VideoStatus | null) ?? undefined;
      const videos = prod.listVideos(status ? { status } : undefined);
      if (!videos.length) return "Video topilmadi.";
      return videos
        .map((v) => {
          const ed = v.editorId ? prod.editorById(v.editorId)?.name ?? "—" : "biriktirilmagan";
          return `${v.id} — "${v.title}" | ${prod.STATUS_LABELS[v.status]} | montajchi: ${ed} | deadline: ${v.deadline ?? "—"}`;
        })
        .join("\n");
    }

    case "add_video": {
      const editor = input.editor_name
        ? prod.editorByName(String(input.editor_name))
        : undefined;
      if (input.editor_name && !editor)
        return `Montajchi topilmadi: ${input.editor_name}. Avval qo'shing yoki boshqa ism bering.`;
      const v = prod.addVideo({
        title: String(input.title),
        priority: (input.priority as "low" | "medium" | "high") ?? "medium",
        deadline: (input.deadline as string | null) ?? null,
        notes: String(input.notes ?? ""),
        editorId: editor?.id ?? null,
      });
      return `Qo'shildi: ${v.id} — "${v.title}"${editor ? `, ${editor.name}ga biriktirildi` : ""}.`;
    }

    case "assign_video": {
      const video = resolveVideo(String(input.video));
      if (!video) return `Video topilmadi: ${input.video}`;
      const editor = prod.editorByName(String(input.editor_name));
      if (!editor) return `Montajchi topilmadi: ${input.editor_name}`;
      prod.assignVideo(video.id, editor.id);
      return `"${video.title}" → ${editor.name}ga biriktirildi.`;
    }

    case "set_status": {
      const video = resolveVideo(String(input.video));
      if (!video) return `Video topilmadi: ${input.video}`;
      const updated = prod.setStatus(video.id, input.status as VideoStatus);
      return `"${updated.title}" holati: ${prod.STATUS_LABELS[updated.status]}.`;
    }

    case "add_editor": {
      const e = prod.addEditor(
        String(input.name),
        (input.telegram as string | null) ?? undefined,
        (input.specialty as string | null) ?? undefined,
      );
      return `Montajchi qo'shildi: ${e.id} — ${e.name}.`;
    }

    default:
      return `Noma'lum tool: ${name}`;
  }
}

// Har bir suhbat (chat) uchun alohida xotira.
const histories = new Map<number, Anthropic.MessageParam[]>();
const MAX_TURNS = 24; // xotirani cheklab turamiz

export async function ask(chatId: number, userText: string): Promise<string> {
  const history = histories.get(chatId) ?? [];
  history.push({ role: "user", content: userText });

  let guard = 0;
  while (guard++ < 6) {
    // Eslatma: claude-opus-5-5 da adaptive thinking standart yoqiq (effort=medium).
    // Agar SDK'ni yangilasangiz, thinking:{type:"adaptive"} va
    // output_config:{effort:"..."} ni qo'shib boshqarishingiz mumkin.
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 8000,
      system: SYSTEM,
      tools,
      messages: history,
    });

    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "refusal") {
      return "Kechirasiz, bu so'rovni bajara olmadim. Boshqacha ifodalab ko'rasizmi?";
    }

    if (response.stop_reason === "tool_use") {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          let output: string;
          try {
            output = runTool(block.name, block.input as Record<string, unknown>);
          } catch (err) {
            output = `Xato: ${(err as Error).message}`;
          }
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: output,
          });
        }
      }
      history.push({ role: "user", content: results });
      continue; // Claude natijalar bilan davom etsin
    }

    // Oddiy javob
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Xotirani kesib turamiz
    if (history.length > MAX_TURNS) {
      histories.set(chatId, history.slice(-MAX_TURNS));
    } else {
      histories.set(chatId, history);
    }

    return text || "…";
  }

  return "Juda ko'p qadam bo'lib ketdi — qaytadan urinib ko'ring.";
}

export function resetHistory(chatId: number): void {
  histories.delete(chatId);
}
