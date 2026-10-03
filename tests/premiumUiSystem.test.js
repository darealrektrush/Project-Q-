import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/campaign-app/index.html', 'utf8');
const app = fs.readFileSync('public/campaign-app/app.js', 'utf8');
const css = fs.readFileSync('public/campaign-app/premium-v4.css', 'utf8');

test('Premium V4 is the final Project Q visual system layer', () => {
  assert.match(html, /premium-v4\.css/);
  const premium = html.indexOf('premium-v4.css');
  const legacy = html.indexOf('campaign-depth.css');
  assert.ok(premium > legacy);
  assert.match(css, /--q-page:/);
  assert.match(css, /--q-surface:/);
  assert.match(css, /--q-navy:/);
  assert.match(css, /--q-ui:/);
});

test('mobile shell stays compact and removes persistent marketing footer', () => {
  assert.match(css, /\.q-shell-v2 \.q-footer\{display:none!important\}/);
  assert.match(css, /\.q-shell-v2 \.mobile-nav/);
  assert.match(css, /min-height:57px/);
  assert.match(css, /\.nav-button\.active::before/);
  assert.doesNotMatch(css, /\.mobile-nav \.nav-button\.active\{[^}]*linear-gradient\(125deg,#806024/);
});

test('wallet verification exposes branded major wallets and Wallet Standard discovery', () => {
  for (const wallet of ['Phantom','Solflare','Backpack','Jupiter','MetaMask','Other Solana Wallet']) {
    assert.match(app, new RegExp(wallet));
  }
  assert.match(app, /wallet-brand-mark/);
  assert.match(app, /wallet-standard:app-ready/);
  assert.match(app, /DETECTED WALLET/);
  assert.match(app, /RECOMMENDED/);
  assert.match(app, /More wallets/);
  assert.match(app, /Signature only/);
  assert.match(app, /0 SOL/);
  assert.match(app, /No transaction/);
});

test('premium surfaces reduce chrome rather than adding new dashboard borders', () => {
  assert.match(css, /Shared functional surfaces/);
  assert.match(css, /border:1px solid rgba\(72,83,86,.075\)!important/);
  assert.match(css, /mission-file-row[\s\S]*border:0!important/);
  assert.match(css, /reward-summary-grid article[\s\S]*border:0!important/);
  assert.match(css, /verification-action-card[\s\S]*border:0!important/);
});

test('Profile uses compact identity, Verification Center, and one current-operation object', () => {
  assert.match(app, /universal-profile-hero compact/);
  assert.match(app, /PROJECT Q \/\/ VERIFICATION CENTER/);
  assert.match(app, /profile-operation-card/);
  assert.match(app, /OPERATION ACCESS/);
  assert.doesNotMatch(app, /Complete your operation setup/);
});
