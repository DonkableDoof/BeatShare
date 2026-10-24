import { createSupabaseApi } from "./supabase";
import { createDemoApi } from "./demo";

/* Supabase when its keys are in .env, otherwise the local demo backend */
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
const configured = /^https:\/\//.test(url) && key.length > 20 && !url.includes("your-project-ref");

export const api = configured ? createSupabaseApi(url, key) : createDemoApi();
export const isDemo = api.mode === "demo";
