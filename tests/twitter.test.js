import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDistributionTweet, weightedLength } from '../src/lib/twitter.js';

const TWEET_MAX = 280;
const SOLSCAN = 'https://solscan.io/tx/' + 'a'.repeat(88);

test('weightedLength counts any URL as 23 chars, not its raw length', () => {
  const url = 'https://solscan.io/tx/' + 'z'.repeat(88); // 110 raw chars
  assert.ok(url.length > 100);
  assert.equal(weightedLength(url), 23);
});

test('weightedLength adds plain text and URL weight together', () => {
  assert.equal(weightedLength('gm ' + SOLSCAN), 3 + 23);
});

test('formatDistributionTweet includes the core receipt facts', () => {
  const tweet = formatDistributionTweet({
    totalSol: 12.5,
    holdersCount: 342,
    oceanSol: 1.25,
    solscanUrl: SOLSCAN,
  });
  assert.match(tweet, /\$FAWKQ/);
  assert.match(tweet, /12\.5000 SOL/);
  assert.match(tweet, /342 holders/);
  assert.match(tweet, /1\.2500 SOL to ocean/);
  assert.ok(tweet.includes(SOLSCAN));
});

test('formatDistributionTweet stays within the weighted tweet limit', () => {
  const tweet = formatDistributionTweet({
    totalSol: 12.5,
    holdersCount: 342,
    oceanSol: 1.25,
    solscanUrl: SOLSCAN,
  });
  assert.ok(weightedLength(tweet) <= TWEET_MAX);
});

test('formatDistributionTweet stays within the limit even with an absurd holder count', () => {
  const tweet = formatDistributionTweet({
    totalSol: 999999.9999,
    holdersCount: 1_000_000_000,
    oceanSol: 99999.9999,
    solscanUrl: SOLSCAN,
  });
  assert.ok(weightedLength(tweet) <= TWEET_MAX);
});

test('formatDistributionTweet formats SOL to 4 decimals', () => {
  const tweet = formatDistributionTweet({
    totalSol: 1,
    holdersCount: 0,
    oceanSol: 0,
    solscanUrl: SOLSCAN,
  });
  assert.match(tweet, /1\.0000 SOL distributed/);
});
