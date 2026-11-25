import { createSupabaseContext } from "npm:@supabase/server@1.9.2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";
const MAX_BODY_CHARS = 28_000;
const MAX_TEXT_CHARS = 4_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const sourceNotes = [
  {
    id: "PROFFIT_2025_CH15_ALIGNMENT",
    label: "Proffit 2025 · Chapter 15 · Alignment",
    note:
      "Initial alignment should favor light continuous forces and flexible archwires. Early alignment mainly corrects crown displacement/tipping; archwire travel and unwanted incisor advancement are mechanics concerns that require control.",
  },
  {
    id: "PROFFIT_2025_CH9_SLIDING",
    label: "Proffit 2025 · Chapter 9 · Resistance to sliding",
    note:
      "During sliding, bracket-wire binding rapidly becomes a major component of resistance as angulation develops. Wire-bracket contact is also needed for rotation and root-position control, so sliding mechanics always involve a balance between clearance, binding and control.",
  },
  {
    id: "PROFFIT_2025_CH8_9_ANCHORAGE",
    label: "Proffit 2025 · Chapters 8–9 · Anchorage",
    note:
      "Anchorage is case-specific. Reinforcement works by enlarging the anchorage unit and distributing reaction force over more periodontal ligament area. Excessive force undermines differential anchorage; light controlled force is important.",
  },
  {
    id: "PROFFIT_2025_CH16_SPACE_CLOSURE",
    label: "Proffit 2025 · Chapter 16 · Space closure",
    note:
      "Sliding and closing-loop mechanics are the two major fixed-appliance approaches to extraction-space closure. Sliding requires a suitably rigid undersized rectangular wire and encounters resistance to sliding; closing loops avoid sliding resistance but require deliberate force/moment and root-paralleling control.",
  },
  {
    id: "PROFFIT_2025_CH16_TWO_STEP",
    label: "Proffit 2025 · Chapter 16 · Two-step closure",
    note:
      "For moderate anchorage with a 0.022-inch appliance, a predictable two-step approach is canine retraction on a rectangular steel wire with a posterior stop, followed by incisor retraction. The posterior teeth except the canine can be incorporated into the anchorage unit during canine retraction.",
  },
  {
    id: "PROFFIT_2025_CH16_INTERARCH",
    label: "Proffit 2025 · Chapter 16 · Interarch elastics",
    note:
      "Interarch elastics produce reciprocal effects in both arches. Class II elastic mechanics can advance the mandibular dentition/procline lower incisors and add vertical components including molar/incisor extrusion and occlusal-plane change; stabilizing rectangular wires and attachment choices affect control.",
  },
  {
    id: "PROFFIT_2025_CH20_EXTRUSION",
    label: "Proffit 2025 · Chapter 20 · Controlled extrusion",
    note:
      "Orthodontic extrusion requires an anchor unit plus a flexible force-delivering element. A flexible continuous wire can extrude the target tooth but may tip adjacent teeth toward it; rigid stabilization with a flexible auxiliary improves control.",
  },
] as const;

const allowedSourceIds = new Set(sourceNotes.map((source) => source.id));

const responseSchema = {
  type: "object",
  properties: {
    case_summary: { type: "string" },
    clinical_assessment: { type: "string" },
    supported_points: {
      type: "array",
      items: { type: "string" },
    },
    concerns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issue: { type: "string" },
          why_it_matters: { type: "string" },
          source_ids: { type: "array", items: { type: "string" } },
        },
        required: ["issue", "why_it_matters", "source_ids"],
      },
    },
    alternative_consideration: { type: "string" },
    stage_guidance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stage: { type: "string" },
          active_unit: { type: "string" },
          anchorage_unit: { type: "string" },
          movement_tendency: { type: "string" },
          reciprocal_effects: { type: "string" },
          control_strategy: { type: "string" },
          source_ids: { type: "array", items: { type: "string" } },
        },
        required: [
          "stage",
          "active_unit",
          "anchorage_unit",
          "movement_tendency",
          "reciprocal_effects",
          "control_strategy",
          "source_ids",
        ],
      },
    },
    missing_information: {
      type: "array",
      items: { type: "string" },
    },
    clinician_checks: {
      type: "array",
      items: { type: "string" },
    },
    boundary: { type: "string" },
  },
  required: [
    "case_summary",
    "clinical_assessment",
    "supported_points",
    "concerns",
    "alternative_consideration",
    "stage_guidance",
    "missing_information",
    "clinician_checks",
    "boundary",
  ],
};


const treatmentSuggestionsSchema = {
  type: "object",
  properties: {
    problem_list: { type: "string" },
    goals: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          aims: { type: "string" },
          mechanics: { type: "string" },
          checks: { type: "string" },
          source_ids: { type: "array", items: { type: "string" } },
        },
        required: ["title", "aims", "mechanics", "checks", "source_ids"],
      },
    },
    missing_information: { type: "array", items: { type: "string" } },
  },
  required: ["problem_list", "goals", "options", "missing_information"],
};

type ReviewMode = "diagnosis_draft" | "treatment_suggestions" | "plan_review" | "stage_review";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, max = MAX_TEXT_CHARS) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanStringArray(value: unknown, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 800))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanSourceIds(value: unknown) {
  return cleanStringArray(value, 8).filter((id) => allowedSourceIds.has(id as never));
}

function normalizeTreatmentSuggestions(value: any) {
  return {
    problem_list: cleanText(value?.problem_list, 1700),
    goals: cleanText(value?.goals, 1700),
    options: Array.isArray(value?.options)
      ? value.options.slice(0, 3).map((item: any) => ({
          title: cleanText(item?.title, 180),
          aims: cleanText(item?.aims, 1300),
          mechanics: cleanText(item?.mechanics, 1600),
          checks: cleanText(item?.checks, 1600),
          source_ids: cleanSourceIds(item?.source_ids),
        })).filter((item: any) => item.title && item.aims && item.mechanics)
      : [],
    missing_information: cleanStringArray(value?.missing_information, 10),
  };
}

function normalizeOutput(value: any) {
  const concerns = Array.isArray(value?.concerns)
    ? value.concerns.slice(0, 12).map((item: any) => ({
        issue: cleanText(item?.issue, 800),
        why_it_matters: cleanText(item?.why_it_matters, 1200),
        source_ids: cleanSourceIds(item?.source_ids),
      })).filter((item: any) => item.issue && item.why_it_matters)
    : [];

  const stageGuidance = Array.isArray(value?.stage_guidance)
    ? value.stage_guidance.slice(0, 10).map((item: any) => ({
        stage: cleanText(item?.stage, 200),
        active_unit: cleanText(item?.active_unit, 700),
        anchorage_unit: cleanText(item?.anchorage_unit, 900),
        movement_tendency: cleanText(item?.movement_tendency, 1100),
        reciprocal_effects: cleanText(item?.reciprocal_effects, 1100),
        control_strategy: cleanText(item?.control_strategy, 1100),
        source_ids: cleanSourceIds(item?.source_ids),
      })).filter((item: any) => item.stage)
    : [];

  return {
    case_summary: cleanText(value?.case_summary, 1600),
    clinical_assessment: cleanText(value?.clinical_assessment, 1800),
    supported_points: cleanStringArray(value?.supported_points, 12),
    concerns,
    alternative_consideration: cleanText(value?.alternative_consideration, 1600),
    stage_guidance: stageGuidance,
    missing_information: cleanStringArray(value?.missing_information, 12),
    clinician_checks: cleanStringArray(value?.clinician_checks, 12),
    boundary:
      "Draft clinical decision support only. The clinician controls diagnosis, treatment-plan approval, 3D target approval, mechanics and patient care.",
  };
}

function sanitizeInput(body: any) {
  const mode: ReviewMode =
    body?.mode === "diagnosis_draft" ? "diagnosis_draft" : body?.mode === "treatment_suggestions" ? "treatment_suggestions" : body?.mode === "stage_review" ? "stage_review" : "plan_review";

  return {
    mode,
    case_details: {
      age: cleanText(body?.case_details?.age, 24),
      sex: cleanText(body?.case_details?.sex, 40),
      patient_stage: cleanText(body?.case_details?.patient_stage, 50),
      growth_status: cleanText(body?.case_details?.growth_status, 50),
      chief_complaint: cleanText(body?.case_details?.chief_complaint, 700),
      medical_history: cleanText(body?.case_details?.medical_history, 1000),
      dental_history: cleanText(body?.case_details?.dental_history, 1000),
      clinical_notes: cleanText(body?.case_details?.clinical_notes, 700),
    },
    diagnosis: {
      summary: cleanText(body?.diagnosis?.summary, 1900),
      interpretation: cleanText(body?.diagnosis?.interpretation, 1900),
      information_gaps: cleanText(body?.diagnosis?.information_gaps, 1900),
    },
    gates: {
      diagnosis_approved: body?.gates?.diagnosis_approved === true,
      planning_ready: body?.gates?.planning_ready === true,
      clinical_plan_approved: body?.gates?.clinical_plan_approved === true,
      setup_approved: body?.gates?.setup_approved === true,
    },
    findings: {
      oral_periodontal: cleanText(body?.findings?.oral_periodontal, 1400),
      facial: cleanText(body?.findings?.facial, 1400),
      occlusal: cleanText(body?.findings?.occlusal, 1800),
      cephalometric: cleanText(body?.findings?.cephalometric, 1800),
    },
    plan: {
      problem_list: cleanText(body?.plan?.problem_list, 1800),
      goals: cleanText(body?.plan?.goals, 1800),
      primary_strategy: cleanText(body?.plan?.primary_strategy, 2200),
      alternative_strategy: cleanText(body?.plan?.alternative_strategy, 2200),
    },
    setup: {
      overjet_mm:
        typeof body?.setup?.overjet_mm === "number" ? body.setup.overjet_mm : null,
      overbite_mm:
        typeof body?.setup?.overbite_mm === "number" ? body.setup.overbite_mm : null,
      midline_mm:
        typeof body?.setup?.midline_mm === "number" ? body.setup.midline_mm : null,
      moved_teeth: cleanStringArray(body?.setup?.moved_teeth, 32),
      collision_warning: body?.setup?.collision_warning === true,
    },
    mechanics: {
      power_chain: body?.mechanics?.power_chain === true,
      closed_coil: body?.mechanics?.closed_coil === true,
      interarch_elastics: body?.mechanics?.interarch_elastics === true,
      closing_loop: body?.mechanics?.closing_loop === true,
      stage_summaries: Array.isArray(body?.mechanics?.stage_summaries)
        ? body.mechanics.stage_summaries.slice(0, 10).map((stage: any) => ({
            title: cleanText(stage?.title, 200),
            active_unit: cleanText(stage?.active_unit, 700),
            anchorage_unit: cleanText(stage?.anchorage_unit, 900),
            movement_tendency: cleanText(stage?.movement_tendency, 1000),
            reciprocal_effects: cleanText(stage?.reciprocal_effects, 1000),
            control_strategy: cleanText(stage?.control_strategy, 1000),
          }))
        : [],
    },
  };
}

function enforceGates(input: ReturnType<typeof sanitizeInput>) {
  if (!input.gates.planning_ready) {
    return "Required records and scope screening must be complete before AI clinical review.";
  }

  if (input.mode === "treatment_suggestions" &&
      (!input.gates.diagnosis_approved || !input.diagnosis.summary || !input.diagnosis.interpretation)) {
    return "Approve and complete the clinical diagnosis before requesting treatment suggestions.";
  }

  if (
    input.mode === "stage_review" &&
    (!input.gates.clinical_plan_approved || !input.gates.setup_approved)
  ) {
    return "Stage review requires both Clinical Plan Approval and 3D Setup Approval.";
  }

  return "";
}

async function callGemini(model: string, input: ReturnType<typeof sanitizeInput>) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY_MISSING");

  const sourceBlock = sourceNotes
    .map((source) => `[${source.id}] ${source.label}\n${source.note}`)
    .join("\n\n");

  const systemInstruction = `You are the clinical reasoning layer inside BracketMotion, a conventional fixed-appliance orthodontic planning tool.

NON-NEGOTIABLE BOUNDARIES:
- You provide draft decision support for a qualified clinician.
- When mode is diagnosis_draft: summarize only clinical findings provided by the clinician, distinguish observed findings from unassessed details, and state missing information. Produce case_summary and clinical_assessment as concise editable narrative. Do NOT interpret unseen photographs or radiographs, infer cephalometric landmark coordinates, assign unprovided measurements, claim normality from missing data, or recommend treatment. Keep concerns, checks and missing_information concise. stage_guidance must be empty.
- When mode is treatment_suggestions: prepare up to THREE meaningfully different, case-relevant fixed-appliance treatment suggestions based only on clinician-entered records and the approved clinical diagnosis. Each option must have a short title, aims, mechanics, checks/trade-offs and valid source_ids for mechanics-specific claims. Do not fill three slots with near-duplicates or invented indications. If the supplied evidence supports fewer than three, return fewer and identify what is missing. Never treat uploaded images as visually interpreted: they are not included in the request. Do not invent cephalometric angles, extraction indications, measured arch lengths, treatment duration, biological outcome or exact movement predictions. Do not prescribe a routine mechanic when documented contraindications make it inappropriate.
- You never approve a diagnosis, clinical plan or 3D setup.
- You never output tooth coordinates, rotations, transforms, bracket coordinates, STL edits, or geometry commands.
- You never claim to predict biologic tooth movement, treatment duration, exact force delivery, root resorption, periodontal safety, or treatment outcome from the supplied geometry.
- Use only the structured case data and SOURCE NOTES below for orthodontic mechanics claims.
- When the sources do not support a claim, put the gap in missing_information instead of inventing an answer.
- Every mechanics-specific concern or stage-guidance item must cite one or more source_ids from SOURCE NOTES.
- Do not cite sources that do not support the specific statement.
- The clinician is the only authority who can accept, modify or reject the draft.

SOURCE NOTES:
${sourceBlock}`;

  const prompt = `Review this BracketMotion case in mode "${input.mode}".

${input.mode === "diagnosis_draft"
  ? "Prepare an EDITABLE DIAGNOSTIC DRAFT from only the supplied clinician-entered history and structured findings. Distinguish observed findings from unassessed points. Summarize important occlusal, periodontal, soft-tissue and skeletal findings only when explicitly supported. Do not interpret uploaded photos or radiographs; they are not supplied. Identify missing evidence. Do not generate a treatment plan or mechanics instructions. Keep stage_guidance empty."
  : input.mode === "treatment_suggestions"
    ? "Suggest up to three distinct clinically plausible treatment strategies as EDITABLE alternatives. Use only clinician-entered history, findings and approved diagnosis for indications and risks, and SOURCE NOTES for mechanics claims. Supply concise problem_list, goals, options and missing_information. Do not generate a strategy merely to make three, and do not imply a predicted outcome or clinician approval."
    : "Return concise, clinically useful structured reasoning. Do not repeat the whole input. Identify unsupported assumptions and information gaps."}

CASE DATA:
${JSON.stringify(input)}`;

  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 5000,
      thinkingConfig: { thinkingLevel: "medium" },
      responseMimeType: "application/json",
      responseJsonSchema: input.mode === "treatment_suggestions" ? treatmentSuggestionsSchema : responseSchema,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    const error = new Error(`GEMINI_${response.status}`);
    (error as any).status = response.status;
    (error as any).detail = raw.slice(0, 500);
    throw error;
  }

  const payload = raw ? JSON.parse(raw) : null;
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => String(part?.text ?? ""))
    .join("")
    .trim();

  if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");

  return JSON.parse(text);
}

async function generateReview(input: ReturnType<typeof sanitizeInput>) {
  try {
    return await callGemini(MODEL, input);
  } catch (error: any) {
    const status = Number(error?.status ?? 0);
    if (status === 429 || status >= 500) {
      return await callGemini(FALLBACK_MODEL, input);
    }
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return json({
      ok: true,
      service: "bracketmotion-clinical-reasoning",
      model: MODEL,
      auth: "required for POST",
    });
  }

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const { data: auth, error: authError } = await createSupabaseContext(req, {
    auth: "user",
  });

  if (authError || !auth?.userClaims?.sub) {
    return json(
      {
        error: "AUTH_REQUIRED",
        message: "Sign in is required before sending clinical case data to AI.",
      },
      authError?.status ?? 401,
    );
  }

  const rawBody = await req.text();

  if (!rawBody || rawBody.length > MAX_BODY_CHARS) {
    return json(
      {
        error: "INVALID_BODY",
        message: "The structured clinical payload is missing or too large.",
      },
      413,
    );
  }

  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const input = sanitizeInput(body);
  const gateError = enforceGates(input);

  if (gateError) {
    return json(
      {
        error: "APPROVAL_GATE",
        message: gateError,
      },
      409,
    );
  }

  try {
    const generated = await generateReview(input);
    if (input.mode === "treatment_suggestions") {
      return json({
        suggestions: normalizeTreatmentSuggestions(generated),
        model: MODEL,
        source_catalog: sourceNotes.map(({ id, label }) => ({ id, label })),
        clinician_review_required: true,
        geometry_write_access: false,
      });
    }
    const review = normalizeOutput(generated);

    return json({
      review,
      model: MODEL,
      source_catalog: sourceNotes.map(({ id, label }) => ({ id, label })),
      clinician_review_required: true,
      geometry_write_access: false,
    });
  } catch (error: any) {
    console.error(
      "BRACKETMOTION_GEMINI_ERROR",
      String(error?.message || "unknown").slice(0, 180),
    );

    return json(
      {
        error: "AI_REVIEW_UNAVAILABLE",
        message: "Clinical AI review is temporarily unavailable. The case and approvals remain unchanged.",
      },
      502,
    );
  }
});
