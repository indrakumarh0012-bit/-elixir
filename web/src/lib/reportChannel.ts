/**
 * Delivery channel to the maintainer's inbox via FormSubmit AJAX. The
 * address is kept out of the visible UI. FormSubmit requires a ONE-TIME
 * activation: the first-ever submission triggers an activation email to the
 * inbox (often in Spam/Promotions, sender formsubmit.co) — until its button
 * is clicked, submissions are held, and the API says so in its response.
 */
const INBOX = "aW5kcmFrdW1hcmgwMDEyQGdtYWlsLmNvbQ==";

export type SendResult =
  | { ok: true; pendingActivation: boolean }
  | { ok: false; reason: string };

export async function sendToInbox(
  subject: string,
  fields: Record<string, string>,
): Promise<SendResult> {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${atob(INBOX)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: subject,
        _template: "table",
        _captcha: "false",
        ...fields,
      }),
    });
    let body: { success?: string | boolean; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // Non-JSON body: fall through to the status check.
    }
    const success = body.success === true || body.success === "true";
    const message = (body.message ?? "").toLowerCase();
    if (success) {
      return { ok: true, pendingActivation: message.includes("activat") };
    }
    if (message.includes("activat")) {
      // Held until the one-time activation is completed on the inbox side.
      return { ok: true, pendingActivation: true };
    }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: false, reason: body.message ? "rejected by the relay" : "unknown response" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
