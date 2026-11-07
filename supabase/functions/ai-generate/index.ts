import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const corsHeaders: Record<string, string> = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers":
"authorization, x-client-info, apikey, content-type",
};
const FREE_DAILY_LIMIT = 12;
const PRO_DAILY_LIMIT = 100;
const GUEST_DAILY_LIMIT = 2;
const MAX_FLASHCARD_COUNT = 20;
const MAX_QUIZ_COUNT = 20;
const STUDY_TOP_UP_ATTEMPTS = 3;
const HISTORY_WINDOW = 24;
const MAX_MESSAGE_CHARS = 6000;
const ACCOUNT_MEMORY_RESULT_LIMIT = 12;
const ACCOUNT_MEMORY_MAX_CHARS = 14000;
const MAX_OUTPUT_TOKENS_QA = 6000;
const MAX_OUTPUT_TOKENS_DEEP = 12000;
const GEMINI_EXAM_COACH_MODEL = "gemini-2.5-flash-lite";
const GEMINI_STUDY_MODEL = "gemini-3.5-flash-lite";
const NOTES_SINGLE_PASS_CHAR_LIMIT = 150_000;
const LARGE_NOTES_MAX_CONTEXT_CHARS = 150_000;
const LARGE_NOTES_OUTPUT_TOKENS = 14_000;
const LARGE_NOTES_PAGE_THRESHOLD = 150;
const MAX_NOTES_PDF_PAGES = 900;
const CHARS_PER_PAGE_ESTIMATE = 2000;
function getTodayUTC(): string {
return new Date().toISOString().slice(0, 10);
}
function getClientIp(req: Request): string {
const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();
if (cloudflareIp) return cloudflareIp;
const forwardedFor = req.headers.get("x-forwarded-for");
if (forwardedFor) return forwardedFor.split(",")[0].trim();
return req.headers.get("x-real-ip")?.trim() || "unknown";
}
async function getGuestFingerprint(req: Request): Promise<string> {
const source = [
getClientIp(req),
req.headers.get("user-agent") ?? "",
req.headers.get("accept-language") ?? "",
req.headers.get("sec-ch-ua-platform") ?? "",
req.headers.get("sec-ch-ua-mobile") ?? "",
].join("|");
const key = await crypto.subtle.importKey(
"raw",
new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY),
{ name: "HMAC", hash: "SHA-256" },
false,
["sign"],
);
const signature = await crypto.subtle.sign(
"HMAC",
key,
new TextEncoder().encode(source),
);
return Array.from(new Uint8Array(signature), (byte) =>
byte.toString(16).padStart(2, "0"),
).join("");
}
function truncateText(text: string, maxChars: number): string {
if (!text) return "";
return text.length > maxChars ? text.slice(0, maxChars) : text;
}
const MEMORY_STOP_WORDS = new Set([
"about",
"after",
"again",
"also",
"been",
"before",
"could",
"does",
"from",
"have",
"here",
"into",
"just",
"last",
"like",
"more",
"most",
"much",
"need",
"only",
"other",
"please",
"previous",
"previously",
"remember",
"same",
"should",
"that",
"their",
"there",
"these",
"they",
"this",
"those",
"through",
"today",
"want",
"what",
"when",
"where",
"which",
"with",
"would",
"your",
]);
function hasSavedChatContinuityIntent(text: string): boolean {
return /\b(remember|previous|previously|earlier|last time|yesterday|other day|past chat|old chat|before|continue|continued|again|same one|same topic|we discussed|we talked|we chose|we decided|we picked|we agreed|you said|you told me|you suggested|you gave me|my thesis|my research|our thesis|our research)\b/i.test(
String(text || ""),
);
}
function buildMemorySearchText(text: string): string {
const terms = Array.from(
new Set(
String(text || "")
.toLowerCase()
.replace(/[^a-z0-9\s-]/g, " ")
.split(/\s+/)
.map((token) => token.replace(/^-+|-+$/g, ""))
.filter(
(token) =>
token.length >= 3 &&
!MEMORY_STOP_WORDS.has(token) &&
!/^\d+$/.test(token),
),
),
).slice(0, 10);
return terms.join(" or ");
}
async function loadSavedConversationHistory(
adminClient: any,
userId: string,
conversationId: string,
): Promise<any[]> {
if (!userId || !conversationId) return [];
const { data: conversation, error: conversationError } = await adminClient
.from("conversations")
.select("id")
.eq("id", conversationId)
.eq("user_id", userId)
.maybeSingle();
if (conversationError || !conversation) return [];
const { data, error } = await adminClient
.from("messages")
.select("id,role,content,created_at")
.eq("conversation_id", conversationId)
.eq("user_id", userId)
.order("id", { ascending: false })
.limit(HISTORY_WINDOW);
if (error || !Array.isArray(data)) return [];
return data.reverse();
}
async function loadRelevantSavedChatMemory(
adminClient: any,
userId: string,
currentQuestion: string,
recentMessageIds: Set<number>,
): Promise<string> {
if (!userId || !hasSavedChatContinuityIntent(currentQuestion)) return "";
const searchText = buildMemorySearchText(currentQuestion);
let rows: any[] = [];
if (searchText) {
const { data, error } = await adminClient
.from("messages")
.select("id,conversation_id,role,content,created_at")
.eq("user_id", userId)
.textSearch("content", searchText, {
type: "websearch",
config: "english",
})
.order("created_at", { ascending: false })
.limit(24);
if (!error && Array.isArray(data)) rows = data;
}
if (!rows.length) {
const { data, error } = await adminClient
.from("messages")
.select("id,conversation_id,role,content,created_at")
.eq("user_id", userId)
.order("created_at", { ascending: false })
.limit(24);
if (!error && Array.isArray(data)) rows = data;
}
const kept: string[] = [];
let usedChars = 0;
for (const row of rows) {
const id = Number(row?.id);
if (Number.isFinite(id) && recentMessageIds.has(id)) continue;
const content = truncateText(String(row?.content || "").trim(), 1800);
if (!content) continue;
const createdAt = String(row?.created_at || "");
const date = createdAt ? createdAt.slice(0, 10) : "Earlier";
const role = row?.role === "assistant" ? "DentAIstudy" : "User";
const line = `[${date}] ${role}: ${content}`;
if (usedChars + line.length > ACCOUNT_MEMORY_MAX_CHARS) break;
kept.push(line);
usedChars += line.length;
if (kept.length >= ACCOUNT_MEMORY_RESULT_LIMIT) break;
}
return kept.join("\n\n");
}
function looksLikeAccidentalRepeat(
content: string,
history: Array<{ role: string; content: string }>,
): boolean {
const previous = [...history]
.reverse()
.find((message) => message.role === "assistant")?.content;
if (!previous) return false;
const normalize = (value: string) =>
String(value || "")
.toLowerCase()
.replace(/\s+/g, " ")
.trim();
const current = normalize(content);
const prior = normalize(previous);
if (!current || !prior) return false;
if (current === prior) return true;
const prefixLength = Math.min(500, current.length, prior.length);
return (
prefixLength >= 220 &&
current.slice(0, prefixLength) === prior.slice(0, prefixLength)
);
}
function cleanExamCoachLeakage(text: string): string {
const original = String(text || "");
const lines = original.trim().split(/\r?\n/);
const leakedPlannerLine = (line: string) =>
/^STEP\s+[123]\s*:/i.test(line) ||
/^This is a TYPE\s+[A-D]\s+question\b/i.test(line) ||
/^The user is asking\b/i.test(line) ||
/^Apply the correct answer architecture/i.test(line) ||
/^Apply formatting and length rules/i.test(line);
while (lines.length) {
const first = lines[0].trim();
if (!first || leakedPlannerLine(first)) {
lines.shift();
continue;
}
break;
}
return lines.join("\n").trim() || original.trim();
}
function cleanNotesMarkdown(text: string): string {
return String(text || "")
.trim()
.split(/\r?\n/)
.map((line) => {
let raw = line.trimEnd();
const trimmed = raw.trim();
const adultDoseNote = /^\\?\*\s*(Maximum adult dose.+)$/i.exec(trimmed);
if (adultDoseNote) {
return `- ${adultDoseNote[1].trim()}`;
}
const cephalosporinNote = /^\\?#\s*(Cephalosporins.+)$/i.exec(trimmed);
if (cephalosporinNote) {
return `- ${cephalosporinNote[1].trim()}`;
}
const deepHeading = /^(#{4,6})\s+(.+)$/.exec(raw);
if (deepHeading) {
return `### ${deepHeading[2].trim()}`;
}
raw = raw
.replace(/\\\*#/g, "")
.replace(/\\\*/g, "")
.replace(/\\#/g, "")
.replace(/\*#/g, "")
.replace(/\b(Adults|Children)\*(\s*\|?\s*)$/i, "$1$2")
.replace(/([A-Za-z)])#(\s|\||$)/g, "$1$2");
return raw.replace(/^(\s*)\*\s+/, "$1- ");
})
.join("\n")
.replace(/\n{3,}/g, "\n\n")
.trim();
}
function isGeminiRateOrTransient(status: number | null | undefined): boolean {
if (!status) return false;
return status === 429 || status === 503 || (status >= 500 && status <= 599);
}
async function fetchGeminiWithBackoff(
url: string,
body: unknown,
apiKey: string,
): Promise<Response> {
let res: Response | null = null;
for (let attempt = 0; attempt < 4; attempt++) {
res = await fetch(url, {
method: "POST",
headers: {
"x-goog-api-key": apiKey,
"Content-Type": "application/json",
},
body: JSON.stringify(body),
});
if (res.status !== 429 && res.status < 500) return res;
const delayMs = Math.min(8000, 500 * 2 ** attempt);
await new Promise((r) => setTimeout(r, delayMs));
}
return res!;
}
type GeminiMessage = {
role: "system" | "user" | "assistant";
content: string;
};
function looksLikeIncompleteMarkdown(text: string): boolean {
const trimmed = String(text || "").trimEnd();
if (!trimmed) return true;
const lines = trimmed.split(/\r?\n/);
const lastLine = String(lines[lines.length - 1] || "").trim();
if (lastLine.startsWith("|")) {
if (!lastLine.endsWith("|")) return true;
const recentTableLines = lines.slice(-30);
const hasSeparator = recentTableLines.some((line) =>
/^\s*\|?\s*:?-{3,}.*\|/.test(line),
);
if (!hasSeparator) return true;
}
const codeFenceCount = (trimmed.match(/```/g) || []).length;
if (codeFenceCount % 2 !== 0) return true;
const boldMarkerCount = (trimmed.match(/\*\*/g) || []).length;
if (boldMarkerCount % 2 !== 0) return true;
return false;
}
function appendGeminiContinuation(base: string, continuation: string): string {
const left = String(base || "").trimEnd();
const right = String(continuation || "").trimStart();
if (!right) return left;
const maxOverlap = Math.min(500, left.length, right.length);
for (let size = maxOverlap; size >= 40; size--) {
if (left.slice(-size) === right.slice(0, size)) {
return left + right.slice(size);
}
}
return `${left}\n${right}`;
}
async function generateGeminiText(options: {
model: string;
messages: GeminiMessage[];
temperature: number;
maxOutputTokens: number;
responseMimeType?: string;
responseSchema?: unknown;
enableThinking?: boolean;
thinkingBudget?: number;
ensureCompleteMarkdown?: boolean;
}): Promise<string> {
const systemText = options.messages
.filter((m) => m.role === "system")
.map((m) => m.content)
.filter(Boolean)
.join("\n\n");
const contents = options.messages
.filter((m) => m.role !== "system")
.map((m) => ({
role: m.role === "assistant" ? "model" : "user",
parts: [{ text: m.content || " " }],
}));
const isGemini3 = options.model.startsWith("gemini-3");
const requestBody: any = {
contents: contents.length
? contents
: [{ role: "user", parts: [{ text: "Continue." }] }],
generationConfig: {
...(isGemini3 ? {} : { temperature: options.temperature }),
maxOutputTokens: options.maxOutputTokens,
},
};
const thinkingBudget = Math.max(
0,
Math.round(options.thinkingBudget ?? (options.enableThinking ? 2048 : 512)),
);
requestBody.generationConfig.thinkingConfig = isGemini3
? { thinkingLevel: thinkingBudget === 0 ? "minimal" : thinkingBudget <= 512 ? "low" : "medium" }
: { thinkingBudget };
if (systemText) {
requestBody.systemInstruction = { parts: [{ text: systemText }] };
}
if (options.responseMimeType) {
requestBody.generationConfig.responseMimeType = options.responseMimeType;
}
if (options.responseSchema) {
requestBody.generationConfig.responseSchema = options.responseSchema;
}
const res = await fetchGeminiWithBackoff(
`https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
requestBody,
GEMINI_API_KEY,
);
const raw = await res.text();
const json = raw ? JSON.parse(raw) : null;
if (!res.ok) {
throw Object.assign(
new Error(`GEMINI_ERROR ${res.status}: ${raw.slice(0, 500)}`),
{
status: res.status,
raw: raw.slice(0, 500),
},
);
}
const candidate = json?.candidates?.[0];
const parts = candidate?.content?.parts;
let content = Array.isArray(parts)
? parts
.map((part: any) => String(part?.text ?? ""))
.join("")
.trim()
: "";
let finishReason = String(candidate?.finishReason ?? "");
if (!content && !options.ensureCompleteMarkdown) return "";
if (finishReason && finishReason !== "STOP") {
console.warn("GEMINI_FINISH_REASON", {
model: options.model,
finishReason,
thoughtsTokenCount: Number(json?.usageMetadata?.thoughtsTokenCount ?? 0),
candidatesTokenCount: Number(
json?.usageMetadata?.candidatesTokenCount ?? 0,
),
});
}
if (options.ensureCompleteMarkdown && !options.responseMimeType) {
let continuationContents = requestBody.contents;
let previousModelContent = candidate?.content;
for (let attempt = 0; attempt < 2; attempt++) {
const needsContinuation =
finishReason === "MAX_TOKENS" || looksLikeIncompleteMarkdown(content);
if (!needsContinuation) break;
const continuationBody: any = {
...requestBody,
contents: [
...continuationContents,
previousModelContent ?? { role: "model", parts: [{ text: content }] },
{
role: "user",
parts: [
{
text:
"Continue exactly from where the response stopped. Do not restart, summarize, or repeat completed text. Finish any open Markdown table first, then complete the requested answer. Return only the continuation.",
},
],
},
],
generationConfig: {
...requestBody.generationConfig,
maxOutputTokens: Math.max(2500, Math.min(options.maxOutputTokens, 7000)),
thinkingConfig: isGemini3
? { thinkingLevel: "minimal" }
: { thinkingBudget: Math.min(thinkingBudget, 512) },
},
};
const continuationRes = await fetchGeminiWithBackoff(
`https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
continuationBody,
GEMINI_API_KEY,
);
const continuationRaw = await continuationRes.text();
const continuationJson = continuationRaw
? JSON.parse(continuationRaw)
: null;
if (!continuationRes.ok) break;
const continuationCandidate = continuationJson?.candidates?.[0];
const continuationParts = continuationCandidate?.content?.parts;
if (!Array.isArray(continuationParts)) break;
const continuationText = continuationParts
.map((part: any) => String(part?.text ?? ""))
.join("")
.trim();
if (!continuationText) break;
content = appendGeminiContinuation(content, continuationText);
finishReason = String(continuationCandidate?.finishReason ?? "");
continuationContents = continuationBody.contents;
previousModelContent = continuationCandidate?.content;
}
}
return content.trim();
}
async function generateGeminiTextWithFallback(options: {
model: string;
fallbackModel?: string;
messages: GeminiMessage[];
temperature: number;
maxOutputTokens: number;
responseMimeType?: string;
responseSchema?: unknown;
enableThinking?: boolean;
thinkingBudget?: number;
ensureCompleteMarkdown?: boolean;
}): Promise<string> {
try {
return await generateGeminiText({
model: options.model,
messages: options.messages,
temperature: options.temperature,
maxOutputTokens: options.maxOutputTokens,
responseMimeType: options.responseMimeType,
responseSchema: options.responseSchema,
enableThinking: options.enableThinking,
thinkingBudget: options.thinkingBudget,
ensureCompleteMarkdown: options.ensureCompleteMarkdown,
});
} catch (e: any) {
const status = Number(e?.status ?? null);
if (
options.fallbackModel &&
isGeminiRateOrTransient(Number.isFinite(status) ? status : null)
) {
return await generateGeminiText({
model: options.fallbackModel,
messages: options.messages,
temperature: options.temperature,
maxOutputTokens: options.maxOutputTokens,
responseMimeType: options.responseMimeType,
responseSchema: options.responseSchema,
thinkingBudget: options.thinkingBudget,
ensureCompleteMarkdown: options.ensureCompleteMarkdown,
});
}
throw e;
}
}

const COACH_RESPONSE_SCHEMA = {
type: "object",
properties: {
blocks: {
type: "array",
items: {
type: "object",
properties: {
kind: { type: "string", enum: ["markdown", "table"] },
text: { type: "string" },
headers: { type: "array", items: { type: "string" } },
rows: { type: "array", items: { type: "array", items: { type: "string" } } },
},
required: ["kind"],
},
},
},
required: ["blocks"],
};

function renderCoachStructured(answer: any): string {
if (!answer || !Array.isArray(answer.blocks) || !answer.blocks.length || answer.blocks.length > 30) {
throw new Error("INVALID_COACH_BLOCKS");
}
const output: string[] = [];
for (const block of answer.blocks) {
if (block?.kind === "markdown") {
const value = typeof block.text === "string" ? block.text.trim() : "";
if (!value || value.length > 12000 || /^ *\|.*\|/m.test(value)) {
throw new Error("INVALID_COACH_TEXT");
}
output.push(value);
} else if (block?.kind === "table") {
const headers = block.headers;
const rows = block.rows;
if (!Array.isArray(headers) || headers.length < 2 || headers.length > 6 ||
!headers.every((cell: unknown) => typeof cell === "string" && cell.trim() && cell.length <= 160) ||
!Array.isArray(rows) || !rows.length || rows.length > 50 ||
!rows.every((row: any) => Array.isArray(row) && row.length === headers.length &&
row.every((cell: unknown) => typeof cell === "string" && cell.length <= 900))) {
throw new Error("INVALID_COACH_TABLE");
}
const cell = (value: string) => value.replace(/\|/g, "｜").replace(/\s+/g, " ").trim();
output.push([
"| " + headers.map(cell).join(" | ") + " |",
"| " + headers.map(() => "---").join(" | ") + " |",
...rows.map((row: string[]) => "| " + row.map(cell).join(" | ") + " |"),
].join("\n"));
} else {
throw new Error("INVALID_COACH_BLOCK_KIND");
}
}
const result = output.join("\n\n").trim();
if (!result || result.length > 30000 ||
result.split("\n").some((line) => line.length > 1800 || /(.)\1{250,}/.test(line))) {
throw new Error("INVALID_COACH_LENGTH");
}
return result;
}

async function generateCoachStructured(
messages: GeminiMessage[],
maxOutputTokens: number,
): Promise<string> {
const system = messages.filter((message) => message.role === "system")
.map((message) => message.content).join("\n\n");
const contents = messages.filter((message) => message.role !== "system").map((message) => ({
role: message.role === "assistant" ? "model" : "user",
parts: [{ text: message.content || " " }],
}));
const baseInstruction = system +
"\n\nEXAM COACH RESPONSE CONTRACT: Answer the current user request fully and clinically accurately. " +
"Return structured JSON blocks, ordered as they should be read. " +
"Use markdown blocks for explanations, lists, headings and MCQs. " +
"Use table blocks with headers and rows whenever the user requests a table or comparison, regardless of wording. " +
"Never write Markdown pipe-table syntax inside a markdown block. " +
"For tables, use 2–6 concise columns; include all requested clinically relevant items and preserve qualifications. " +
"Do not omit requested items just to shorten the response. Avoid unnecessary preambles. " +
"Do not copy previous error messages or fabricate missing content.";
const requestBody = {
contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Explain the requested dental topic." }] }],
systemInstruction: { parts: [{ text: baseInstruction }] },
generationConfig: {
temperature: 0.3,
maxOutputTokens,
thinkingConfig: { thinkingBudget: 0 },
responseMimeType: "application/json",
responseSchema: COACH_RESPONSE_SCHEMA,
},
};
const deadline = Date.now() + 50000;
let lastReason = "NO_VALID_RESPONSE";
for (let attempt = 1; attempt <= 2; attempt++) {
const remaining = deadline - Date.now();
if (remaining <= 1000) break;
const body = attempt === 1 ? requestBody : {
...requestBody,
systemInstruction: { parts: [{ text: baseInstruction +
"\n\nThe first attempt was unusable. Generate a NEW, COMPLETE, concise answer from the original conversation. Do not continue or quote the failed attempt." }] },
};
try {
const response = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/" +
GEMINI_EXAM_COACH_MODEL + ":generateContent",
{
method: "POST",
headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
body: JSON.stringify(body),
signal: AbortSignal.timeout(Math.min(25000, remaining)),
},
);
const raw = await response.text();
if (!response.ok) {
lastReason = "UPSTREAM_" + response.status;
console.warn("EXAM_COACH_PROVIDER_ERROR", { attempt, status: response.status });
if (response.status === 400 || response.status === 401 || response.status === 403) break;
continue;
}
if (raw.length > 120000) { lastReason = "RAW_TOO_LARGE"; continue; }
const data = JSON.parse(raw);
const candidate = data?.candidates?.[0];
const finishReason = String(candidate?.finishReason || "");
const text = Array.isArray(candidate?.content?.parts)
? candidate.content.parts.filter((part: any) => !part?.thought)
.map((part: any) => String(part?.text ?? "")).join("").trim()
: "";
console.info("EXAM_COACH_GENERATION", {
attempt, model: GEMINI_EXAM_COACH_MODEL, finishReason,
outputChars: text.length,
promptTokens: Number(data?.usageMetadata?.promptTokenCount ?? 0),
thoughtTokens: Number(data?.usageMetadata?.thoughtsTokenCount ?? 0),
outputTokens: Number(data?.usageMetadata?.candidatesTokenCount ?? 0),
});
if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
lastReason = "SAFETY"; break;
}
if (finishReason !== "STOP") { lastReason = "FINISH_" + finishReason; continue; }
if (!text || text.length > 45000) { lastReason = "OUTPUT_SIZE"; continue; }
try {
return renderCoachStructured(JSON.parse(text));
} catch (error: any) {
lastReason = String(error?.message || "INVALID_STRUCTURE").slice(0, 80);
}
} catch (error: any) {
lastReason = error?.name === "TimeoutError" ? "TIMEOUT" : "REQUEST_OR_PARSE";
console.warn("EXAM_COACH_ATTEMPT_FAILED", { attempt, reason: lastReason });
}
}
throw new Error("EXAM_COACH_OUTPUT_UNAVAILABLE:" + lastReason);
}

function parsePageMarkers(
text: string,
): Array<{ page: number | null; text: string }> {
const t = String(text || "").trim();
if (!/\[Page\s+\d+\]/.test(t)) {
return [{ page: null, text: t }];
}
const out: Array<{ page: number | null; text: string }> = [];
const re = /\[Page\s+(\d+)\]/g;
let lastIndex = 0;
let lastPage: number | null = null;
for (;;) {
const m = re.exec(t);
if (!m) break;
const idx = m.index;
if (idx > lastIndex) {
const chunk = t.slice(lastIndex, idx).trim();
if (chunk) out.push({ page: lastPage, text: chunk });
}
lastPage = Number(m[1]);
lastIndex = re.lastIndex;
}
const tail = t.slice(lastIndex).trim();
if (tail) out.push({ page: lastPage, text: tail });
return out;
}
type PdfDoc = {
file_id: string;
file_name?: string;
text: string;
pages?: number | null;
};
function formatBatch(rows: any[]) {
let out = "";
for (const r of rows) {
const page =
r.page_start == null
? ""
: ` (page ${r.page_start}${r.page_end && r.page_end !== r.page_start ? `-${r.page_end}` : ""})`;
out += `\n--- ${r.file_name || "PDF"}${page} ---\n${String(r.content || "").trim()}\n`;
}
return out.trim();
}
function clampInt(value: unknown, min: number, max: number, fallback: number) {
const n = Number(value);
if (!Number.isFinite(n)) return fallback;
return Math.max(min, Math.min(max, Math.round(n)));
}
function parseJsonObject(text: string): any {
const raw = String(text || "").trim();
if (!raw) return null;
try {
return JSON.parse(raw);
} catch (_) {
const start = raw.indexOf("{");
const end = raw.lastIndexOf("}");
if (start >= 0 && end > start) {
try {
return JSON.parse(raw.slice(start, end + 1));
} catch (_) {
return null;
}
}
}
return null;
}
function salvageArrayItems(rawText: string, keys: string[]): any[] {
const text = String(rawText || "");
let start = -1;
for (const key of keys) {
const match = new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text);
if (match) {
start = match.index + match[0].length;
break;
}
}
if (start < 0) return [];
const items: any[] = [];
let depth = 0;
let inString = false;
let escape = false;
let itemStart = -1;
for (let i = start; i < text.length; i++) {
const ch = text[i];
if (inString) {
if (escape) escape = false;
else if (ch === "\\") escape = true;
else if (ch === '"') inString = false;
continue;
}
if (ch === '"') {
inString = true;
continue;
}
if (ch === "{") {
if (depth === 0) itemStart = i;
depth++;
continue;
}
if (ch === "}") {
depth--;
if (depth === 0 && itemStart >= 0) {
try {
items.push(JSON.parse(text.slice(itemStart, i + 1)));
} catch (_) {
}
itemStart = -1;
}
continue;
}
if (ch === "]" && depth === 0) break;
}
return items;
}
function pickFlashcardItems(parsed: any): any[] {
if (Array.isArray(parsed)) return parsed;
if (Array.isArray(parsed?.cards)) return parsed.cards;
if (Array.isArray(parsed?.flashcards)) return parsed.flashcards;
if (Array.isArray(parsed?.items)) return parsed.items;
return [];
}
function normalizeFlashcards(
value: any,
): Array<{ front: string; back: string }> {
const arr = Array.isArray(value) ? value : [];
return arr
.map((card: any) => ({
front: String(
card?.front ??
card?.question ??
card?.prompt ??
card?.term ??
card?.card_front ??
"",
).trim(),
back: String(
card?.back ??
card?.answer ??
card?.explanation ??
card?.definition ??
card?.card_back ??
"",
).trim(),
}))
.filter((card) => card.front && card.back)
.slice(0, 30);
}
function pickQuizItems(parsed: any): any[] {
if (Array.isArray(parsed)) return parsed;
if (Array.isArray(parsed?.questions)) return parsed.questions;
if (Array.isArray(parsed?.quiz)) return parsed.quiz;
if (Array.isArray(parsed?.mcqs)) return parsed.mcqs;
if (Array.isArray(parsed?.items)) return parsed.items;
return [];
}
function normalizeQuizOptions(item: any): string[] {
if (Array.isArray(item?.options)) {
return item.options
.map((option: unknown) => String(option ?? "").trim())
.filter(Boolean)
.slice(0, 5);
}
return [item?.a, item?.b, item?.c, item?.d, item?.e]
.map((option) => String(option ?? "").trim())
.filter(Boolean)
.slice(0, 5);
}
function resolveCorrectIndex(item: any, options: string[]): number {
const rawIndex = Number(item?.correct_index ?? item?.answer_index);
if (
Number.isInteger(rawIndex) &&
rawIndex >= 0 &&
rawIndex < options.length
) {
return rawIndex;
}
const answer = String(
item?.correct_answer ?? item?.answer ?? item?.correct ?? "",
).trim();
if (/^[A-E]$/i.test(answer)) {
const index = answer.toUpperCase().charCodeAt(0) - 65;
if (index >= 0 && index < options.length) return index;
}
const match = options.findIndex(
(option) => option.toLowerCase() === answer.toLowerCase(),
);
return match >= 0 ? match : 0;
}
function normalizeQuizQuestions(value: any) {
const arr = Array.isArray(value) ? value : [];
return arr
.map((item: any) => {
const options = normalizeQuizOptions(item);
const correctIndex = resolveCorrectIndex(item, options);
return {
question: String(
item?.question ?? item?.stem ?? item?.prompt ?? "",
).trim(),
options,
correct_index: correctIndex,
explanation: String(
item?.explanation ?? item?.rationale ?? item?.reason ?? "",
).trim(),
};
})
.filter(
(item) =>
item.question &&
item.options.length >= 3 &&
item.correct_index >= 0 &&
item.correct_index < item.options.length,
)
.slice(0, 30);
}
const FLASHCARD_RESPONSE_SCHEMA = {
type: "object",
properties: {
title: { type: "string" },
cards: {
type: "array",
items: {
type: "object",
properties: {
front: { type: "string" },
back: { type: "string" },
},
required: ["front", "back"],
},
},
},
required: ["title", "cards"],
};
const QUIZ_RESPONSE_SCHEMA = {
type: "object",
properties: {
title: { type: "string" },
questions: {
type: "array",
items: {
type: "object",
properties: {
question: { type: "string" },
options: {
type: "array",
items: { type: "string" },
},
correct_index: { type: "integer" },
explanation: { type: "string" },
},
required: ["question", "options", "correct_index", "explanation"],
},
},
},
required: ["title", "questions"],
};
const QUIZ_DIFFICULTY_SPEC: Record<string, string> = {
easy:
"EASY — direct recall and single-step clinical reasoning. Short, clear stems. " +
"One clearly correct answer; distractors are wrong in an obvious way to a student who has studied the material. Good for first-pass revision.",
normal:
"NORMAL — licensing-exam style. Clinical scenario stems with 1-2 decision points. " +
"Distractors are plausible and reflect common partial-understanding errors. Tests applied understanding, not memorization.",
hard:
"HARD — multi-step clinical reasoning. Stems include contraindications, exceptions, sequencing, or conflicting clinical findings that must be weighed against each other. " +
"Distractors are close calls that mirror real examiner traps, not just wrong facts.",
};
function countBuffer(count: number): number {
if (count <= 10) return 2;
if (count <= 25) return 3;
return 4;
}
async function refundAiCredit(
adminClient: any,
snapshot: { userId: string; metadata: Record<string, unknown> } | null,
): Promise<void> {
if (!snapshot) return;
try {
await adminClient.auth.admin.updateUserById(snapshot.userId, {
user_metadata: snapshot.metadata,
});
} catch (_) {
}
}
async function topUpFlashcards(params: {
sourceText: string;
existingFronts: string[];
needed: number;
}): Promise<Array<{ front: string; back: string }>> {
const avoidList = params.existingFronts
.slice(0, 30)
.map((front) => `- ${front}`)
.join("\n");
const aiText = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
temperature: 0.4,
maxOutputTokens: Math.min(6000, Math.max(1800, params.needed * 260 + 500)),
responseMimeType: "application/json",
responseSchema: FLASHCARD_RESPONSE_SCHEMA,
messages: [
{
role: "system",
content:
"You are the DentAIstudy exam tutor. Generate additional active-recall flashcards that do not duplicate the ones already produced. " +
"Back: 2-3 concise sentences, max 50 words. Output valid JSON only. No preamble. No markdown.",
},
{
role: "user",
content:
`Create exactly ${params.needed} NEW active-recall flashcards from the source below. ` +
`Do not repeat or rephrase these existing fronts:\n${avoidList || "(none)"}\n\n` +
'Return this schema: {"title":"short deck title","cards":[{"front":"question","back":"answer"}]}\n\n' +
`Source:\n${params.sourceText}`,
},
],
});
const parsed = parseJsonObject(aiText);
let topUp = normalizeFlashcards(pickFlashcardItems(parsed));
if (!topUp.length) {
topUp = normalizeFlashcards(
salvageArrayItems(aiText, ["cards", "flashcards", "items"]),
);
}
return topUp;
}
async function topUpQuizQuestions(params: {
sourceText: string;
existingQuestions: string[];
needed: number;
difficulty: string;
}): Promise<ReturnType<typeof normalizeQuizQuestions>> {
const avoidList = params.existingQuestions
.slice(0, 30)
.map((question) => `- ${question}`)
.join("\n");
const aiText = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
temperature: params.difficulty === "hard" ? 0.35 : 0.25,
maxOutputTokens: Math.min(8000, Math.max(2000, params.needed * 380 + 500)),
responseMimeType: "application/json",
responseSchema: QUIZ_RESPONSE_SCHEMA,
messages: [
{
role: "system",
content:
"You are the DentAIstudy exam writer. Generate additional MCQs that do not duplicate the ones already produced. " +
"Explanations: 1-2 concise sentences, max 45 words. Output valid JSON only. No preamble. No markdown.",
},
{
role: "user",
content:
`Create exactly ${params.needed} NEW ${params.difficulty} multiple-choice questions from the source below. ` +
`Do not repeat or rephrase these existing stems:\n${avoidList || "(none)"}\n\n` +
'Return this schema: {"title":"short quiz title","questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}\n\n' +
`Source:\n${params.sourceText}`,
},
],
});
const parsed = parseJsonObject(aiText);
let topUp = normalizeQuizQuestions(pickQuizItems(parsed));
if (!topUp.length) {
topUp = normalizeQuizQuestions(
salvageArrayItems(aiText, ["questions", "quiz", "mcqs", "items"]),
);
}
return topUp;
}
function estimatePageCount(
charCount: number,
providedPages?: number | null,
): number {
if (providedPages && providedPages > 0) return providedPages;
return Math.max(1, Math.round(charCount / CHARS_PER_PAGE_ESTIMATE));
}
function shouldSkipLargePdfPage(text: string): boolean {
const t = String(text || "").toLowerCase();
if (!t.trim()) return true;
if (/\bcontents\b/.test(t)) return false;
return /isbn|copyright|all rights reserved|published by|publisher|printed in|library of congress|british library|contributors|acknowledgements|preface/.test(
t,
);
}
function looksLikeChapterOpener(text: string): boolean {
const clean = String(text || "")
.replace(/\r/g, "")
.trim();
const firstLine = clean.split("\n").find(Boolean) || "";
if (/^\d+\s+chapter\s+\d+/i.test(firstLine)) return false;
const firstBlock = clean.slice(0, 1200);
return (
/^\s*(chapter|unit|section)\s+\d{1,2}\b/im.test(firstBlock) ||
/^\s*\d{1,2}\s*\n[A-Z][^\n]{3,100}\n/.test(firstBlock)
);
}
function rowFromPage(
page: { page: number | null; text: string },
fileName: string,
chunkIndex: number,
) {
return {
chunk_index: chunkIndex,
page_start: page.page,
page_end: page.page,
content: String(page.text || "").trim(),
file_name: fileName,
};
}
function buildLargePdfStudyRows(rawText: string, fileName: string) {
const pages = parsePageMarkers(rawText);
const selected = new Map<number, { page: number | null; text: string }>();
const addPage = (index: number) => {
const page = pages[index];
if (!page || shouldSkipLargePdfPage(page.text)) return;
selected.set(index, page);
};
pages.forEach((page, index) => {
const text = String(page.text || "");
const lower = text.toLowerCase();
if (/\bcontents\b/.test(lower)) addPage(index);
if (looksLikeChapterOpener(text)) {
addPage(index);
addPage(index + 1);
addPage(index + 2);
}
});
if (!selected.size) {
pages.forEach((_, index) => {
if (index < 12 || index % 20 === 0) addPage(index);
});
}
const rows: any[] = [];
let usedChars = 0;
let chunkIndex = 0;
Array.from(selected.keys())
.sort((a, b) => a - b)
.forEach((index) => {
if (usedChars >= LARGE_NOTES_MAX_CONTEXT_CHARS) return;
const page = selected.get(index)!;
const clean = String(page.text || "")
.replace(/\s+/g, " ")
.trim();
if (!clean) return;
const remaining = LARGE_NOTES_MAX_CONTEXT_CHARS - usedChars;
const content = clean.slice(0, Math.max(0, remaining));
if (!content) return;
rows.push(
rowFromPage({ ...page, text: content }, fileName, chunkIndex++),
);
usedChars += content.length;
});
return rows;
}
function hasMcqIntent(text: string): boolean {
const t = String(text || "").toLowerCase();
return /\b(mcqs?|multiple[\s-]choice|quiz me|test me)\b/.test(t);
}
const MCQ_NUMBER_WORDS: Record<string, number> = {
one: 1,
two: 2,
three: 3,
four: 4,
five: 5,
six: 6,
seven: 7,
eight: 8,
nine: 9,
ten: 10,
eleven: 11,
twelve: 12,
thirteen: 13,
fourteen: 14,
fifteen: 15,
sixteen: 16,
seventeen: 17,
eighteen: 18,
nineteen: 19,
twenty: 20,
};
function detectRequestedMcqCount(text: string): number | null {
const t = String(text || "").toLowerCase();
const digitMatch = t.match(/\b(\d{1,2})\s*(?:mcqs?|questions?|qs)\b/);
if (digitMatch) {
const n = parseInt(digitMatch[1], 10);
if (n >= 1 && n <= 40) return n;
}
const wordMatch = t.match(
/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?:mcqs?|questions?|qs)\b/,
);
if (wordMatch) {
const n = MCQ_NUMBER_WORDS[wordMatch[1]];
if (n) return n;
}
return null;
}
serve(async (req: Request): Promise<Response> => {
if (req.method === "OPTIONS")
return new Response("ok", { headers: corsHeaders });
if (req.method !== "POST") {
return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
status: 405,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
return new Response(JSON.stringify({ error: "SERVER_MISCONFIGURED" }), {
status: 500,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
try {
const body = (await req.json().catch(() => ({}))) as any;
const topic = String(body?.topic ?? "").trim();
const mode = String(body?.mode ?? "General overview");
const subject = String(body?.subject ?? "General dentistry");
const conversationId = String(body?.conversation_id ?? "").trim();
const task = String(body?.task ?? "qa").trim(); // "qa" | "chapter_notes" | "flashcards" | "quiz"
const activeFileId =
String(body?.file_id ?? "").trim() ||
String(body?.pdf_docs?.[0]?.file_id ?? "").trim();
const pdfDocs: PdfDoc[] = Array.isArray(body?.pdf_docs)
? body.pdf_docs.map((d: any) => ({
file_id: String(d?.file_id ?? ""),
file_name: String(d?.file_name ?? ""),
text: String(d?.text ?? ""),
pages: d?.pages ?? null,
}))
: [];
const messagesFromClient = Array.isArray(body?.messages)
? body.messages
.filter(
(m: any) => m && (m.role === "user" || m.role === "assistant"),
)
.slice(-HISTORY_WINDOW)
.map((m: any) => ({
role: m.role,
content: truncateText(String(m.content ?? ""), MAX_MESSAGE_CHARS),
}))
: null;
if (!topic && !messagesFromClient?.length) {
return new Response(JSON.stringify({ error: "TOPIC_REQUIRED" }), {
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
const supabaseAdmin = createClient(
SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY,
{
auth: { persistSession: false },
},
);
const authHeader = req.headers.get("Authorization") || "";
let userId: string | null = null;
if (authHeader.toLowerCase().startsWith("bearer ")) {
const jwt = authHeader.slice(7).trim();
const { data } = await supabaseAdmin.auth.getUser(jwt);
if (data?.user) userId = data.user.id;
}
let subscriptionTier = "free";
let isProUser = false;
let quotaUserMeta: any = null;
if (userId) {
const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
if (data?.user) {
quotaUserMeta = data.user.user_metadata ?? {};
const appMeta: any = data.user.app_metadata ?? {};
const tier = appMeta.subscription_tier || "free";
const partnerProUntil = String(appMeta.partner_pro_until || "").trim();
const partnerProExpiresAt = partnerProUntil
? Date.parse(`${partnerProUntil}T23:59:59.999Z`)
: Number.NaN;
const hasPartnerPro =
Number.isFinite(partnerProExpiresAt) &&
partnerProExpiresAt >= Date.now();
const isPro = tier === "pro" || tier === "pro_yearly" || hasPartnerPro;
subscriptionTier = hasPartnerPro && tier === "free" ? "pro" : tier;
isProUser = isPro;
}
}
if (
(task === "flashcards" ||
task === "quiz" ||
(task === "chapter_notes" && pdfDocs.length > 0)) &&
!isProUser
) {
return new Response(
JSON.stringify({ error: "PRO_REQUIRED", tier: subscriptionTier }),
{
status: 403,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
const maxPdfDocs = isProUser && task === "chapter_notes" ? 1 : 0;
if (pdfDocs.length > maxPdfDocs) {
return new Response(
JSON.stringify({
error: "PDF_LIMIT_REACHED",
tier: subscriptionTier,
maxPdfs: maxPdfDocs,
}),
{
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
let creditRefundSnapshot: {
userId: string;
metadata: Record<string, unknown>;
} | null = null;
if (userId && quotaUserMeta) {
const today = getTodayUTC();
const limit = isProUser ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
const requestCost =
task === "flashcards" ||
task === "quiz" ||
task === "chapter_notes" ||
Boolean(activeFileId) ||
pdfDocs.length > 0
? 2
: 1;
let used =
typeof quotaUserMeta.ai_count === "number" ? quotaUserMeta.ai_count : 0;
let date =
typeof quotaUserMeta.ai_date === "string"
? quotaUserMeta.ai_date
: null;
if (date !== today) {
used = 0;
date = today;
}
if (used + requestCost > limit) {
return new Response(
JSON.stringify({
error: "LIMIT_REACHED",
tier: subscriptionTier,
limit,
used,
requestCost,
}),
{
status: 429,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
creditRefundSnapshot = {
userId,
metadata: {
...quotaUserMeta,
ai_date: today,
ai_count: used,
},
};
await supabaseAdmin.auth.admin.updateUserById(userId, {
user_metadata: {
...quotaUserMeta,
ai_date: today,
ai_count: used + requestCost,
},
});
}
if (!userId) {
const guestFingerprint = await getGuestFingerprint(req);
const { data: guestQuotaRows, error: guestQuotaError } =
await supabaseAdmin.rpc("consume_guest_ai_credit", {
p_fingerprint_hash: guestFingerprint,
p_limit: GUEST_DAILY_LIMIT,
});
if (guestQuotaError) throw guestQuotaError;
const guestQuota = Array.isArray(guestQuotaRows)
? guestQuotaRows[0]
: guestQuotaRows;
if (!guestQuota?.allowed) {
return new Response(
JSON.stringify({
error: "GUEST_LIMIT_REACHED",
limit: GUEST_DAILY_LIMIT,
used: Number(guestQuota?.used ?? GUEST_DAILY_LIMIT),
}),
{
status: 429,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
}
if (
task === "chapter_notes" &&
pdfDocs.length &&
String(pdfDocs[0]?.text || "").trim()
) {
const doc = pdfDocs[0];
const fileName = String(doc.file_name || "Dental PDF").trim();
const rawText = String(doc.text || "").trim();
const estimatedPages = estimatePageCount(rawText.length, doc.pages);
if (estimatedPages > MAX_NOTES_PDF_PAGES) {
return new Response(
JSON.stringify({
error: "PDF_TOO_LARGE",
message: `This PDF has about ${estimatedPages} pages. Upload a book under ${MAX_NOTES_PDF_PAGES} pages or split it by section.`,
}),
{
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
const isLargePdf =
rawText.length > NOTES_SINGLE_PASS_CHAR_LIMIT ||
estimatedPages > LARGE_NOTES_PAGE_THRESHOLD;

if (isLargePdf) {
const rows = buildLargePdfStudyRows(rawText, fileName);
if (!rows.length) {
return new Response(JSON.stringify({ error: "NO_PDF_TEXT_FOUND" }), {
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}

let studyMap = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
thinkingBudget: 0,
ensureCompleteMarkdown: true,
temperature: 0.3,
maxOutputTokens: LARGE_NOTES_OUTPUT_TOKENS,
messages: [
{
role: "system",
content:
"You are the DentAIstudy Notes engine — a senior dental educator, licensing exam coach, and medical education content editor. A very large dental PDF was uploaded. Your job is not to rewrite the whole book. Create one clean, readable, exam-ready chapter map from the provided extracted structure and chapter samples. Cover all visible chapters, including final chapters, even if earlier chapters must be tighter. Ignore copyright, ISBN, publisher, preface, acknowledgements, contributors, and dosage/legal disclaimers unless the actual study content requires a safety warning. Use the PDF as the scope and organize it for exam revision. Write like a professional study-note editor: clean markdown headings, correct punctuation, precise bullets, and no raw formatting marks. Use only #, ##, and ### headings. Never use ####, #####, or deeper heading levels. No greeting. No filler. Do not mention internal chunking or extraction limits.",
},
{
role: "user",
content:
`Source: ${fileName}\n` +
`Detected size: about ${estimatedPages} pages.\n` +
"Deliverable: Create one exam-ready note sheet for the full uploaded book.\n\n" +
"Required structure:\n" +
"# [Book or file title] — Exam Notes\n" +
"## How to study this book\n" +
"- Give 4-6 bullets that tell an anxious exam candidate how to use the material.\n" +
"## Chapter-by-chapter high-yield map\n" +
"Use this exact chapter format for every visible chapter or major section:\n" +
"### 1. [Chapter title]\n" +
"- **Core exam focus:** The main exam theme of this chapter.\n" +
"- **Must-know clinical points:** The practical points a candidate must remember.\n" +
"- **Common viva/MCQ traps:** The mistakes candidates commonly make.\n" +
"- **What to revise first:** The first material to review before the exam.\n" +
"Continue numbering as 2., 3., 4., and so on. Never write headings like `1 History and examination`; always write `1. History and examination`.\n" +
"## Final high-yield traps\n" +
"- List the cross-chapter mistakes students commonly make.\n\n" +
"Markdown rules:\n" +
"- Use clean markdown only: #, ##, ###, bullets, numbered headings, bold labels, and tables only when useful.\n" +
"- Never use ####, #####, or deeper heading levels.\n" +
"- Use **bold** for labels such as **Core exam focus:**.\n" +
"- Use *italic* only for true emphasis. Never leave raw asterisks visible in the final answer.\n" +
"- Do not waste space on publisher details, ISBN, editors, contents admin, disclaimers, preface, or acknowledgements.\n" +
"- Do not pretend this is a full page-by-page rewrite. Make it a smart study map.\n" +
"- If a chapter has only a title or limited extracted detail, still include a concise exam-revision direction, but do not invent page-specific facts.\n" +
"- Use practical dental exam language, not textbook marketing language.\n\n" +
`Extracted structure and chapter samples:\n${formatBatch(rows)}`,
},
],
});

studyMap = cleanNotesMarkdown(studyMap);
return new Response(JSON.stringify({ output: studyMap }), {
status: 200,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}

let notes = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
thinkingBudget: 0,
ensureCompleteMarkdown: true,
temperature: 0.25,
maxOutputTokens: MAX_OUTPUT_TOKENS_DEEP,
messages: [
{
role: "system",
content:
"You are the DentAIstudy Notes engine — a senior dental educator, licensing exam coach, and medical education content editor. Create one complete exam-ready note sheet from the uploaded dental PDF. Preserve the important material across the full source. Use direct headings, high-yield bullets, mechanisms, clinical relevance, and exam traps where supported. Use clean markdown only: ## and ### headings, `1. Heading` not `1 Heading`, `- **Label:** text` for bullets, and valid tables when useful. Never use ####, #####, or deeper heading levels. Use **bold** for labels and *italic* only for true emphasis. Never leave raw asterisks visible in the final notes. Tables must be self-contained and complete. Never use footnote symbols such as *, #, \\*, or \\# in table cells. Ignore publisher details, ISBN, copyright, preface, acknowledgements, and generic book disclaimers unless clinically relevant. Remove repetition, but do not omit important source content. No greeting. No filler. Do not invent missing content.",
},
{
role: "user",
content:
`Source: ${fileName}\n` +
`Detected size: about ${estimatedPages} pages.\n` +
"Deliverable: Complete exam-ready notes from the full uploaded PDF.\n\n" +
rawText,
},
],
});

notes = cleanNotesMarkdown(notes);
return new Response(JSON.stringify({ output: notes }), {
status: 200,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
if (task === "flashcards") {
const cardCount = clampInt(body?.card_count, 6, MAX_FLASHCARD_COUNT, 12);
const requestedCardCount = cardCount + countBuffer(cardCount);
const sourceText = truncateText(
[
topic,
...(messagesFromClient || []).map(
(m: any) => `${m.role}: ${m.content}`,
),
]
.filter(Boolean)
.join("\n\n"),
18000,
);
if (sourceText.length < 30) {
return new Response(JSON.stringify({ error: "SOURCE_REQUIRED" }), {
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
const flashcardMaxTokens = Math.min(
8000,
Math.max(3200, requestedCardCount * 220 + 600),
);
const aiText = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
temperature: 0.38,
maxOutputTokens: flashcardMaxTokens,
responseMimeType: "application/json",
responseSchema: FLASHCARD_RESPONSE_SCHEMA,
messages: [
{
role: "system",
content:
"You are the DentAIstudy exam tutor — a senior dental educator and licensing exam coach. " +
"Generate active-recall flashcards that train exam thinking, not passive memorisation. " +
"Front: a specific clinical or exam-style question, hard enough to be useful. " +
"Back: a direct complete answer with exam-critical nuance in 2-3 concise sentences, max 50 words. " +
"Prioritise high-yield clinical facts, classifications, contraindications, viva traps, and common student errors. " +
"Output valid JSON only. No preamble. No markdown.",
},
{
role: "user",
content:
`Create exactly ${requestedCardCount} active-recall flashcards from the source. ` +
"Avoid duplicates. Keep questions specific and answers concise but useful. " +
'Return this schema: {"title":"short deck title","cards":[{"front":"question","back":"answer"}]}\n\n' +
`Source:\n${sourceText}`,
},
],
});
const parsed = parseJsonObject(aiText);
let cards = normalizeFlashcards(pickFlashcardItems(parsed));
let salvaged = !parsed;
if (!cards.length) {
cards = normalizeFlashcards(
salvageArrayItems(aiText, ["cards", "flashcards", "items"]),
);
salvaged = true;
}
for (
let attempt = 0;
attempt < STUDY_TOP_UP_ATTEMPTS && cards.length < cardCount;
attempt++
) {
try {
const needed = cardCount - cards.length;
const topUp = await topUpFlashcards({
sourceText,
existingFronts: cards.map((card) => card.front),
needed: Math.min(MAX_FLASHCARD_COUNT, needed + countBuffer(needed)),
});
const seen = new Set(cards.map((card) => card.front.toLowerCase()));
for (const card of topUp) {
if (cards.length >= cardCount) break;
if (seen.has(card.front.toLowerCase())) continue;
cards.push(card);
seen.add(card.front.toLowerCase());
}
salvaged = true;
} catch (_) {
break;
}
}
cards = cards.slice(0, cardCount);
if (cards.length < cardCount) {
await refundAiCredit(supabaseAdmin, creditRefundSnapshot);
if (!cards.length) {
console.error("FLASHCARDS_PARSE_EMPTY", aiText.slice(0, 800));
return new Response(
JSON.stringify({
error: "FLASHCARDS_EMPTY",
message:
"Could not generate flashcards from this note. Try again.",
}),
{
status: 502,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
return new Response(
JSON.stringify({
error: "FLASHCARDS_INCOMPLETE",
message: `Only ${cards.length} of ${cardCount} flashcards could be generated from this note. Try a lower count or a longer note.`,
requested_count: cardCount,
generated_count: cards.length,
}),
{
status: 422,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
return new Response(
JSON.stringify({
title: String(parsed?.title || "Study deck").slice(0, 90),
cards,
requested_count: cardCount,
generated_count: cards.length,
salvaged,
}),
{
status: 200,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
if (task === "quiz") {
const questionCount = clampInt(body?.question_count, 5, MAX_QUIZ_COUNT, 10);
const requestedQuestionCount = questionCount + countBuffer(questionCount);
const difficulty = ["easy", "normal", "hard"].includes(
String(body?.difficulty),
)
? String(body?.difficulty)
: "normal";
const sourceText = truncateText(
[
topic,
...(messagesFromClient || []).map(
(m: any) => `${m.role}: ${m.content}`,
),
]
.filter(Boolean)
.join("\n\n"),
18000,
);
if (sourceText.length < 30) {
return new Response(JSON.stringify({ error: "SOURCE_REQUIRED" }), {
status: 400,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
const quizMaxTokens = Math.min(
10000,
Math.max(4600, requestedQuestionCount * 380 + 600),
);
const aiText = await generateGeminiTextWithFallback({
model: GEMINI_STUDY_MODEL,
fallbackModel: GEMINI_EXAM_COACH_MODEL,
temperature: difficulty === "hard" ? 0.35 : 0.25,
maxOutputTokens: quizMaxTokens,
responseMimeType: "application/json",
responseSchema: QUIZ_RESPONSE_SCHEMA,
messages: [
{
role: "system",
content:
"You are the DentAIstudy exam writer — a senior dental educator who writes licensing-style dental questions. " +
"Use realistic clinical stems and plausible distractors based on mistakes real students make. " +
"Explanations must state why the correct answer is correct and why distractors fail in 1-2 concise sentences, max 45 words. " +
"Output valid JSON only. No preamble. No markdown.",
},
{
role: "user",
content:
`Create exactly ${requestedQuestionCount} multiple-choice questions from the source. ` +
`Difficulty calibration:\n${QUIZ_DIFFICULTY_SPEC[difficulty]}\n\n` +
"Each question needs 4 options, one correct answer, and a short explanation. Avoid duplicates. " +
'Return this schema: {"title":"short quiz title","questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}\n\n' +
`Source:\n${sourceText}`,
},
],
});
const parsed = parseJsonObject(aiText);
let questions = normalizeQuizQuestions(pickQuizItems(parsed));
let salvaged = !parsed;
if (!questions.length) {
questions = normalizeQuizQuestions(
salvageArrayItems(aiText, ["questions", "quiz", "mcqs", "items"]),
);
salvaged = true;
}
for (
let attempt = 0;
attempt < STUDY_TOP_UP_ATTEMPTS && questions.length < questionCount;
attempt++
) {
try {
const needed = questionCount - questions.length;
const topUp = await topUpQuizQuestions({
sourceText,
existingQuestions: questions.map((question) => question.question),
needed: Math.min(MAX_QUIZ_COUNT, needed + countBuffer(needed)),
difficulty,
});
const seen = new Set(
questions.map((question) => question.question.toLowerCase()),
);
for (const question of topUp) {
if (questions.length >= questionCount) break;
if (seen.has(question.question.toLowerCase())) continue;
questions.push(question);
seen.add(question.question.toLowerCase());
}
salvaged = true;
} catch (_) {
break;
}
}
questions = questions.slice(0, questionCount);
if (questions.length < questionCount) {
await refundAiCredit(supabaseAdmin, creditRefundSnapshot);
if (!questions.length) {
console.error("QUIZ_PARSE_EMPTY", aiText.slice(0, 800));
return new Response(
JSON.stringify({
error: "QUIZ_EMPTY",
message:
"Could not generate quiz questions from this note. Try again.",
}),
{
status: 502,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
return new Response(
JSON.stringify({
error: "QUIZ_INCOMPLETE",
message: `Only ${questions.length} of ${questionCount} quiz questions could be generated from this note. Try a lower count or a longer note.`,
requested_count: questionCount,
generated_count: questions.length,
}),
{
status: 422,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
return new Response(
JSON.stringify({
title: String(parsed?.title || "Study quiz").slice(0, 90),
questions,
requested_count: questionCount,
generated_count: questions.length,
difficulty,
salvaged,
}),
{
status: 200,
headers: { ...corsHeaders, "Content-Type": "application/json" },
},
);
}
const latestUserQuestion =
topic ||
(messagesFromClient
?.slice()
.reverse()
.find((m: any) => m.role === "user")?.content ??
"");
const savedConversationHistory =
userId && conversationId
? await loadSavedConversationHistory(
supabaseAdmin,
userId,
conversationId,
)
: [];
const historySource = savedConversationHistory.length
? savedConversationHistory
: Array.isArray(messagesFromClient)
? messagesFromClient
: [];
const recentMessageIds = new Set<number>(
savedConversationHistory
.map((message: any) => Number(message?.id))
.filter((id: number) => Number.isFinite(id)),
);
const savedChatMemory = userId
? await loadRelevantSavedChatMemory(
supabaseAdmin,
userId,
latestUserQuestion,
recentMessageIds,
)
: "";
const mcqIntentDetected = hasMcqIntent(latestUserQuestion);
const requestedMcqCount = detectRequestedMcqCount(latestUserQuestion);
const effectiveMode = mcqIntentDetected ? "MCQ" : mode;
const modeExplanation = (() => {
const l = effectiveMode.toLowerCase();
if (l.includes("osce")) {
return "OSCE MODE — answer in examiner checklist format: introduction, history, examination, investigations, diagnosis/differential, management, follow-up, and mark-scoring points.";
}
if (l.includes("flashcard")) {
return "FLASHCARD MODE — produce active-recall Q/A pairs that test clinical reasoning and exam traps.";
}
if (l.includes("mcq")) {
return (
"MCQ MODE — strict format, no exceptions, applies whenever user requests questions regardless of mode:\n\n" +
"START RULE: The very first characters of the response must be '**Question 1:**' — nothing before it. No sentence about what you are generating. Start cold on Question 1.\n\n" +
"EXACT FORMAT per question — follow this precisely:\n\n" +
"**Question [N]:**\n" +
"[Clinical scenario — 2 to 4 sentences. Patient age or context, presenting complaint, key clinical or radiographic findings. End with a specific answerable question.]\n\n" +
"A. [Option]\n" +
"B. [Option]\n" +
"C. [Option]\n" +
"D. [Option]\n\n" +
"**Correct Answer: [Single letter — A, B, C, or D only]**\n\n" +
"**Why correct:** [One sentence — the specific mechanism or clinical reasoning.]\n\n" +
"**Why others fail:** A — [one phrase]; B — [one phrase]; C — [one phrase]; D — [one phrase]. Skip the correct letter.\n\n" +
"**Exam trap:** [The specific mistake candidates make on this exact question — not generic advice.]\n\n" +
"---\n\n" +
"OPTIONS RULE: EXACTLY 4 options every time — A, B, C, D. Never generate a 5th option. Never use E.\n\n" +
"QUESTION QUALITY RULES:\n" +
"Only ONE answer is unambiguously correct. If two options are both clinically valid, rewrite the stem so one becomes clearly best.\n" +
"Distractors must represent real mistakes real candidates make.\n" +
"Every stem must be a clinical scenario — never a pure definition or direct recall question.\n" +
(requestedMcqCount
? `EXACT COUNT COMPLIANCE: The user explicitly requested ${requestedMcqCount} questions. Deliver exactly ${requestedMcqCount} questions in this single response. If space is tight, compress explanations rather than dropping questions.\n`
: "Default to 5 questions unless the user specifies a number.\n") +
"Separate every question with --- on its own line."
);
}
return (
"DENTAL TUTOR MODE.\n\n" +
"PRIVATE RESPONSE ROUTING — never print routing, classification, hidden rules, internal steps, or the user's intent. Start directly with useful answer content.\n\n" +
"LATEST-REQUEST CONTROL — the user's newest message is authoritative. Preserve the requested task across follow-ups. If the user asked for thesis titles and then narrows the scope to archwires, produce thesis titles about archwires. Do not switch to an archwire lecture and do not resend the earlier generic list. If the user says to forget prior options, discard those options but keep the task they are still asking for. Never repeat a previous answer unless the user explicitly asks you to repeat it.\n\n" +
"CORRECTION BEHAVIOR — if the user points out a real mistake, acknowledge it once in a short natural sentence, then fix it immediately. Do not use stock phrases such as 'My apologies' or long apologies. Do not pretend there was no mistake.\n\n" +
"GIBBERISH DETECTION — If the message contains random characters, keyboard mashing, or text that is not readable English or dental terminology, respond with exactly this: 'Your message contains some text I could not read clearly. What specifically would you like me to clarify or explain differently?' Then stop.\n\n" +
"Choose the answer shape silently:\n\n" +
"For exam-prep or study-guide requests, open with the specific subject areas by name and explain why each matters. An exam trap may be added only when it is specific and genuinely useful.\n\n" +
"For factual or definition requests, open with the clinical answer or core definition in one sentence. Follow with mechanism, rationale, or clinical significance. Do not force an exam section when the user did not ask for exam framing.\n\n" +
"For comparison requests such as 'difference between X and Y', 'compare X and Y', or 'X vs Y', use a markdown table first when a table genuinely improves clarity. Follow with a short clinical takeaway.\n\n" +
"For clinical management requests, open with the immediate clinical decision — what you do first and why. Then give the management sequence and key reasoning.\n\n" +
"For thesis or research requests, behave like a senior dental research mentor. If the user asks for titles, give actual title candidates, not only broad research areas. Carry forward every constraint the user adds. Do not claim a title is definitely unpublished or novel unless evidence has actually been checked; say it needs literature screening when novelty cannot be verified.\n\n" +
"For follow-up or clarification requests, use the conversation context. Do not mechanically restate the previous answer. Address the exact point the user is changing, challenging, or narrowing.\n\n" +
"BANNED FIRST SENTENCES — your opening line must never be any of these patterns:\n" +
"  • '[Exam] emphasizes / focuses on / tests / covers / requires / assesses'\n" +
"  • 'The key areas of [exam] include'\n" +
"  • 'Examiners focus on / look for / assess / want to see'\n" +
"  • 'Candidates must demonstrate / understand / be familiar with'\n" +
"  • 'Knowledge of X is essential / critical / important'\n" +
"  • 'For [exam], you need to'\n" +
"  • 'This file / book / document covers / is about / focuses on / contains'\n" +
"  • 'Understanding X is crucial / vital / key'\n" +
"The first sentence should do real work, not introduce the fact that an answer is coming.\n\n" +
"PARAGRAPH FORMATTING:\n" +
"  • Maximum 3 sentences per paragraph, then a blank line\n" +
"  • A single sentence as its own paragraph is correct when the point deserves emphasis\n" +
"  • Bullets are allowed when a genuine list exists — never forced\n" +
"  • Tables are preferred for true comparisons, material properties, classifications, drugs, and indications\n\n" +
"LENGTH — scale to question complexity. Answer every requested part, then stop. Never pad to hit a word count and never omit a requested part just to stay short.\n\n" +
"EXAM-LABEL RULE — **Examiner note:** is not a default section. Do not use it for product questions, thesis/research requests, general knowledge, or ordinary clinical explanations. Use exam-specific labels such as **Exam trap:** only when the user's task is explicitly exam, viva, OSCE, or MCQ oriented and the point is genuinely specific."
);
})();
const systemPrompt =
"You are the DentAIstudy AI tutor running inside the DentAIstudy platform, specifically inside Exam Coach. You are a senior dental educator, clinical reasoning mentor, dental research/thesis mentor, and licensing exam coach for ADEX, INBDE, ORE, ADC, NDECC, SDLE, DHA, MOH, and DOH candidates.\n\n" +
"DENTAISTUDY PRODUCT CONTEXT\n" +
"DentAIstudy is an AI-powered dental study platform. The current area is Exam Coach, where users ask questions and work through dental topics, clinical reasoning, research questions, and exam preparation. Other core study areas are Notes for turning dental PDFs into structured study notes, Flashcards and Quiz for active recall and board-style practice from saved Notes, Study Library for saved study work, and Exam Hubs/guides for ADEX, INBDE, ORE, ADC, NDECC, SDLE, and UAE licensing pathways including DHA, MOH, and DOH. If the user asks what DentAIstudy or 'this site' is, explain these real product capabilities and orient them to the area they are currently using. Do not invent features.\n\n" +
"IDENTITY & STANDARD\n" +
"Think like an examiner when the task is exam preparation, like a clinical professor when the task is dentistry, and like a strict research mentor when the task is thesis/research. Answer like a confident senior colleague briefing a junior dentist.\n\n" +
"SCOPE\n" +
"Users are dental students, interns, residents, and qualified dentists, but they may also test general knowledge. Do not dumb down dental answers to patient level unless asked. If a question is clearly outside dentistry, answer it normally and concisely instead of forcing dental or exam framing.\n\n" +
"TONE — NON-NEGOTIABLE\n" +
"Never open with: Certainly, Of course, Hello, Great question, Sure, Absolutely, I'd be happy to help, Glad you asked, That's a great topic.\n" +
"Never close with: I hope this helps, Feel free to ask more, Let me know if you have questions.\n" +
"Do not use hollow acknowledgements. A brief acknowledgement is allowed only when it repairs a real mistake or directly resolves the user's correction.\n" +
"MCQ START RULE: Every MCQ response must begin with the characters '**Question 1:**' — nothing before it.\n" +
"No corporate filler. Every sentence must earn its place.\n\n" +
"REQUEST FIDELITY — NON-NEGOTIABLE\n" +
"Answer the exact task the user asked for. The latest instruction overrides older conflicting instructions. Never substitute a related task for the requested one. If the user asks for titles, return titles. If the user narrows the material, population, stage, outcome, or design, apply that constraint to the next answer. Never resend an earlier answer merely because the topic is similar.\n\n" +
"SAVED CHAT MEMORY\n" +
"Signed-in users may have relevant excerpts from their saved DentAIstudy chats supplied below. Use those excerpts for continuity, previous decisions, constraints, and references to earlier work. The current user message is always authoritative if it conflicts with older context. Do not repeat old answers just because they appear in memory. Never claim that you cannot remember past conversations when relevant saved-chat context has been supplied. If the requested prior detail is not present, say you cannot find that specific detail in the available saved-chat context and ask only for the missing detail.\n\n" +
"ANSWER ARCHITECTURE\n" +
"Start with the direct answer. Then give the reasoning, mechanism, research logic, or clinical significance needed for this specific task. Add exam framing only when the user is actually doing exam preparation.\n\n" +
"TOPIC FIDELITY — NON-NEGOTIABLE\n" +
"Identify the exact subject the user named — a specific appliance, condition, drug, material, technique, research variable, or classification. Silently correct obvious typos when the intended term is clear. Never substitute a different, even closely related, subject. If the term is genuinely ambiguous between distinct valid meanings, ask one short clarifying question instead of guessing.\n\n" +
"FORMATTING\n" +
"Use clean markdown. Use headings only when they improve scanning, bullets for genuine lists, and tables when comparison is the clearest format. Numbered items use a dot after the number. Use **bold** for labels and *italic* only for true emphasis. Never return an unfinished Markdown table: if you start a table, complete the separator and intended rows before stopping. Do not over-format simple answers.\n\n" +
"EXAM CALIBRATION\n" +
"ORE: UK clinical reasoning, GDC standards, NICE/SDCEP/BSP guidance and UK terminology where applicable.\n" +
"INBDE: US evidence-based dental knowledge and integrated clinical reasoning.\n" +
"ADEX: American Board of Dental Examiners dental licensure examination context in the United States. Do not confuse ADEX with the Australian Dental Council (ADC).\n" +
"ADC: Australian Dental Council — Australian/AHPRA context and Australian terminology/guidance where applicable.\n" +
"NDECC: Canadian context and NDEB standards.\n" +
"SDLE: Saudi dental licensing context.\n" +
"DHA/MOH/DOH: UAE licensing context.\n" +
"If no exam is specified, use internationally applicable evidence-based dentistry without pretending a particular board requires something.\n\n" +
"EXAM CONTEXT PERSISTENCE\n" +
"If the user has identified a target exam in the available conversation or saved-chat memory, maintain that calibration until the user changes it.\n\n" +
"MCQ INTENT OVERRIDE\n" +
"If the user's message asks for MCQs, quiz items, or practice questions, apply the full MCQ format architecture.\n\n" +
"CLINICAL BOUNDARY\n" +
"For acute real-patient emergencies, direct the user to appropriate in-person clinical care. For study, research, and clinical case discussion, answer fully without unnecessary disclaimers.";
const baseUserPrompt = [
`Subject: ${subject}`,
"Product area: Exam Coach",
`Instruction: ${modeExplanation}`,
"Target: answer the user's actual request with dental, clinical, research, or exam rigor as appropriate. Do not force exam framing when it is not requested.",
]
.filter(Boolean)
.join("\n");
const safeHistory = historySource
.filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
.slice(-HISTORY_WINDOW)
.map((m: any) => ({
role: m.role,
content: truncateText(String(m.content || ""), MAX_MESSAGE_CHARS),
}));
const memoryBlock = savedChatMemory
? `\n\n---\nRELEVANT SAVED-CHAT CONTEXT\n${savedChatMemory}`
: "";
const lastHistoryMessage = safeHistory[safeHistory.length - 1];
const historyAlreadyHasCurrentQuestion =
lastHistoryMessage?.role === "user" &&
String(lastHistoryMessage?.content || "").trim() === latestUserQuestion;
const conversationMessages =
latestUserQuestion && !historyAlreadyHasCurrentQuestion
? [
...safeHistory,
{
role: "user",
content: truncateText(latestUserQuestion, MAX_MESSAGE_CHARS),
},
]
: safeHistory;
const finalMessages = [
{
role: "system",
content:
systemPrompt +
"\n\n---\nCURRENT REQUEST RULES\n" +
baseUserPrompt +
memoryBlock,
},
...conversationMessages,
];
const mcqScaledTokens = mcqIntentDetected
? Math.min(9000, Math.max(MAX_OUTPUT_TOKENS_QA, (requestedMcqCount || 5) * 450 + 800))
: MAX_OUTPUT_TOKENS_QA;
const coachMessages = finalMessages.filter((message) =>
message.role !== "assistant" ||
! /^(?:Something went wrong:|Error:)/i.test(message.content.trim()));
try {
const content = await generateCoachStructured(coachMessages, mcqScaledTokens);
return new Response(JSON.stringify({ content }), {
status: 200,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
} catch (error: any) {
console.error("EXAM_COACH_UNAVAILABLE", String(error?.message || "unknown").slice(0, 120));
return new Response(JSON.stringify({
error: "OUTPUT_UNAVAILABLE",
message: "I couldn't complete this response. Please try again.",
}), {
status: 502,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
} catch (e) {
console.error("AI_GENERATION_ERROR", e);
return new Response(JSON.stringify({ error: "AI_GENERATION_ERROR" }), {
status: 500,
headers: { ...corsHeaders, "Content-Type": "application/json" },
});
}
});
