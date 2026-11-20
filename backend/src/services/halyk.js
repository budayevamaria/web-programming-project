// Halyk ePay integration (payment widget flow).
// 1. server asks Halyk for a token bound to one invoice and amount
// 2. browser calls halyk.pay(paymentObject) and the customer pays on Halyk's page
// 3. Halyk redirects back and posts a notification to postLink
// 4. server checks the real status through the Transaction status API before granting anything
import { config } from "../config.js";

const h = config.halyk;
const STATUS_SCOPE = "webapi usermanagement email_send verification statement statistics payment";

export const postLinkUrl = () =>
  `${config.publicApiUrl}/api/halyk/postlink?s=${encodeURIComponent(h.postlinkSecret)}`;

async function requestToken(fields) {
  if (!h.clientSecret || !h.terminal)
    throw new Error("Halyk credentials are missing (HALYK_CLIENT_SECRET, HALYK_TERMINAL)");
  const res = await fetch(h.oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: h.clientId,
      client_secret: h.clientSecret,
      terminal: h.terminal,
      ...fields,
    }),
  });
  const responseText = await res.text();

  console.log("Halyk status:", res.status);
  console.log("Halyk content type:", res.headers.get("content-type"));
  console.log("Halyk response body:", responseText);

  let data = {};
  try {
    data = JSON.parse(responseText);
  } catch {}

  if (!res.ok || !data.access_token) {
    throw new Error(`Halyk token request failed (${res.status})`);
  }
  if (!res.ok || !data.access_token) {
    console.log("Halyk OAuth URL:", h.oauthUrl);
    console.log("Halyk response:", data);
    throw new Error(`Halyk token request failed (${res.status})`);
  }
  return data; // { access_token, expires_in, scope, token_type }
}

// order: { invoiceId, publicId, amount, currency, email }
export async function buildPaymentObject(order) {
  const auth = await requestToken({
    scope: "payment",
    invoiceID: order.invoiceId,
    amount: String(order.amount),
    currency: order.currency,
    postLink: postLinkUrl(),
    failurePostLink: postLinkUrl(),
  });
  const back = `${config.frontendUrl}/result?order=${order.publicId}`;
  return {
    invoiceId: order.invoiceId,
    backLink: back,
    failureBackLink: `${back}&failed=1`,
    postLink: postLinkUrl(),
    failurePostLink: postLinkUrl(),
    language: "ENG",
    description: "HomeSync Premium",
    accountId: order.publicId,
    terminal: h.terminal,
    amount: order.amount,
    currency: order.currency,
    email: order.email,
    auth, // passed whole to the widget
  };
}

// The source of truth for payment state. Never trust the postLink body or the redirect.
export async function checkStatus(invoiceId) {
  const auth = await requestToken({ scope: STATUS_SCOPE });
  const res = await fetch(
    `${h.apiUrl}/check-status/payment/transaction/${encodeURIComponent(invoiceId)}`,
    {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    }
  );
  const data = await res.json().catch(() => ({}));
  // resultCode 100 = request ok; payment state is transaction.statusName (CHARGE = paid)
  return {
    resultCode: String(data.resultCode ?? ""),
    statusName: data.transaction?.statusName || "",
    amount: data.transaction?.amount,
    reference: data.transaction?.reference || "",
  };
}
