const BASE = "/api";

export async function fetchListenings() {
  const res = await fetch(`${BASE}/listening`);
  return res.json();
}

export async function fetchListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`);
  return res.json();
}

export async function fetchSentenceAnalysis(subtitleId: number) {
  const res = await fetch(`${BASE}/analysis/${subtitleId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
