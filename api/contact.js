// AURANZA contact endpoint — Vercel Serverless Function
// Required environment variables: RESEND_API_KEY and CONTACT_FROM_EMAIL.
// Optional: CONTACT_TO_EMAIL (defaults to auranza.digital@gmail.com).
const MAX_BODY_BYTES = 12000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Origin");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST to submit an enquiry." });
  }

  // Browser submissions must be same-origin. Requests without Origin are allowed
  // for compatible form clients, but still pass validation and provider checks.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ ok: false, error: "Request origin could not be verified." });
      }
    } catch {
      return res.status(403).json({ ok: false, error: "Request origin could not be verified." });
    }
  }

  let rawBody = req.body;
  if (typeof rawBody === "string") {
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return res.status(413).json({ ok: false, error: "Enquiry is too large." });
    }
    try { rawBody = JSON.parse(rawBody); }
    catch { return res.status(400).json({ ok: false, error: "Invalid request body." }); }
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return res.status(400).json({ ok: false, error: "Invalid enquiry details." });
  }

  // Honeypot: quietly accept automated submissions without forwarding them.
  if (clean(rawBody.website, 120)) return res.status(200).json({ ok: true });

  const name = clean(rawBody.name, 80);
  const email = clean(rawBody.email, 254);
  const service = clean(rawBody.service, 100);
  const budget = clean(rawBody.budget, 80);
  const timeline = clean(rawBody.timeline, 80);
  const message = clean(rawBody.message, 3000);

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 15) {
    return res.status(400).json({ ok: false, error: "Please check your name, email address and project details." });
  }
  if (!service) return res.status(400).json({ ok: false, error: "Please choose a service." });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || "auranza.digital@gmail.com";
  if (!apiKey || !from) {
    return res.status(503).json({ ok: false, error: "Email delivery is not configured." });
  }

  const textBody = [
    "New AURANZA website enquiry",
    "",
    "Name: " + name,
    "Reply email: " + email,
    "Service: " + service,
    "Budget: " + (budget || "Not provided"),
    "Timeline: " + (timeline || "Not provided"),
    "",
    "Project details:",
    message
  ].join("\n");

  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: "AURANZA enquiry — " + service,
        text: textBody
      })
    });
    if (!providerResponse.ok) {
      // Avoid returning provider internals or secrets to the visitor.
      console.error("AURANZA email provider returned status", providerResponse.status);
      const providerError = providerResponse.status === 403
        ? "Online email delivery is blocked by the email provider. A verified sending domain is required for the current recipient. Please use the direct email fallback."
        : "Email delivery failed. Please use the direct email fallback.";
      return res.status(502).json({ ok: false, code: providerResponse.status === 403 ? "SENDER_DOMAIN_NOT_VERIFIED_OR_RESTRICTED" : "EMAIL_PROVIDER_ERROR", error: providerError });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("AURANZA email delivery request failed.");
    return res.status(502).json({ ok: false, error: "Email delivery is temporarily unavailable. Please email auranza.digital@gmail.com directly." });
  }
};
