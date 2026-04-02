import crypto from "crypto";

interface TBACredentials {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export function generateAuthHeader(
  method: string,
  url: string,
  credentials: TBACredentials
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_token: credentials.tokenId,
    oauth_version: "1.0",
  };

  const paramEntries = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const baseUrl = url.split("?")[0];
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(paramEntries),
  ].join("&");

  const signingKey = `${encodeURIComponent(credentials.consumerSecret)}&${encodeURIComponent(credentials.tokenSecret)}`;

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(signatureBase)
    .digest("base64");

  const realm = credentials.accountId.toUpperCase().replace(/-/g, "_");
  const headerParts = [
    `realm="${realm}"`,
    ...Object.entries(oauthParams).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`),
    `oauth_signature="${encodeURIComponent(signature)}"`,
  ];

  return `OAuth ${headerParts.join(", ")}`;
}

export function getNsCredentials(): {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  baseUrl: string;
} | null {
  const {
    NETSUITE_ACCOUNT_ID,
    NETSUITE_CONSUMER_KEY,
    NETSUITE_CONSUMER_SECRET,
    NETSUITE_TOKEN_ID,
    NETSUITE_TOKEN_SECRET,
  } = process.env;

  if (
    !NETSUITE_ACCOUNT_ID ||
    !NETSUITE_CONSUMER_KEY ||
    !NETSUITE_CONSUMER_SECRET ||
    !NETSUITE_TOKEN_ID ||
    !NETSUITE_TOKEN_SECRET
  ) {
    return null;
  }

  return {
    accountId: NETSUITE_ACCOUNT_ID,
    consumerKey: NETSUITE_CONSUMER_KEY,
    consumerSecret: NETSUITE_CONSUMER_SECRET,
    tokenId: NETSUITE_TOKEN_ID,
    tokenSecret: NETSUITE_TOKEN_SECRET,
    baseUrl:
      process.env.NETSUITE_BASE_URL ||
      `https://${NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest`,
  };
}
