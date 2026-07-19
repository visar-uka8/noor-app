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
      const status =
        result.code === "expired"
          ? 410
          : result.code === "invalid" || result.code === "missing"
            ? 404
            : 503;

      return Response.json(
        { error: result.error, code: result.code },
        { status },
      );
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
