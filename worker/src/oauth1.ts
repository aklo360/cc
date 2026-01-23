/**
 * OAuth 1.0a Implementation for Twitter API
 * Required for media upload endpoint (v1.1 API)
 */

// Generate a random nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Get current Unix timestamp
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// Percent encode per OAuth 1.0a spec (RFC 3986)
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

// Create signature base string
function createSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  return [method.toUpperCase(), percentEncode(url), percentEncode(sortedParams)].join('&');
}

// Create signing key
function createSigningKey(consumerSecret: string, tokenSecret: string): string {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

// Generate HMAC-SHA1 signature
async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataToSign = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);

  // Convert to base64
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface OAuth1Credentials {
  apiKey: string; // Consumer Key
  apiSecret: string; // Consumer Secret
  accessToken: string; // Access Token
  accessTokenSecret: string; // Access Token Secret
}

// Generate OAuth 1.0a Authorization header
export async function generateOAuth1Header(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  additionalParams: Record<string, string> = {}
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: getTimestamp(),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  // Combine oauth params with any body params for signing
  const allParams = { ...oauthParams, ...additionalParams };

  // Create signature base string
  const baseString = createSignatureBaseString(method, url, allParams);

  // Create signing key
  const signingKey = createSigningKey(credentials.apiSecret, credentials.accessTokenSecret);

  // Generate signature
  const signature = await hmacSha1(signingKey, baseString);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

// OAuth 1.0a request token for 3-legged flow
export interface RequestTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: string;
}

export async function getRequestToken(
  apiKey: string,
  apiSecret: string,
  callbackUrl: string
): Promise<RequestTokenResponse> {
  const url = 'https://api.twitter.com/oauth/request_token';

  const oauthParams: Record<string, string> = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: getTimestamp(),
    oauth_version: '1.0',
  };

  // Create signature (no token secret yet, so empty string)
  const baseString = createSignatureBaseString('POST', url, oauthParams);
  const signingKey = createSigningKey(apiSecret, '');
  const signature = await hmacSha1(signingKey, baseString);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${headerParams}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Request token failed: ${response.status} - ${error}`);
  }

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    oauth_token: params.get('oauth_token') || '',
    oauth_token_secret: params.get('oauth_token_secret') || '',
    oauth_callback_confirmed: params.get('oauth_callback_confirmed') || '',
  };
}

// Exchange verifier for access token
export interface AccessTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: string;
  screen_name: string;
}

export async function getAccessToken(
  apiKey: string,
  apiSecret: string,
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<AccessTokenResponse> {
  const url = 'https://api.twitter.com/oauth/access_token';

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: getTimestamp(),
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
    oauth_version: '1.0',
  };

  // Create signature
  const baseString = createSignatureBaseString('POST', url, oauthParams);
  const signingKey = createSigningKey(apiSecret, oauthTokenSecret);
  const signature = await hmacSha1(signingKey, baseString);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${headerParams}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Access token failed: ${response.status} - ${error}`);
  }

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    oauth_token: params.get('oauth_token') || '',
    oauth_token_secret: params.get('oauth_token_secret') || '',
    user_id: params.get('user_id') || '',
    screen_name: params.get('screen_name') || '',
  };
}
