'use strict';
/* =====================================================================
   BASE: tiện ích, cấu hình, trạng thái, lưu trữ, âm thanh, bản đồ, vẽ nhân vật & phòng lab
   ===================================================================== */

/* ---------- Tiện ích ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function h(tag, attrs, ...kids){
  const e=document.createElement(tag);
  if(attrs) for(const k in attrs){ const v=attrs[k];
    if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2),v);
    else if(v!==false&&v!=null) e.setAttribute(k,v); }
  for(const c of kids.flat(Infinity)){ if(c==null||c===false) continue; e.append(c.nodeType?c:document.createTextNode(c)); }
  return e;
}
const SVGNS='http://www.w3.org/2000/svg';
function sv(tag, attrs, ...kids){
  const e=document.createElementNS(SVGNS,tag);
  if(attrs) for(const k in attrs){ const v=attrs[k]; if(v!=null&&v!==false) e.setAttribute(k,v); }
  for(const c of kids.flat(Infinity)){ if(c==null||c===false) continue; e.append(c.nodeType?c:document.createTextNode(c)); }
  return e;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const bin=(q,n=2)=>q.toString(2).padStart(n,'0');
function rr(c,x,y,w,hh,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+hh,r); c.arcTo(x+w,y+hh,x,y+hh,r); c.arcTo(x,y+hh,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function ell(c,x,y,rx,ry,fill,stroke){ c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();} }
function hashStr(s){ let x=2166136261; for(let i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,16777619); } return x>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rint=(rng,n)=>Math.floor(rng()*n);
const pickOne=(rng,a)=>a[rint(rng,a.length)];
function shuffled(rng,a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=rint(rng,i+1); [b[i],b[j]]=[b[j],b[i]]; } return b; }
const ITEM = Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const BADGE = Object.fromEntries(BADGES.map(b=>[b.id,b]));
const PROJECT = Object.fromEntries(PROJECTS.map(p=>[p.id,p]));
const DAILY_BY_ID = Object.fromEntries(DAILY.map(d=>[d.id,d]));

/* =====================================================================
   0. CẤU HÌNH – tên, nhân vật, độ khó
   ===================================================================== */
const CONFIG = {
  gameTitle:'Hành trình kỹ sư vi mạch SGU',
  teacher:  { name:'Cô Minh Châu', role:'Giảng viên hướng dẫn' },
  teammate: { name:'Khoa',         role:'Bạn cùng nhóm' },
  mascot:   { name:'Chip Chip' },
  defaultName:'Bạn',
  // 6 ngoại hình: 3 nữ + 3 nam (đổi màu tóc / áo ở đây). style tóc: bun | short | twin | crew | sidepart | spiky
  looks:[
    { id:0, gender:'Nữ',  name:'Mây',    hair:'#5b4a6b', style:'bun',      outfit:'#9ad7e8', legs:'#6f7bb0', skin:'#ffe3d0', glasses:false },
    { id:1, gender:'Nữ',  name:'Nắng',   hair:'#9a6246', style:'short',    outfit:'#f7b7c9', legs:'#8b78a8', skin:'#ffd9c2', glasses:false },
    { id:2, gender:'Nữ',  name:'Bạc hà', hair:'#33405e', style:'twin',     outfit:'#c9b8f2', legs:'#5f8f86', skin:'#fde0cf', glasses:true  },
    { id:3, gender:'Nam', name:'Phong',  hair:'#2b3350', style:'crew',     outfit:'#8fb8f0', legs:'#4f5f8f', skin:'#fbd8c0', glasses:false },
    { id:4, gender:'Nam', name:'Bảo',    hair:'#8a5a3a', style:'sidepart', outfit:'#a8d8a0', legs:'#6f7bb0', skin:'#f6cfb2', glasses:true  },
    { id:5, gender:'Nam', name:'Hải',    hair:'#1f1f2e', style:'spiky',    outfit:'#ffc9a8', legs:'#5f6f8f', skin:'#fbd8c0', glasses:false }
  ],
  // Độ khó: điểm bị trừ cho mỗi lần sai / dùng gợi ý (ảnh hưởng thưởng nhận được); haloAlways: luôn hiện vùng cách ly ở layout
  difficulties:{
    easy:  { label:'Dễ',     wrongPenalty:0, hintPenalty:0,  haloAlways:true,  desc:'Không bị trừ thưởng khi sai hoặc dùng gợi ý. Hợp để làm quen.' },
    normal:{ label:'Thường', wrongPenalty:3, hintPenalty:6,  haloAlways:true,  desc:'Sai mỗi lần −3%, mỗi gợi ý −6% thưởng (tối thiểu còn 40%).' },
    hard:  { label:'Khó',    wrongPenalty:6, hintPenalty:12, haloAlways:false, desc:'Sai −6%, gợi ý −12% thưởng; ở layout chỉ thấy vùng cách ly khi đang kéo khối.' }
  },
  maxPoints:100, minPoints:40,
  speed:170
};
const PAL = {
  floorA:'#fdf6ec', floorB:'#f8eddc', wall:'#cdbff2', wallDark:'#b3a2e6', wood:'#ebcfa6', woodDark:'#c9a27a',
  ink:'#4a4458', ink2:'#7a7390', mint:'#bfe8d8', pink:'#ffd3df', sky:'#c6e6fb', butter:'#fff0b8',
  lav:'#dcd0f7', chip:'#8fd3c1', chipDark:'#5fa896', coral:'#ff7f9d'
};

/* ---------- Lời thoại ---------- */
const TEXT = {
  intro:[
    {who:'chip', text:'Chào {name}! Mình là Chip Chip, linh vật của phòng lab. Chào mừng đến “Hành trình kỹ sư vi mạch SGU”!'},
    {who:'chip', text:'Hãy gặp Cô Minh Châu ở bàn giảng viên (góc trên bên trái) để bắt đầu chương hướng dẫn. Đi bằng WASD hoặc phím mũi tên, nhấn E để tương tác.'}
  ],
  assign:[
    {who:'teacher', text:'Chào {name}, chào mừng đến phòng lab! (Phòng lab này là bối cảnh hư cấu của trò chơi nhé.)'},
    {who:'teacher', text:'Hôm nay nhóm mình cần thiết kế một mạch đếm 2 bit.'},
    {who:'teacher', text:'Yêu cầu: đếm theo chu kỳ 00 → 01 → 10 → 11 → 00 ở mỗi cạnh lên của clock. Có reset đồng bộ, tích cực mức cao.'},
    {who:'teacher', text:'Việc đầu tiên của người kỹ sư là đọc kỹ đề và xác định tín hiệu vào/ra. Em chọn giúp cô nhé!'}
  ],
  assignAgain:[ {who:'teacher', text:'Cô nhắc lại: mạch đếm 2 bit, đếm lên ở cạnh lên của clock, có reset đồng bộ mức cao. Em chọn các tín hiệu vào/ra nhé.'} ],
  q1done:[
    {who:'chip', text:'Đúng rồi! Để mình giải thích nha. clk (clock) là “nhịp tim” của mạch: mỗi cạnh lên là một nhịp để bộ đếm cập nhật.'},
    {who:'chip', text:'rst (reset) đưa bộ đếm về 00. Vì là reset đồng bộ mức cao nên nó chỉ có tác dụng ở cạnh lên của clk khi rst = 1.'},
    {who:'chip', text:'Q[1:0] là ngõ ra 2 bit chứa giá trị đang đếm: 00, 01, 10, 11. Giờ ra bảng trắng ở giữa phòng để vẽ sơ đồ khối nhé!'}
  ],
  q2intro:[ {who:'chip', text:'Đây là bảng trắng! Kéo (hoặc bấm) các khối vào bảng, rồi bấm hai cổng để nối dây: từ ngõ ra (chấm hồng) sang ngõ vào (chấm xanh).'} ],
  q2done:[ {who:'chip', text:'Sơ đồ khối chuẩn rồi! Tiếp theo, ngồi vào bàn máy tính bên trái để viết RTL nha.'} ],
  q3intro:[
    {who:'khoa', text:'Chào {name}! Mình để sẵn khung code VHDL cho bộ đếm, còn mấy chỗ trống chờ bạn điền đó.'},
    {who:'chip', text:'Mạch chưa chạy hả? Bình tĩnh, kiểm tra từng khối nha! Cứ bấm vào chỗ trống để chọn mảnh code.'}
  ],
  q3done:[ {who:'chip', text:'Code đẹp lắm! Giờ ra khu kiểm tra (bên phải) để xem mạch chạy bằng waveform nhé.'} ],
  q4intro:[
    {who:'chip', text:'Đây là khu kiểm tra: ta quan sát clock, reset và Q bằng waveform.'},
    {who:'chip', text:'Nhớ nha: đây là mô hình mô phỏng giáo dục trong game, không phải phần mềm mô phỏng HDL thực tế.'}
  ],
  q4done:[ {who:'khoa', text:'Hóa ra mình lỡ viết falling_edge! Cảm ơn bạn đã bắt lỗi. Giờ đến khu layout ở giữa phòng nhé.'} ],
  q5intro:[
    {who:'chip', text:'Layout là cách bố trí và kết nối các phần tử trên chip. Ở đây ta chơi một mô hình minh họa đơn giản trên lưới ô vuông.'},
    {who:'chip', text:'Quy tắc của game: hai khối phải cách nhau ít nhất 1 ô trống. Khối nào vi phạm sẽ tô đỏ.'}
  ],
  q5done:[ {who:'chip', text:'Gọn gàng quá! Giờ quay lại gặp Cô Minh Châu để bàn giao sản phẩm nhé.'} ],
  handover:[
    {who:'teacher', text:'Cô đã xem kết quả của {name}: từ yêu cầu thiết kế, sơ đồ khối, RTL, mô phỏng đến layout, em làm rất có hệ thống.'},
    {who:'chip', text:'Mạch chưa chạy hả? Bình tĩnh, kiểm tra từng khối nha! … Hôm nay bạn đâu cần câu đó nữa rồi.'},
    {who:'teacher', text:'Cô trao cho {name} huy hiệu “Kỹ sư vi mạch tập sự SGU”. Chúc mừng em!'}
  ],
  afterTutorial:[
    {who:'teacher', text:'Từ giờ em là thành viên của lab. Mỗi ngày em có một ít năng lượng: hãy chọn nhiệm vụ ở bảng nhiệm vụ rồi làm việc ở đúng khu trong phòng.'},
    {who:'chip', text:'Làm nhiệm vụ nhận XP, xu và điểm kỹ năng. Đủ XP và hoàn thành dự án thì lên cấp. Hết năng lượng thì bấm “Sang ngày mới” khi bạn sẵn sàng nha!'},
    {who:'chip', text:'Dự án đầu tiên đã mở: “Cổng logic cơ bản”. Bấm nút “Nhiệm vụ” ở thanh trên để xem!'}
  ],
  mentor:[
    ['Em đang là sinh viên thực tập ở lab. Hoàn thành dự án Cổng logic và Flip-flop rồi tích đủ XP, cô sẽ nâng em lên Thực tập sinh.'],
    ['Thực tập sinh à, giờ em lo bộ đếm và thanh ghi nhé. Hai dự án này là nền của mọi mạch tuần tự.'],
    ['Kỹ sư mới rồi, đến lượt máy trạng thái. Hãy cẩn thận với latch và reset trong FSM.'],
    ['Em đã hoàn thành lộ trình chính! Cô mong em tiếp tục luyện tập và giữ phòng lab thật xinh nhé.']
  ],
  khoaTips:[
    'Cô Minh Châu đang đợi bạn ở bàn giảng viên đó, qua nhận đề bài đi!',
    'Sơ đồ khối vẽ ở bảng trắng phía trên nha. Nhớ: clock và reset đi vào bộ đếm, Q đi ra khối hiển thị.',
    'Code ở máy tính bên trái. Mẹo: reset đồng bộ thì kiểm tra bên TRONG điều kiện cạnh lên.',
    'Khu kiểm tra ở bên phải. Xem kỹ Q đổi giá trị đúng vào cạnh nào của clock nha!',
    'Layout hả? Cứ chừa khoảng trống giữa các khối, đừng xếp sát nhau. Mình hay bị đỏ hoài.',
    'Xong hết rồi hả? Qua gặp cô bàn giao đi!'
  ],
  khoaFree:[
    'Mình đang tập luyện nè. Bạn thử làm nhiệm vụ “sửa lỗi” đi, vui lắm!',
    'Mẹo: đọc kỹ triệu chứng rồi hãy chọn dòng lỗi. Đừng đoán bừa!',
    'Nhớ tiết kiệm xu để mua đồ trang trí cho lab nha, mình thích cây xanh!',
    'Hết năng lượng thì cứ nghỉ ngơi, bấm “Sang ngày mới” khi bạn sẵn sàng.'
  ],
  flavor:{
    shelf:'Giá sách: “Thiết kế số với VHDL”, “Mạch logic cơ bản”… Toàn sách hay!',
    plant:'Cây xanh giúp lab bớt căng thẳng. Reset tâm trạng đồng bộ ở cạnh lên của… nước tưới.',
    coffee:'Máy pha cà phê. Cà phê giúp tỉnh táo, nhưng mạch lỗi thì vẫn phải kiểm tra từng khối nha!',
    poster:'Áp phích: “Clock là nhịp tim, reset là nút khởi động lại”. Chip Chip rất thích câu này.',
    khoaDesk:'Bàn của Khoa: màn hình đầy cửa sổ code và một cốc trà sữa đã cạn.'
  }
};
const OBJECTIVES = [
  'Gặp <b>Cô Minh Châu</b> (bàn giảng viên) để nhận đề bài.',
  'Ra <b>bảng trắng</b> để xây dựng sơ đồ khối.',
  'Ngồi vào <b>bàn máy tính</b> để hoàn thiện code VHDL.',
  'Đến <b>khu kiểm tra</b> để mô phỏng và sửa lỗi.',
  'Đến <b>khu layout</b> để sắp xếp các khối.',
  'Quay lại gặp <b>Cô Minh Châu</b> để bàn giao sản phẩm.',
  ''
];
const QUEST_TITLES = ['Nhận yêu cầu thiết kế','Xây dựng sơ đồ khối','Hoàn thiện thiết kế RTL','Mô phỏng và sửa lỗi','Khám phá layout','Bàn giao sản phẩm'];
const TUT_STATIONS = ['teacher','whiteboard','pcdesk','bench','layout','teacher'];

/* =====================================================================
   1. TRẠNG THÁI GAME + LƯU TRỮ (v2, có chuyển đổi bản v1 cũ)
   ===================================================================== */
const SAVE_KEYS = ['name','look','diff','seed','stage','results','attempt','day','money','xp','career','energy','skills','projects','daily','active','badges','owned','equip','stats','history'];
function defaultEquip(){ return {outfit:null,head:null,face:null,neck:null,chip:null,wall:'wall_lav',floor:'floor_cream',decor:{}}; }
function defaultState(){
  return { name:CONFIG.defaultName, look:0, diff:'normal', seed:(Math.random()*4294967296)>>>0,
    stage:0, results:{}, attempt:{},
    day:1, money:0, xp:0, career:0, energy:CAREERS[0].energy,
    skills:{}, projects:{}, daily:null, active:null, badges:{}, owned:{wall_lav:true,floor_cream:true}, equip:defaultEquip(),
    stats:{dailyDone:0,debugDone:0,tasksDone:0,practiceDay:0,practiceToday:0}, history:[] };
}
const G = Object.assign(defaultState(), {
  screen:'title', t:0, near:null, seen:{}, seenAssign:false,
  player:{x:480,y:500,dir:'up',moving:false,phase:0}, chip:{x:450,y:520}, particles:[]
});
const isNum=v=>typeof v==='number'&&isFinite(v);
function int(v,lo,hi,def){ return isNum(v)?clamp(Math.floor(v),lo,hi):def; }
// Làm sạch dữ liệu bất kỳ thành trạng thái hợp lệ (dùng cho tải, nhập và chuyển đổi)
function sanitize(d){
  const s=defaultState();
  if(typeof d.name==='string') s.name=d.name.trim().slice(0,14)||CONFIG.defaultName;
  s.look=int(d.look,0,CONFIG.looks.length-1,0);
  s.diff=CONFIG.difficulties[d.diff]?d.diff:'normal';
  s.seed=isNum(d.seed)?(d.seed>>>0):s.seed;
  s.stage=int(d.stage,0,6,0);
  s.results=(d.results&&typeof d.results==='object')?d.results:{};
  s.attempt=(d.attempt&&typeof d.attempt==='object')?d.attempt:{};
  s.day=int(d.day,1,99999,1); s.money=int(d.money,0,1e9,0); s.xp=int(d.xp,0,1e9,0);
  s.career=int(d.career,0,CAREERS.length-1,0);
  s.energy=int(d.energy,0,CAREERS[s.career].energy,CAREERS[s.career].energy);
  s.skills={}; if(d.skills&&typeof d.skills==='object') for(const k of SKILLS) s.skills[k.id]=int(d.skills[k.id],0,1e6,0);
  s.projects={};
  if(d.projects&&typeof d.projects==='object') for(const p of PROJECTS){ const q=d.projects[p.id]; if(!q||typeof q!=='object') continue;
    const n=p.steps.length, done=!!q.done; s.projects[p.id]={step:done?n:int(q.step,0,n-1,0),done,seeds:Array.isArray(q.seeds)?q.seeds.filter(isNum).slice(0,n):[]}; }
  s.daily=null;
  if(d.daily&&typeof d.daily==='object'&&Array.isArray(d.daily.tasks)){
    const tasks=d.daily.tasks.filter(t=>t&&DAILY_BY_ID[t.pid]&&isNum(t.seed)).map(t=>({pid:t.pid,seed:t.seed>>>0,done:!!t.done})).slice(0,6);
    s.daily={day:int(d.daily.day,1,99999,s.day),tasks};
  }
  s.active=null;
  if(d.active&&typeof d.active==='object'){
    if(d.active.kind==='daily'&&isNum(d.active.idx)) s.active={kind:'daily',idx:d.active.idx|0};
    else if(d.active.kind==='project'&&PROJECT[d.active.pid]) s.active={kind:'project',pid:d.active.pid};
    else if(d.active.kind==='practice'&&DAILY_BY_ID[d.active.pid]) s.active={kind:'practice',pid:d.active.pid,seed:(d.active.seed>>>0)||1};
  }
  s.badges={}; if(d.badges&&typeof d.badges==='object') for(const k in d.badges) if(BADGE[k]) s.badges[k]=int(d.badges[k],1,99999,1);
  s.owned={wall_lav:true,floor_cream:true}; if(d.owned&&typeof d.owned==='object') for(const k in d.owned) if(ITEM[k]&&d.owned[k]) s.owned[k]=true;
  const eq=defaultEquip();
  if(d.equip&&typeof d.equip==='object'){
    for(const slot of ['outfit','head','face','neck','chip','wall','floor']){ const id=d.equip[slot]; if(id&&ITEM[id]&&ITEM[id].slot===slot&&s.owned[id]) eq[slot]=id; }
    if(d.equip.decor&&typeof d.equip.decor==='object') for(const k in d.equip.decor) if(ITEM[k]&&ITEM[k].slot==='decor'&&s.owned[k]&&d.equip.decor[k]) eq.decor[k]=true;
  }
  s.equip=eq;
  const st=d.stats||{}; s.stats={dailyDone:int(st.dailyDone,0,1e6,0),debugDone:int(st.debugDone,0,1e6,0),tasksDone:int(st.tasksDone,0,1e6,0),practiceDay:int(st.practiceDay,0,99999,0),practiceToday:int(st.practiceToday,0,99,0)};
  s.history=Array.isArray(d.history)?d.history.filter(x=>x&&PROJECT[x.id]).map(x=>({id:x.id,day:int(x.day,1,99999,1)})).slice(0,50):[];
  return s;
}
// Chuyển đổi bản lưu của game cũ (v1: 1 ngày, 6 nhiệm vụ) sang v2
function migrate(d){
  if(!d||typeof d!=='object') return null;
  if(d.data&&typeof d.data==='object'&&(d.app==='sgu-journey'||d.v)) d=d.data;      // bản xuất có bọc
  if(d.v===2||'day' in d||'xp' in d||'career' in d) return sanitize(d);          // v2 (nhận dạng cả khi thiếu trường v)
  if('stage' in d){                                                               // v1
    const s=sanitize({name:d.name,look:d.look,diff:d.diff,stage:d.stage,results:d.results,attempt:d.attempt});
    for(let n=1;n<=5;n++) if(s.results[n]){ s.xp+=TUTORIAL_REWARD.perQuest.xp; s.money+=TUTORIAL_REWARD.perQuest.money; }
    if(s.stage>=6){ s.xp+=TUTORIAL_REWARD.handover.xp; s.money+=TUTORIAL_REWARD.handover.money; }
    s._migrated=true; return s;
  }
  return null;
}
const SAVE_KEY='sgu-journey-v2', OLD_KEY='sgu-chip-lab-v1';
const Store = {
  ok:true,
  raw(key){ try{ return localStorage.getItem(key); }catch(e){ this.ok=false; return null; } },
  parse(txt){ try{ return JSON.parse(txt); }catch(e){ return null; } },
  load(){
    let r=this.raw(SAVE_KEY); if(r){ const s=migrate(this.parse(r)); if(s) return s; }
    r=this.raw(OLD_KEY); if(r){ const s=migrate(this.parse(r)); if(s) return s; }
    return null;
  },
  exists(){ return !!this.load(); },
  save(obj){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(obj)); this.ok=true; return true; }catch(e){ this.ok=false; return false; } },
  clear(){ try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_KEY); }catch(e){} }
};
function snapshot(){ const o={v:2}; for(const k of SAVE_KEYS) o[k]=G[k]; return o; }
function applyState(s){ for(const k of SAVE_KEYS) G[k]=s[k]; G.seen={}; G.seenAssign=false; G.near=null; }
function save(){
  const ok=Store.save(snapshot());
  if(!ok && !G._warnedSave){ G._warnedSave=true; UI.toast('Trình duyệt không cho lưu tự động. Hãy dùng Menu → Xuất bản lưu để sao lưu thủ công.'); }
}
function exportText(){ return JSON.stringify({app:'sgu-journey',v:2,exportedAt:new Date().toISOString(),data:snapshot()},null,1); }
function importText(txt){
  const d=Store.parse((txt||'').trim()); if(!d) return {ok:false,msg:'Nội dung không phải JSON hợp lệ.'};
  const s=migrate(d); if(!s) return {ok:false,msg:'Không nhận ra định dạng bản lưu.'};
  return {ok:true,state:s};
}
const diff=()=>CONFIG.difficulties[G.diff]||CONFIG.difficulties.normal;
function attempt(n){ return G.attempt[n]||(G.attempt[n]={wrong:0,hints:0}); }
const curCareer=()=>CAREERS[G.career];
const skillLevel=id=>{ const p=G.skills[id]||0; let l=1; for(let i=1;i<SKILL_LEVELS.length;i++) if(p>=SKILL_LEVELS[i]) l=i+1; return l; };
const isProjectDone=id=>id==='tutorial'?G.stage>=6:!!(G.projects[id]&&G.projects[id].done);
const doneProjectCount=()=>PROJECTS.filter(p=>isProjectDone(p.id)).length;
const badgeCount=()=>Object.keys(G.badges).length;
const ownedCount=()=>Object.keys(G.owned).filter(k=>ITEM[k]&&ITEM[k].price>0).length;
const projName=id=>id==='tutorial'?'Chương hướng dẫn':(PROJECT[id]?PROJECT[id].name:id);

// Kiểm tra điều kiện mở khóa của vật phẩm / dự án. Trả về danh sách {ok,text}
function unlockChecks(u){
  const out=[]; u=u||{};
  if(u.career!=null) out.push({ok:G.career>=u.career,text:'Cấp '+CAREERS[u.career].name});
  if(u.project) out.push({ok:isProjectDone(u.project),text:'Hoàn thành dự án '+projName(u.project)});
  if(u.badge) out.push({ok:!!G.badges[u.badge],text:'Huy hiệu “'+BADGE[u.badge].name+'”'});
  if(u.skill) out.push({ok:skillLevel(u.skill[0])>=u.skill[1],text:'Kỹ năng '+SKILLS.find(s=>s.id===u.skill[0]).name+' cấp '+u.skill[1]});
  if(u.day) out.push({ok:G.day>=u.day,text:'Từ ngày '+u.day});
  if(u.badges) out.push({ok:badgeCount()>=u.badges,text:'Có '+u.badges+' huy hiệu'});
  return out;
}
const unlockMet=u=>unlockChecks(u).every(c=>c.ok);

// Hình dạng nhân vật hiện tại = ngoại hình gốc + đồ đang mặc
function curLook(equip){
  const eq=equip||G.equip, L={...CONFIG.looks[G.look]};
  if(eq.outfit&&ITEM[eq.outfit]){ L.outfit=ITEM[eq.outfit].color; L.deco=ITEM[eq.outfit].deco; }
  if(eq.head&&ITEM[eq.head]) L.head=ITEM[eq.head];
  if(eq.face&&ITEM[eq.face]) L.face=ITEM[eq.face].style; else if(L.glasses) L.face='round';
  if(eq.neck&&ITEM[eq.neck]) L.neck=ITEM[eq.neck];
  return L;
}

/* =====================================================================
   2. ÂM THANH (chỉ bật sau tương tác đầu tiên)
   ===================================================================== */
const Sound = {
  ctx:null, on:true, master:0.8,           // master: 0.1 = nhỏ, 1 = to
  unlock(){
    try{
      if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; this.ctx=new AC(); }
      if(this.ctx.state==='suspended') this.ctx.resume();
      Music.start();                       // nhạc nền bắt đầu sau tương tác đầu tiên
    }catch(e){ this.ctx=null; }
  },
  tone(f,d,type='sine',vol=0.3,delay=0){
    if(!this.on||!this.ctx) return;
    try{
      const t=this.ctx.currentTime+delay, o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type; o.frequency.value=f; g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(vol*this.master,t+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+d+0.02);
    }catch(e){}
  },
  click(){ this.tone(660,0.1,'triangle',0.35); },
  blip(){ this.tone(880,0.06,'triangle',0.25); },
  ok(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,0.3,'triangle',0.4,i*0.09)); },
  bad(){ this.tone(220,0.25,'square',0.18); this.tone(180,0.3,'square',0.16,0.12); },
  coin(){ this.tone(988,0.08,'square',0.18); this.tone(1319,0.18,'square',0.18,0.08); },
  set(on){ this.on=on; const b=$('#btnSound'); if(b) b.textContent='Hiệu ứng âm thanh: '+(on?'Bật':'Tắt'); }
};

/* =====================================================================
   NHẠC NỀN: tự tạo bằng WebAudio (không cần file). Lofi nhẹ ~76 BPM, lặp 4 ô nhịp:
   Cmaj7 – Am7 – Fmaj7 – G6. Pad + bass + giai điệu ngũ cung ngẫu nhiên, có echo nhẹ.
   Chỉnh: vol (âm lượng nhạc), bpm, PROG (hợp âm), SCALE (nốt giai điệu).
   ===================================================================== */
const Music = {
  on:true, vol:1.5, bpm:130, ctx:null, out:null, bus:null, timer:null, nextT:0, step:0, last:2, notes:0,
  PROG:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,64]],     // Cmaj7, Am7, Fmaj7, G6 (số nốt MIDI)
  SCALE:[72,74,76,79,81,84],                                          // giai điệu: C D E G A C
  load(){ try{ if(localStorage.getItem('sgu-music')==='0') this.on=false; }catch(e){} },
  savePref(){ try{ localStorage.setItem('sgu-music',this.on?'1':'0'); }catch(e){} },
  label(){ const b=$('#btnMusic'); if(b) b.textContent='Nhạc nền: '+(this.on?'Bật':'Tắt'); },
  hz:m=>440*Math.pow(2,(m-69)/12),
  init(){
    const c=Sound.ctx; if(!c||this.out&&this.ctx===c) return; this.ctx=c;
    this.out=c.createGain(); this.out.gain.value=this.on?this.vol:0; this.out.connect(c.destination);
    this.bus=c.createGain(); this.bus.connect(this.out);
    const dl=c.createDelay(1.5), fb=c.createGain(), wet=c.createGain(), lp=c.createBiquadFilter();       // echo mềm
    dl.delayTime.value=60/this.bpm*0.75; fb.gain.value=0.32; wet.gain.value=0.3; lp.type='lowpass'; lp.frequency.value=1800;
    this.bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(this.out);
  },
  start(){
    if(!this.on||!Sound.ctx) return; this.init(); if(this.timer) return;
    this.nextT=Sound.ctx.currentTime+0.15; this.step=0; this.timer=setInterval(()=>this.schedule(),250);
  },
  stop(){ clearInterval(this.timer); this.timer=null; },
  setOn(on){
    this.on=on; this.savePref(); this.label();
    if(this.out) this.out.gain.setTargetAtTime(on?this.vol:0,this.ctx.currentTime,0.25);
    if(on){ Sound.unlock(); this.start(); } else this.stop();
  },
  note(m,t,dur,type,vol,att){
    const c=this.ctx, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.value=this.hz(m); g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t+dur+0.05); this.notes++;
  },
  play(s,t){
    const eighth=60/this.bpm/2, bar=Math.floor(s/8)%4, pos=s%8, chord=this.PROG[bar];
    if(pos===0) for(const m of chord) this.note(m,t,eighth*7.5,'sine',0.045,0.5);      // pad
    if(pos===0||pos===4) this.note(chord[0]-24,t,eighth*3.2,'sine',0.11,0.02);          // bass
    if([0,2,3,4,6,7].includes(pos)&&Math.random()<(pos===0?0.8:0.5)){                    // giai điệu
      let i=this.last+[-2,-1,-1,0,1,1,2][Math.floor(Math.random()*7)]; i=Math.max(0,Math.min(this.SCALE.length-1,i)); this.last=i;
      this.note(this.SCALE[i],t,eighth*2.6,'triangle',0.07,0.012);
    }
  },
  schedule(){
    const c=this.ctx; if(!c||!this.on) return;
    const eighth=60/this.bpm/2; if(this.nextT<c.currentTime-0.3) this.nextT=c.currentTime+0.1;   // tránh dồn nốt khi tab bị ẩn lâu
    while(this.nextT<c.currentTime+1.8){ this.play(this.step,this.nextT); this.nextT+=eighth; this.step++; }
  }
};

/* =====================================================================
   3. ĐIỀU KHIỂN
   ===================================================================== */
const Input = {
  keys:{}, virt:{},
  map:{KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'},
  vec(){
    const k=this.keys, v=this.virt;
    let x=((k.right||v.right)?1:0)-((k.left||v.left)?1:0), y=((k.down||v.down)?1:0)-((k.up||v.up)?1:0);
    const l=Math.hypot(x,y); return l?{x:x/l,y:y/l}:{x:0,y:0};
  }
};

/* =====================================================================
   4. BẢN ĐỒ & VA CHẠM
   ===================================================================== */
const W=960, H=576;
const OBJ = {
  teacherDesk:{rect:[48,60,150,50]},
  whiteboard:{rect:[330,0,300,50], name:'Bảng trắng', act:'whiteboard', mk:[480,66,'up']},
  board:{rect:[740,390,72,50], name:'Bảng nhiệm vụ', act:'board', mk:[776,372,'down']},
  pcdesk:{rect:[60,300,190,56], name:'Bàn máy tính', act:'pcdesk', mk:[155,284,'down']},
  khoaDesk:{rect:[60,420,190,56], name:'Bàn của Khoa', act:'flavor:khoaDesk'},
  layout:{rect:[380,330,200,60], name:'Khu thiết kế layout', act:'layout', mk:[480,314,'down']},
  bench:{rect:[730,86,170,64], name:'Khu kiểm tra', act:'bench', mk:[815,70,'down']},
  shelf:{rect:[880,250,50,130], name:'Giá sách', act:'flavor:shelf'},
  plant:{rect:[890,490,36,50], name:'Cây xanh', act:'flavor:plant'},
  coffee:{rect:[720,500,70,40], name:'Máy pha cà phê', act:'flavor:coffee'},
  shop:{rect:[600,496,80,44], name:'Cửa hàng linh kiện', act:'shop', mk:[640,480,'down']},
  poster:{rect:[210,0,80,50], name:'Áp phích', act:'flavor:poster'}
};
const NPC = {
  teacher:{x:120,y:160,name:CONFIG.teacher.name, mk:[120,86]},
  khoa:{x:285,y:452,name:CONFIG.teammate.name}
};
function circleHitsRect(x,y,r,rc){ const cx=clamp(x,rc[0],rc[0]+rc[2]), cy=clamp(y,rc[1],rc[1]+rc[3]); return Math.hypot(x-cx,y-cy)<r; }
function hitWorld(x,y){
  const r=11;
  if(x<34||x>926||y<76||y>548) return true;
  for(const k in OBJ) if(circleHitsRect(x,y,r,OBJ[k].rect)) return true;
  for(const k in NPC) if(Math.hypot(x-NPC[k].x,y-NPC[k].y)<r+12) return true;
  return false;
}
function movePlayer(dt){
  const p=G.player, v=Input.vec();
  p.moving=(v.x!==0||v.y!==0);
  if(!p.moving) return;
  if(Math.abs(v.x)>Math.abs(v.y)) p.dir=v.x<0?'left':'right'; else p.dir=v.y<0?'up':'down';
  const sp=CONFIG.speed*dt;
  const nx=p.x+v.x*sp; if(!hitWorld(nx,p.y)) p.x=nx;
  const ny=p.y+v.y*sp; if(!hitWorld(p.x,ny)) p.y=ny;
  p.phase+=dt*12;
}
function nearest(){
  const p=G.player; let best=null, bd=1e9;
  for(const k in OBJ){ const o=OBJ[k]; if(!o.act) continue;
    const rc=o.rect, d=Math.hypot(p.x-clamp(p.x,rc[0],rc[0]+rc[2]), p.y-clamp(p.y,rc[1],rc[1]+rc[3]));
    if(d<=34 && d<bd){ bd=d; best={id:k,name:o.name,act:o.act}; } }
  for(const k in NPC){ const n=NPC[k], d=Math.hypot(p.x-n.x,p.y-n.y)-12;
    if(d<=40 && d<bd){ bd=d; best={id:k,name:n.name,act:'npc:'+k}; } }
  return best;
}

/* =====================================================================
   5. VẼ NHÂN VẬT CHIBI (đồ trang phục + phụ kiện), CHIP CHIP, PHÒNG LAB
   ===================================================================== */
function drawHeadAcc(c,it,hy,dir){
  const col=it.color||'#ff9eb5', s=it.style;
  c.fillStyle=col; c.strokeStyle='rgba(74,68,88,.35)'; c.lineWidth=1.5;
  if(s==='cap'){
    c.beginPath(); c.ellipse(0,hy-6,18,13,0,Math.PI,Math.PI*2); c.fill(); c.stroke();
    if(dir!=='up'){ const bx=dir==='left'?-26:(dir==='right'?8:-10), bw=dir==='down'?20:18; rr(c,bx,hy-7,bw,5,2.5); c.fill(); }
  } else if(s==='beanie'){
    c.beginPath(); c.ellipse(0,hy-6,18.5,14,0,Math.PI,Math.PI*2); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.5)'; c.fillRect(-18,hy-9,36,4); ell(c,0,hy-22,4.5,4.5,'#fff','rgba(74,68,88,.3)');
  } else if(s==='bow'){
    for(const sx of [-1,1]){ c.beginPath(); c.moveTo(sx*9,hy-17); c.lineTo(sx*21,hy-25); c.lineTo(sx*21,hy-9); c.closePath(); c.fillStyle=col; c.fill(); c.stroke(); }
    ell(c,sx0(),hy-17,3.5,3.5,col,'rgba(74,68,88,.3)');
  } else if(s==='catears'){
    for(const sx of [-1,1]){ c.beginPath(); c.moveTo(sx*17,hy-6); c.lineTo(sx*13,hy-27); c.lineTo(sx*3,hy-13); c.closePath(); c.fillStyle=col; c.fill(); c.beginPath(); c.moveTo(sx*14,hy-10); c.lineTo(sx*12,hy-22); c.lineTo(sx*6,hy-14); c.closePath(); c.fillStyle='#ffb3c6'; c.fill(); }
  } else if(s==='helmet'){
    c.beginPath(); c.ellipse(0,hy-6,19,15,0,Math.PI,Math.PI*2); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(-2.5,hy-21,5,15); rr(c,-19,hy-8,38,4,2); c.fillStyle='#e8b93a'; c.fill();
  } else if(s==='crown'){
    c.beginPath(); c.moveTo(-12,hy-14); c.lineTo(-13,hy-27); c.lineTo(-6,hy-20); c.lineTo(0,hy-29); c.lineTo(6,hy-20); c.lineTo(13,hy-27); c.lineTo(12,hy-14); c.closePath(); c.fill(); c.stroke();
    ell(c,0,hy-18,2.3,2.3,'#ff7f9d');
  }
}
function sx0(){ return 0; }
function drawNeckAcc(c,it,bob){
  const col=it.color||'#ff9eb5', s=it.style;
  if(s==='scarf'){ rr(c,-12,-38+bob,24,8,4); c.fillStyle=col; c.fill(); c.strokeStyle='rgba(74,68,88,.3)'; c.lineWidth=1.2; c.stroke(); rr(c,3,-33+bob,6,12,3); c.fillStyle=col; c.fill(); c.stroke(); }
  else if(s==='bowtie'){ for(const sx of [-1,1]){ c.beginPath(); c.moveTo(0,-34+bob); c.lineTo(sx*8,-39+bob); c.lineTo(sx*8,-29+bob); c.closePath(); c.fillStyle=col; c.fill(); } ell(c,0,-34+bob,2.4,2.4,col,'rgba(0,0,0,.2)'); }
  else if(s==='medal'){ c.strokeStyle='#ff7f9d'; c.lineWidth=2; c.beginPath(); c.moveTo(-5,-35+bob); c.lineTo(0,-24+bob); c.lineTo(5,-35+bob); c.stroke(); ell(c,0,-21+bob,5,5,col,'#c9972a'); }
}
function drawOutfitDeco(c,deco,bob,base){
  const top=-35+bob, bot=-11+bob;
  if(deco==='coat'){ c.beginPath(); c.moveTo(0,top); c.lineTo(0,bot); c.strokeStyle='rgba(74,68,88,.3)'; c.lineWidth=1.5; c.stroke(); c.fillStyle='rgba(74,68,88,.12)'; c.fillRect(-11,bot-6,5,6); c.fillRect(6,bot-6,5,6); }
  else if(deco==='hoodie'){ c.fillStyle='rgba(255,255,255,.35)'; rr(c,-7,bot-8,14,8,3); c.fill(); c.strokeStyle='rgba(255,255,255,.7)'; c.lineWidth=1.6; c.beginPath(); c.moveTo(-3,top+2); c.lineTo(-3,top+9); c.moveTo(3,top+2); c.lineTo(3,top+9); c.stroke(); }
  else if(deco==='stripe'){ c.fillStyle='#8f7fd1'; for(const y of [top+5,top+11,top+17]) c.fillRect(-10,y,20,2.6); }
  else if(deco==='overall'){ c.fillStyle='#6f8fcf'; c.fillRect(-8,top,3.4,14); c.fillRect(4.6,top,3.4,14); rr(c,-9,top+12,18,12,3); c.fill(); ell(c,-6.3,top+13,1.5,1.5,'#ffe08a'); ell(c,6.3,top+13,1.5,1.5,'#ffe08a'); }
  else if(deco==='dots'){ c.fillStyle='#ff9eb5'; for(const [x,y] of [[-6,top+6],[5,top+8],[-2,top+15],[7,top+18],[-8,top+20]]) ell(c,x,y,1.8,1.8,'#ff9eb5'); }
  else if(deco==='suit'){ c.beginPath(); c.moveTo(-5,top); c.lineTo(0,top+14); c.lineTo(5,top); c.closePath(); c.fillStyle='#fff'; c.fill(); c.fillStyle='#e0587a'; c.fillRect(-1.2,top+4,2.4,11); c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-5,top); c.lineTo(-8,bot); c.moveTo(5,top); c.lineTo(8,bot); c.stroke(); }
}
function drawChibi(c,x,y,o){
  const L=o.look, dir=o.dir||'down', t=o.t||0, mv=!!o.moving, ph=o.phase||0;
  const bob = mv ? Math.abs(Math.sin(ph))*2.6 : Math.sin(t*2)*0.7;
  const sw = mv ? Math.sin(ph) : 0;
  const side = dir==='left'||dir==='right', sx = dir==='left'?-1:1;
  c.save(); c.translate(x,y); if(o.scale) c.scale(o.scale,o.scale);
  ell(c,0,2,15,6,'rgba(80,60,100,.2)');
  const shoe='#fff';
  if(side){
    for(const s of [1,-1]){ const ox=s*sw*5; rr(c,ox-4,-13,8,13,3); c.fillStyle=L.legs; c.fill(); rr(c,ox-4+(sx>0?1:-1),-4,8,5,2.5); c.fillStyle=shoe; c.fill(); }
  } else {
    for(const s of [-1,1]){ const lift=Math.max(0,s*sw)*4; rr(c,s*5.5-3.5,-13-lift,7,13,3); c.fillStyle=L.legs; c.fill(); rr(c,s*5.5-4,-4-lift,8,5,2.5); c.fillStyle=shoe; c.fill(); }
  }
  const hy=-49+bob;
  if(L.style==='twin'){ for(const s of [-1,1]){ ell(c,s*17,hy+3+(mv?sw*s*1.5:0),6,9,L.hair); } }
  rr(c,-11,-35+bob,22,24,8); c.fillStyle=L.outfit; c.fill(); c.strokeStyle='rgba(74,68,88,.25)'; c.lineWidth=1.5; c.stroke();
  if(L.deco) drawOutfitDeco(c,L.deco,bob); else if(L.coat) drawOutfitDeco(c,'coat',bob);
  if(L.hoodie&&!L.deco) drawOutfitDeco(c,'hoodie',bob);
  if(side){ ell(c,sw*-5,-24+bob,4.5,7,L.outfit,'rgba(74,68,88,.25)'); }
  else for(const s of [-1,1]){ ell(c,s*13.5,-24+bob+(-s*sw*2.5),4.2,7.5,L.outfit,'rgba(74,68,88,.25)'); }
  if(dir!=='up'){
    const cx= side?sx*1:0; c.strokeStyle=L.lanyard||'#7ec8e3'; c.lineWidth=2;
    c.beginPath(); c.moveTo(cx-5,-35+bob); c.lineTo(cx,-23+bob); c.lineTo(cx+5,-35+bob); c.stroke();
    rr(c,cx-5,-24+bob,10,13,2); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#9fb0c8'; c.lineWidth=1; c.stroke();
    c.fillStyle=L.lanyard||'#7ec8e3'; c.fillRect(cx-5,-24+bob,10,4);
    c.fillStyle='#b8c0d0'; c.fillRect(cx-3,-17+bob,6,1.4); c.fillRect(cx-3,-14.5+bob,4,1.4);
  } else { c.strokeStyle=L.lanyard||'#7ec8e3'; c.lineWidth=2; c.beginPath(); c.moveTo(-4,-35+bob); c.lineTo(4,-35+bob); c.stroke(); }
  if(L.neck&&dir!=='up') drawNeckAcc(c,L.neck,bob);
  ell(c,0,hy,17,16.5,L.skin,'rgba(74,68,88,.3)');
  if(L.phones){ c.strokeStyle='#5a5470'; c.lineWidth=3.5; c.beginPath(); c.arc(0,hy,18.5,Math.PI*1.05,Math.PI*1.95); c.stroke(); for(const s of [-1,1]) { rr(c,s*18-3.5,hy-5,7,11,3); c.fillStyle='#ff9eb5'; c.fill(); } }
  c.fillStyle=L.hair;
  if(dir==='up'){ ell(c,0,hy-1,17.5,17,L.hair); }
  else {
    c.beginPath(); c.ellipse(0,hy-3,18,15,0,Math.PI,Math.PI*2); c.fill();
    c.beginPath();
    c.moveTo(-17,hy-3); c.quadraticCurveTo(-8,hy+5,-2,hy-5); c.quadraticCurveTo(6,hy+4,17,hy-3); c.lineTo(17,hy-8); c.lineTo(-17,hy-8); c.closePath(); c.fill();
    if(side){ ell(c,-sx*10,hy,8,13,L.hair); }
  }
  if(L.style==='bun') ell(c,0,hy-20,7.5,7.5,L.hair);
  if(L.style==='short'&&dir!=='up'){ c.beginPath(); c.arc(-9,hy-16,5,0,7); c.arc(5,hy-18,4,0,7); c.fill(); }
  if(L.style==='spiky'){ c.fillStyle=L.hair; for(const [px,py,w] of [[-11,hy-14,5],[-4,hy-19,5],[4,hy-19,5],[11,hy-14,5]]){ c.beginPath(); c.moveTo(px-w,hy-10); c.lineTo(px,py-4); c.lineTo(px+w,hy-10); c.closePath(); c.fill(); } }
  if(L.style==='crew'&&dir!=='up'){ c.beginPath(); c.ellipse(0,hy-12,15,5,0,Math.PI,Math.PI*2); c.fill(); }
  if(L.style==='sidepart'&&dir!=='up'){ c.beginPath(); c.moveTo(-16,hy-4); c.quadraticCurveTo(-4,hy-16,10,hy-12); c.quadraticCurveTo(2,hy-5,-4,hy-1); c.closePath(); c.fill(); }
  if(L.head) drawHeadAcc(c,L.head,hy,dir);
  if(dir!=='up'){
    const blink = (t%4)<0.12;
    const eyes = side?[sx*6.5]:[-6,6];
    for(const ex of eyes){
      if(blink){ c.strokeStyle=PAL.ink; c.lineWidth=2; c.beginPath(); c.moveTo(ex-3,hy+1); c.lineTo(ex+3,hy+1); c.stroke(); }
      else { ell(c,ex,hy+1,3,4,'#2f2a3d'); ell(c,ex+1,hy-0.5,1.1,1.3,'#fff'); }
      if(L.face==='round'){ c.strokeStyle='#5a5470'; c.lineWidth=1.8; c.beginPath(); c.arc(ex,hy+1,6,0,7); c.stroke(); }
      else if(L.face==='square'){ c.strokeStyle='#5a5470'; c.lineWidth=1.8; c.strokeRect(ex-6,hy-4,12,10); }
      else if(L.face==='shades'){ rr(c,ex-6.5,hy-3.5,13,9,3); c.fillStyle='#2f2a3d'; c.fill(); c.fillStyle='rgba(255,255,255,.35)'; c.fillRect(ex-4,hy-2,3,2); }
    }
    if(L.face&&!side){ c.strokeStyle=L.face==='shades'?'#2f2a3d':'#5a5470'; c.lineWidth=1.8; c.beginPath(); c.moveTo(-1,hy+1); c.lineTo(1,hy+1); c.stroke(); }
    const bx = side?[sx*11]:[-10.5,10.5];
    for(const b of bx) ell(c,b,hy+7,3.6,2.3,'rgba(255,130,160,.55)');
    c.strokeStyle='#8a4f5e'; c.lineWidth=1.6; c.beginPath(); c.arc(side?sx*7:0,hy+7,2.6,0.15*Math.PI,0.85*Math.PI); c.stroke();
  }
  c.restore();
}
function drawChip(c,x,y,t,scale,accId){
  const bob=Math.abs(Math.sin(t*3.2))*3;
  c.save(); c.translate(x,y); if(scale) c.scale(scale,scale);
  ell(c,0,1,11,4,'rgba(80,60,100,.18)');
  const by=-17-bob;
  c.fillStyle=PAL.chipDark;
  for(let i=-1;i<=1;i++){ c.fillRect(-17,by+i*8-1.5,5,3); c.fillRect(12,by+i*8-1.5,5,3); c.fillRect(i*8-1.5,by-17,3,5); c.fillRect(i*8-1.5,by+12,3,5); }
  rr(c,-13,by-13,26,26,6); c.fillStyle=PAL.chip; c.fill(); c.strokeStyle=PAL.chipDark; c.lineWidth=2.2; c.stroke();
  rr(c,-9,by-9,18,18,4); c.fillStyle='rgba(255,255,255,.28)'; c.fill();
  ell(c,-8,by-9,2,2,PAL.chipDark);
  const blink=(t%3.3)<0.1;
  for(const ex of [-5,5]){ if(blink){ c.strokeStyle=PAL.ink; c.lineWidth=1.8; c.beginPath(); c.moveTo(ex-2.5,by); c.lineTo(ex+2.5,by); c.stroke(); } else { ell(c,ex,by,2.5,3.2,'#2f2a3d'); ell(c,ex+.8,by-1,.9,1,'#fff'); } }
  for(const ex of [-9,9]) ell(c,ex,by+5,2.6,1.7,'rgba(255,120,150,.6)');
  c.strokeStyle='#2f2a3d'; c.lineWidth=1.5; c.beginPath(); c.arc(0,by+4,3,0.15*Math.PI,0.85*Math.PI); c.stroke();
  const a=accId&&ITEM[accId]?ITEM[accId].style:null;
  if(a==='bow'){ for(const sx of [-1,1]){ c.beginPath(); c.moveTo(-9,by-14); c.lineTo(-9+sx*9,by-20); c.lineTo(-9+sx*9,by-9); c.closePath(); c.fillStyle='#ff7f9d'; c.fill(); } ell(c,-9,by-14,2.4,2.4,'#ff7f9d','rgba(0,0,0,.2)'); }
  else if(a==='party'){ c.beginPath(); c.moveTo(-7,by-13); c.lineTo(0,by-30); c.lineTo(7,by-13); c.closePath(); c.fillStyle='#ffd24d'; c.fill(); c.strokeStyle='#e8b93a'; c.lineWidth=1.5; c.stroke(); ell(c,0,by-31,2.6,2.6,'#ff7f9d'); c.fillStyle='#ff7f9d'; c.fillRect(-4,by-20,2.4,2.4); c.fillRect(2,by-24,2.4,2.4); }
  else if(a==='shades'){ for(const ex of [-5,5]){ rr(c,ex-4.5,by-3.5,9,7,2.5); c.fillStyle='#2f2a3d'; c.fill(); } c.fillRect(-1,by-1.5,2,1.5); }
  c.restore();
}
function lookTeacher(){ return {hair:'#6b5b73',style:'bun',outfit:'#ffffff',legs:'#7a7390',skin:'#ffe3d0',face:'round',coat:true,lanyard:'#ff9eb5'}; }
function lookKhoa(){ return {hair:'#3f3a4f',style:'short',outfit:'#ffc9a8',legs:'#6f7bb0',skin:'#fbd8c0',hoodie:true,phones:true,lanyard:'#a8d8a0'}; }

function monitor(c,x,y,w,hh,kind,t){
  rr(c,x,y,w,hh,4); c.fillStyle='#4a4458'; c.fill();
  rr(c,x+3,y+3,w-6,hh-9,3); c.fillStyle=kind==='scope'?'#16322b':'#f1f7ff'; c.fill();
  c.fillStyle='#4a4458'; c.fillRect(x+w/2-6,y+hh,12,3);
  const ix=x+6, iy=y+7;
  if(kind==='code'){ const cols=['#9fb5f0','#ff9eb5','#8ad1b6','#e8b93a']; for(let i=0;i<4;i++){ c.fillStyle=cols[i]; c.fillRect(ix+(i%2)*4,iy+i*5,10+((i*7)%14),2.5); } }
  else if(kind==='grid'){ c.fillStyle='#9fb5f0'; c.fillRect(ix,iy,10,6); c.fillStyle='#ff9eb5'; c.fillRect(ix+16,iy+6,10,6); c.fillStyle='#8ad1b6'; c.fillRect(ix+4,iy+16,12,5); c.strokeStyle='#bbb'; c.lineWidth=1; c.strokeRect(ix-1,iy-1,w-12,hh-14); }
  else if(kind==='scope'){ c.strokeStyle='#7ff2b8'; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=w-12;i++){ const yy=iy+(hh-14)/2 + ((((Math.floor((i+t*40)/9))%2)?-1:1)*5); if(i===0) c.moveTo(ix+i,yy); else c.lineTo(ix+i,yy);} c.stroke(); }
  else if(kind==='diagram'){ c.fillStyle='#c6e6fb'; c.fillRect(ix,iy,9,7); c.fillStyle='#ffd3df'; c.fillRect(ix+14,iy+3,10,9); }
}
function drawDesk(c,rc,o){
  const [x,y,w,hh]=rc;
  ell(c,x+w/2,y+hh+4,w/2+4,6,'rgba(80,60,100,.12)');
  rr(c,x,y,w,hh,8); c.fillStyle=PAL.wood; c.fill(); c.strokeStyle=PAL.woodDark; c.lineWidth=3; c.stroke();
  c.fillStyle='rgba(180,130,90,.25)'; c.fillRect(x+4,y+hh-9,w-8,6);
  const n=o.mon||1, mw=n===1?46:42;
  for(let i=0;i<n;i++){ const mx=x+w/2-(n*mw+(n-1)*10)/2+i*(mw+10); monitor(c,mx,y+4,mw,34,(o.kinds&&o.kinds[i])||'code',o.t||0); }
  if(o.keyboard){ rr(c,x+w/2-24,y+hh-14,48,9,3); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#c9bfe6'; c.lineWidth=1.5; c.stroke(); }
  if(o.mug){ ell(c,x+w-20,y+hh-18,6,5,'#ffd3df','#c9a2b0'); }
}
function drawChair(c,x,y){ ell(c,x,y,13,10,'#cdbff2','#a898d8'); ell(c,x,y-9,12,5,'#b3a2e6'); }
function star(c,x,y,r,col){ c.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rad=i%2?r*0.45:r; c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad); } c.closePath(); c.fillStyle=col; c.fill(); }
function drawDecorFloor(c,t){            // đồ trang trí đặt sàn, vẽ trước nhân vật
  const D=G.equip.decor;
  if(D.d_rug){ ell(c,500,236,120,44,'rgba(255,224,138,.55)','rgba(232,185,58,.6)'); star(c,500,236,22,'#ffd24d'); }
  if(D.d_plant){ rr(c,40,500,30,26,5); c.fillStyle='#f0a58c'; c.fill(); for(const [dx,dy,r] of [[55,486,15],[44,494,11],[66,494,11],[55,470,11]]) ell(c,dx,dy,r,r,'#8fd1a0','#5fb89f'); }
  if(D.d_lamp){ ell(c,330,548,10,4,'rgba(80,60,100,.2)'); c.fillStyle='#8a7fa0'; c.fillRect(328,500,4,46); ell(c,330,498,13,9,'#ffe9a0','#e8b93a'); ell(c,330,498,20,14,'rgba(255,233,160,.18)'); }
  if(D.d_cat){ const bx=560,by=470; ell(c,bx,by+8,22,6,'rgba(80,60,100,.15)'); ell(c,bx,by,20,12,'#f3d3a6','#c99a5e'); ell(c,bx+17,by-2,9,8,'#f3d3a6','#c99a5e'); c.fillStyle='#f3d3a6'; c.beginPath(); c.moveTo(bx+11,by-8); c.lineTo(bx+13,by-16); c.lineTo(bx+17,by-9); c.fill(); c.beginPath(); c.moveTo(bx+20,by-9); c.lineTo(bx+24,by-16); c.lineTo(bx+25,by-7); c.fill(); c.strokeStyle='#c99a5e'; c.lineWidth=3; c.beginPath(); c.moveTo(bx-19,by+2); c.quadraticCurveTo(bx-30,by-8,bx-24,by-14); c.stroke(); c.fillStyle=PAL.ink2; c.font='bold 12px sans-serif'; c.textAlign='center'; c.fillText('z',bx+30,by-14-Math.abs(Math.sin(t*1.5))*4); }
  if(D.d_trophy){ rr(c,700,262,52,72,5); c.fillStyle='#e9e2f7'; c.fill(); c.strokeStyle='#b3a2e6'; c.lineWidth=3; c.stroke(); c.fillStyle='rgba(180,170,210,.4)'; c.fillRect(704,266,44,64);
    const n=Math.min(3,Math.ceil(badgeCount()/3)); for(let i=0;i<n;i++){ const cx=714+i*13; c.fillStyle='#ffd24d'; c.fillRect(cx-3,296-i*0,6,10); c.beginPath(); c.arc(cx,292,6,0,Math.PI); c.fill(); }
    c.fillStyle=PAL.ink2; c.font='bold 9px sans-serif'; c.textAlign='center'; c.fillText(badgeCount()+' huy hiệu',726,326); }
}
function drawDecorWall(c,t){
  const D=G.equip.decor;
  if(D.d_lights){ c.strokeStyle='#8a7fa0'; c.lineWidth=1.5; c.beginPath(); c.moveTo(24,48); for(let x=24;x<=936;x+=8) c.lineTo(x,48+Math.sin((x-24)/40*Math.PI)*7+6); c.stroke();
    const cols=['#ff9eb5','#ffe08a','#8ad1b6','#9fb5f0']; for(let x=44,i=0;x<=920;x+=40,i++){ const y=48+Math.sin((x-24)/40*Math.PI)*7+6, on=Math.sin(t*3+i)>-0.4; ell(c,x,y+5,4,5,on?cols[i%4]:'#d8d0e8'); if(on) ell(c,x,y+5,8,9,'rgba(255,240,180,.25)'); } }
  if(D.d_poster){ rr(c,90,8,64,34,4); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#c9bfe6'; c.lineWidth=2; c.stroke(); rr(c,108,14,28,22,4); c.fillStyle=PAL.chip; c.fill(); ell(c,117,22,2,2,'#2f2a3d'); ell(c,127,22,2,2,'#2f2a3d'); c.strokeStyle='#2f2a3d'; c.lineWidth=1.4; c.beginPath(); c.arc(122,27,3,0.1*Math.PI,0.9*Math.PI); c.stroke(); }
}
function drawWorld(c,t){
  const fl=ITEM[G.equip.floor]||ITEM.floor_cream, wl=ITEM[G.equip.wall]||ITEM.wall_lav;
  for(let j=0;j<12;j++) for(let i=0;i<20;i++){ c.fillStyle=(i+j)%2?fl.a:fl.b; c.fillRect(i*48,j*48,48,48); }
  const rug=(x,y,w,hh,col,label,top)=>{ rr(c,x,y,w,hh,22); c.fillStyle=col; c.globalAlpha=.55; c.fill(); c.globalAlpha=1; c.setLineDash([8,6]); c.strokeStyle='rgba(122,115,144,.5)'; c.lineWidth=2; c.stroke(); c.setLineDash([]);
    c.fillStyle='rgba(74,68,88,.55)'; c.font='bold 13px "Segoe UI",sans-serif'; c.textAlign='center'; c.fillText(label,x+w/2,top?y+17:y+hh-8); };
  rug(30,262,270,244,PAL.pink,'KHU THIẾT KẾ',true);
  rug(350,292,260,170,PAL.lav,'KHU LAYOUT',true);
  rug(700,64,232,150,PAL.mint,'KHU KIỂM TRA');
  rug(30,66,220,140,PAL.butter,'GIẢNG VIÊN');
  drawDecorFloor(c,t);
  c.fillStyle=wl.color; c.fillRect(0,0,W,48); c.fillRect(0,0,24,H); c.fillRect(W-24,0,24,H); c.fillRect(0,H-20,W,20);
  c.fillStyle=wl.dark; c.fillRect(0,44,W,4); c.fillRect(24,0,3,H); c.fillRect(W-27,0,3,H); c.fillRect(0,H-23,W,3);
  rr(c,440,H-24,80,24,6); c.fillStyle='#c9a27a'; c.fill(); ell(c,508,H-10,3,3,'#fff0b8');
  for(const wx of [660,720]) { rr(c,wx-0,6,46,34,5); c.fillStyle=PAL.sky; c.fill(); c.strokeStyle='#fff'; c.lineWidth=3; c.stroke(); c.beginPath(); c.moveTo(wx+23,6); c.lineTo(wx+23,40); c.stroke(); }
  const po=OBJ.poster.rect; rr(c,po[0],8,po[2],34,4); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#c9bfe6'; c.lineWidth=2; c.stroke();
  rr(c,po[0]+28,16,24,18,3); c.fillStyle=PAL.chip; c.fill(); c.fillStyle=PAL.chipDark; for(let i=0;i<3;i++){ c.fillRect(po[0]+24,19+i*5,4,2); c.fillRect(po[0]+52,19+i*5,4,2); }
  const wb=OBJ.whiteboard.rect; rr(c,wb[0]+4,4,wb[2]-8,40,5); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#b8b0d0'; c.lineWidth=4; c.stroke();
  const bx=(x,y,w,col,lab)=>{ rr(c,x,y,w,20,4); c.fillStyle=col; c.fill(); c.fillStyle=PAL.ink; c.font='bold 10px "Segoe UI",sans-serif'; c.textAlign='center'; c.fillText(lab,x+w/2,y+14); };
  bx(360,12,50,PAL.sky,'CLK'); bx(360,28,50,PAL.pink,'RST'); bx(448,16,74,PAL.mint,'ĐẾM 2 BIT'); bx(560,16,50,PAL.butter,'Q');
  c.strokeStyle=PAL.ink2; c.lineWidth=1.6; c.beginPath(); c.moveTo(410,22); c.lineTo(448,22); c.moveTo(410,38); c.lineTo(448,38); c.moveTo(522,26); c.lineTo(560,26); c.stroke();
  drawDecorWall(c,t);
  const td=OBJ.teacherDesk.rect; drawChair(c,td[0]+td[2]/2,td[1]+2); drawDesk(c,td,{mon:1,keyboard:true,mug:true,t});
  rr(c,td[0]+8,td[1]+td[3]-12,34,10,3); c.fillStyle='#fff'; c.fill(); c.fillStyle=PAL.ink2; c.font='bold 8px sans-serif'; c.textAlign='center'; c.fillText('GV',td[0]+25,td[1]+td[3]-4);
  const pc=OBJ.pcdesk.rect; drawChair(c,pc[0]+95,pc[1]+pc[3]+26); drawDesk(c,pc,{mon:2,kinds:['code','code'],keyboard:true,t});
  const kd=OBJ.khoaDesk.rect; drawChair(c,kd[0]+95,kd[1]+kd[3]+26); drawDesk(c,kd,{mon:2,kinds:['code','diagram'],keyboard:true,mug:true,t});
  const ly=OBJ.layout.rect; drawChair(c,ly[0]+100,ly[1]+ly[3]+26); drawDesk(c,ly,{mon:2,kinds:['grid','grid'],keyboard:true,t});
  const bn=OBJ.bench.rect; drawDesk(c,bn,{mon:2,kinds:['scope','scope'],t});
  rr(c,bn[0]+8,bn[1]+bn[3]-18,34,12,3); c.fillStyle='#8ad1b6'; c.fill(); ell(c,bn[0]+bn[2]-20,bn[1]+bn[3]-12,5,4,'#ff9eb5');
  const sh=OBJ.shelf.rect; rr(c,sh[0],sh[1],sh[2],sh[3],6); c.fillStyle=PAL.wood; c.fill(); c.strokeStyle=PAL.woodDark; c.lineWidth=3; c.stroke();
  const cols=['#9fb5f0','#ff9eb5','#8ad1b6','#e8b93a','#c9b8f2'];
  for(let r=0;r<4;r++) for(let i=0;i<4;i++){ c.fillStyle=cols[(r+i)%5]; c.fillRect(sh[0]+6+i*9,sh[1]+8+r*30,7,22); }
  // bảng nhiệm vụ: bảng gỗ cắm ghim đứng trên sàn
  const bd=OBJ.board.rect; ell(c,bd[0]+bd[2]/2,bd[1]+bd[3]+2,bd[2]/2+4,5,'rgba(80,60,100,.15)'); c.fillStyle='#b78b57'; c.fillRect(bd[0]+8,bd[1]+bd[3]-12,6,14); c.fillRect(bd[0]+bd[2]-14,bd[1]+bd[3]-12,6,14);
  rr(c,bd[0],bd[1],bd[2],bd[3]-8,6); c.fillStyle='#e9c79a'; c.fill(); c.strokeStyle='#b78b57'; c.lineWidth=4; c.stroke();
  for(const [nx,ny,col] of [[bd[0]+8,bd[1]+6,'#fff'],[bd[0]+30,bd[1]+8,'#ffe08a'],[bd[0]+50,bd[1]+6,'#ffd3df'],[bd[0]+14,bd[1]+24,'#c6e6fb'],[bd[0]+40,bd[1]+24,'#fff']]){ c.fillStyle=col; c.fillRect(nx,ny,16,13); ell(c,nx+8,ny+2,1.8,1.8,'#e0587a'); }
  const pl=OBJ.plant.rect; rr(c,pl[0]+6,pl[1]+28,24,22,5); c.fillStyle='#f0a58c'; c.fill();
  for(const [dx,dy,r] of [[18,18,12],[10,22,9],[26,22,9],[18,8,9]]) ell(c,pl[0]+dx,pl[1]+dy,r,r,'#8fd1a0','#5fb89f');
  const cf=OBJ.coffee.rect; rr(c,cf[0],cf[1]+8,cf[2],cf[3]-4,6); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#c9bfe6'; c.lineWidth=3; c.stroke();
  rr(c,cf[0]+10,cf[1]+14,24,16,3); c.fillStyle='#ffd3df'; c.fill(); ell(c,cf[0]+50,cf[1]+20,5,5,'#8ad1b6'); ell(c,cf[0]+50,cf[1]+4,4,4,'rgba(200,200,220,.7)');
  // cửa hàng linh kiện (quầy nhỏ có mái che sọc)
  const sp=OBJ.shop.rect; rr(c,sp[0],sp[1]+10,sp[2],sp[3]-10,6); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#c9bfe6'; c.lineWidth=3; c.stroke();
  for(let i=0;i<8;i++){ c.fillStyle=i%2?'#ffd3df':'#fff'; c.fillRect(sp[0]+i*10,sp[1]-2,10,14); } c.strokeStyle='#e8a5b8'; c.lineWidth=2; c.strokeRect(sp[0],sp[1]-2,80,14);
  ell(c,sp[0]+18,sp[1]+24,6,5,PAL.chip,PAL.chipDark); rr(c,sp[0]+34,sp[1]+19,14,10,3); c.fillStyle='#9fb5f0'; c.fill(); ell(c,sp[0]+62,sp[1]+24,6,5,'#ffe08a','#e8b93a');
}
function drawMarker(c,x,y,t,dir){
  const b=Math.sin(t*5)*4; c.save(); c.translate(x,y+(dir==='up'?-b:b));
  c.beginPath(); if(dir==='up'){ c.moveTo(0,-10); c.lineTo(-9,4); c.lineTo(9,4); } else { c.moveTo(0,10); c.lineTo(-9,-4); c.lineTo(9,-4); }
  c.closePath(); c.fillStyle=PAL.coral; c.fill(); c.strokeStyle='#fff'; c.lineWidth=3; c.stroke(); c.restore();
}
// Mục tiêu hiện tại để vẽ mũi tên: titutorial theo G.stage; sau đó theo nhiệm vụ đang nhận
function markerTarget(){
  if(G.stage<6) return TUT_STATIONS[G.stage];
  const a=Game.activeInfo && Game.activeInfo();
  return a?a.station:null;
}
function render(t){
  const c=ctx; c.setTransform(DPR,0,0,DPR,0,0); c.clearRect(0,0,W,H);
  drawWorld(c,t);
  const target=markerTarget();
  if(G.screen==='play'){
    if(target==='teacher') drawMarker(c,NPC.teacher.x,NPC.teacher.y-82,t,'down'); else if(target&&OBJ[target]) drawMarker(c,OBJ[target].mk[0],OBJ[target].mk[1],t,OBJ[target].mk[2]);
  }
  const p=G.player, ch=G.chip;
  const near=Math.hypot(p.x-NPC.teacher.x,p.y-NPC.teacher.y)<140;
  const tdir = near? (Math.abs(p.x-NPC.teacher.x)>Math.abs(p.y-NPC.teacher.y)?(p.x<NPC.teacher.x?'left':'right'):(p.y<NPC.teacher.y?'up':'down')):'down';
  const ents=[
    {y:p.y,fn:()=>{ drawChibi(c,p.x,p.y,{look:curLook(),dir:p.dir,moving:p.moving,phase:p.phase,t});
        c.font='bold 12px "Segoe UI",sans-serif'; c.textAlign='center'; const tw=c.measureText(G.name).width+12; rr(c,p.x-tw/2,p.y-86,tw,16,8); c.fillStyle='#ffffffdd'; c.fill(); c.fillStyle=PAL.ink; c.fillText(G.name,p.x,p.y-74); }},
    {y:NPC.teacher.y,fn:()=>drawChibi(c,NPC.teacher.x,NPC.teacher.y,{look:lookTeacher(),dir:tdir,t})},
    {y:NPC.khoa.y,fn:()=>drawChibi(c,NPC.khoa.x,NPC.khoa.y,{look:lookKhoa(),dir:'left',t})},
    {y:ch.y,fn:()=>drawChip(c,ch.x,ch.y,t,1,G.equip.chip)}
  ].sort((a,b)=>a.y-b.y);
  ents.forEach(e=>e.fn());
  c.font='bold 12px "Segoe UI",sans-serif'; c.textAlign='center';
  for(const k in NPC){ const n=NPC[k], tw=c.measureText(n.name).width+12; rr(c,n.x-tw/2,n.y-86,tw,16,8); c.fillStyle=k==='teacher'?'#ffe0ea':'#e4f6ee'; c.fill(); c.fillStyle=PAL.ink; c.fillText(n.name,n.x,n.y-74); }
  if(G.screen==='play' && G.near){ const o=G.near, pos = o.act.startsWith('npc:')? [NPC[o.id].x,NPC[o.id].y-98] : [OBJ[o.id].rect[0]+OBJ[o.id].rect[2]/2, Math.max(16,OBJ[o.id].rect[1]-12)];
    const wallObj=(o.id==='whiteboard'||o.id==='poster'), by=pos[1]+(wallObj?70:0)-Math.abs(Math.sin(t*6))*3; rr(c,pos[0]-13,by-13,26,26,8); c.fillStyle='#fff'; c.fill(); c.strokeStyle=PAL.coral; c.lineWidth=3; c.stroke(); c.fillStyle=PAL.coral; c.font='bold 16px "Segoe UI",sans-serif'; c.fillText('E',pos[0],by+6); }
  for(const q of G.particles){ c.save(); c.translate(q.x,q.y); c.rotate(q.r); c.fillStyle=q.col; c.globalAlpha=clamp(q.life*1.5,0,1); c.fillRect(-4,-2,8,4); c.restore(); }
}

/* =====================================================================
   6. HIỆU ỨNG
   ===================================================================== */
const Fx = {
  confetti(){
    const cols=[PAL.coral,'#8ad1b6','#9fb5f0','#e8b93a','#c9b8f2','#ff9eb5'];
    for(let i=0;i<70;i++) G.particles.push({x:W/2+(Math.random()-.5)*300,y:120+Math.random()*60,vx:(Math.random()-.5)*260,vy:-80-Math.random()*200,r:Math.random()*6,vr:(Math.random()-.5)*10,col:cols[i%cols.length],life:1.4+Math.random()*.6});
  },
  update(dt){ for(const q of G.particles){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=420*dt; q.r+=q.vr*dt; q.life-=dt; } G.particles=G.particles.filter(q=>q.life>0); },
  banner(text,ms){ const b=$('#banner'); b.innerHTML=text; b.classList.remove('hidden'); b.style.animation='none'; void b.offsetWidth; b.style.animation=''; clearTimeout(this._bt); this._bt=setTimeout(()=>b.classList.add('hidden'),ms||2400); }
};
