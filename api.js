// api.js — reemplaza a supabase.js
const API = import.meta.env.VITE_API_URL;

if (!API) throw new Error('Falta VITE_API_URL en .env.local');

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function registrarItem({ nombre, categoria, cantidad, estante, repisa = 0, seccion = 'A' }) {
  return request(`${API}/items.php?action=create`, {
    method: 'POST',
    body: JSON.stringify({ nombre, categoria, cantidad, estante, repisa, seccion }),
  });
}

export async function buscarItemPorCodigo(codigo) {
  try {
    return await request(`${API}/items.php?action=get&codigo=${encodeURIComponent(codigo)}`);
  } catch (e) {
    if (e.message.includes('no encontrado')) return null;
    throw e;
  }
}

export async function obtenerTodos() {
  return request(`${API}/items.php?action=list`);
}

export async function eliminarItem(codigo) {
  try {
    await request(`${API}/items.php?action=delete`, {
      method: 'POST',
      body: JSON.stringify({ codigo }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function actualizarUbicacion(codigo, estante, repisa, seccion) {
  return request(`${API}/items.php?action=update-ubicacion`, {
    method: 'POST',
    body: JSON.stringify({ codigo, estante, repisa, seccion }),
  });
}