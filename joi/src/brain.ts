import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { config } from "./config.js";
import * as prod from "./production.js";
import type { VideoStatus } from "./store.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const SYSTEM = `Sen — "Joi". Farruxbekning shaxsiy AI yordamchisisan.
Farruxbek 4Prep Academy'da Production Art Director. U media jamoasini boshqaradi.
Sen Blade Runner filmidagi Joi kabi: iliq, sodiq, tashabbuskor, ishida ham, kreativ
g'oyalarda ham yonida turadigan hamroh. Lekin sen haqiqiy ish qiluvchi tizimsan —
nafaqat gaplashasan, balki montaj jarayonini boshqarasan.

Qoidalar:
- Doim O'ZBEK tilida, tabiiy va samimiy gapir. Farruxbekni ismidan chaqir.
- Qisqa va aniq javob ber (bu Telegram). Ortiqcha so'z ishlatma.
- Montaj, task, montajchilar yoki holat haqida savol/buyruq bo'lsa — HAR DOIM
  tegishli funksiyani (tool) ishlat, xotirangdan taxmin qilma.
- Yangi task berishda yoki holatni o'zgartirishda avval funksiya orqali bajar,
  keyin tabiiy til bilan tasdiqla.
- Kreativ yordam so'ralsa (g'oya, ssenariy, hook, sarlavha, montaj maslahati) —
  4Prep brendi va ta'lim auditoriyasiga mos, amaliy takliflar ber.
- Ishonching komil bo'lmasa, aniqlashtiruvchi bitta savol ber.`;

// Gemini funksiya (tool) ta'riflari. Gemini sxemasi JSON Schema'dan biroz
// farq qiladi: tiplar katta harf ("STRING", "OBJECT"), null-union yo'q —
// ixtiyoriy maydonlar shunchaki "required" ro'yxatiga kirmaydi.
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "get_summary",
    description: "Butun production jarayonining umumiy holati (qaysi bosqichda nechta video, montajchilar yuklamasi).",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_editors",
    description: "Barcha montajchilar va ularning faol videolari sonini qaytaradi.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_videos",
    description: "Videolar ro'yxati. Ixtiyoriy: holat bo'yicha filtrlash.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          enum: ["backlog", "assigned", "in_progress", "review", "done"],
          description: "Faqat shu holatdagi videolar (ixtiyoriy).",
        },
      },
    },
  },
  {
    name: "add_video",
    description: "Yangi video/loyiha qo'shadi. Montajchi ismi berilsa, unga biriktiriladi.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Video nomi." },
        priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
        deadline: { type: Type.STRING, description: "YYYY-MM-DD ko'rinishida (ixtiyoriy)." },
        notes: { type: Type.STRING, description: "Qisqa izoh/talablar (ixtiyoriy)." },
        editor_name: { type: Type.STRING, description: "Montajchi ismi yoki @username (ixtiyoriy)." },
      },
      required: ["title"],
    },
  },
  {
    name: "assign_video",
    description: "Mavjud videoni montajchiga biriktiradi.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        video: { type: Type.STRING, description: "Video id (v1) yoki nomining bir qismi." },
        editor_name: { type: Type.STRING, description: "Montajchi ismi yoki @username." },
      },
      required: ["video", "editor_name"],
    },
  },
  {
    name: "set_status",
    description: "Video holatini o'zgartiradi. 'review' yoki 'done' bo'lsa rejissyorga avtomatik xabar ketadi.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        video: { type: Type.STRING, description: "Video id (v1) yoki nomining bir qismi." },
        status: { type: Type.STRING, enum: ["backlog", "assigned", "in_progress", "review", "done"] },
      },
      required: ["video", "status"],
    },
  },
  {
    name: "add_editor",
    description: "Jamoaga yangi montajchi qo'shadi.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        telegram: { type: Type.STRING, description: "@username (ixtiyoriy)." },
        specialty: { type: Type.STRING, description: "Masalan: Reels, Motion, YouTube (ixtiyoriy)." },
      },
      required: ["name"],
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
      const status = (input.status as VideoStatus | undefined) || undefined;
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
        priority: (input.priority as "low" | "medium" | "high") || "medium",
        deadline: (input.deadline as string) || null,
        notes: String(input.notes || ""),
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
        (input.telegram as string) || undefined,
        (input.specialty as string) || undefined,
      );
      return `Montajchi qo'shildi: ${e.id} — ${e.name}.`;
    }

    default:
      return `Noma'lum funksiya: ${name}`;
  }
}

// Gemini suhbat tarixi: { role: "user"|"model", parts: [...] }
interface Part {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface Content {
  role: "user" | "model";
  parts: Part[];
}

const histories = new Map<number, Content[]>();
const MAX_TURNS = 30;

export async function ask(chatId: number, userText: string): Promise<string> {
  const history = histories.get(chatId) ?? [];
  history.push({ role: "user", parts: [{ text: userText }] });

  let guard = 0;
  while (guard++ < 6) {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: history as any,
      config: {
        systemInstruction: SYSTEM,
        tools: [{ functionDeclarations }],
      },
    });

    const parts = (response.candidates?.[0]?.content?.parts ?? []) as Part[];
    history.push({ role: "model", parts });

    const calls = parts
      .filter((p) => p.functionCall)
      .map((p) => p.functionCall!);

    if (calls.length) {
      const responseParts: Part[] = calls.map((call) => {
        let output: string;
        try {
          output = runTool(call.name ?? "", call.args ?? {});
        } catch (err) {
          output = `Xato: ${(err as Error).message}`;
        }
        return {
          functionResponse: {
            name: call.name ?? "",
            response: { result: output },
          },
        };
      });
      history.push({ role: "user", parts: responseParts });
      continue; // Gemini natijalar bilan davom etsin
    }

    const text = parts
      .filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join("\n")
      .trim();

    histories.set(chatId, history.length > MAX_TURNS ? history.slice(-MAX_TURNS) : history);
    return text || "…";
  }

  return "Juda ko'p qadam bo'lib ketdi — qaytadan urinib ko'ring.";
}

export function resetHistory(chatId: number): void {
  histories.delete(chatId);
}
