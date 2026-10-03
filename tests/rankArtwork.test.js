import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('public/campaign-app/app.js', 'utf8');
const css = fs.readFileSync('public/campaign-app/terminal-v2.css', 'utf8');
const contract = fs.readFileSync('public/campaign-app/assets/ranks/README.md', 'utf8');
const server = fs.readFileSync('src/server.js', 'utf8');

test('Universal Profile resolves only canonical Crab Army badge keys', () => {
  assert.match(app, /CRAB_ARMY_RANK_ASSET_KEY/);
  assert.match(app, /crab_army_rank_/);
  assert.match(app, /campaign-app\/assets\/ranks/);
  assert.match(app, /army\?\.badgeAssetKey/);
});

test('rank artwork preserves the deterministic medallion fallback', () => {
  assert.match(app, /universal-rank-insignia/);
  assert.match(app, /universal-rank-medallion/);
  assert.match(app, /data-rank-insignia/);
  assert.match(app, /image\.remove\(\)/);
  assert.match(css, /\.universal-rank-art/);
  assert.match(css, /\.universal-rank-insignia/);
});

test('Project Q documents Oracle as the artwork authority', () => {
  assert.match(contract, /Project Q does not define rank order, thresholds, names, divisions or lifetime XP/);
  assert.match(contract, /CrabStarRanks_by_CrabStar_Oraacle_Bot/);
  assert.match(contract, /sticker 1 = Level 1 Recruit/);
  assert.match(contract, /sticker 50 = Level 50 Supreme Commander/);
});


test('Dev rank artwork fallback is allowlisted and production closed', () => {
  assert.match(server, /\/campaign-app\/api\/rank-assets\/:filename/);
  assert.match(server, /\/campaign-app\/assets\/ranks\/:filename/);
  assert.match(server, /crabstar-webhooks-dev\.onrender\.com\/public\/crab-army-ranks/);
  assert.match(server, /project-q-dev\.onrender\.com/);
  assert.match(server, /image\/webp/);
  assert.match(server, /1_000_000/);
  assert.match(server, /redirect\(307/);
});
