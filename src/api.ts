export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export async function getStatus(): Promise<{ live: boolean; model: string }> {
  try {
    const res = await fetch('/api/status');
    return await res.json();
  } catch {
    return { live: false, model: 'offline' };
  }
}
