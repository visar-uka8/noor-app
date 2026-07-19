type EmailCta = {
  label: string;
  href: string;
};

export function renderNoorEmailHtml(bodyHtml: string, cta?: EmailCta) {
  const ctaHtml = cta
    ? `<p style="margin:28px 0 0;">
        <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 24px;border-radius:12px;">
          ${escapeHtml(cta.label)}
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Noor</title>
  </head>
  <body style="margin:0;padding:0;background:#F7F6F2;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F6F2;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:0.5px solid #E4E2DB;">
            <tr>
              <td style="background:#1D9E75;padding:20px 24px;text-align:center;">
                <span style="color:#ffffff;font-size:24px;font-weight:700;font-family:'DM Sans',Arial,sans-serif;letter-spacing:0.02em;">noor</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;font-family:'DM Sans',Arial,sans-serif;font-size:16px;line-height:1.65;color:#333333;">
                ${bodyHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px;font-family:'DM Sans',Arial,sans-serif;font-size:13px;line-height:1.5;color:#88856F;">
                Diese E-Mail wurde von Noor gesendet. Einstellungen ändern:
                <a href="https://noorhealth.app/settings" style="color:#1D9E75;">noorhealth.app/profil</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function paragraph(text: string) {
  return `<p style="margin:0 0 16px;">${escapeHtml(text)}</p>`;
}

export function signature() {
  return `<p style="margin:24px 0 0;">— Noor</p>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
