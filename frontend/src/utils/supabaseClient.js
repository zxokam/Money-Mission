import { createClient } from "@supabase/supabase-js";
import { loginUser } from "./api";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function loginWithUsername(username) {
  const data = await loginUser(username);
  if (!data) return null;
  const user = { id: data.id, username: data.username };
  localStorage.setItem("mm_user", JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem("mm_user");
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("mm_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
