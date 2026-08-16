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
  assert.ok(Array.isArray(campaign.missions));
});

test('campaign reward schedule and mission identifiers are internally consistent', async () => {
  const campaign = await readJson('bond-the-duck-2026.json');
  assert.equal(campaign.releases.reduce((total, release) => total + release.percent, 0), 100);
  assert.ok(Object.values(campaign.xpCaps).every((cap) => Number.isFinite(cap) && cap >= 0));
  const missionIds = campaign.missions.map(({ id }) => id);
  assert.equal(new Set(missionIds).size, missionIds.length);
});
