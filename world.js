/* Akhil Roy's little living village. Original canvas artwork, no external assets. */
(() => {
  'use strict';
  const canvas = document.getElementById('villageCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const landscape = document.createElement('canvas');
  const land = landscape.getContext('2d', { alpha: false });
  const KEY = 'akhil.pixelVillage.v1';
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const weathers = ['clear', 'rain', 'snow'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { season: 'spring', weather: 'clear', night: false, paused: reducedMotion.matches, effects: true, sound: false, wood: 0, population: 4, day: 1, stage: 0 };
  let W = 640, H = 400, S = 1, mobile = false, elapsed = 0, dayClock = 0, lastFrame = 0, frame = 0, dirty = true, saveClock = 0, audio = null, shelterAmount = 0;
  let randomSeed = 731093, replay = null, greeting = null, greetingClock = 0, soundClock = 0;
  const greetings = new Map();
  const characterLore = [
    { id: 'ravi', name: 'Ravi', role: 'Woodcutter', bio: 'Knows every path through the grove. Brings home the wood that helps this little village grow.', hello: 'One good log at a time. The next roof is already taking shape.', silly: 'Ravi has named his favourite log Sir Planks-a-Lot. It is apparently a very good listener.' },
    { id: 'meera', name: 'Meera', role: 'Farmer', bio: 'Tends the field, swaps seeds at the market and always leaves a little grain for the birds.', hello: 'The field is looking promising. Shall we save you a place at the harvest table?', silly: 'Meera has appointed a chicken Head of Crop Inspection. Its first report says: more snacks.' },
    { id: 'kabir', name: 'Kabir', role: 'Herder', bio: 'Keeps the animals close and the pace unhurried. Usually followed by a very opinionated cow.', hello: 'Three cows, five chickens, and somehow I am the one being supervised.', silly: 'Kabir insists the cows have started a book club. They are currently discussing the grass.' },
    { id: 'tara', name: 'Tara', role: 'Builder', bio: 'Looks after the well, repairs the market and turns the woodcutter’s deliveries into a new home.', hello: 'A sturdy foundation and a little patience. That is how we build here.', silly: 'Tara has invented a door that opens both ways. The village is calling it a breakthrough.' },
    { id: 'asha', name: 'Asha', role: 'New neighbour', bio: 'Moved into the new hut and planted a sapling nearby. Every growing village needs a fresh perspective.', hello: 'A new home, a young tree and a whole village to get to know.', silly: 'Asha tried to teach the sapling to wave. The wind has agreed to help.' },
  ];
  const random = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296; };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (v, fallback, lo, hi) => Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
  const pixel = (c, x, y, width, height, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height))); };
  const polygon = (c, points, color) => { c.fillStyle = color; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(Math.round(p[0]), Math.round(p[1])) : c.moveTo(Math.round(p[0]), Math.round(p[1]))); c.closePath(); c.fill(); };
  const rect = (c, x, y, width, height, color) => pixel(c, x, y, width, height, color);
  const eventDefinitions = {
    spring: { id: 'spring-market', title: 'Banyan market', description: 'Flower baskets and fresh bunting brighten the market for three village days.' },
    summer: { id: 'summer-kites', title: 'Kite afternoon', description: 'A small kite takes to the warm sky while the village finds its summer rhythm.' },
    autumn: { id: 'autumn-harvest', title: 'Harvest gathering', description: 'Grain bundles arrive at the market. Look near the river for a curious fox.' },
    winter: { id: 'winter-lanterns', title: 'Lantern evening', description: 'Little lanterns add a warm welcome around the well and market.' },
  };
  const currentEvent = () => ({ ...eventDefinitions[state.season], active: (state.day - 1) % 8 < 3 });
  const publicState = () => ({ ...state, replay: Boolean(replay), event: currentEvent() });
  function restore() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!stored || stored.version !== 1) return;
      if (seasons.includes(stored.season)) state.season = stored.season;
      if (weathers.includes(stored.weather)) state.weather = stored.weather;
      ['night', 'effects'].forEach(k => { if (typeof stored[k] === 'boolean') state[k] = stored[k]; });
      state.paused = reducedMotion.matches || stored.paused === true;
      state.wood = Math.floor(finite(stored.wood, 0, 0, 999));
      state.stage = Math.floor(finite(stored.stage, 0, 0, 2));
      state.population = state.stage === 2 ? 5 : 4;
      state.day = Math.floor(finite(stored.day, 1, 1, 99999));
      elapsed = finite(stored.elapsed, 0, 0, 10000000);
      dayClock = finite(stored.dayClock, 0, 0, 89.999);
    } catch (_) { /* Private browsing and blocked storage still get a living world. */ }
  }
  restore();
  shelterAmount = state.night || state.weather !== 'clear' ? 1 : 0;
  function persist() {
    if (replay) return;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, ...state, sound: false, elapsed, dayClock, actors: workers.map(w => ({ x: w.x, y: w.y, target: w.target, wait: w.wait })) })); } catch (_) { /* Storage is optional. */ }
  }
  function announce() { document.dispatchEvent(new CustomEvent('worldchange', { detail: publicState() })); }
  function changed(repaint = true) { if (repaint) dirty = true; persist(); announce(); render(); }
  function safeTrees(trees) {
    if (!Array.isArray(trees)) return [];
    const occupied = new Set();
    return trees.slice(0, 100).filter(t => {
      if (!t || !Number.isInteger(t.plot) || t.plot < 0 || t.plot > 5 || occupied.has(t.plot)) return false;
      occupied.add(t.plot); return true;
    }).slice(0, 6).map(t => ({ id: String(t.id || t.plot).slice(0, 80), initials: String(t.initials || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'G', plot: t.plot, plantedAt: typeof t.plantedAt === 'string' && Number.isFinite(Date.parse(t.plantedAt)) ? t.plantedAt.slice(0, 40) : finite(t.plantedAt, 0, 0, 99999999999999), day: Math.floor(finite(t.day, state.day, 1, 99999)) }));
  }
  function currentTrees() {
    if (replay) return replay.frames[replay.index].trees;
    try { return safeTrees(window.villageJournal?.getTrees?.()); } catch (_) { return []; }
  }

  function palette() {
    const season = {
      spring: { grass: '#adbd86', light: '#bdcb98', shade: '#98ad76', field: '#b8c87b', leaf: '#426848', leafLight: '#648453', blossom: '#ecc7b4', dirt: '#cfbf8b' },
      summer: { grass: '#a9b47b', light: '#c0c78d', shade: '#8f9f67', field: '#d3bd70', leaf: '#3d6244', leafLight: '#627d48', blossom: '#d8cb85', dirt: '#d3bf8a' },
      autumn: { grass: '#b7ad7c', light: '#c9bd8d', shade: '#a0966a', field: '#c5a269', leaf: '#936d43', leafLight: '#b38c51', blossom: '#d3ad64', dirt: '#d3bb89' },
      winter: { grass: '#dce1ce', light: '#edf0df', shade: '#becbb7', field: '#bac3a5', leaf: '#496959', leafLight: '#799080', blossom: '#edf0df', dirt: '#cbc9ab' },
    }[state.season];
    return { ...season, sky: state.night ? '#172b35' : '#f4efdf', mountainFar: state.night ? '#334953' : '#cbd5c3', mountain: state.night ? '#31484c' : '#afc0ad', mountainShade: state.night ? '#243d42' : '#99af9b', river: state.night ? '#31585b' : '#669d95', riverLight: state.night ? '#567c7d' : '#96bcb0' };
  }

  function local(c, x, y, scale, draw) { c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale); draw(); c.restore(); }
  function shadow(c, x, y, width, depth = 5) { polygon(c, [[x - width / 2, y], [x + width / 2, y], [x + width / 2 + 10, y + depth], [x - width / 2 + 8, y + depth]], '#344b3222'); }
  function tree(c, x, y, size = 1, kind = 'round', p = palette()) {
    local(c, x, y, S * size, () => {
      shadow(c, 0, 0, 28, 5);
      rect(c, -3, -34, 6, 35, '#6b6745'); rect(c, 1, -33, 3, 34, '#514f37');
      rect(c, -8, -26, 7, 3, '#6b6745'); rect(c, -9, -34, 3, 10, '#6b6745'); rect(c, 3, -24, 8, 3, '#514f37');
      if (kind === 'pine') {
        [[-8, -64, 16, 9], [-12, -56, 24, 9], [-16, -48, 32, 10], [-20, -39, 40, 10], [-22, -31, 44, 8]].forEach(r => rect(c, ...r, p.leaf));
        [[-8, -64, 8, 7], [-12, -55, 12, 6], [-16, -46, 16, 6], [-20, -37, 18, 5]].forEach(r => rect(c, ...r, p.leafLight));
      } else {
        [[-15, -59, 29, 8], [-23, -52, 43, 15], [-27, -41, 50, 14], [-21, -29, 42, 8], [-12, -22, 28, 6]].forEach(r => rect(c, ...r, p.leaf));
        [[-15, -59, 23, 6], [-22, -51, 16, 9], [-12, -49, 23, 7], [-25, -39, 15, 8], [-15, -34, 12, 5]].forEach(r => rect(c, ...r, p.leafLight));
        [[16, -47, 8, 11], [8, -27, 12, 6], [-2, -23, 11, 7]].forEach(r => rect(c, ...r, state.season === 'autumn' ? '#785c3c' : '#355a41'));
        if (state.season === 'spring') [[-12,-53],[8,-44],[-20,-34],[4,-29],[-3,-47]].forEach(pt => { rect(c, pt[0], pt[1], 3, 2, p.blossom); rect(c, pt[0]+1,pt[1]-1,1,4,p.blossom); });
      }
      if (state.season === 'winter') { rect(c,-16,-55,29,3,'#edf0df');rect(c,-24,-38,15,3,'#edf0df');rect(c,5,-29,17,3,'#edf0df'); }
    });
  }
  function bush(c, x, y, width, p) { rect(c, x + 3, y - 5, width - 6, 9, p.leafLight); rect(c, x, y - 2, width, 7, p.leaf); rect(c, x + 3, y - 4, width / 2, 3, p.leafLight); }
  function hut(c, x, y, kind = 'home', scale = 1) {
    local(c, x, y, S * scale, () => {
      const wide = kind === 'store' ? 47 : 40;
      shadow(c,0,0,wide+13,7);
      rect(c,-wide/2,-31,wide,31,'#e2c897'); rect(c,wide/2-8,-30,8,30,'#c4a575');
      rect(c,-wide/2,-8,wide,8,'#c1a879');rect(c,-wide/2,-2,wide,3,'#b29a6d');
      polygon(c,[[-wide/2-7,-31],[-8,-53],[9,-53],[wide/2+8,-31]],'#a36548');
      polygon(c,[[-8,-53],[9,-53],[wide/2+8,-31],[2,-31]],'#8b513c');
      rect(c,-wide/2-6,-32,wide+13,4,'#794c39');
      for(let row=0;row<4;row++){ const left=-wide/2+row*5; const len=wide-row*10; rect(c,left-1,-35-row*4,len+7,1,'#c1875b'); }
      if(kind === 'store') { rect(c,-10,-25,20,25,'#6c6244'); rect(c,-8,-23,7,23,'#8c7c52'); rect(c,2,-23,6,23,'#7d704b'); rect(c,-9,-11,18,2,'#a3986a'); }
      else { rect(c,-5,-22,10,22,'#60513d');rect(c,-4,-21,3,20,'#78613e');rect(c,2,-11,1,2,'#d7bb79'); }
      [-15,11].forEach(wx=>{rect(c,wx,-23,7,8,'#826548');rect(c,wx+1,-22,5,6,state.night?'#f3cb7d':'#778f80');rect(c,wx+3,-22,1,6,'#776142');});
      rect(c,-9,0,18,2,'#baa678');
      rect(c,-23,-3,5,4,'#b28052');rect(c,-22,-8,3,5,'#77925c');
      if(state.season==='winter') { polygon(c,[[-wide/2-5,-32],[-8,-53],[9,-53],[13,-48],[-7,-48],[-wide/2+1,-31]],'#edf0df'); }
    });
  }
  function temple(c,x,y){local(c,x,y,S,()=>{
    shadow(c,0,2,42,7);rect(c,-23,-1,46,5,'#bbaf89');rect(c,-20,-5,40,4,'#d0c49d');rect(c,-17,-30,34,25,'#e6d7b4');rect(c,10,-30,7,25,'#c7b894');
    rect(c,-20,-34,40,5,'#b5865c');rect(c,-15,-39,30,5,'#d4b88b');rect(c,-13,-44,26,5,'#d3b085');rect(c,-11,-49,22,5,'#d8bb92');rect(c,-8,-55,16,6,'#d9bf98');rect(c,-5,-61,10,6,'#dfcaa5');rect(c,-2,-67,4,6,'#b98a51');rect(c,-1,-81,1,15,'#8a6848');polygon(c,[[0,-81],[15,-77],[0,-72]],'#bc774c');
    rect(c,-6,-22,12,17,'#786e53');rect(c,-4,-26,8,4,'#786e53');rect(c,-2,-21,4,16,state.night?'#e7b969':'#544e3c');rect(c,-13,-23,3,17,'#f0e1bd');rect(c,10,-23,3,17,'#d5c59f');rect(c,-10,-7,20,2,'#b8a67e');
    for(let i=0;i<4;i++)rect(c,-12+i*7,-30,3,2,'#eddcbc');
  });}
  function well(c,x,y){local(c,x,y,S,()=>{
    shadow(c,0,0,29);rect(c,-12,-9,25,10,'#949782');rect(c,-14,-11,29,5,'#c3c5aa');rect(c,-9,-12,19,4,'#527c72');rect(c,-11,-7,6,3,'#b4b89e');rect(c,1,-3,7,3,'#c0c0a4');rect(c,-13,-34,3,26,'#827049');rect(c,11,-34,3,26,'#695e40');rect(c,-15,-35,31,3,'#9d7e50');rect(c,-1,-34,1,22,'#c4b984');rect(c,-3,-32,5,5,'#665d44');rect(c,6,-7,4,4,'#bbaa78');
  });}
  function market(c,x,y){local(c,x,y,S,()=>{
    shadow(c,0,2,49);rect(c,-21,-28,3,28,'#8d7650');rect(c,19,-28,3,28,'#756345');polygon(c,[[-27,-25],[-19,-38],[20,-38],[27,-25]],'#cd9d69');for(let i=0;i<5;i++)polygon(c,[[-26+i*11,-25],[-18+i*8,-38],[-14+i*8,-38],[-21+i*11,-25]],i%2?'#efe0b7':'#a66c4a');rect(c,-26,-25,53,4,'#b57850');rect(c,-22,-11,44,11,'#a89160');rect(c,-24,-13,48,3,'#c0a573');rect(c,-21,-8,42,1,'#8c7952');[-15,-6,3,12].forEach((q,i)=>{rect(c,q,-17,7,4,i%2?'#b38e50':'#77925c');rect(c,q+1,-19,4,2,i%2?'#c69a57':'#92a56d');});
  });}
  function cart(c,x,y){local(c,x,y,S,()=>{shadow(c,0,1,22,3);rect(c,-12,-9,25,8,'#a18758');rect(c,-14,-11,28,3,'#b79a65');[-8,8].forEach(w=>{rect(c,w-3,-3,6,7,'#695b3e');rect(c,w-1,-1,2,3,'#bdac79');});rect(c,11,-6,14,2,'#82714c');rect(c,-8,-16,5,5,'#c5b178');rect(c,-2,-18,8,7,'#d0bc82');});}
  function cattleShelter(c,x,y){local(c,x,y,S*.85,()=>{shadow(c,0,1,48,5);rect(c,-23,-24,46,24,'#6c765245');rect(c,-24,-28,3,30,'#8e8154');rect(c,22,-28,3,30,'#756e49');polygon(c,[[-30,-26],[-19,-38],[18,-38],[31,-26]],'#b5a16a');rect(c,-30,-26,61,3,'#928053');for(let n=0;n<7;n++)rect(c,-22+n*7,-31,5,1,'#d2bd7d');rect(c,-24,1,49,2,'#b7aa70');});}
  function fence(c,x,y,length){for(let n=0;n<length;n+=11*S){rect(c,x+n,y-9*S,2*S,12*S,'#9b8d5f');rect(c,x+n,y-10*S,2*S,2*S,'#b7a579');}rect(c,x,y-6*S,length,2*S,'#b4a171');rect(c,x,y-1*S,length,2*S,'#93845b');}
  function drawPath(c,points,width,color){c.strokeStyle=color;c.lineWidth=width;c.lineCap='square';c.lineJoin='round';c.beginPath();points.forEach((pt,i)=>i?c.lineTo(Math.round(pt[0]*W),Math.round(pt[1]*H)):c.moveTo(Math.round(pt[0]*W),Math.round(pt[1]*H)));c.stroke();}
  const sites = () => mobile ? {
    homes:[[.18,.745],[.43,.79],[.7,.755]], temple:[.79,.663], well:[.53,.895], market:[.76,.875], cart:[.63,.94], store:[.22,.915], newhut:[.82,.973], shelter:[.57,.99], banyan:[.47,.673], forest:[.06,.733], field:[.19,.852], depot:[.39,.863], river:.9,
  } : {
    homes:[[.16,.735],[.37,.688],[.53,.717],[.73,.774]],temple:[.685,.657],well:[.445,.806],market:[.577,.879],cart:[.66,.928],store:[.305,.874],newhut:[.71,.934],shelter:[.80,.949],banyan:[.48,.658],forest:[.065,.775],field:[.19,.857],depot:[.34,.826],river:.877,
  };

  function seasonalDecor(c) {
    if (!currentEvent().active) return;
    const s = sites(), x = s.market[0] * W, y = s.market[1] * H;
    local(c, x, y, S, () => {
      if (state.season === 'spring') {
        rect(c, -35, -33, 2, 33, '#8e815a'); rect(c, 34, -33, 2, 33, '#8e815a');
        for (let i = 0; i < 7; i++) { const dy = Math.round(Math.sin(i / 6 * Math.PI) * 4); rect(c, -34 + i * 10, -32 + dy, 11, 1, '#b5a778'); polygon(c, [[-30+i*10,-31+dy],[-24+i*10,-31+dy],[-27+i*10,-24+dy]], i%2?'#dfc991':'#b68b74'); }
        [-30,29].forEach(q => { rect(c,q-3,-5,7,5,'#ae895b');rect(c,q-4,-9,9,5,'#75945c');rect(c,q-3,-10,3,3,'#e0b4a7');rect(c,q+2,-11,2,3,'#eadcc1'); });
      } else if (state.season === 'autumn') {
        [-31,30].forEach(q => { rect(c,q-5,-9,10,9,'#c4a268');rect(c,q-3,-12,6,4,'#dbc183');rect(c,q-5,-5,10,2,'#aa8155'); });
        for(let i=0;i<3;i++){rect(c,24+i*5,3,5,4,'#b98751');rect(c,25+i*5,2,3,6,'#c39459');rect(c,26+i*5,1,1,2,'#6c7646');}
      } else if (state.season === 'winter') {
        [-29,30].forEach(q=>{rect(c,q,-27,1,28,'#83785d');rect(c,q-2,-27,5,1,'#867c61');rect(c,q-2,-25,5,7,'#ddbb75');rect(c,q-1,-24,3,5,state.night?'#ecd08d':'#dfc893');rect(c,q-2,-18,5,1,'#a38d63');});
      }
    });
    if(state.season==='summer') {
      const kx=W*.86,ky=H*.402;polygon(c,[[kx,ky-8],[kx+6,ky],[kx,ky+8],[kx-6,ky]],'#b8885d');polygon(c,[[kx,ky-8],[kx,ky+8],[kx-6,ky]],'#cfb778');rect(c,kx,ky-7,1,15,'#e4d1a3');
      for(let i=0;i<10;i++)rect(c,kx+Math.sin(i*.7)*3,ky+8+i*3,1,2,'#b1ab87');
    }
  }
  function visitorGrove(c, p) {
    const plots = mobile ? [[.07,.896],[.135,.964],[.29,.971],[.405,.967],[.575,.76],[.87,.741]] : [[.073,.918],[.145,.956],[.234,.965],[.387,.967],[.792,.866],[.812,.716]];
    currentTrees().forEach(t => {
      const [nx,ny]=plots[t.plot],x=nx*W,y=ny*H,age=Math.max(0,state.day-t.day),size=age<3?.22:age<8?.32:.43;
      tree(c,x,y,size,'round',p);
      const labelWidth=t.initials.length*4+4;
      rect(c,x-labelWidth/2,y+3,labelWidth,7,state.night?'#314f45':'#eee5c8');
      c.fillStyle=state.night?'#e9dfbb':'#576749';c.font='5px monospace';c.textAlign='center';c.textBaseline='top';c.fillText(t.initials,Math.round(x),Math.round(y+4));
    });
  }

  function drawLandscape(){
    const p=palette(), c=land, s=sites();randomSeed=731093;
    rect(c,0,0,W,H,p.sky);
    if(!state.night){rect(c,0,H*.46,W,H*.12,'#e7e9d5');rect(c,0,0,W,H*.44,'#f4efdf');}
    const sunX=W*(mobile?.83:.91),sunY=H*(mobile?.24:.15),radius=mobile?14:21;
    if(state.night){
      const moon=[[-.4,-1],[.4,-1],[.4,-.85],[.7,-.85],[.7,-.6],[.9,-.6],[.9,-.3],[1,-.3],[1,.3],[.9,.3],[.9,.6],[.7,.6],[.7,.85],[.4,.85],[.4,1],[-.4,1],[-.4,.85],[-.7,.85],[-.7,.6],[-.9,.6],[-.9,.3],[-1,.3],[-1,-.3],[-.9,-.3],[-.9,-.6],[-.7,-.6],[-.7,-.85],[-.4,-.85]];
      polygon(c,moon.map(([x,y])=>[sunX+x*radius,sunY+y*radius]),'#e8e0b9');
      polygon(c,moon.map(([x,y])=>[sunX+(x+.4)*radius,sunY+(y-.26)*radius]),p.sky);
    }
    else{rect(c,sunX-radius+5,sunY-radius,2*radius-10,2*radius,'#e4c277');rect(c,sunX-radius,sunY-radius+5,2*radius,2*radius-10,'#e4c277');rect(c,sunX-radius+3,sunY-radius+3,2*radius-6,2*radius-6,'#eccd89');}
    polygon(c,[[W*.36,H*.59],[W*.52,H*.405],[W*.60,H*.48],[W*.73,H*.315],[W*.82,H*.42],[W*.93,H*.30],[W*1.1,H*.59]],p.mountainFar);
    polygon(c,[[W*.49,H*.59],[W*.62,H*.43],[W*.7,H*.47],[W*.8,H*.375],[W*.86,H*.43],[W*.97,H*.36],[W*1.1,H*.61]],p.mountain);
    polygon(c,[[W*.72,H*.59],[W*.8,H*.375],[W*.85,H*.445],[W*.82,H*.435],[W*.79,H*.505],[W*.83,H*.57]],p.mountainShade);
    polygon(c,[[W*.88,H*.59],[W*.97,H*.36],[W*1.05,H*.50],[W*.97,H*.44],[W*.95,H*.515]],p.mountainShade);
    rect(c,0,H*.575,W,H*.425,p.grass);
    polygon(c,[[0,H*.565],[W*.12,H*.558],[W*.22,H*.58],[W*.38,H*.546],[W*.54,H*.57],[W*.67,H*.54],[W*.88,H*.55],[W,H*.51],[W,H*.64],[0,H*.64]],p.light);
    polygon(c,[[0,H*.67],[W*.17,H*.625],[W*.35,H*.661],[W*.56,H*.632],[W*.79,H*.66],[W,H*.611],[W,H*.74],[0,H*.73]],p.grass);
    polygon(c,[[0,H*.86],[W*.21,H*.897],[W*.42,H*.846],[W*.67,H*.892],[W,H*.847],[W,H],[0,H]],p.shade);
    // Tiny square field marks make a textured landscape, without stochastic redraw.
    for(let i=0;i<W*1.2;i++){const x=random()*W,y=(.59+random()*.41)*H;rect(c,x,y,random()>.78?3:1,1,random()>.45?p.light:p.shade);}
    const rx=s.river;
    const banks=[[rx-.015,.555],[rx-.047,.624],[rx+.015,.696],[rx+.026,.752],[rx-.025,.815],[rx+.012,.88],[rx+.055,1.03]];
    drawPath(c,banks,Math.max(10,W*.068),'#c4c7a3');drawPath(c,banks,Math.max(7,W*.052),p.river);
    drawPath(c,banks.map(([x,y])=>[x-.015,y]),Math.max(2,W*.007),p.riverLight);
    // Far hedges, tiny cypresses, terraces.
    for(let i=0;i<18;i++){const x=W*(.43+i*.034);tree(c,x,H*(.584+Math.sin(i*3)*.014),.21+(i%3)*.035,'pine',p);}
    const fieldX=W*(mobile?.025:.067),fieldY=H*(mobile?.792:.786),fieldW=W*(mobile?.28:.18),fieldH=H*(mobile?.1:.1);
    rect(c,fieldX,fieldY,fieldW,fieldH,'#998e5e');rect(c,fieldX+2,fieldY+2,fieldW-4,fieldH-4,p.field);
    for(let j=4;j<fieldH-2;j+=5){rect(c,fieldX+2,fieldY+j,fieldW-4,1,'#a49961');for(let i=4;i<fieldW-2;i+=6){rect(c,fieldX+i,fieldY+j-2,1,3,state.season==='winter'?'#e8eadb':'#79874d');rect(c,fieldX+i-1,fieldY+j-2,3,1,state.season==='summer'?'#e0cd79':p.light);}}
    const routes=mobile?[[[.02,.78],[.35,.835],[.53,.865],[.89,.835]],[[.35,.835],[.34,.947],[.84,.977]],[[.53,.865],[.67,.763],[.79,.686]]]:[[[.04,.793],[.28,.805],[.443,.819],[.7,.819],[.91,.822]],[[.443,.819],[.545,.944],[.73,.967]],[[.443,.819],[.38,.724]],[[.443,.819],[.59,.713],[.675,.679]]];
    routes.forEach(path=>drawPath(c,path,8*S,p.dirt));
    routes.forEach(path=>drawPath(c,path,2*S,'#dbce9e'));
    fence(c,fieldX-2,fieldY+fieldH+4,fieldW+4);
    fence(c,W*(mobile?.57:.585),H*.98,W*.22);
    // Pixel-plank bridge, crossing the river on the main path.
    const bx=W*(rx-.037),by=H*.821,bw=W*.091;
    rect(c,bx,by-2*S,bw,14*S,'#655f43');rect(c,bx,by-4*S,bw,11*S,'#b6a372');for(let x=bx+2;x<bx+bw;x+=4*S)rect(c,x,by-4*S,1*S,11*S,'#8d7e56');
    rect(c,bx,by-11*S,bw,2*S,'#b1a071');[bx,bx+bw-2*S].forEach(x=>rect(c,x,by-14*S,2*S,20*S,'#857952'));rect(c,bx,by+8*S,bw,2*S,'#8c7e54');
    // The large tree and temple sit behind the houses.
    tree(c,s.banyan[0]*W,s.banyan[1]*H,mobile?.74:1.02,'round',p);
    temple(c,s.temple[0]*W,s.temple[1]*H);
    s.homes.forEach(([x,y],i)=>hut(c,x*W,y*H,'home',i===1?.95:1));
    well(c,s.well[0]*W,s.well[1]*H);
    market(c,s.market[0]*W,s.market[1]*H);
    cart(c,s.cart[0]*W,s.cart[1]*H);
    cattleShelter(c,s.shelter[0]*W,s.shelter[1]*H);
    // Building sites stay legible while the woodcutter earns their materials.
    if(state.stage>=1) hut(c,s.store[0]*W,s.store[1]*H,'store',.88);
    else { fence(c,s.store[0]*W-14*S,s.store[1]*H,28*S);rect(c,s.store[0]*W-8*S,s.store[1]*H-3*S,16*S,4*S,'#bcb184'); }
    if(state.stage>=2) { hut(c,s.newhut[0]*W,s.newhut[1]*H,'home',.9);tree(c,(s.newhut[0]-.042)*W,(s.newhut[1]+.012)*H,.3,'round',p); }
    else { const nx=s.newhut[0]*W,ny=s.newhut[1]*H;rect(c,nx-15*S,ny-3*S,30*S,3*S,'#a3996a');[-15,-6,5,14].forEach(dx=>rect(c,nx+dx*S,ny-5*S,2*S,5*S,'#b9af7b')); }
    // Edges frame the village; the upper-left remains open for portfolio copy.
    tree(c,W*.015,H*.715,mobile?.72:1.16,'round',p);
    tree(c,W*.075,H*.726,mobile?.48:.76,'round',p);
    tree(c,W*.986,H*.727,mobile?.72:1.2,'pine',p);
    tree(c,W*.975,H*.975,mobile?.65:.94,'round',p);
    [[.024,.941],[.083,.965],[.369,.96],[.78,.591]].forEach(([x,y])=>bush(c,x*W,y*H,17*S,p));
    // Irrigation pot, sacks, stones, flowers, a small washing line.
    [[.257,.872],[.287,.919],[.415,.908]].forEach(([x,y],i)=>{rect(c,x*W,y*H-5*S,5*S,5*S,i%2?'#b19d6b':'#ad7c54');rect(c,x*W+S,y*H-7*S,3*S,2*S,'#c7ac79');});
    const lx=W*.25,ly=H*.743;rect(c,lx,ly-17*S,1*S,18*S,'#8b815a');rect(c,lx+30*S,ly-18*S,1*S,19*S,'#8b815a');rect(c,lx,ly-15*S,30*S,1*S,'#bbb588');rect(c,lx+5*S,ly-14*S,8*S,10*S,'#ece4c9');rect(c,lx+18*S,ly-14*S,7*S,8*S,'#bb9a79');
    for(let i=0;i<45;i++){const x=random()*W,y=(.73+random()*.26)*H;if(x>W*.84)continue;rect(c,x,y,1,2,p.leafLight);if(i%3===0)rect(c,x-1,y,3,1,state.season==='spring'?'#e5d5b0':p.blossom);}
    seasonalDecor(c);visitorGrove(c,p);
    if(state.night){c.fillStyle='#0b233454';c.fillRect(0,H*.55,W,H*.45);}
    dirty=false;
  }

  function makeWorkers(){const s=sites();return[
    {role:'woodcutter',color:'#b56e48',x:s.depot[0],y:s.depot[1],target:0,wait:0,route:[s.forest,[s.forest[0]+.02,s.forest[1]+.018],s.depot],home:s.homes[0],cargo:false},
    {role:'farmer',color:'#647c9a',x:s.field[0],y:s.field[1],target:0,wait:1,route:[s.field,[s.field[0]+.07,s.field[1]-.022],s.well,s.homes[0]],home:s.homes[0]},
    {role:'herder',color:'#cea75e',x:s.market[0]-.02,y:s.market[1]+.03,target:0,wait:2,route:[[s.market[0]-.06,.939],[s.market[0]+.045,.933],s.well],home:s.homes[1]},
    {role:'builder',color:'#a57780',x:s.homes[2][0],y:s.homes[2][1]+.01,target:0,wait:3,route:[s.well,s.depot,[s.market[0]+.025,s.market[1]+.025],s.homes[2]],home:s.homes[2]},
  ];}
  let workers=makeWorkers();
  function restoreWorkers(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(!Array.isArray(saved?.actors))return;workers.forEach((w,i)=>{const a=saved.actors[i];if(!a)return;w.x=finite(a.x,w.x,0,1);w.y=finite(a.y,w.y,.55,1);w.target=Math.floor(finite(a.target,0,0,w.route.length-1));w.wait=finite(a.wait,0,0,5);});}catch(_){}}
  restoreWorkers();
  function residentActors() {
    const actors=workers.map((actor,i)=>({actor,lore:characterLore[i]}));
    if(state.stage===2){const s=sites();actors.push({actor:{x:s.newhut[0]-.025+Math.sin(elapsed*.13)*.01,y:s.newhut[1]+.012,home:s.newhut,color:'#688b80',role:'builder',wait:1},lore:characterLore[4]});}
    return actors;
  }
  function getVillagers(){return residentActors().map(({actor,lore})=>({id:lore.id,name:lore.name,role:lore.role,bio:lore.bio,x:actor.x,y:actor.y}));}
  function greetVillager(id){
    if(replay)stopReplay();
    const resident=residentActors().find(r=>r.lore.id===id);
    if(!resident)return{message:'That neighbour has not arrived in the village yet.',surprise:false};
    const count=(greetings.get(id)||0)+1;greetings.set(id,count);
    const surprise=count%5===0;
    greeting={id,surprise,until:performance.now()+2800};greetingClock=0;render();
    return{message:surprise?resident.lore.silly:resident.lore.hello,surprise};
  }
  function characterReaction(c){
    if(!greeting||replay)return;
    const resident=residentActors().find(r=>r.lore.id===greeting.id);if(!resident)return;
    const x=resident.actor.x*W,y=resident.actor.y*H-29*S;
    rect(c,x-7*S,y-6*S,15*S,7*S,state.night?'#b5c4a1':'#f1e7c8');rect(c,x-S,y+S,2*S,2*S,state.night?'#b5c4a1':'#f1e7c8');
    if(greeting.surprise){rect(c,x-S,y-5*S,2*S,3*S,'#8f6b44');rect(c,x-S,y-S,2*S,S,'#8f6b44');}
    else[-3,0,3].forEach(offset=>rect(c,x+offset*S,y-3*S,S,S,'#758360'));
  }
  function awardWood(){state.wood=Math.min(999,state.wood+4);if(state.stage===0&&state.wood>=12){state.wood-=12;state.stage=1;dirty=true;}else if(state.stage===1&&state.wood>=28){state.wood-=28;state.stage=2;state.population=5;dirty=true;}persist();announce();}
  function updateWorkers(dt){
    const resting=state.night||state.weather!=='clear';
    for(const w of workers){
      if(w.wait>0&&!resting){w.wait-=dt;continue;}
      const goal=resting?[w.home[0],w.home[1]+.012]:w.route[w.target];
      const dx=goal[0]-w.x,dy=(goal[1]-w.y)*H/W,dist=Math.hypot(dx,dy),speed=.026;
      if(dist<.003){
        if(resting)continue;
        if(w.role==='woodcutter'){if(w.target===1)w.cargo=true;if(w.target===2){awardWood();w.cargo=false;}}
        w.target=(w.target+1)%w.route.length;w.wait=w.role==='woodcutter'?2.5:1.8;
      }else{const step=Math.min(dist,speed*dt);w.x+=dx/dist*step;w.y+=dy/dist*step*W/H;w.facing=dx<0?-1:1;}
    }
  }
  function villager(c,w,index){
    const resting=state.night||state.weather!=='clear';const atHome=Math.abs(w.x-w.home[0])<.013&&Math.abs(w.y-w.home[1])<.025;
    if(resting&&atHome)return;
    const moving=!state.paused&&w.wait<=0&&!resting,step=moving?Math.floor(elapsed*5+index)%2:0;
    local(c,w.x*W,w.y*H,S,()=>{
      rect(c,-3,0,8,2,'#40523835');
      rect(c,-2,-5,2,5+step,'#626047');rect(c,2,-5,2,6-step,'#54513d');
      rect(c,-3,-12,7,8,w.color);rect(c,-4,-11,2,5,'#be9368');rect(c,4,-11,2,5,'#be9368');
      rect(c,-2,-18,5,6,'#c09a70');rect(c,-2,-19,5,2,'#4b4c38');rect(c,-3,-18,2,4,'#4b4c38');
      if(w.role==='farmer'||w.role==='herder'){rect(c,-5,-18,11,2,'#cfbb7e');rect(c,-2,-21,5,3,'#c0a46b');}
      if(w.cargo){rect(c,4,-13,3,9,'#94714b');rect(c,5,-14,3,8,'#b59360');}
      if(w.role==='woodcutter'&&w.wait>0&&w.target===2){const swing=Math.floor(elapsed*3)%2;rect(c,6,-14-swing*3,2,9,'#8d7950');rect(c,5,-14-swing*3,5,3,'#bcc1aa');}
    });
  }
  function cow(c,x,y,index,resting){local(c,x,y,S,()=>{
    const facing=index%2?-1:1;c.scale(facing,1);const step=resting?0:Math.floor(elapsed*2+index)%2;
    rect(c,-8,0,19,2,'#40523830');rect(c,-7,-6,2,7-step,'#72654e');rect(c,5,-6,2,6+step,'#72654e');rect(c,-10,-14,19,10,index%2?'#a67c54':'#e5dfc6');rect(c,-7,-14,6,5,index%2?'#c39e70':'#6b7058');rect(c,4,-11,7,4,index%2?'#c39e70':'#73755a');rect(c,8,-16,7,10,index%2?'#b18b60':'#ded8bd');rect(c,11,-10,5,3,'#b4a686');rect(c,12,-14,1,1,'#384734');rect(c,9,-18,1,3,'#bba67d');rect(c,14,-18,1,3,'#bba67d');rect(c,-12,-12,2,9,'#837154');
  });}
  function chicken(c,x,y,index){local(c,x,y,S,()=>{rect(c,-1,0,1,2,'#b38647');rect(c,2,0,1,2,'#b38647');rect(c,-3,-5,7,5,index%2?'#c2a674':'#e9e2c9');rect(c,2,-8,4,5,index%2?'#d2b986':'#efe7ce');rect(c,3,-9,2,2,'#a5684c');rect(c,6,-6,2,1,'#ba8c48');rect(c,4,-7,1,1,'#42503a');rect(c,-5,-7,3,3,'#998c62');});}
  function drawAnimals(c){
    const rest=state.night||state.weather!=='clear',s=sites();
    for(let i=0;i<3;i++){const baseX=(mobile?.6+i*.064:.57+i*.065)+Math.sin(elapsed*.1+i*2.2)*.022,baseY=.954-(i%2)*.035+Math.cos(elapsed*.12+i*3)*.009;const x=(baseX*(1-shelterAmount)+(s.shelter[0]+(i-1)*.016)*shelterAmount)*W;const y=(baseY*(1-shelterAmount)+(s.shelter[1]-.003-(i%2)*.012)*shelterAmount)*H;cow(c,x,y,i,rest&&shelterAmount>.98);}
    for(let i=0;i<5;i++){const baseX=(mobile?.31:.39)+i*.022+Math.sin(elapsed*.3+i*1.8)*.012,baseY=(mobile?.961:.927)+Math.cos(elapsed*.2+i*3)*.012;const x=baseX*(1-shelterAmount)+(s.homes[0][0]-.035+i*.008)*shelterAmount,y=baseY*(1-shelterAmount)+(s.homes[0][1]+.017+(i%2)*.006)*shelterAmount;chicken(c,x*W,y*H,i);}
  }
  function drawWood(c){const s=sites(),amount=Math.min(8,Math.ceil(state.wood/4));for(let i=0;i<amount;i++){const x=s.depot[0]*W+12*S+(i%4)*4*S,y=s.depot[1]*H-2*S-Math.floor(i/4)*3*S;rect(c,x,y,4*S,3*S,'#94764b');rect(c,x,y,2*S,2*S,'#c5a872');}}
  function autumnFox(c){
    if(state.season!=='autumn'||!state.effects||state.paused||replay||state.weather!=='clear')return;
    const x=(mobile?.79:.797)*W+Math.sin(elapsed*.12)*W*.025,y=H*.867;
    local(c,x,y,S*.85,()=>{const facing=Math.cos(elapsed*.12)>0?1:-1;c.scale(facing,1);rect(c,-8,-7,13,6,'#b17c4c');rect(c,4,-11,6,7,'#bd8955');rect(c,6,-13,2,3,'#6b6044');rect(c,9,-8,4,2,'#d6c59b');rect(c,9,-10,1,1,'#354d3b');rect(c,-7,-2,2,4,'#685d42');rect(c,2,-2,2,4,'#685d42');rect(c,-15,-6,8,4,'#aa7548');rect(c,-18,-7,4,4,'#e2d5b2');});
  }
  function atmosphere(c){
    const p=palette();
    if(state.night){for(let i=0;i<38;i++){const x=((i*127+31)%997)/997*W,y=(.04+((i*53)%311)/311*.45)*H;rect(c,x,y,1,i%9===0?2:1,i%3===0?'#e6ddb4':'#8aa3a2');}}
    else{
      const clouds=mobile?[[.59,.16,.62],[.9,.37,.54]]:[[.60,.16,1],[.94,.31,.72],[.34,.10,.45]];
      clouds.forEach(([x,y,z],i)=>{const drift=state.effects?Math.sin(elapsed*.008+i)*W*.012:0;local(c,x*W+drift,y*H,S*z,()=>{rect(c,-23,-2,54,7,'#faf6e9');rect(c,-15,-8,32,9,'#faf6e9');rect(c,-4,-11,14,4,'#faf6e9');});});
    }
    if(!state.effects)return;
    // Small ripples only on the river, never on the portfolio copy.
    for(let i=0;i<9;i++){const y=.61+i*.047;const rx=sites().river+Math.sin((y-.56)*19)*.023;rect(c,(rx+.003*Math.sin(elapsed+i))*W,y*H,3+(i%3)*2,1,p.riverLight);}
    if(state.weather==='rain'){for(let i=0;i<(mobile?35:70);i++){const px=((i*47.31+elapsed*17)%W),py=((i*63.91+elapsed*110)%H);if(px<W*.48&&py<H*.54)continue;rect(c,px,py,1,4,state.night?'#92adb16a':'#6b999575');}}
    if(state.weather==='snow'){for(let i=0;i<(mobile?30:65);i++){const px=(i*61.7+Math.sin(elapsed*.3+i)*8+W)%W,py=(i*47.2+elapsed*9)%H;if(px<W*.48&&py<H*.54)continue;rect(c,px,py,i%4===0?2:1,1,state.night?'#d3ded7':'#f9f8eb');}}
    if(state.weather==='clear'&&!state.night){for(let i=0;i<3;i++){const x=(W*.67+i*W*.06+elapsed*2)%W,y=H*.385+Math.sin(elapsed*.7+i)*3;rect(c,x,y,2,1,'#718372');rect(c,x-1,y-1,1,1,'#718372');rect(c,x+2,y-1,1,1,'#718372');}}
    if(state.night&&state.weather==='clear'){for(let i=0;i<9;i++){const x=(.19+i*.071+Math.sin(elapsed*.3+i)*.007)*W,y=(.68+((i*7)%19)*.013+Math.cos(elapsed*.5+i)*.006)*H;if(Math.sin(elapsed+i*2)>.1)rect(c,x,y,1,1,'#d2d68b');}}
    if(state.night&&state.weather==='clear'&&!state.paused&&!replay){const phase=elapsed%79;if(phase>73&&phase<76){const t=(phase-73)/3,x=(.58+t*.25)*W,y=(.13+t*.14)*H;for(let i=0;i<7;i++)rect(c,x-i*2,y-i,1,1,i<2?'#cfdbcd':'#779d98');}}
    // A chimney wisp, drawn as stepped translucent pixels.
    if(state.night||state.season==='winter'){const h=sites().homes[1];for(let i=0;i<3;i++)rect(c,h[0]*W+12*S+Math.sin(elapsed+i)*2,h[1]*H-(47+i*7+(elapsed*3%7))*S,4*S,3*S,state.night?'#a8b4ab38':'#a6aea452');}
  }
  function render(){if(dirty)drawLandscape();ctx.imageSmoothingEnabled=false;ctx.drawImage(landscape,0,0);drawWood(ctx);residentActors().sort((a,b)=>a.actor.y-b.actor.y).forEach(({actor},i)=>villager(ctx,actor,i));drawAnimals(ctx);autumnFox(ctx);atmosphere(ctx);characterReaction(ctx);}

  function resize(){
    if(replay)stopReplay();
    const bounds=canvas.getBoundingClientRect(),width=bounds.width||innerWidth,height=bounds.height||innerHeight;
    const wasMobile=mobile;mobile=width<650;
    W=Math.max(192,Math.min(720,Math.round(width/(mobile?2:2.25))));H=Math.round(W*height/width);S=mobile?.61:clamp(W/640,.73,1.12);
    canvas.width=W;canvas.height=H;landscape.width=W;landscape.height=H;ctx.imageSmoothingEnabled=false;land.imageSmoothingEnabled=false;
    if(wasMobile!==mobile){const previous=workers;workers=makeWorkers();workers.forEach((w,i)=>{w.wait=previous[i]?.wait||0;});}
    dirty=true;render();
  }
  function historySnapshot(){return{...publicState(),trees:currentTrees().map(t=>({...t}))};}
  function replayEvent(active){document.dispatchEvent(new CustomEvent('worldreplay',{detail:{active,index:replay?.index??0,total:replay?.frames.length??0,snapshot:historySnapshot()}}));}
  function validateFrame(value){
    if(!value||!Number.isFinite(value.day)||value.day<1||!Number.isFinite(value.stage)||value.stage<0||value.stage>2||!Number.isFinite(value.wood)||value.wood<0||!seasons.includes(value.season)||!weathers.includes(value.weather)||typeof value.night!=='boolean')return null;
    return{day:Math.floor(clamp(value.day,1,99999)),stage:Math.floor(value.stage),wood:Math.floor(clamp(value.wood,0,999)),population:Math.floor(finite(value.population,value.stage===2?5:4,1,20)),season:value.season,weather:value.weather,night:value.night,trees:safeTrees(value.trees)};
  }
  function showReplayFrame(index){
    if(!replay)return;replay.index=index;
    const snapshot=replay.frames[index];
    ['day','stage','wood','population','season','weather','night'].forEach(key=>{state[key]=snapshot[key];});
    workers=makeWorkers();elapsed=0;shelterAmount=state.night||state.weather!=='clear'?1:0;dirty=true;render();replayEvent(true);
  }
  function startReplay(frames){
    if(document.hidden||!Array.isArray(frames))return false;
    const valid=frames.slice(-500).map(validateFrame).filter(Boolean);if(!valid.length)return false;
    if(replay)stopReplay();
    const count=Math.min(8,valid.length),selected=Array.from({length:count},(_,i)=>valid[count===1?0:Math.round(i*(valid.length-1)/(count-1))]);
    const live={state:{...state},workers,elapsed,dayClock,saveClock,shelterAmount,randomSeed,soundClock,greeting,greetingRemaining:greeting?Math.max(0,greeting.until-performance.now()):0};
    replay={frames:selected,index:0,clock:0,live};greeting=null;cancelChirps();audio?.context.suspend().catch(()=>{});showReplayFrame(0);announce();return true;
  }
  function stopReplay(){
    if(!replay)return false;
    const previous=replay,live=previous.live;replay=null;
    Object.assign(state,live.state);workers=live.workers;elapsed=live.elapsed;dayClock=live.dayClock;saveClock=live.saveClock;shelterAmount=live.shelterAmount;randomSeed=live.randomSeed;soundClock=live.soundClock;greeting=live.greeting;
    if(greeting)greeting={...greeting,until:performance.now()+live.greetingRemaining};
    lastFrame=performance.now();dirty=true;render();updateAudio();
    document.dispatchEvent(new CustomEvent('worldreplay',{detail:{active:false,index:previous.index,total:previous.frames.length,snapshot:historySnapshot()}}));announce();return true;
  }
  function advanceReplay(dt){
    if(!replay)return;replay.clock+=dt;
    if(replay.clock>=8){stopReplay();return;}
    const index=Math.min(replay.frames.length-1,Math.floor(replay.clock/(8/replay.frames.length)));
    if(index!==replay.index)showReplayFrame(index);
  }
  function cancelChirps(){if(!audio?.voices)return;for(const voice of audio.voices){try{voice.oscillator.stop();}catch(_){}voice.oscillator.disconnect();voice.gain.disconnect();}audio.voices.clear();}
  function wildlifeChirp(dt){
    if(!audio||!state.sound||state.paused||document.hidden||replay||state.weather==='rain')return;
    soundClock+=dt;const interval=state.night?4.8:6.5;if(soundClock<interval)return;soundClock=0;
    const start=audio.context.currentTime+.02,notes=state.night?3:2;
    for(let i=0;i<notes;i++){
      const oscillator=audio.context.createOscillator(),gain=audio.context.createGain(),at=start+i*(state.night?.115:.19),length=state.night?.065:.14;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(state.night?3150:1900+i*220,at);oscillator.frequency.exponentialRampToValueAtTime(state.night?3250:2850+i*130,at+length*.65);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(state.night?.008:.013,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      oscillator.connect(gain);gain.connect(audio.context.destination);const voice={oscillator,gain};audio.voices.add(voice);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();audio?.voices.delete(voice);};oscillator.start(at);oscillator.stop(at+length+.015);
    }
  }
  function soundEnabled(enabled){
    if(replay)stopReplay();
    state.sound=Boolean(enabled);
    if(!state.sound){cancelChirps();audio?.context.suspend().catch(()=>{});announce();return;}
    try{
      if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){state.sound=false;announce();return;}const context=new Audio();const gain=context.createGain();gain.gain.value=.022;gain.connect(context.destination);const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;filter.connect(gain);const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let seed=5027,value=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;value=(value+(seed/4294967296*2-1)*.025)/1.005;data[i]=value;}const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(filter);source.start();audio={context,filter,gain,voices:new Set()};}
      if(!document.hidden&&!state.paused)audio.context.resume().catch(()=>{state.sound=false;announce();});
      updateAudio();wildlifeChirp(10);
    }catch(_){state.sound=false;}
    announce();
  }
  function updateAudio(){if(!audio)return;cancelChirps();audio.filter.frequency.setTargetAtTime(state.weather==='rain'?1200:state.night?350:650,audio.context.currentTime,.5);audio.gain.gain.setTargetAtTime(state.weather==='rain'?.045:.022,audio.context.currentTime,.5);if(state.paused||document.hidden||!state.sound||replay)audio.context.suspend().catch(()=>{});else audio.context.resume().catch(()=>{});}
  function loop(now){
    frame=requestAnimationFrame(loop);
    if(document.hidden){lastFrame=now;return;}
    if(now-lastFrame<1000/30)return;
    const dt=Math.min(.1,(now-lastFrame)/1000||.033);lastFrame=now;
    if(replay){advanceReplay(dt);return;}
    if(greeting&&now>=greeting.until){greeting=null;render();}
    if(state.paused){if(dirty)render();return;}
    elapsed+=dt;dayClock+=dt;saveClock+=dt;updateWorkers(dt);shelterAmount=clamp(shelterAmount+(state.night||state.weather!=='clear'?dt*.08:-dt*.1),0,1);
    wildlifeChirp(dt);
    if(dayClock>=90){dayClock-=90;state.day=Math.min(99999,state.day+1);dirty=true;persist();announce();}
    if(saveClock>8){saveClock=0;persist();}
    render();
  }
  window.villageWorld={
    setSeason(value){if(!seasons.includes(value))return;if(replay)stopReplay();if(value===state.season)return;state.season=value;changed();},
    setWeather(value){if(!weathers.includes(value))return;if(replay)stopReplay();if(value===state.weather)return;state.weather=value;updateAudio();changed();},
    setNight(value){if(replay)stopReplay();state.night=Boolean(value);updateAudio();changed();},
    setPaused(value){if(replay)stopReplay();state.paused=Boolean(value);lastFrame=performance.now();updateAudio();changed(false);},
    setEffects(value){if(replay)stopReplay();state.effects=Boolean(value);changed(false);},
    setSound:soundEnabled,
    getState:publicState,
    getVillagers,
    greetVillager,
    getEvent:currentEvent,
    startReplay,
    stopReplay,
  };
  canvas.addEventListener('click',event=>{
    if(event.button>0)return;
    const bounds=canvas.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;
    const residents=residentActors().filter(({actor})=>!((state.night||state.weather!=='clear')&&Math.abs(actor.x-actor.home[0])<.013&&Math.abs(actor.y-actor.home[1])<.025));
    const hits=residents.map(resident=>({...resident,distance:Math.hypot(resident.actor.x*bounds.width-x,resident.actor.y*bounds.height-9*S*bounds.height/H-y)})).filter(hit=>hit.distance<=44).sort((a,b)=>a.distance-b.distance);
    if(!hits.length)return;
    const hit=hits[0],result=greetVillager(hit.lore.id),current=getVillagers().find(person=>person.id===hit.lore.id);
    if(current)document.dispatchEvent(new CustomEvent('worldcharacter',{detail:{...current,...result}}));
  });
  document.addEventListener('journalchange',()=>{dirty=true;render();});
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);},{passive:true});
  document.addEventListener('visibilitychange',()=>{const wasReplay=Boolean(replay);if(document.hidden&&replay)stopReplay();lastFrame=performance.now();updateAudio();if(document.hidden&&!wasReplay)persist();else render();});
  window.addEventListener('pagehide',()=>{if(replay)stopReplay();else persist();cancelChirps();audio?.context.suspend().catch(()=>{});});
  reducedMotion.addEventListener?.('change',event=>{if(event.matches)window.villageWorld.setPaused(true);});
  resize();announce();frame=requestAnimationFrame(loop);
})();
