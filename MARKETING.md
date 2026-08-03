# FAWK Q — Free Marketing & Listing Playbook

Everything here is **free**. FAWK Q's edge is a real story most coins don't have:
live, on-chain receipts (75% community / 15% dev / 10% ocean conservation) and a
transparency bot. "Free advertising" is really *earned attention* — so lead with
the receipts and the ocean angle everywhere.

Ready-to-paste description (short):

> **FAWK Q ($FAWKQ)** — The community's eyes on the money. Real-time price,
> holder counts, wallet balances, and every reward distribution posted on-chain
> with tx links the second it happens. 75% back to the community, 15% dev, 10%
> to ocean conservation. No spin, just receipts.

Fill these in once and reuse everywhere:

- Website: `https://fawkq.com`
- Contract (mint): `__________`
- X: `__________`
- Telegram: `__________`
- Logo: square PNG, transparent bg, ≥ 256×256

---

## 1. Listing & tracker sites (discovery — do these first)

| # | Site | What it gets you | Free path | Done |
|---|------|------------------|-----------|------|
| 1 | [DEX Screener](https://dexscreener.com) | Main trader-facing token page | "Edit/Update" → sign with update-authority wallet (no fee) | ☐ |
| 2 | [GeckoTerminal](https://www.geckoterminal.com) | Auto-lists Solana pairs | Keep on-chain metadata clean; submit socials | ☐ |
| 3 | [Birdeye](https://birdeye.so) | Solana-native token page | Submit/verify token info | ☐ |
| 4 | [Jupiter](https://station.jup.ag/guides/general/get-your-token-on-jupiter) | Verified checkmark on swaps (trust) | Apply to verified token list | ☐ |
| 5 | [Solscan](https://solscan.io) | Explorer token info | Set on-chain Metaplex metadata (propagates free) | ☐ |
| 6 | [CoinGecko](https://support.coingecko.com/hc/en-us/articles/23739356509465) | Huge discovery | Free listing application (needs volume + site) | ☐ |
| 7 | [CoinMarketCap](https://support.coinmarketcap.com/hc/en-us/articles/360043659351) | Biggest payoff | Free application (strictest) | ☐ |
| 8 | [CoinPaprika](https://coinpaprika.com/get-listed/) | Aggregator | Free form | ☐ |
| 9 | [CoinCodex](https://coincodex.com/page/add-coin/) | Aggregator | Free form | ☐ |
| 10 | [LiveCoinWatch](https://www.livecoinwatch.com) | Aggregator | Free submission | ☐ |
| 11 | [CoinMarketCal](https://coinmarketcal.com) | List upcoming events/announcements | Free event submission | ☐ |

> **On-chain metadata is the root fix.** If your Metaplex token metadata
> (name, symbol, logo URI) is correct, many explorers pull it automatically for
> free. Get this right before paying anyone for "info updates."

## 2. Gem / launchpad voting sites (short-term traffic spikes)

Free listings with community voting — rally holders to vote daily to climb the
front page.

- [ ] [CoinSniper](https://coinsniper.net)
- [ ] [Coinscope](https://www.coinscope.co)
- [ ] [CoinHunt](https://coinhunt.cc)
- [ ] [Moontok](https://moontok.io)
- [ ] [GemFinder](https://gemfinder.cc)

## 3. Social & community channels

- [ ] **X (Twitter)** — the main engine. Post receipts daily (the auto-poster
      below does this for you). Use `$FAWKQ`, reply under bigger Solana accounts.
- [ ] **Telegram** — cross-post into Solana / meme groups (respect each group's rules).
- [ ] **Discord** — Solana community + "gems" servers.
- [ ] **Reddit** — r/CryptoMoonShots, r/SolanaMemeCoins, r/SatoshiStreetBets, r/CryptoMarkets.
- [ ] **Farcaster / Warpcast** — crypto-native, less saturated.
- [ ] **TikTok / YT Shorts / IG Reels** — short clips of the live-receipts bot.
- [ ] **Bitcointalk** — Altcoin ANN (announcement) thread; free and indexed.
- [ ] **Publish0x / Medium / Mirror.xyz** — write the transparency + ocean story.

## 4. Earned media (FAWK Q's unfair advantage)

- [ ] **Ocean-conservation proof.** Actually send the 10%, post the on-chain tx,
      and pitch "crypto for good" accounts + green communities. Press meme coins can't buy.
- [ ] **Transparency as content.** The distribution auto-poster (below) turns
      every payout into a self-refreshing ad.
- [ ] **Engagement raids.** Coordinate the community to reply under big Solana
      posts — free reach lives in the replies, not your own timeline.
- [ ] **Giveaways.** Small $FAWKQ for retweet/tag. Amplifies reach fast.
- [ ] **Memes.** A "no spin, just receipts" meme travels further than any ad.

## Avoid

- "Free promotion" DMs/bots promising followers/pumps — scams.
- Fake volume or holders — CoinGecko/CMC **delist** for it.
- Paying for DEXTools basic info before you have traction — do the free trackers first.

---

## Automated distribution receipts → X

The distribution job (`jobs/distribute.js`) auto-posts an on-chain "receipt"
to X after every successful payout, using `src/lib/twitter.js`.

**Enable it (free X API tier):**

1. Create a project/app at <https://developer.x.com> for your posting account.
2. Set the app's **User authentication** to **Read and Write** (OAuth 1.0a).
3. Under **Keys and tokens**, generate:
   - API Key + Secret → `X_API_KEY`, `X_API_SECRET`
   - Access Token + Secret (for the account you want to post as) → `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`
4. Add all four to your environment (see `.env.example`).

**Behavior:**

- If any of the four vars is missing, auto-posting is silently skipped.
- Posting is **best-effort**: it runs *after* the distribution is marked
  completed, wrapped so a failed/rate-limited tweet can never fail or unwind a
  real distribution.
- The tweet stays within X's 280 weighted-character limit (links count as 23).

Example post:

```
📡 $FAWKQ rewards just went out on-chain.

💰 12.5000 SOL distributed
👥 342 holders paid
🌊 1.2500 SOL to ocean conservation

No spin, just receipts 👇
https://solscan.io/tx/...

#Solana #FAWKQ #memecoin
```
