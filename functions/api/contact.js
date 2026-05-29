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
      subject: `Neue Website-Eintragung von ${name}`,
      htmlContent: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;">

            <div style="background:#0f0d0b;padding:24px 32px;">
              <table style="width:100%;"><tr>
                <td style="vertical-align:middle;color:#fff;font-size:18px;font-weight:800;letter-spacing:-.02em;">ungephiltert<span style="color:#E8652B;">.</span></td>
                <td style="text-align:right;vertical-align:middle;"><span style="color:rgba(255,255,255,.4);font-size:11px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;">Neue Eintragung</span></td>
              </tr></table>
            </div>

            <div style="padding:28px 32px 12px;">
              <h2 style="margin:0 0 4px;font-size:20px;color:#111;">${escapeHtml(name)}</h2>
              <p style="margin:0;color:#666;font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#E8652B;text-decoration:none;">${escapeHtml(email)}</a></p>
            </div>

            <div style="margin:0 32px 24px;padding:20px;background:#f8f9fa;border-radius:8px;border-left:3px solid #E8652B;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;">Nachricht</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">${escapeHtml(message).replace(/\n/g, "<br>")}</p>
            </div>

            <div style="padding:0 32px 32px;text-align:center;">
              <a href="mailto:${escapeHtml(email)}?subject=Re: Deine Nachricht auf ungephiltert" style="display:inline-block;background:#E8652B;color:#fff;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">Antworten</a>
            </div>

          </div>
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
      subject: `Hey ${firstName}, hab dich gelesen`,
      htmlContent: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0f0d0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f0d0b" style="background-color:#0f0d0b;margin:0;padding:0;">
            <tr><td align="center" style="padding:0;">

              <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;">

                <tr><td bgcolor="#0f0d0b" style="background-color:#0f0d0b;padding:24px 32px;">
                  <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-.02em;">ungephiltert<span style="color:#E8652B;">.</span></span>
                </td></tr>

                <tr><td style="padding:36px 32px 24px;background-color:#ffffff;">
                  <h1 style="margin:0 0 18px;font-size:24px;color:#111;font-weight:800;letter-spacing:-.02em;line-height:1.2;">Hey ${escapeHtml(firstName)},</h1>
                  <p style="font-size:15px;line-height:1.75;color:#444;margin:0 0 14px;">kurz von mir: deine Nachricht ist da. Ich schau sie mir in Ruhe an und melde mich bei dir, meistens innerhalb von ein, zwei Tagen.</p>
                  <p style="font-size:15px;line-height:1.75;color:#444;margin:0 0 28px;">Bis dahin guck gern auf Instagram vorbei, da läuft eh am meisten.</p>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr><td>
                    <a href="https://www.instagram.com/ungphiltert/" style="display:inline-block;background:#E8652B;color:#fff;padding:13px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">Auf Instagram schauen</a>
                  </td></tr></table>

                  <p style="font-size:15px;line-height:1.7;color:#444;margin:0;">Bis gleich,</p>
                  <p style="font-size:15px;line-height:1.7;color:#111;margin:4px 0 0;font-weight:700;">Philipp</p>
                </td></tr>

                <tr><td style="padding:18px 32px;border-top:1px solid #f0f0f0;background-color:#fafafa;">
                  <p style="margin:0;color:#999;font-size:12px;">ungephiltert. · Video Creator aus Marburg</p>
                </td></tr>

              </table>

            </td></tr>
          </table>
        </body></html>
      `,
      textContent: `Hey ${firstName},\n\nkurz von mir: deine Nachricht ist da. Ich schau sie mir in Ruhe an und melde mich bei dir, meistens innerhalb von ein, zwei Tagen.\n\nBis dahin guck gern auf Instagram vorbei, da läuft eh am meisten.\nhttps://www.instagram.com/ungphiltert/\n\nBis gleich,\nPhilipp\nungephiltert.`,
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
