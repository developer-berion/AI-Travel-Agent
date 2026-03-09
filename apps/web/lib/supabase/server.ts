import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  assertSupabaseAdminEnabled,
  assertSupabaseEnabled,
} from "@/lib/runtime-config";

export const createRequestSupabaseClient = async () => {
  const config = assertSupabaseEnabled();
  const cookieStore = await cookies();

  return createServerClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            options?: CookieOptions;
            value: string;
          }>,
        ) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );
};

export const createAdminSupabaseClient = () => {
  const config = assertSupabaseAdminEnabled();
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("supabase_service_role_key_missing");
  }

  return createClient(config.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
