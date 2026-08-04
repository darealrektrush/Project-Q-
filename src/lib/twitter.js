import crypto from 'node:crypto';

// Free X/Twitter auto-poster. Turns each on-chain event into a public post so
// the "no spin, just receipts" story markets itself. Posting is best-effort:
// if credentials are missing or X rejects the call, the caller (a distribution
// run) must NOT fail — marketing never blocks money movement.
//
// Uses OAuth 1.0a user-context signing, which is what POST /2/tweets on the
// free X API tier requires. Four secrets, all from the X developer portal
// (Project -> Keys and tokens):
//   X_API_KEY / X_API_SECRET       — the app's consumer key/secret
//   X_ACCESS_TOKEN / X_ACCESS_SECRET — the posting account's access token/secret

const TWEETS_URL = 'https://api.twitter.com/2/tweets';
const TWEET_MAX = 280;
// X wraps every link in a t.co shortener, so a URL of any length counts as
// exactly 23 characters against the 280 weighted limit.
const TCO_WEIGHT = 23;

const URL_RE = /https?:\/\/\S+/g;

// X's weighted length: URLs count as 23 no matter how long they render. A raw
// Solscan tx link is ~90 chars but only costs 23 here, so budget against this.
export function weightedLength(text) {
  const urls = text.match(URL_RE) ?? [];
  const rawUrlChars = urls.reduce((sum, u) => sum + u.length, 0);
  return text.length - rawUrlChars + urls.length * TCO_WEIGHT;
}

// Builds the public "receipt" tweet for a completed distribution. Pure and
// deterministic — no env, no clock — so it can be unit-tested. Takes SOL
// figures already converted from lamports by the caller.
export function formatDistributionTweet({ totalSol, holdersCount, oceanSol, solscanUrl }) {
  const lines = [
    `📡 $FAWKQ rewards just went out on-chain.`,
    ``,
    `💰 ${Number(totalSol).toFixed(4)} SOL distributed`,
    `👥 ${holdersCount} holders paid`,
    `🌊 ${Number(oceanSol).toFixed(4)} SOL to ocean conservation`,
    ``,
    `No spin, just receipts 👇`,
    solscanUrl,
    ``,
    `#Solana #FAWKQ #memecoin`,
  ];
  let text = lines.join('\n');

  // Defensive: if a huge holder count ever pushes us over, drop the hashtag
  // line first (least essential), then the ocean line, keeping the receipt.
  if (weightedLength(text) > TWEET_MAX) {
    text = lines.filter((l) => !l.startsWith('#')).join('\n');
  }
  if (weightedLength(text) > TWEET_MAX) {
    text = lines.filter((l) => !l.startsWith('#') && !l.startsWith('🌊')).join('\n');
  }
  return text;
}

export function isConfigured() {
  return Boolean(
    process.env.X_API_KEY &&
      process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_SECRET
  );
}

// RFC 3986 percent-encoding. encodeURIComponent leaves !*'() alone, but OAuth
// requires those escaped too, or every signature with them silently mismatches.
function percentEncode(str) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

// Builds the OAuth 1.0a Authorization header for a POST with a JSON body.
// A JSON (application/json) body is NOT part of the signature base string —
// only the oauth_* parameters are — so we sign those alone.
function buildAuthHeader({ apiKey, apiSecret, accessToken, accessSecret }) {
  const oauth = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauth[k])}`)
    .join('&');

  const baseString = [
    'POST',
    percentEncode(TWEETS_URL),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const header = { ...oauth, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.keys(header)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(header[k])}"`)
      .join(', ')
  );
}

// Posts a tweet. Resolves to the created tweet's id on success, or null when
// unconfigured. Throws only on an actual API error so callers can log-and-swallow.
export async function postTweet(text) {
  if (!isConfigured()) {
    console.log('[twitter] not configured — skipping auto-post');
    return null;
  }

  const authHeader = buildAuthHeader({
    apiKey: process.env.X_API_KEY,
    apiSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });

  const res = await fetch(TWEETS_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail || data?.title || JSON.stringify(data);
    throw new Error(`X post failed (${res.status}): ${detail}`);
  }
  return data?.data?.id ?? null;
}

// Wraps postTweet so a distribution run never dies on a marketing failure.
// Returns { ok, id } / { ok:false, skipped } / { ok:false, error }.
export async function tryPostTweet(text) {
  if (!isConfigured()) return { ok: false, skipped: true };
  try {
    const id = await postTweet(text);
    return { ok: true, id };
  } catch (err) {
    console.error('[twitter] auto-post failed', err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}
