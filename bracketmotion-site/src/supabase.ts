import { createClient, type Session, type User } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hlvkbqpesiqjxbastxux.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Ua-32KrYhA63EESjA0RxsQ_fytQcdE4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type BracketMotionSession = Session;
export type BracketMotionUser = User;

export type BracketMotionCaseSummary = {
  id: string;
  label: string;
  plan_approved: boolean;
  setup_approved: boolean;
  updated_at: string;
  last_opened_at: string;
};

export type BracketMotionCaseRow = BracketMotionCaseSummary & {
  user_id: string;
  records: unknown;
  scope_issue: string;
  plan: unknown;
  scan_state: unknown;
  stage_state: unknown;
  created_at: string;
};

export async function listBracketMotionCases() {
  const { data, error } = await supabase
    .from("bracketmotion_cases")
    .select(
      "id,label,plan_approved,setup_approved,updated_at,last_opened_at",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BracketMotionCaseSummary[];
}

export async function loadBracketMotionCase(caseId: string) {
  const { data, error } = await supabase
    .from("bracketmotion_cases")
    .select(
      "id,user_id,label,records,scope_issue,plan,plan_approved,setup_approved,scan_state,stage_state,created_at,updated_at,last_opened_at",
    )
    .eq("id", caseId)
    .single();

  if (error) throw error;

  await supabase
    .from("bracketmotion_cases")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", caseId);

  return data as BracketMotionCaseRow;
}

export async function createBracketMotionCase(userId: string, label = "Untitled Case") {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bracketmotion_cases")
    .insert({
      user_id: userId,
      label,
      records: {},
      plan: {},
      scan_state: {},
      stage_state: {},
      updated_at: now,
      last_opened_at: now,
    })
    .select(
      "id,user_id,label,records,scope_issue,plan,plan_approved,setup_approved,scan_state,stage_state,created_at,updated_at,last_opened_at",
    )
    .single();

  if (error) throw error;
  return data as BracketMotionCaseRow;
}

export async function saveBracketMotionCase(
  caseId: string,
  patch: {
    label: string;
    records: unknown;
    scope_issue: string;
    plan: unknown;
    plan_approved: boolean;
    setup_approved: boolean;
    scan_state: unknown;
    stage_state: unknown;
  },
) {
  const { error } = await supabase
    .from("bracketmotion_cases")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (error) throw error;
}

export async function uploadBracketMotionScan(
  userId: string,
  caseId: string,
  jaw: "upper" | "lower" | "bite",
  file: File,
) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "stl";
  const path = `${userId}/${caseId}/${jaw}.${extension}`;

  const { error } = await supabase.storage
    .from("bracketmotion-cases")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw error;
  return path;
}

export async function downloadBracketMotionScan(path: string) {
  const { data, error } = await supabase.storage
    .from("bracketmotion-cases")
    .download(path);

  if (error) throw error;
  return data;
}

export async function removeBracketMotionScan(path: string) {
  const { error } = await supabase.storage
    .from("bracketmotion-cases")
    .remove([path]);

  if (error) throw error;
}

export async function invokeBracketMotionClinicalReview(
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(
    "bracketmotion-clinical-reasoning",
    { body: payload },
  );

  if (error) throw error;
  return data;
}
