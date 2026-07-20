import { establishOnboardingSession } from "@/lib/registration-session";

export const runtime = "nodejs";

type OnboardingSessionPayload = {
  email?: unknown;
  password?: unknown;
  userId?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OnboardingSessionPayload;

    if (
      typeof payload.email !== "string" ||
      typeof payload.password !== "string" ||
      typeof payload.userId !== "string"
    ) {
      return Response.json(
        { error: "Anmeldedaten für die Registrierung fehlen." },
        { status: 400 },
      );
    }

    const result = await establishOnboardingSession({
      email: payload.email,
      password: payload.password,
      userId: payload.userId,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 401 });
    }

    return Response.json({ ok: true, alreadySignedIn: result.alreadySignedIn ?? false });
  } catch (error) {
    console.error("[onboarding-session] failed", error);

    return Response.json(
      { error: "Anmeldung nach der Registrierung konnte nicht eingerichtet werden." },
      { status: 500 },
    );
  }
}
