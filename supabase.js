// supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wttbjctycyfrpvvwomyz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7EyzMPk1wVPA5XWn46A9Xw_ymVftA-E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// FUNCIONES DE INVENTARIO
// ============================================

// Registrar un item nuevo
export async function registrarItem({ nombre, categoria, cantidad, estante, repisa = 0, seccion = 'A' }) {
  const codigo = 'FERR-' + Math.floor(1000 + Math.random() * 9000);

  const { data, error } = await supabase
    .from('items')
    .insert([{ codigo, nombre, categoria, cantidad, estante, repisa, seccion }])
    .select();

  if (error) {
    console.error(' Error al registrar:', error.message);
    return null;
  }

  console.log(' Item registrado:', data[0]);
  return data[0];
}

// Buscar un item por su código
export async function buscarItemPorCodigo(codigo) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('codigo', codigo)
    .single();

  if (error) {
    console.warn(' Item no encontrado:', codigo);
    return null;
  }

  console.log(' Item encontrado:', data);
  return data;
}

// Obtener todos los items (para ver el inventario completo)
export async function obtenerTodos() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(' Error al obtener items:', error.message);
    return [];
  }

  return data;
}
// Eliminar un item por su código
export async function eliminarItem(codigo) {
  const { data, error } = await supabase
    .from('items')
    .delete()
    .eq('codigo', codigo)
    .select();

  if (error) {
    console.error(' Error al eliminar:', error.message);
    return false;
  }

  console.log(' Item eliminado:', codigo);
  return true;
}
// Actualizar la ubicación de un item
export async function actualizarUbicacion(codigo, estante, repisa, seccion) {
  const { data, error } = await supabase
    .from('items')
    .update({ estante, repisa, seccion })
    .eq('codigo', codigo)
    .select();

  if (error) {
    console.error(' Error al actualizar ubicación:', error.message);
    return null;
  }

  console.log(' Ubicación actualizada:', data[0]);
  return data[0];
}