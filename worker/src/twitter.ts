/**
 * Twitter API Implementation for Cloudflare Workers
 * - OAuth 1.0a for media upload (v1.1 API - required)
 * - OAuth 1.0a for tweet posting (v2 API - free tier compatible)
 */

import { generateOAuth1Header, OAuth1Credentials } from './oauth1';

export { OAuth1Credentials };

// Upload media using Twitter v1.1 API with OAuth 1.0a
export async function uploadMedia(
  imageBase64: string,
  credentials: OAuth1Credentials
): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  // For media upload, we need to include the body params in the signature
  const bodyParams = { media_data: base64Data };

  // Generate OAuth 1.0a header (signature includes body params)
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

// Post a tweet using Twitter v2 API with OAuth 1.0a
// (v2 is available on free tier, v1.1 statuses/update requires elevated access)
export async function postTweet(
  text: string,
  credentials: OAuth1Credentials,
  mediaId?: string
): Promise<{ id: string; text: string }> {
  const url = 'https://api.twitter.com/2/tweets';

  // Build JSON body
  const body: { text: string; media?: { media_ids: string[] } } = { text };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  // For v2 with JSON body, OAuth signature is calculated without body params
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

// Post tweet with image
// - OAuth 1.0a for media upload (v1.1)
// - OAuth 1.0a for tweet posting (v2)
export async function postTweetWithImage(
  text: string,
  imageBase64: string,
  credentials: OAuth1Credentials
): Promise<{ id: string; text: string }> {
  try {
    // Upload media first (v1.1 endpoint)
    const mediaId = await uploadMedia(imageBase64, credentials);
    console.log('Media uploaded successfully, media_id:', mediaId);

    // Post tweet with media (v2 endpoint)
    return postTweet(text, credentials, mediaId);
  } catch (error) {
    console.error('Tweet with image failed:', error);
    throw error;
  }
}

// Upload video using Twitter v1.1 chunked media upload
// Videos require: INIT → APPEND (chunks) → FINALIZE → STATUS polling
export async function uploadVideo(
  videoBase64: string,
  credentials: OAuth1Credentials
): Promise<string> {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  // Decode base64 to get raw bytes for size calculation
  const binaryString = atob(videoBase64);
  const totalBytes = binaryString.length;

  console.log(`Video size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  // INIT - initialize the upload
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

  // APPEND - upload chunks (5MB of raw bytes max per chunk)
  // Base64: 4 chars = 3 bytes, so for 5MB bytes we need ~6.67MB of base64 chars
  const CHUNK_BYTES = 5 * 1024 * 1024; // 5MB of raw bytes
  // Base64 chars for this many bytes (round down to multiple of 4)
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

    const chunkBytes = Math.ceil(chunk.length * 3 / 4);
    console.log(`Video APPEND segment ${segmentIndex} complete (${(chunkBytes / 1024 / 1024).toFixed(2)} MB)`);
    segmentIndex++;
  }

  // FINALIZE - complete the upload
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

  // STATUS - poll for processing completion
  if (finalizeData.processing_info) {
    let processingInfo = finalizeData.processing_info;

    while (processingInfo.state === 'pending' || processingInfo.state === 'in_progress') {
      const waitSecs = processingInfo.check_after_secs || 5;
      console.log(`Video processing ${processingInfo.state}, waiting ${waitSecs}s...`);
      await new Promise(r => setTimeout(r, waitSecs * 1000));

      const statusParams = {
        command: 'STATUS',
        media_id: mediaId,
      };

      // STATUS uses GET with query params - include params in signature
      const statusUrl = `${url}?command=STATUS&media_id=${mediaId}`;
      // For OAuth signature, use base URL but include query params in additionalParams
      const statusHeader = await generateOAuth1Header('GET', url, credentials, statusParams);

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Authorization: statusHeader,
        },
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
        throw new Error(`Video processing failed: ${processingInfo.error?.message || 'Unknown error'}`);
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
  credentials: OAuth1Credentials
): Promise<{ id: string; text: string }> {
  try {
    // Upload video first (chunked upload)
    const mediaId = await uploadVideo(videoBase64, credentials);
    console.log('Video uploaded successfully, media_id:', mediaId);

    // Post tweet with media (v2 endpoint)
    return postTweet(text, credentials, mediaId);
  } catch (error) {
    console.error('Tweet with video failed:', error);
    throw error;
  }
}
