/**
 * NELB API client — typed wrappers for the three agent endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Types ---

export interface JobLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface AllocationRequest {
  job_category: string;
  description: string;
  budget: number;
  location: JobLocation;
  radius_km?: number;
  exclude_worker_id?: string;
}

export interface WorkerScore {
  worker_id: string;
  worker_name: string;
  skill_score: number;
  reliability_score: number;
  distance_score: number;
  fairness_score: number;
  budget_score: number;
  estimated_price: number;
  composite_score: number;
  distance_km: number;
  skills: string[];
  recent_jobs_7d: number;
}

export interface ReasoningStep {
  step: number;
  name: string;
  description: string;
  candidates_before: number;
  candidates_after: number;
  eliminated: string[];
}

export interface AllocationResponse {
  recommendations: WorkerScore[];
  reasoning_trace: ReasoningStep[];
  explanation: string;
  confidence: number;
  total_candidates_evaluated: number;
  citations: Array<{ index: number; filename: string; content: string }>;
}

export interface RecallRequest {
  worker_id: string;
  query: string;
}

export interface JobRecord {
  job_id: string;
  client_name: string;
  category: string;
  description: string;
  location: string;
  completed_at: string;
  rating: number | null;
  notes: string;
}

export interface RecallResponse {
  answer: string;
  records: JobRecord[];
  query_interpreted: string;
}

export interface AssistRequest {
  worker_id: string;
  question: string;
  job_context?: string;
}

export interface AssistResponse {
  answer: string;
  source: string;
  category: string;
  citations: Array<{ index: number; filename: string; content: string }>;
}

// --- API functions ---

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json();
}

/** Brain 1 — Allocate job and get ranked worker recommendations. */
export async function allocateJob(
  request: AllocationRequest
): Promise<AllocationResponse> {
  return post<AllocationResponse>("/api/agent/allocate", request);
}

/** Brain 2 — Recall job history with natural language query. */
export async function recallMemory(
  request: RecallRequest
): Promise<RecallResponse> {
  return post<RecallResponse>("/api/agent/recall", request);
}

/** Brain 3 — Ask a work-related question. */
export async function workAssist(
  request: AssistRequest
): Promise<AssistResponse> {
  return post<AssistResponse>("/api/agent/assist", request);
}

// --- Agent /run endpoint (unified natural language interface) ---

export interface RunRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  worker_id?: string;
  job_context?: string;
}

export interface RunResponse {
  tool_used: string;
  response: string;
  raw_result: AllocationResponse | RecallResponse | AssistResponse | ProfileResponse | null;
}

/** Unified agent endpoint — send natural language, agent decides which tool to call. */
export async function runAgent(request: RunRequest): Promise<RunResponse> {
  return post<RunResponse>("/api/agent/run", request);
}

// --- Profile Lookup ---

export interface ProfileResponse {
  worker_id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  reliability_score: number;
  latitude: number;
  longitude: number;
  address: string;
  is_available: boolean;
  total_jobs: number;
  recent_jobs_7d: number;
  average_rating: number | null;
}

/** Brain 4 — Look up a worker's profile from the database. */
export async function profileLookup(worker_id: string): Promise<ProfileResponse> {
  return post<ProfileResponse>("/api/agent/profile", { worker_id });
}
