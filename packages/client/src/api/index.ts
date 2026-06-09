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

export async function fetchSubtitle(id: number) {
  const res = await fetch(`${BASE}/subtitles/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<{
    id: number;
    englishText: string | null;
    chineseText: string | null;
    listeningId: number;
  }>;
}
