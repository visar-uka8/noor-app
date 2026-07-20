import { resumeRegistration } from "@/lib/resume-registration";

export const runtime = "nodejs";

type ResumeRegistrationPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ResumeRegistrationPayload;

    if (
      typeof payload.email !== "string" ||
      typeof payload.password !== "string"
    ) {
      return Response.json(
        { error: "Bitte E-Mail und Passwort eingeben." },
        { status: 400 },
      );
    }

    const result = await resumeRegistration({
      email: payload.email,
      password: payload.password,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 401 });
    }

    return Response.json({
      ok: true,
      complete: result.complete,
    });
  } catch (error) {
    console.error("[resume-registration] failed", error);

    return Response.json(
      { error: "Registrierung konnte nicht fortgesetzt werden." },
      { status: 500 },
    );
  }
}
