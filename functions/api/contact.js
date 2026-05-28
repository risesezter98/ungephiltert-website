// Cloudflare Pages Function — POST /api/contact
// Sendet Notification an Philipp + Bestätigung an den Absender via Brevo API.
// Voraussetzung: BREVO_API_KEY ist in Cloudflare Pages Settings (Environment Variables) gesetzt.
// Sender-Mail muss in Brevo verifiziert sein.

// PFLICHT-ANPASSUNG VOR DEPLOYMENT:
//   OWNER_EMAIL  → Philipps echte E-Mail (wo Anfragen ankommen)
//   SENDER_EMAIL → in Brevo verifizierte Absender-Adresse
//   OWNER_NAME   → "Philipp"
const OWNER_EMAIL = "rubenpfeiffer.1104@gmail.com";   // TEST: spaeter auf Philipps Mail wechseln
const SENDER_EMAIL = "media@ungephiltert.de";  // Brevo-verifiziert (Philipp's Mailbox via all-inkl + Gmail)
const OWNER_NAME = "Philipp";
const SITE_NAME = "ungephiltert.";

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const data = await request.json();
    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const message = (data.message || "").trim();

    // Basis-Validierung
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Bitte alle Felder ausfüllen." }),
        { status: 400, headers }
      );
    }

    // Einfache E-Mail-Plausibilität
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Ungültige E-Mail-Adresse." }),
        { status: 400, headers }
      );
    }

    const BREVO_API_KEY = env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY nicht gesetzt");
      return new Response(
        JSON.stringify({ error: "Server-Konfigurationsfehler." }),
        { status: 500, headers }
      );
    }

    // ============ Mail 1 — Notification an Philipp ============
    const notificationEmail = {
      sender: { name: SITE_NAME, email: SENDER_EMAIL },
      to: [{ email: OWNER_EMAIL, name: OWNER_NAME }],
      replyTo: { email: email, name: name },
      subject: `Neue Website-Eintragung — ${name}`,
      htmlContent: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0f0d0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0d0b;">
            <tr><td align="center" style="padding:40px 16px;">

              <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">

                <tr><td style="background:#0f0d0b;padding:22px 32px;border-bottom:2px solid #E8652B;">
                  <table role="presentation" width="100%"><tr>
                    <td style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-.02em;">ungephiltert<span style="color:#E8652B;">.</span></td>
                    <td align="right" style="color:rgba(255,255,255,.5);font-size:10px;font-family:'SF Mono',Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;">Website · Eintragung</td>
                  </tr></table>
                </td></tr>

                <tr><td style="padding:32px 32px 8px;">
                  <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:700;">Von</p>
                  <h1 style="margin:0 0 4px;font-size:24px;color:#111;font-weight:800;letter-spacing:-.02em;">${escapeHtml(name)}</h1>
                  <p style="margin:0;font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#E8652B;text-decoration:none;font-weight:600;">${escapeHtml(email)}</a></p>
                </td></tr>

                <tr><td style="padding:24px 32px 8px;">
                  <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:700;">Nachricht</p>
                  <div style="padding:22px 24px;background:#faf8f5;border-left:3px solid #E8652B;border-radius:6px;">
                    <p style="margin:0;font-size:15px;line-height:1.75;color:#222;">${escapeHtml(message).replace(/\n/g, "<br>")}</p>
                  </div>
                </td></tr>

                <tr><td style="padding:28px 32px 36px;" align="center">
                  <a href="mailto:${escapeHtml(email)}?subject=Re: Deine Nachricht auf ungephiltert" style="display:inline-block;background:#E8652B;color:#fff;padding:14px 38px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.01em;">Direkt antworten</a>
                </td></tr>

                <tr><td style="background:#0f0d0b;padding:14px 32px;text-align:center;">
                  <p style="margin:0;color:rgba(255,255,255,.4);font-size:11px;letter-spacing:.5px;">Gesendet via Kontaktformular auf ungephiltert.de</p>
                </td></tr>

              </table>

            </td></tr>
          </table>
        </body></html>
      `,
      textContent: `Neue Website-Eintragung\n\nVon: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
    };

    // ============ Mail 2 — Bestätigung an Absender ============
    const firstName = name.split(/\s+/)[0];
    const confirmationEmail = {
      sender: { name: SITE_NAME, email: SENDER_EMAIL },
      to: [{ email: email, name: name }],
      replyTo: { email: SENDER_EMAIL, name: OWNER_NAME },
      subject: "Hab deine Nachricht — ungephiltert.",
      htmlContent: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0f0d0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f5f1ea;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0d0b;">
            <tr><td align="center" style="padding:48px 16px;">

              <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

                <tr><td align="center" style="padding:0 0 40px;">
                  <span style="font-size:26px;font-weight:800;letter-spacing:-.02em;color:#fff;">ungephiltert<span style="color:#E8652B;">.</span></span>
                </td></tr>

                <tr><td style="background:#15110d;border:1px solid rgba(232,101,43,.18);border-radius:18px;padding:48px 40px 40px;">

                  <p style="margin:0 0 18px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#E8652B;font-weight:700;">Angekommen</p>

                  <h1 style="margin:0 0 22px;font-size:30px;color:#fff;font-weight:800;letter-spacing:-.02em;line-height:1.15;">Hey ${escapeHtml(firstName)} —<br>danke für deine Nachricht.</h1>

                  <p style="font-size:16px;line-height:1.75;color:#cfc7bb;margin:0 0 14px;">Ich hab sie gesehen, schau sie mir in Ruhe an und meld mich bei dir. Meistens innerhalb von ein, zwei Tagen — ich bin viel draußen mit Kamera unterwegs.</p>

                  <p style="font-size:16px;line-height:1.75;color:#cfc7bb;margin:0 0 32px;">Bis dahin — wenn du sehen willst, was ich gerade so mache, schau gern auf Instagram vorbei.</p>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td>
                    <a href="https://www.instagram.com/ungphiltert/" style="display:inline-block;background:#E8652B;color:#fff;padding:15px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.01em;">Auf Instagram folgen</a>
                  </td></tr></table>

                  <div style="margin:36px 0 0;padding:24px 0 0;border-top:1px solid rgba(255,255,255,.08);">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#cfc7bb;">Bis gleich,</p>
                    <p style="margin:4px 0 0;font-size:17px;line-height:1.7;color:#fff;font-weight:700;letter-spacing:-.01em;">Philipp</p>
                  </div>

                </td></tr>

                <tr><td align="center" style="padding:28px 0 0;">
                  <p style="margin:0;color:rgba(255,255,255,.35);font-size:11px;letter-spacing:1px;text-transform:uppercase;">ungephiltert · Video Creator</p>
                </td></tr>

              </table>

            </td></tr>
          </table>
        </body></html>
      `,
      textContent: `Hey ${firstName},\n\ndanke für deine Nachricht. Ich hab sie gesehen, schau sie mir in Ruhe an und meld mich bei dir — meistens innerhalb von ein, zwei Tagen.\n\nBis dahin: wenn du sehen willst was ich gerade so mache, schau gern auf Instagram vorbei.\nhttps://www.instagram.com/ungphiltert/\n\nBis gleich,\nPhilipp\nungephiltert.`,
    };

    // ============ Beide Mails parallel via Brevo API senden ============
    const brevoUrl = "https://api.brevo.com/v3/smtp/email";
    const brevoHeaders = {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    };

    const [notifResult, confirmResult] = await Promise.all([
      fetch(brevoUrl, { method: "POST", headers: brevoHeaders, body: JSON.stringify(notificationEmail) }),
      fetch(brevoUrl, { method: "POST", headers: brevoHeaders, body: JSON.stringify(confirmationEmail) }),
    ]);

    if (!notifResult.ok || !confirmResult.ok) {
      const errText = !notifResult.ok ? await notifResult.text() : await confirmResult.text();
      console.error("Brevo API error:", errText);
      return new Response(
        JSON.stringify({ error: "Mail-Versand fehlgeschlagen." }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(
      JSON.stringify({ error: "Interner Server-Fehler." }),
      { status: 500, headers }
    );
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Mini-HTML-Escape gegen Injection in den Mail-Templates
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
