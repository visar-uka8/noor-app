import { getSharedPassportByToken } from "@/lib/health-passport-share-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return Response.json({ error: "Token fehlt." }, { status: 400 });
    }

    const result = await getSharedPassportByToken(token);

    if ("error" in result) {
      const message = result.error;
      const status = message.includes("abgelaufen")
        ? 410
        : message.includes("ungültig") || message.includes("nicht gefunden")
          ? 404
          : 503;

      return Response.json({ error: message }, { status });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Health passport share load failed", error);

    return Response.json(
      { error: "Notfall-Daten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
