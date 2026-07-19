import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function createCookieSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from Server Components where cookies cannot be set.
          }
        },
      },
    },
  );
}

function createBearerSupabaseClient(accessToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}

export async function getAuthenticatedSupabase(request: Request): Promise<{
  supabase: SupabaseClient;
  user: User | null;
  authError: Error | null;
}> {
  const cookieStore = await cookies();
  const cookieClient = createCookieSupabaseClient(cookieStore);
  const {
    data: { user: cookieUser },
    error: cookieError,
  } = await cookieClient.auth.getUser();

  if (cookieUser) {
    return { supabase: cookieClient, user: cookieUser, authError: null };
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (token) {
    const {
      data: { user: tokenUser },
      error: tokenError,
    } = await cookieClient.auth.getUser(token);

    if (tokenUser) {
      return {
        supabase: createBearerSupabaseClient(token),
        user: tokenUser,
        authError: null,
      };
    }

    return {
      supabase: cookieClient,
      user: null,
      authError: tokenError ?? cookieError,
    };
  }

  return {
    supabase: cookieClient,
    user: null,
    authError: cookieError ?? new Error("No session"),
  };
}

export async function getAuthenticatedUser(request: Request): Promise<{
  user: User | null;
  authError: Error | null;
}> {
  const { user, authError } = await getAuthenticatedSupabase(request);
  return { user, authError };
}
