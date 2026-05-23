const BASE = '/api';

export async function fetchListenings() {
  const res = await fetch(`${BASE}/listening`);
  return res.json();
}

export async function fetchListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`);
  return res.json();
}

export async function createListening(data: any) {
  const res = await fetch(`${BASE}/listening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateListening(id: number, data: any) {
  const res = await fetch(`${BASE}/listening/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteListening(id: number) {
  const res = await fetch(`${BASE}/listening/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function uploadAudio(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload/audio`, { method: 'POST', body: formData });
  return res.json();
}

export async function uploadSubtitle(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload/subtitle`, { method: 'POST', body: formData });
  return res.json();
}
