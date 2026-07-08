import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const expiredMessage =
  "Dieser Code ist abgelaufen. Bitte fordern Sie einen neuen an.";
const invalidMessage = "Ungültiger Code. Bitte überprüfen Sie die Eingabe.";

type AcceptInvitationPayload = {
  code?: unknown;
};

type StoredInvitation = {
  code: string;
  patient_id: string;
  expires_at: string;
  status: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AcceptInvitationPayload;
    const code = normalizeCode(payload.code);
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      if (code === "000000") {
        return Response.json({ error: expiredMessage }, { status: 410 });
      }

      if (!/^\d{6}$/.test(code)) {
        return Response.json({ error: invalidMessage }, { status: 404 });
      }

      return Response.json({
        connected: true,
        patientId: "hans-leka-demo",
        dashboardUrl: "/dashboard",
      });
    }

    const { data, error } = await supabase
      .from("family_invitations")
      .select("code, patient_id, expires_at, status")
      .eq("code", code)
      .maybeSingle<StoredInvitation>();

    if (error) throw error;

    if (!data || data.status !== "pending") {
      return Response.json({ error: invalidMessage }, { status: 404 });
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      await supabase
        .from("family_invitations")
        .update({ status: "expired" })
        .eq("code", code);

      return Response.json({ error: expiredMessage }, { status: 410 });
    }

    const { error: updateError } = await supabase
      .from("family_invitations")
      .update({ status: "accepted" })
      .eq("code", code);

    if (updateError) throw updateError;

    return Response.json({
      connected: true,
      patientId: data.patient_id,
      dashboardUrl: "/dashboard",
    });
  } catch (error) {
    console.error("Family invitation acceptance failed", error);

    return Response.json(
      { error: "Verbindung konnte gerade nicht hergestellt werden." },
      { status: 500 },
    );
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function normalizeCode(code: unknown) {
  if (typeof code !== "string") {
    throw new Error("Invitation code is required.");
  }

  return code.replace(/\D/g, "").slice(0, 6);
}
