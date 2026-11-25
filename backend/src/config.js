
// Node 20.12+ reads .env itself, no dotenv package needed.
try {
  process.loadEnvFile();
} catch {
  /* no .env file, use the real environment */
}

const e = process.env;
const mode = ["mock", "test", "prod"].includes(e.HALYK_ENV)
  ? e.HALYK_ENV
  : "mock";

const mockPort = Number(e.HALYK_MOCK_PORT) || 4100;
const mock = `http://localhost:${mockPort}`;

const urls = {
  mock: {
    oauthUrl: `${mock}/oauth2/token`,
    apiUrl: `${mock}/api`,
    widgetUrl: `${mock}/payform/payment-api.js`,
  },
  test: {
    oauthUrl: "https://test-epay-oauth.epayment.kz/oauth2/token",
    apiUrl: "https://testepay.homebank.kz/api",
    widgetUrl: "https://test-epay.epayment.kz/payform/payment-api.js",
  },
  prod: {
    oauthUrl: "https://epay-oauth.homebank.kz/oauth2/token",
    apiUrl: "https://epay-api.homebank.kz",
    widgetUrl: "https://epay.homebank.kz/payform/payment-api.js",
  },
}[mode];

const port = Number(e.PORT) || 4000;

export const config = {
  port,

  mongoUri: e.MONGO_URI || "mongodb://localhost:27017/halyk_pay",

  openai: {
  apiKey: e.OPENAI_API_KEY || "",
  model: e.OPENAI_DEFAULT_MODEL || "gpt-6.2-sol",
},

  publicApiUrl: e.PUBLIC_API_URL || `http://localhost:${port}`,
  frontendUrl: e.FRONTEND_URL || "http://localhost:5173",

  premium: {
    priceKzt: Number(e.PREMIUM_PRICE_KZT) || 2990,
    periodDays: Number(e.PREMIUM_DAYS) || 30,
  },

  halyk: {
    env: mode,
    mockPort,
    clientId: e.HALYK_CLIENT_ID || "test",
    clientSecret: e.HALYK_CLIENT_SECRET || (mode === "mock" ? "mock-secret" : ""),
    terminal: e.HALYK_TERMINAL || (mode === "mock" ? "mock-terminal" : ""),
    postlinkSecret: e.HALYK_POSTLINK_SECRET || (mode === "mock" ? "mock-postlink" : ""),
    ...urls,
  },
};

if (mode !== "mock" && !config.halyk.postlinkSecret) {
  throw new Error("Set HALYK_POSTLINK_SECRET (any long random string)");
}
