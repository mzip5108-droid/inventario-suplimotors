import { createClient } from '@supabase/supabase-js';

// PON TUS DATOS AQUÍ:
const supabaseUrl = 'https://wttbjctycyfrpvvwomyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGJqY3R5Y3lmcnB2dndvbXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NzYyNjUsImV4cCI6MjEwNjI1MjI2NX0.NchIV1Gu9Dv4uPySHAjRIrmkx4X4GXELZRgDpvh2Now';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function obtenerTodos() {
  const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function registrarItem({ nombre, categoria, cantidad, estante, repisa, seccion }) {
  const { data, error } = await supabase.from('items').insert([{ nombre, categoria, cantidad, estante, repisa, seccion }]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function buscarItemPorCodigo(codigo) {
  const { data, error } = await supabase.from('items').select('*').eq('codigo', codigo).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function eliminarItem(codigo) {
  const { error } = await supabase.from('items').delete().eq('codigo', codigo);
  if (error) { console.error(error); return false; }
  return true;
}

export async function actualizarUbicacion(codigo, estante, repisa, seccion) {
  const { data, error } = await supabase.from('items').update({ estante, repisa, seccion }).eq('codigo', codigo).select().single();
  if (error) throw new Error(error.message);
  return data;
}
