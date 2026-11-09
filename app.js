'use strict';
const $=id=>document.getElementById(id), params=new URLSearchParams(location.search);
const replay=params.get('replay')==='true', sessionID=params.get('sessionID'), host=params.get('rgs_url');
const live=Boolean(sessionID||host)&&!replay;
let config,balance=1000e6,bet=1e6,currency='CR',busy=true,blocked=false,turbo=false,sound=false,ctx,jurisdiction={},levels=[10000,20000,50000,100000,200000,500000,1000000,2000000,5000000,10000000,20000000,50000000,100000000],modeCosts={base:1,surge:75,fracture:100,echo:150,eclipse:300},modeMax={},demoCache={},replayRound;
const paths=[
'<path d="M50 12 78 50 50 88 22 50Z"/><path d="m50 29 13 21-13 21-13-21Z" fill="#142a36"/><path d="M50 12v17m0 42v17" stroke="#fff3b8"/>',
'<path d="m21 79 27-58 31 32-58 26Z"/><path d="m31 70 27-27m-39 8 17-30m19 59 26-18" fill="none" stroke-width="5"/><circle cx="56" cy="45" r="13" fill="#f1dd9c"/>',
'<path d="M68 15A36 36 0 1 0 83 72 32 32 0 0 1 68 15Z"/><path d="m72 28 3 8 9 1-7 5 2 9-7-5-8 5 3-9-7-5 9-1Z" fill="#f5e5af"/>',
'<path d="M29 24h42l-5 28-12 10v15h15v7H31v-7h15V62L34 52Z"/><path d="M29 30H17q-2 24 20 23m34-23h12q2 24-20 23" fill="none" stroke-width="6"/><path d="m50 27 7 12-7 12-7-12Z" fill="#d9f8e9"/>',
'<path d="m50 72-27 11 8-26-19-26 27 9L50 15l11 25 27-9-19 26 8 26Z"/><path d="m50 32-9 21 9 17 9-17Z" fill="#fce3a6"/><path d="m28 90 22-15 22 15" fill="none" stroke-width="4"/>',
'<path d="m19 33 19 14 12-25 12 25 19-14-8 38H27Z"/><path d="M27 78h46" stroke-width="7"/><path d="m50 49 7 11-7 9-7-9Z" fill="#ffecc0"/><circle cx="19" cy="29" r="4"/><circle cx="81" cy="29" r="4"/><circle cx="50" cy="18" r="4"/>',
'<circle cx="50" cy="46" r="29" fill="#15242d" stroke="#ffe4a4" stroke-width="6"/><path d="M56 18a28 28 0 0 1 0 56 25 25 0 0 0 0-56" fill="#f1d59a"/><text x="50" y="91" fill="#ffe7ad" stroke="none" font-size="14" text-anchor="middle" font-family="Georgia">WILD</text>'
];
const colors=['#79c4d2','#a6a6e4','#9fcedd','#77cdb5','#dd9c68','#d7bc7a','#edda9e'];
function icon(s){return `<svg viewBox="0 0 100 100" aria-hidden="true" fill="${colors[s]}" stroke="${colors[s]}" stroke-width="1.5">${paths[s]}</svg>`;}
function draw(board,cores=[],wins=[]){
 $('reels').innerHTML=board.map((col,c)=>`<div class="reel">${col.map((s,r)=>`<div class="cell ${s===6?'wild':''} ${wins.some(w=>c<w.length&&(s===w.symbol||s===6))?'hit':''}" title="${s===6?'Wild':config.names[s]}">${icon(s)}</div>`).join('')}</div>`).join('');
 $('cores').innerHTML=Array.from({length:6},(_,i)=>`<div class="core ${cores[i]?'on':''}" aria-label="Core ${i+1} ${cores[i]?'active':'inactive'}">◈</div>`).join('');
 $('ways').textContent=board.reduce((n,c)=>n*c.length,1).toLocaleString()+' WAYS';
}
function money(n,win=false){let v=n/1e6;let digits=win&&v!==0&&Math.abs(v)<.1?4:2;return v.toFixed(digits)+' '+currency;}
function update(){ $('balance').textContent=money(balance);$('bet').textContent=money(bet); ['spin','plus','minus','buy'].forEach(id=>$(id).disabled=busy||blocked||(replay&&id!=='spin'));}
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function pause(ms){return new Promise(r=>setTimeout(r,turbo?Math.min(ms,100):ms));}
function chime(win){if(!sound)return;ctx||=new AudioContext();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=win?660:180;g.gain.setValueAtTime(.055,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.3);}
function rgsOrigin(){if(!host||!/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(host))throw Error('Missing or invalid RGS launch host.');return 'https://'+host;}
async function api(path,body){const response=await fetch(rgsOrigin()+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionID,...body})});if(!response.ok)throw Error(`Server request failed (${response.status}). Reload to recover the round.`);return response.json();}
function eventsOf(round){const state=round.state??round.events;const events=Array.isArray(state)?state:state?.events;if(!Array.isArray(events)||!events.length)throw Error('Server returned an unsupported outcome. Reload to recover.');return events;}
function validateEvents(events){
 let sum=0,final;
 for(const e of events){if(e.type==='spin'){
 if(!Array.isArray(e.board)||e.board.length!==6||e.board.some(c=>!Array.isArray(c)||c.length<4||c.length>8||c.some(s=>!Number.isInteger(s)||s<0||s>6)))throw Error('Invalid server board.');
 if(!Number.isSafeInteger(e.win)||e.win<0)throw Error('Invalid server payout.');sum+=e.win;
 }else if(e.type==='finalWin')final=e.amount;else if(!['bonusStart','bonusEnd'].includes(e.type))throw Error('Unsupported server event.');}
 if(final!==sum||sum>config.cap)throw Error('Server payout validation failed.');return sum;
}
async function animate(events,track=false,start=0){
 let total=events.slice(0,start).filter(e=>e.type==='spin').reduce((s,e)=>s+e.win,0);let remaining=0,feature='';
 // Reconstruct the bonus banner when resuming mid-round.
 for(const e of events.slice(0,start)){if(e.type==='bonusStart'){remaining=e.spins;feature=e.feature;}if(e.type==='spin'&&feature)remaining--;}
 for(let i=start;i<events.length;i++){
  const e=events[i];
  if(e.type==='bonusStart'){remaining=e.spins;feature=e.feature;message(`${feature.toUpperCase()} AWAKENED · ${remaining} FREE SPINS`);chime(true);await pause(1100);}
  if(e.type==='spin'){
   $('phase').textContent=feature?`${feature.toUpperCase()} · ${remaining--} SPINS`:'BASE GAME';
   document.querySelectorAll('.reel').forEach(c=>c.classList.add('rolling'));await pause(450);
   draw(e.before,e.cores);await pause(300);
   if(e.modifier){message(e.modifier.toUpperCase()+' · CORE REACTION');await pause(300);}
   draw(e.board,e.cores,e.wins);total+=e.win;$('win').textContent=money(Math.round(bet*total/100),true);chime(e.win>0);await pause(e.win?650:250);
  }
  if(e.type==='bonusEnd'){feature='';message('FORGE COMPLETE');await pause(600);}
  if(e.type==='finalWin'){message(total>0?`ROUND WIN ${money(Math.round(bet*total/100),true)}${total===config.cap?' · WIN LIMIT REACHED':''}`:'The forge rests. Spin to awaken it.');$('win').textContent=money(Math.round(bet*total/100),true);}
  // Progress is saved after presentation. A failed checkpoint leaves the round recoverable.
  if(track)await api('/bet/event',{event:String(i+1)});
 }
 $('phase').textContent=replay?'ROUND REPLAY':'BASE GAME';return total;
}
async function settle(round){if(round.active){const r=await api('/wallet/end-round',{});balance=r.balance.amount;currency=r.balance.currency;}}
async function run(mode='base'){
 if(busy||blocked)return;busy=true;update();$('modal').close();
 try{
  if(replay){await animate(eventsOf(replayRound));$('spin').innerHTML='↻<small>AGAIN</small>';return;}
  const cost=modeCosts[mode];if(!cost)throw Error('Mode is unavailable.');
  if(live&&modeMax[mode]&&bet>modeMax[mode])throw Error('Base bet exceeds the limit for this mode.');
  if(balance<bet*cost)throw Error('Insufficient balance for this bet.');
  let round;
  if(live){const r=await api('/wallet/play',{amount:bet,mode});balance=r.balance.amount;round=r.round;}
  else{if(!demoCache[mode])demoCache[mode]=await fetch(`demo_${mode}.json`).then(r=>{if(!r.ok)throw Error('Demo data unavailable. Serve the folder over HTTP.');return r.json();});const a=new Uint32Array(1);crypto.getRandomValues(a);const b=demoCache[mode][Math.floor(a[0]/2**32*demoCache[mode].length)];round={state:b.events};balance-=bet*cost;}
  update();const events=eventsOf(round);validateEvents(events);const paid=await animate(events,live&&round.active);
  if(live)await settle(round);else balance+=Math.round(bet*paid/100);
 }catch(e){message(e.message,true);if(live){blocked=true;message(e.message+' Reload before continuing.',true);}}
 finally{busy=false;update();}
}
function modal(html){$('modalContent').innerHTML=html;$('modal').showModal();}
function showRules(){
 modal(`<span class="eyebrow">RUTHLESS GAMING</span><h2>Ruthless Eclipse</h2><p>Six reels, four rows, 4,096 initial ways. Match a symbol on at least three consecutive reels, starting on the left. The longest consecutive match pays for each symbol; matching counts multiply across the winning reels. Wilds substitute for all six paying symbols and never originate on reel one.</p><h3>Core reactions</h3><p>In the base game, 1 core activates Surge (all wild-bearing reels expand to four wilds); 2 activate Fracture (each wild becomes two positions); 3 activate Echo (wild positions copy onto the reel to the right, or left from reel six). Echo copies use a snapshot of the original wild-bearing reels and cannot spread onto reel one. With 4–6 cores the base board is paid without a modifier, then free spins begin.</p><p>4 cores: 10 Surge spins. 5 cores: 8 Echo spins. 6 cores: 6 Eclipse spins. Eclipse applies Surge, then Echo, then Fracture. During free spins the chosen modifier is always active. Cores in free spins are decorative and do not retrigger or award extra spins.</p><h3>Paytable · multiples of base bet per way</h3><table><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th><th>6</th></tr>${config.names.map((n,i)=>`<tr><td>${n.toUpperCase()}</td>${config.paytable[i].map(v=>`<td>${v/100}×</td>`).join('')}</tr>`).join('')}</table><h3>Feature entry</h3><p>Surge: 75× base bet / 10 spins. Fracture: 100× / 10 spins. Echo: 150× / 8 spins. Eclipse: 300× / 6 spins. Every paid mode has 96.00% theoretical RTP relative to its full cost. No ante bet or player choices affect the outcome. The total round limit is 20,000× base bet, including the base spin and all free spins. Payouts are truncated at this limit; remaining spins may be shown with zero additional award.</p><p>High volatility. RTP describes a long-run mathematical average, not a promised session result. Local preview uses a compact stratified sample of the outcome catalog; its RTP and rare-event frequency differ from the full server distribution. In a server session all outcomes and settlements come from the RGS.</p><p class="disclaimer">Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.</p>`);
}
$('rules').onclick=showRules;$('close').onclick=()=>$('modal').close();$('spin').onclick=()=>run();
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫ ON':'♫ OFF';chime(true);};
$('turbo').onclick=()=>{if(jurisdiction.disabledTurbo)return;turbo=!turbo;$('turbo').innerHTML='ϟ<small>TURBO '+(turbo?'ON':'OFF')+'</small>';};
function changeBet(d){if(busy||blocked||replay)return;let i=levels.indexOf(bet);if(i<0)i=0;bet=levels[Math.max(0,Math.min(levels.length-1,i+d))];update();}
$('minus').onclick=()=>changeBet(-1);$('plus').onclick=()=>changeBet(1);
$('buy').onclick=()=>{if(busy||blocked||replay)return;modal(`<span class="eyebrow">ENTER THE FORGE</span><h2>Choose your reaction</h2><p>Base bet ${money(bet)}. Each button opens a cost confirmation.</p>${['surge','fracture','echo','eclipse'].filter(m=>modeCosts[m]).map(m=>`<button class="mode" data-mode="${m}">${m.toUpperCase()} · ${money(bet*modeCosts[m])}<small>${modeCosts[m]}× BASE BET · ${m==='echo'?8:m==='eclipse'?6:10} FREE SPINS</small></button>`).join('')}`);document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{let m=b.dataset.mode;modal(`<h2>${m.toUpperCase()}</h2><p>Enter this feature for <strong>${money(bet*modeCosts[m])}</strong>?</p><button id="confirm" class="mode">CONFIRM ${money(bet*modeCosts[m])}</button>`);$('confirm').onclick=()=>run(m);});};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!$('modal').open&&e.target===document.body){e.preventDefault();run();}});
async function boot(){
 try{
 config=await fetch('config.json').then(r=>{if(!r.ok)throw Error('Configuration unavailable.');return r.json();});
 draw([[0,1,2,3],[3,5,4,0],[2,6,6,1],[4,0,3,2],[1,2,5,4],[5,3,0,1]]);
 if(replay){
  currency=params.get('currency')||'CR';const amount=Number(params.get('amount'));bet=Number.isSafeInteger(amount)&&amount>0?amount:1e6;
  ['plus','minus','buy'].forEach(id=>$(id).hidden=true);$('balance').parentElement.hidden=true;$('session').textContent='ROUND REPLAY';
  const parts=['game','version','mode','event'].map(k=>{const v=params.get(k);if(!v)throw Error('Incomplete replay link.');return encodeURIComponent(v);});
  const response=await fetch(rgsOrigin()+'/bet/replay/'+parts.join('/'));if(!response.ok)throw Error('Replay could not be loaded.');replayRound=await response.json();validateEvents(eventsOf(replayRound));
  message(`Replay ready · ${params.get('mode')} · TOTAL COST ${money(bet*replayRound.costMultiplier)}`);$('spin').innerHTML='▷<small>PLAY</small>';
 }else if(live){
  if(!sessionID||!host)throw Error('Incomplete launch parameters.');$('session').textContent='CONNECTING TO ENGINE';
  const r=await api('/wallet/authenticate',{});balance=r.balance.amount;currency=r.balance.currency;jurisdiction=r.config.jurisdiction||{};
  const c=r.config;levels=(c.betLevels?.length?c.betLevels:[c.minBet]).filter(v=>Number.isSafeInteger(v)&&v>=c.minBet&&v<=c.maxBet&&v%c.stepBet===0).sort((a,b)=>a-b);if(!levels.length)throw Error('No valid bet levels.');bet=levels.includes(c.defaultBetLevel)?c.defaultBetLevel:levels[0];
  if(c.gameModes){const entries=Array.isArray(c.gameModes)?c.gameModes.map(m=>[m.name,m]):Object.entries(c.gameModes);modeCosts={};for(const [name,m]of entries){const expected=config.modes.find(v=>v.name===name);if(!expected)continue;if(m.costMultiplier!==expected.cost)throw Error('Server mode costs do not match game configuration.');modeCosts[name]=m.costMultiplier;modeMax[name]=m.maxBet;}}
  if(jurisdiction.disabledTurbo)$('turbo').hidden=true;
  $('session').textContent='ENGINE SESSION · '+currency;
  if(r.round?.active){bet=r.round.amount||bet;const ev=eventsOf(r.round);validateEvents(ev);const start=Number(r.round.event);await animate(ev,true,Number.isInteger(start)&&start>=0&&start<=ev.length?start:0);await settle(r.round);}
 }else{message('Local preview · play credits only');}
 busy=false;update();
 }catch(e){busy=false;blocked=true;message(e.message,true);update();}
}
boot();
