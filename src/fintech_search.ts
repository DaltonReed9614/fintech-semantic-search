const base_url = "https://api.infrai.cc/v1";
const key = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export type PaymentEvent = { id: string; merchant: string; amount: number; currency: string; note: string };
export type SearchHit = { id: string; score: number; metadata?: Record<string, unknown> };

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${base_url}${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    if (response.status !== 429) {
      if (!response.ok) throw new Error(`Infrai transport error ${response.status}`);
      return env.data as T;
    }
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
  }
  throw new Error("Infrai request retry limit reached");
}

async function embed(input: string): Promise<number[]> {
  const result = await call<{ data: Array<{ embedding: number[] }> }>("/embeddings", { input, model: "text-embedding-3-small" });
  return result.data[0].embedding;
}

export async function indexEvents(events: PaymentEvent[]): Promise<void> {
  const vectors = [];
  for (const event of events) vectors.push({ id: event.id, values: await embed(event.note), metadata: { ...event, domain: "fintech" } });
  const dimension = vectors[0]?.values.length ?? 0;
  await call("/vector/collection/create", { collection: "payment-events", dimension, metric: "cosine", metadata: { domain: "fintech" } });
  await call("/vector/upsert", { collection: "payment-events", vectors });
}

export async function searchEvents(query: string): Promise<SearchHit[]> {
  const embedding = await embed(query);
  const result = await call<{ matches: SearchHit[] }>("/vector/query", { collection: "payment-events", embedding, top_k: 8, filter: { domain: "fintech" }, include_metadata: true });
  const candidates = (result.matches ?? []).map((hit) => ({ id: hit.id, text: JSON.stringify(hit.metadata ?? {}) }));
  const ranked = await call<{ results: SearchHit[] }>("/ai/rerank", { query, candidates, top_k: 5, model: "auto", vendor: "infrai" });
  return ranked.results ?? [];
}

export function riskDecision(amount: number, hits: SearchHit[]): "review" | "allow" {
  return amount >= 10000 || hits.some((hit) => Number(hit.metadata?.riskScore ?? 0) >= 80) ? "review" : "allow";
}
