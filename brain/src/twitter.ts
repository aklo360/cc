/**
 * Twitter API Implementation for Central Brain
 * Ported from worker/src/twitter.ts + worker/src/oauth1.ts
 */

// OAuth 1.0a credentials interface
export interface OAuth1Credentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

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

  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate OAuth 1.0a Authorization header
async function generateOAuth1Header(
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

  const allParams = { ...oauthParams, ...additionalParams };
  const baseString = createSignatureBaseString(method, url, allParams);
  const signingKey = createSigningKey(credentials.apiSecret, credentials.accessTokenSecret);
  const signature = await hmacSha1(signingKey, baseString);
  oauthParams.oauth_signature = signature;

  const headerParams = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

// Upload media using Twitter v1.1 API
export async function uploadMedia(
  imageBase64: string,
  credentials: OAuth1Credentials
): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const bodyParams = { media_data: base64Data };

  const authHeader = await generateOAuth1Header('POST', url, credentials, bodyParams);

  const formData = new URLSearchParams();
  formData.append('media_data', base64Data);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Media upload failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { media_id_string: string };
  return data.media_id_string;
}

// $CC Community ID on Twitter
export const CC_COMMUNITY_ID = '2014131779628618154';

// Post a tweet using Twitter v2 API
export async function postTweet(
  text: string,
  credentials: OAuth1Credentials,
  options: {
    mediaId?: string;
    communityId?: string;
  } = {}
): Promise<{ id: string; text: string }> {
  const url = 'https://api.twitter.com/2/tweets';

  const body: {
    text: string;
    media?: { media_ids: string[] };
    community_id?: string;
  } = { text };

  if (options.mediaId) {
    body.media = { media_ids: [options.mediaId] };
  }

  if (options.communityId) {
    body.community_id = options.communityId;
  }

  const authHeader = await generateOAuth1Header('POST', url, credentials);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tweet failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { data: { id: string; text: string } };
  return data.data;
}

// Post tweet to $CC community
export async function postTweetToCommunity(
  text: string,
  credentials: OAuth1Credentials,
  mediaId?: string
): Promise<{ id: string; text: string }> {
  return postTweet(text, credentials, {
    mediaId,
    communityId: CC_COMMUNITY_ID,
  });
}

// Post tweet with image
export async function postTweetWithImage(
  text: string,
  imageBase64: string,
  credentials: OAuth1Credentials,
  communityId?: string
): Promise<{ id: string; text: string }> {
  const mediaId = await uploadMedia(imageBase64, credentials);
  console.log('Media uploaded, media_id:', mediaId);
  return postTweet(text, credentials, { mediaId, communityId });
}

// Upload video using chunked upload
export async function uploadVideo(
  videoBase64: string,
  credentials: OAuth1Credentials
): Promise<string> {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const binaryString = atob(videoBase64);
  const totalBytes = binaryString.length;

  console.log(`Video size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  // INIT
  const initParams = {
    command: 'INIT',
    total_bytes: totalBytes.toString(),
    media_type: 'video/mp4',
    media_category: 'tweet_video',
  };

  const initHeader = await generateOAuth1Header('POST', url, credentials, initParams);
  const initForm = new URLSearchParams();
  Object.entries(initParams).forEach(([k, v]) => initForm.append(k, v));

  const initResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: initHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: initForm.toString(),
  });

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`Video INIT failed: ${initResponse.status} - ${error}`);
  }

  const initData = (await initResponse.json()) as { media_id_string: string };
  const mediaId = initData.media_id_string;
  console.log('Video INIT complete, media_id:', mediaId);

  // APPEND chunks
  const CHUNK_BYTES = 5 * 1024 * 1024;
  const CHUNK_BASE64_CHARS = Math.floor((CHUNK_BYTES * 4) / 3 / 4) * 4;
  let segmentIndex = 0;

  for (let charOffset = 0; charOffset < videoBase64.length; charOffset += CHUNK_BASE64_CHARS) {
    const chunk = videoBase64.slice(charOffset, charOffset + CHUNK_BASE64_CHARS);

    const appendParams = {
      command: 'APPEND',
      media_id: mediaId,
      segment_index: segmentIndex.toString(),
      media_data: chunk,
    };

    const appendHeader = await generateOAuth1Header('POST', url, credentials, appendParams);
    const appendForm = new URLSearchParams();
    Object.entries(appendParams).forEach(([k, v]) => appendForm.append(k, v));

    const appendResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: appendHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: appendForm.toString(),
    });

    if (!appendResponse.ok) {
      const error = await appendResponse.text();
      throw new Error(`Video APPEND failed: ${appendResponse.status} - ${error}`);
    }

    const chunkBytes = Math.ceil((chunk.length * 3) / 4);
    console.log(
      `Video APPEND segment ${segmentIndex} complete (${(chunkBytes / 1024 / 1024).toFixed(2)} MB)`
    );
    segmentIndex++;
  }

  // FINALIZE
  const finalizeParams = {
    command: 'FINALIZE',
    media_id: mediaId,
  };

  const finalizeHeader = await generateOAuth1Header('POST', url, credentials, finalizeParams);
  const finalizeForm = new URLSearchParams();
  Object.entries(finalizeParams).forEach(([k, v]) => finalizeForm.append(k, v));

  const finalizeResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: finalizeHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: finalizeForm.toString(),
  });

  if (!finalizeResponse.ok) {
    const error = await finalizeResponse.text();
    throw new Error(`Video FINALIZE failed: ${finalizeResponse.status} - ${error}`);
  }

  const finalizeData = (await finalizeResponse.json()) as {
    media_id_string: string;
    processing_info?: {
      state: string;
      check_after_secs?: number;
      error?: { message: string };
    };
  };

  console.log('Video FINALIZE complete');

  // STATUS polling
  if (finalizeData.processing_info) {
    let processingInfo = finalizeData.processing_info;

    while (processingInfo.state === 'pending' || processingInfo.state === 'in_progress') {
      const waitSecs = processingInfo.check_after_secs || 5;
      console.log(`Video processing ${processingInfo.state}, waiting ${waitSecs}s...`);
      await new Promise((r) => setTimeout(r, waitSecs * 1000));

      const statusParams = {
        command: 'STATUS',
        media_id: mediaId,
      };

      const statusUrl = `${url}?command=STATUS&media_id=${mediaId}`;
      const statusHeader = await generateOAuth1Header('GET', url, credentials, statusParams);

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: { Authorization: statusHeader },
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        throw new Error(`Video STATUS failed: ${statusResponse.status} - ${error}`);
      }

      const statusData = (await statusResponse.json()) as {
        processing_info?: {
          state: string;
          check_after_secs?: number;
          error?: { message: string };
        };
      };

      if (!statusData.processing_info) break;
      processingInfo = statusData.processing_info;

      if (processingInfo.state === 'failed') {
        throw new Error(
          `Video processing failed: ${processingInfo.error?.message || 'Unknown error'}`
        );
      }
    }

    console.log('Video processing complete');
  }

  return mediaId;
}

// Post tweet with video
export async function postTweetWithVideo(
  text: string,
  videoBase64: string,
  credentials: OAuth1Credentials,
  communityId?: string
): Promise<{ id: string; text: string }> {
  const mediaId = await uploadVideo(videoBase64, credentials);
  console.log('Video uploaded, media_id:', mediaId);
  return postTweet(text, credentials, { mediaId, communityId });
}

// Get credentials from environment
export function getTwitterCredentials(): OAuth1Credentials {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error('Twitter credentials not configured');
  }

  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}
