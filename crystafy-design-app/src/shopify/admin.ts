import { assertShopifyConfig, config } from '../config.js';

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedAccessToken = '';
let tokenExpiresAt = 0;

function shopHost(): string {
  return config.shopDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

async function requestClientCredentialsToken(): Promise<string> {
  const url = `https://${shopHost()}/admin/oauth/access_token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.shopifyClientId,
      client_secret: config.shopifyClientSecret,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    const message = body.error_description || body.error || res.statusText;
    throw new Error(`Shopify token request failed: ${message}`);
  }

  cachedAccessToken = body.access_token;
  tokenExpiresAt = Date.now() + Number(body.expires_in || 86399) * 1000;
  return cachedAccessToken;
}

async function getAdminAccessToken(): Promise<string> {
  if (config.adminAccessToken) return config.adminAccessToken;
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) return cachedAccessToken;
  return requestClientCredentialsToken();
}

export async function shopifyGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  assertShopifyConfig();

  const url = `https://${shopHost()}/admin/api/${config.apiVersion}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': await getAdminAccessToken(),
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await res.json()) as GraphqlResponse<T>;
  if (!res.ok || body.errors?.length) {
    const message = body.errors?.map((error) => error.message).join('; ') || res.statusText;
    throw new Error(`Shopify GraphQL failed: ${message}`);
  }

  if (!body.data) throw new Error('Shopify GraphQL returned no data');
  return body.data;
}
