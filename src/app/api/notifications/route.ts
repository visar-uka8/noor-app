import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type NotificationPayload = {
  user_id?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NotificationPayload;
    const notification = normalizeNotification(payload);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({
        stored: false,
        reason: "Supabase ist lokal noch nicht konfiguriert.",
        notification,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("notifications").insert(notification);

    if (error) {
      throw error;
    }

    return Response.json({ stored: true, notification });
  } catch (error) {
    console.error("Notification creation failed", error);

    return Response.json(
      { error: "Benachrichtigung konnte gerade nicht erstellt werden." },
      { status: 500 },
    );
  }
}

function normalizeNotification(payload: NotificationPayload) {
  if (
    typeof payload.user_id !== "string" ||
    typeof payload.type !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string"
  ) {
    throw new Error("Invalid notification payload.");
  }

  return {
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    created_at: new Date().toISOString(),
    read_at: null,
  };
}
