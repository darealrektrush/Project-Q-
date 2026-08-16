import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const campaignRoot = new URL('../public/campaign-app/campaigns/', import.meta.url);

async function readJson(file) {
  return JSON.parse(await readFile(new URL(file, campaignRoot), 'utf8'));
}

test('campaign registry points to a valid reusable default campaign', async () => {
  const registry = await readJson('index.json');
  const record = registry.campaigns.find(({ id }) => id === registry.defaultCampaign);
  assert.ok(record, 'default campaign must exist in registry');
  assert.equal(typeof record.visible, 'boolean');
  assert.equal(typeof record.enabled, 'boolean');
  assert.equal(typeof record.archived, 'boolean');

  const campaign = await readJson(record.file);
  assert.equal(campaign.id, record.id);
  assert.ok(campaign.name);
  assert.match(campaign.banner, /^\/campaign-app\/assets\//);
  assert.match(campaign.leaderboardIcon, /^\/campaign-app\/assets\/missions\//);
  assert.match(campaign.creatorAwardsArtwork, /^\/campaign-app\/assets\//);
  assert.deepEqual(Object.keys(campaign.stateArtwork).sort(),
    ['ARCHIVED','COMPLETED','DISABLED','LOCKED']);
  assert.deepEqual(Object.keys(campaign.identityBadges).sort(),
    ['collective','full','fullHero','rewards','telegram','wallet','x']);
  assert.equal(campaign.xpBadges.length, 4);
  assert.equal(campaign.leaderboardBadges.length, 6);
  assert.ok(Array.isArray(campaign.missions));
});

test('campaign reward schedule and mission identifiers are internally consistent', async () => {
  const campaign = await readJson('bond-the-duck-2026.json');
  assert.equal(campaign.releases.reduce((total, release) => total + release.percent, 0), 100);
  assert.ok(Object.values(campaign.xpCaps).every((cap) => Number.isFinite(cap) && cap >= 0));
  const missionIds = campaign.missions.map(({ id }) => id);
  assert.equal(new Set(missionIds).size, missionIds.length);
  assert.equal(campaign.missions.length, 5);
  assert.ok(campaign.missions.every(({ image }) => image));
  assert.equal(campaign.missions.some(({ id }) => id === 'content'), false);
});

test('Mini App escapes Telegram display names and keeps wallet controls locked while disabled', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  assert.match(app, /escapeHtml\(p\.name\)/);
  assert.match(app, /campaignRecord\?\.enabled/);
});

test('Mini App exposes a guided verified onboarding path without activating participation', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  assert.match(app, /Complete your Project Q ID/);
  assert.match(app, /Refresh verification status/);
  assert.match(app, /Telegram identity/);
  assert.match(app, /Oracle X identity/);
  assert.match(app, /Solana reward wallet/);
  assert.match(app, /Campaign identity complete/);
  assert.match(app, /campaignRecord\?\.enabled&&participationReady/);
  assert.match(app, /onEvent\?\.\('activated'/);
});
