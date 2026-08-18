const NAV = [
  ['home', '/campaign-app/assets/project-q-app-icon.webp', 'Home'],
  ['missions', '/campaign-app/assets/system/q-campaigns.webp', 'Missions'],
  ['xp', '/campaign-app/assets/system/q-xp.webp', 'XP'],
  ['leaderboard', '/campaign-app/assets/system/q-signal.webp', 'Leaderboard'],
  ['rewards', '/campaign-app/assets/system/q-distribution.webp', 'Rewards'],
  ['profile', '/campaign-app/assets/system/q-id.webp', 'Profile'],
];

const state = {
  screen: 'home',
  telegram: window.Telegram?.WebApp,
  wallet: null,
  campaign: null,
  campaignRecord: null,
  profile: {
    name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Duck Recruit',
    telegramVerified: false,
    xVerified: false,
    walletVerified: false,
    tokenAccountReady: false,
    xp: 0,
    rank: '—',
    percentile: 0,
    achievements: [],
  },
  sessionStatus: 'checking',
  walletVerificationEnabled: false,
};

const fallbackCampaign = {
  id: 'unavailable', name: 'Campaign Hub', shortName: 'Campaign', sequence: 'CAMPAIGN HUB',
  status: 'DISABLED', statusLabel: 'NO ACTIVE CAMPAIGN', tagline: 'Campaign data unavailable.',
  description: 'Project Q campaign records remain safely closed.', readinessPercent: 0,
  xpCaps: { overallDaily: 0, participationDaily: 0, projectQDaily: 0 },
  releases: [], missions: [],
  stateArtwork: { DISABLED: '/campaign-app/assets/states/empty.webp' },
};

function navMarkup() {
  return NAV.map(([id,icon,label]) => `<button class="nav-button ${state.screen===id?'active':''}" data-screen="${id}" aria-label="${label}" title="${label}"><img class="nav-icon" src="${icon}" alt="" /><span class="nav-label">${label}</span></button>`).join('');
}

function gateRow(label, ok, waiting='Required') {
  return `<div class="gate-row"><span>${label}</span><b class="${ok?'ok':'wait'}">${ok?'Verified':waiting}</b></div>`;
}

function home() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const banner=c.banner?`<figure class="campaign-banner"><img src="${c.banner}" alt="${c.bannerAlt||`${c.name} campaign banner`}" /></figure>`:'';
  const stateArt=c.stateArtwork?.[c.status];
  const lifecycle=stateArt?`<figure class="campaign-state"><img src="${stateArt}" alt="${c.name} ${c.status.toLowerCase()} campaign state" /><figcaption>Project Q campaign state: ${c.status}</figcaption></figure>`:'';
  return `${lifecycle}${banner}<div class="hero-grid">
    <article class="card hero">
      <div><span class="campaign-chip">${c.statusLabel}</span><h2>${c.name.replace(' ','<br>')}.</h2><p>${c.description} ${c.tagline}</p></div>
      <div><div class="gate-row"><span>Campaign readiness</span><b class="wait">${c.status}</b></div><div class="progress"><span style="width:${c.readinessPercent}%"></span></div></div>
    </article>
    <article class="card cycle-card">
      <div><span class="label">Identity gate</span><div class="big">${[p.telegramVerified,p.xVerified,p.walletVerified].filter(Boolean).length}/3</div><small>verified credentials</small></div>
      <div class="gate">${gateRow('Telegram',p.telegramVerified)}${gateRow('Oracle X',p.xVerified,'Connect')}${gateRow('Solana wallet',p.walletVerified,'Connect')}</div>
    </article>
  </div>
  <div class="stats">
    <article class="card stat"><span class="label">Campaign XP</span><strong>${p.xp}</strong><p>Verified total</p></article>
    <article class="card stat"><span class="label">Current rank</span><strong>${p.rank}</strong><p>Combined leaderboard</p></article>
    <article class="card stat"><span class="label">Missions</span><strong>0</strong><p>Completed</p></article>
    <article class="card stat"><span class="label">Allocation</span><strong>—</strong><p>Not calculated</p></article>
  </div>
  <div class="section-head"><h2>Mission lanes</h2><span>Open after identity verification</span></div>
  <div class="mission-grid">${c.missions.slice(0,3).map(missionCard).join('')}</div>`;
}

function missionCard(mission) {
  const visual=mission.image?`<img class="mission-art" src="${mission.image}" alt="" />`:`<div class="mission-icon">${mission.icon}</div>`;
  return `<article class="card mission" data-open="missions">${visual}<h3>${mission.title}</h3><p>${mission.description}</p><div class="mission-footer"><span>${mission.status}</span><b>${mission.reward}</b></div></article>`;
}

function badgeGallery(badges=[]) {
  return `<div class="badge-gallery">${badges.map(badge=>{
    const unlocked=state.profile.achievements.includes(badge.id);
    return `<div class="achievement ${unlocked?'unlocked':'locked'}"><img src="${badge.image}" alt="${badge.label}" /><span>${unlocked?'Unlocked':'Locked'}</span></div>`;
  }).join('')}</div>`;
}

function missionsScreen() {
  const c=state.campaign||fallbackCampaign;
  return `<article class="card page-card"><div class="page-intro"><div><span class="label">Mission centre</span><h2>Every action. One verified record.</h2><p>Oracle raids, certified votes, Telegram bots, Bagwork and approved campaign missions feed one combined Project Q XP ledger.</p></div></div><div class="mission-grid">${c.missions.map(missionCard).join('')}</div><div class="identity-lock"><div><b>Complete the identity gate to participate</b><p>Verified Telegram + Oracle-linked X unlocks missions. A verified wallet unlocks holder and reward eligibility.</p></div><button class="primary" data-screen="profile">Verify identity</button></div></article>`;
}

function xpScreen() {
  const c=state.campaign||fallbackCampaign;
  const caps=c.xpCaps;
  return `<article class="card page-card"><div class="page-intro"><div><span class="label">My XP</span><h2>Auditable participation.</h2><p>Every verified action will appear here with its source, timestamp, status and daily-cap impact.</p></div><div class="score-orb"><div><strong>0</strong><small>XP</small></div></div></div><div class="stats"><div class="card stat"><span class="label">Daily total</span><strong>0 / ${caps.overallDaily}</strong><p>Overall cap</p></div><div class="card stat"><span class="label">Participation</span><strong>0 / ${caps.participationDaily}</strong><p>Daily lane cap</p></div><div class="card stat"><span class="label">Project Q</span><strong>0 / ${caps.projectQDaily}</strong><p>Daily mission cap</p></div><div class="card stat"><span class="label">Pending</span><strong>0</strong><p>Under verification</p></div></div><div class="section-head"><h2>XP achievements</h2><span>Unlocked by verified campaign records</span></div>${badgeGallery(c.xpBadges)}<div class="empty">No verified campaign XP yet. The ledger activates when the campaign readiness gate passes.</div></article>`;
}

function leaderboardScreen() {
  const c=state.campaign||fallbackCampaign;
  const rows = [['1','Duck Alpha','—'],['2','Tide Builder','—'],['3','Shell Runner','—'],['4','Signal Hunter','—'],['5','Ocean Guard','—']];
  const art=c.leaderboardIcon?`<img class="page-emblem" src="${c.leaderboardIcon}" alt="Bond the Duck leaderboards" />`:'';
  return `<article class="card page-card"><div class="page-intro"><div><span class="label">Combined leaderboard</span><h2>Consistency beats noise.</h2><p>Verified raids, voting, approved participation and Project Q campaign XP combine into one transparent ranking.</p></div>${art}</div><div class="list">${rows.map(([rank,name,xp])=>`<div class="list-row"><span class="rank">${rank}</span><div><h3>${name}</h3><p>Identity hidden until launch</p></div><b>${xp} XP</b></div>`).join('')}</div><div class="section-head"><h2>Leaderboard badges</h2><span>Calculated from finalized rankings</span></div>${badgeGallery(c.leaderboardBadges)}</article>`;
}

function rewardsScreen() {
  const c=state.campaign||fallbackCampaign;
  const releases=c.releases;
  const rewardReady=state.profile.telegramVerified&&state.profile.xVerified&&state.profile.walletVerified;
  const badge=rewardReady&&c.identityBadges?.rewards?`<img class="eligibility-art" src="${c.identityBadges.rewards}" alt="Eligible for campaign rewards" />`:'';
  const distribution=c.creatorAwardsArtwork?`<div class="section-head distribution-heading"><div><h2>Creator Awards Distribution Engine</h2><span>Separate from Bond the Duck campaign allocations</span></div></div><figure class="distribution-card"><img src="${c.creatorAwardsArtwork}" alt="FAWKQ and Project Q creator awards allocation breakdown" /><figcaption>Recurring FAWKQ creator-award allocation model. Campaign XP and Bond the Duck rewards are calculated independently.</figcaption></figure>`:'';
  return `<article class="card page-card"><div class="page-intro"><div><span class="label">Reward centre</span><h2>Your campaign allocation.</h2><p>Track preliminary eligibility, founder review, scheduled releases and public transaction receipts. Squads 2-of-3 controls every treasury transfer.</p></div>${badge}</div><div class="reward-grid">${releases.map(release=>`<div class="card reward"><span class="label">${release.label}</span><strong>${release.percent}%</strong><p>${release.detail}</p></div>`).join('')}</div><div class="identity-lock"><div><b>No allocation exists yet</b><p>Enrollment, XP earning and reward calculations remain disabled until the public readiness gate passes.</p></div><button class="secondary" data-screen="profile">Check eligibility</button></div>${distribution}</article>`;
}

function profileScreen() {
  const p=state.profile;
  const c=state.campaign||fallbackCampaign;
  const badges=c.identityBadges||{};
  const verifiedCount=[p.telegramVerified,p.xVerified,p.walletVerified].filter(Boolean).length;
  const participationReady=p.telegramVerified&&p.xVerified;
  const fullyVerified=participationReady&&p.walletVerified;
  const credential=(src,alt,ok)=>src?`<img class="credential-badge ${ok?'verified':'locked'}" src="${src}" alt="${alt}" />`:'<span class="rank">—</span>';
  const statusBadge=fullyVerified?badges.fullHero:(participationReady?badges.collective:null);
  const walletEnabled=Boolean(participationReady&&(state.walletVerificationEnabled||state.campaignRecord?.enabled));
  const telegramDetail=p.telegramVerified?'Signed Mini App session verified':(state.sessionStatus==='outside'?'Open this app from Project Q in Telegram':'Telegram verification required');
  const xDetail=p.xVerified?'Permanent Oracle X identity linked':'Complete /linkx with the CrabStar Oracle, then refresh';
  const walletDetail=p.walletVerified?`Ownership verified · ${short(state.wallet)}`:(state.wallet?short(state.wallet):(walletEnabled?'Connect and sign a no-transaction message':(participationReady?(state.walletVerificationEnabled?'Secure devnet verification available':'Available when campaign opens'):'Complete Telegram and X first')));
  return `<article class="card page-card"><div class="page-intro"><div><span class="label">Participant identity</span><h2>${escapeHtml(p.name)}</h2><p>One Telegram identity, one Oracle-verified X account and one verified Solana reward wallet.</p></div>${statusBadge?`<img class="identity-status-art" src="${statusBadge}" alt="${fullyVerified?'Fully verified identity':'Collective verified community member'}" />`:`<div class="score-orb"><div><strong>${verifiedCount}/3</strong><small>verified</small></div></div>`}</div>
  <section class="onboarding-panel" aria-label="Identity onboarding">
    <div class="onboarding-head"><div><span class="label">Verification path</span><h3>${fullyVerified?'Fully Verified':'Complete your Project Q ID'}</h3></div><b>${verifiedCount}/3</b></div>
    <div class="progress"><span style="width:${Math.round((verifiedCount/3)*100)}%"></span></div>
    <div class="onboarding-steps">
      <article class="onboarding-step ${p.telegramVerified?'complete':'current'}"><span>1</span><div><b>Telegram identity</b><p>${telegramDetail}</p></div><strong>${p.telegramVerified?'Verified':'Required'}</strong></article>
      <article class="onboarding-step ${p.xVerified?'complete':(p.telegramVerified?'current':'locked')}"><span>2</span><div><b>Oracle X identity</b><p>${xDetail}</p></div><button class="secondary" id="oracle-link">${p.xVerified?'Open Oracle':'Verify X'}</button></article>
      <article class="onboarding-step ${p.walletVerified?'complete':(walletEnabled?'current':'locked')}"><span>3</span><div><b>Solana reward wallet</b><p>${walletDetail}</p></div><button class="secondary" id="profile-wallet" ${walletEnabled?'':'disabled'}>${p.walletVerified?'Verified':(walletEnabled?'Connect':'Locked')}</button></article>
    </div>
    ${p.telegramVerified?`<button class="text-action" id="identity-refresh">Refresh verification status</button>`:''}
    ${fullyVerified?`<div class="fully-verified"><img src="${badges.full}" alt="Fully verified" /><div><b>Campaign identity complete</b><p>Telegram, Oracle X and wallet ownership are verified. Reward eligibility still follows the published campaign rules and token-account snapshot.</p></div></div>`:''}
  </section>
  <div class="identity-lock"><div><b>Campaign access: ${participationReady?'Identity ready':'Locked'}</b><p>${participationReady?(p.walletVerified?'Fully verified for wallet-gated eligibility checks.':'Participation identity is ready. Wallet verification opens with the campaign.'):'Complete Telegram and Oracle X verification to unlock participation.'}</p></div></div></article>`;
}

const screens={home,missions:missionsScreen,xp:xpScreen,leaderboard:leaderboardScreen,rewards:rewardsScreen,profile:profileScreen};
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]))}
function short(v){return `${v.slice(0,5)}…${v.slice(-5)}`}
function bytesToBase64(bytes){let binary='';bytes.forEach(byte=>{binary+=String.fromCharCode(byte)});return btoa(binary)}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
function render(){const c=state.campaign||fallbackCampaign;document.querySelector('#desktop-nav').innerHTML=navMarkup();document.querySelector('#mobile-nav').innerHTML=navMarkup();document.querySelector('#screen').innerHTML=screens[state.screen]();document.querySelector('#screen-title').textContent=state.screen==='home'?c.name:(NAV.find(n=>n[0]===state.screen)?.[2]||c.name);document.querySelector('#campaign-sequence').textContent=`PROJECT Q / ${c.sequence}`;document.title=`Project Q — ${c.name}`;bind();}
function go(screen){if(!screens[screen])return;state.screen=screen;history.replaceState(null,'',`#${screen}`);render();state.telegram?.HapticFeedback?.impactOccurred('light');}

async function connectWallet(){
  if(!state.walletVerificationEnabled&&!state.campaignRecord?.enabled){toast('Wallet verification is currently disabled.');return;}
  const provider=window.phantom?.solana||window.solflare||window.backpack;
  if(!provider){toast('Open in Phantom, Solflare or Backpack to connect securely.');window.open('https://phantom.app/','_blank');return;}
  try{
    const result=await provider.connect();
    state.wallet=(result?.publicKey||provider.publicKey)?.toString();
    state.profile.walletVerified=false;
    render();
    const initData=state.telegram?.initData;
    if(!initData){toast('Open through Project Q in Telegram to verify this wallet.');return;}
    const challengeResponse=await fetch('/campaign-app/api/wallet/challenge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData})});
    if(!challengeResponse.ok)throw new Error('challenge');
    const challenge=await challengeResponse.json();
    if(typeof provider.signMessage!=='function'){toast('This wallet does not support message signing here.');return;}
    const signed=await provider.signMessage(new TextEncoder().encode(challenge.message),'utf8');
    const signature=bytesToBase64(signed.signature||signed);
    const verifyResponse=await fetch('/campaign-app/api/wallet/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData,nonce:challenge.nonce,wallet:state.wallet,signature})});
    if(!verifyResponse.ok)throw new Error('verify');
    state.profile.walletVerified=true;
    toast('Wallet ownership verified. No transaction was authorized.');
    await authenticateTelegram();
    render();
  }catch{toast('Wallet connection or ownership verification was cancelled.');}
}

function bind(){
  document.querySelectorAll('[data-screen]').forEach(el=>el.onclick=()=>go(el.dataset.screen));
  document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>go(el.dataset.open));
  const wb=document.querySelector('#wallet-button');wb.onclick=connectWallet;if(state.wallet){wb.textContent=short(state.wallet);wb.classList.add('connected');}
  document.querySelector('#profile-wallet')?.addEventListener('click',connectWallet);
  document.querySelector('#identity-refresh')?.addEventListener('click',async()=>{
    state.sessionStatus='checking';
    await authenticateTelegram();
    render();
    toast(state.profile.xVerified?'Oracle X identity confirmed.':'X identity not linked yet.');
  });
  document.querySelector('#oracle-link')?.addEventListener('click',()=>window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/crabstar_oracle_bot')||window.open('https://t.me/crabstar_oracle_bot','_blank'));
}

async function loadCampaign(){
  try{
    const registry=await fetch('/campaign-app/campaigns/index.json').then(r=>r.json());
    const requested=new URLSearchParams(location.search).get('campaign')||registry.defaultCampaign;
    const record=registry.campaigns.find(c=>c.id===requested&&c.visible);
    if(!record){state.campaign=fallbackCampaign;return;}
    state.campaignRecord=record;
    state.campaign=await fetch(`/campaign-app/campaigns/${record.file}`).then(r=>r.json());
    if(record.archived){state.campaign.status='ARCHIVED';state.campaign.statusLabel='CAMPAIGN ARCHIVE';}
    if(!record.enabled&&!record.archived){state.campaign.status='DRAFT';}
  }catch{state.campaign=fallbackCampaign;}
}

async function authenticateTelegram(){
  const initData=state.telegram?.initData;
  if(!initData){state.sessionStatus='outside';return false;}
  state.sessionStatus='checking';
  try{
    const response=await fetch('/campaign-app/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData})});
    if(!response.ok){state.sessionStatus='error';return false;}
    const session=await response.json();
    state.profile.name=session.user.firstName||session.user.username||'Duck Recruit';
    state.profile.telegramVerified=true;
    state.profile.xVerified=Boolean(session.participant?.xVerified);
    state.profile.walletVerified=Boolean(session.participant?.walletVerified);
    state.profile.tokenAccountReady=Boolean(session.participant?.tokenAccountReady);
    state.walletVerificationEnabled=Boolean(session.capabilities?.walletVerification);
    state.wallet=session.participant?.rewardWallet||null;
    state.profile.xp=Number(session.participant?.totalXp||0);
    state.sessionStatus='verified';
    return true;
  }catch{
    state.sessionStatus='error';
    return false;
  }
}

async function boot(){
  const splashStarted=performance.now();
  state.telegram?.ready();
  state.telegram?.expand();
  state.telegram?.onEvent?.('activated',async()=>{
    await authenticateTelegram();
    render();
  });
  state.screen=location.hash.slice(1) in screens?location.hash.slice(1):'home';
  await Promise.all([loadCampaign(),authenticateTelegram()]);
  render();
  const remaining=Math.max(0,650-(performance.now()-splashStarted));
  setTimeout(()=>document.body.classList.remove('loading'),remaining);
}
boot();
