import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('screen history restores browser Back and the guide moves backward without extra history entries', async () => {
  const source = await readFile(new URL('../public/campaign-app/app.js', import.meta.url), 'utf8');
  const campaign = JSON.parse(await readFile(new URL('../public/campaign-app/campaigns/bond-the-duck-2026.json', import.meta.url), 'utf8'));
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      classList: { add() {}, remove() {}, toggle() {} },
      focus() {}, addEventListener() {},
    });
    return nodes.get(selector);
  };
  const location = { hash: '#home', search: '' };
  const listeners = {};
  const calls = [];
  const history = Object.fromEntries(['pushState', 'replaceState'].map((method) => [method, (_state, _title, hash) => {
    calls.push([method, hash]);
    location.hash = hash;
  }]));
  const context = {
    window: { Telegram: null, scrollTo() {}, matchMedia: () => ({ matches: false }), addEventListener: (type, handler) => { listeners[type] = handler; } },
    location, history, document: { querySelector: node, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, body: { classList: { toggle() {} } } },
    URLSearchParams, URL, console, setTimeout, clearTimeout, performance: { now: () => 0 },
    fetch: async () => { throw new Error('network should not be used by navigation'); },
  };
  vm.createContext(context);
  vm.runInContext(source.replace(/\nboot\(\);\s*$/, '') + `
    state.campaign = ${JSON.stringify(campaign)};
    globalThis.navigate = go;
    globalThis.currentScreen = () => state.screen;
    globalThis.guideStep = () => state.guideStep;
    globalThis.beginGuide = startGuide;
    globalThis.wireControls = bind;
  `, context);

  context.navigate('missions');
  context.navigate('rewards');
  assert.deepEqual(calls, [['pushState', '#missions'], ['pushState', '#rewards']]);
  location.hash = '#missions';
  listeners.popstate();
  assert.equal(context.currentScreen(), 'missions');

  context.wireControls();
  context.beginGuide();
  assert.equal(context.guideStep(), 0);
  assert.equal(node('#guide-back').disabled, true);
  node('#guide-next').onclick();
  assert.equal(context.guideStep(), 1);
  node('#guide-back').onclick();
  assert.equal(context.guideStep(), 0);
  assert.equal(context.currentScreen(), 'home');
  assert.equal(calls.filter(([method]) => method === 'pushState').length, 2);
});
