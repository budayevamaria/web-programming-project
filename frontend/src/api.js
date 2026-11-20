const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.details?.[0]?.replace(/^[^:]+: /, '') || data.error || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const kzt = (n) => `${Number(n).toLocaleString('ru-RU')} ₸`;
export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
