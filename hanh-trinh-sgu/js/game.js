'use strict';
/* =====================================================================
   GAME: nhiệm vụ hằng ngày, dự án, thưởng, lên cấp, huy hiệu, sang ngày mới,
   hồ sơ, cửa hàng, xuất/nhập bản lưu, màn hình và vòng lặp chính
   ===================================================================== */
const strip=s=>s.replace(/<[^>]+>/g,'');
const stars=n=>'★'.repeat(n)+'☆'.repeat(Math.max(0,3-n));
const energyMax=()=>curCareer().energy;
const rewardText=r=>`+${r.xp} XP · +${r.money} xu`+(r.skill?' · '+Object.entries(r.skill).map(([k,v])=>`+${v} ${SKILLS.find(s=>s.id===k).name}`).join(', '):'');
const dailyAvailable=d=>isProjectDone(d.needs)&&G.career>=d.minCareer;

/* ---------- Bảng nhiệm vụ hằng ngày ---------- */
function pickDaily(rng,exclude,count){
  const pool=DAILY.filter(d=>dailyAvailable(d)&&!exclude.includes(d.id));
  const sh=shuffled(rng,pool), picked=[], used=new Set();
  for(const d of sh){ if(picked.length>=count) break; if(!used.has(d.engine)){ picked.push(d); used.add(d.engine); } }
  for(const d of sh){ if(picked.length>=count) break; if(!picked.includes(d)) picked.push(d); }
  return picked.map(d=>({pid:d.id,seed:((rng()*4294967295)>>>0)||1,done:false}));
}
function buildBoard(day){
  const rng=mulberry32(hashStr('board|'+G.seed+'|'+day));
  return {day,tasks:pickDaily(rng,[],4)};
}
function ensureBoard(){ if(!G.daily||G.daily.day!==G.day) G.daily=buildBoard(G.day); }
// Khi mở khóa nội dung mới giữa ngày (xong chương/dự án), bổ sung nhiệm vụ mới cho bảng nếu còn trống
function topUpBoard(){
  if(G.stage<6) return; ensureBoard();
  const have=G.daily.tasks.map(t=>t.pid);
  if(G.daily.tasks.length<4){ const rng=mulberry32(hashStr('top|'+G.seed+'|'+G.day+'|'+have.length)); G.daily.tasks.push(...pickDaily(rng,have,4-G.daily.tasks.length)); }
}

/* ---------- Thưởng, lên cấp, huy hiệu ---------- */
function badgeCond(c){
  if(c.tutorial) return G.stage>=6;
  if(c.project) return isProjectDone(c.project);
  if(c.career!=null) return G.career>=c.career;
  if(c.stat) return (G.stats[c.stat]||0)>=c.min;
  if(c.day) return G.day>=c.day;
  if(c.money) return G.money>=c.money;
  if(c.owned) return ownedCount()>=c.owned;
  if(c.skill) return skillLevel(c.skill[0])>=c.skill[1];
  return false;
}
// Kiểm tra thăng cấp + huy hiệu mới; trả về danh sách sự kiện để thông báo
function checkProgress(){
  const ev=[];
  while(true){
    const c=curCareer(); if(!c.next) break;
    if(G.xp>=c.next.xp && c.next.projects.every(isProjectDone)){
      const oldMax=energyMax(); G.career++; G.energy=Math.min(10,G.energy+Math.max(0,energyMax()-oldMax));
      ev.push({kind:'career',text:'Thăng cấp: '+curCareer().name+'!'});
    } else break;
  }
  for(const b of BADGES) if(!G.badges[b.id]&&badgeCond(b.cond)){ G.badges[b.id]=G.day; ev.push({kind:'badge',text:'Huy hiệu mới: '+b.name}); }
  return ev;
}
function grant(reward,perf){
  perf=perf==null?1:perf;
  const xp=Math.round(reward.xp*perf), money=Math.round(reward.money*perf);
  G.xp+=xp; G.money+=money;
  for(const k in (reward.skill||{})) G.skills[k]=(G.skills[k]||0)+reward.skill[k];
  return {xp,money,skill:reward.skill||{}};
}

/* ---------- Nhiệm vụ đang nhận và cách chạy một nhiệm vụ ---------- */
function projState(pid){ return G.projects[pid]||(G.projects[pid]={step:0,done:false,seeds:[]}); }
function projSeed(pid,idx){ const ps=projState(pid); if(!ps.seeds[idx]) ps.seeds[idx]=((Math.random()*4294967295)>>>0)||1; return ps.seeds[idx]; }
// Tạo định nghĩa nhiệm vụ chạy được từ (kind, tham chiếu)
function taskDef(kind,ref){
  if(kind==='daily'){ const t=G.daily&&G.daily.tasks[ref.idx]; if(!t||t.done) return null; const d=DAILY_BY_ID[t.pid]; return {kind,idx:ref.idx,key:'daily:'+ref.idx,title:d.title,engine:d.engine,params:d.params,station:d.station,tier:d.tier,seed:t.seed,reward:d.reward}; }
  if(kind==='project'){ const p=PROJECT[ref.pid], ps=projState(p.id); if(ps.done||ps.step>=p.steps.length) return null; const st=p.steps[ps.step];
    return {kind,pid:p.id,step:ps.step,key:'project:'+p.id,title:p.name+' – '+st.title,engine:st.engine,params:st.params,station:st.station,tier:st.tier,seed:projSeed(p.id,ps.step),reward:st.reward,brief:st.brief}; }
  if(kind==='practice'){ const d=DAILY_BY_ID[ref.pid]; return {kind,pid:d.id,key:'practice:'+d.id,title:'Luyện tập: '+d.title,engine:d.engine,params:d.params,station:d.station,tier:d.tier,seed:ref.seed||(((Math.random()*4294967295)>>>0)||1),reward:{xp:3,money:2,skill:{}}}; }
  return null;
}
function activeDef(){
  const a=G.active; if(!a) return null;
  if(a.kind==='daily') return taskDef('daily',{idx:a.idx});
  if(a.kind==='project') return taskDef('project',{pid:a.pid});
  if(a.kind==='practice') return taskDef('practice',{pid:a.pid,seed:a.seed});
  return null;
}
function runTask(def){
  const stats={wrong:0,hints:0};
  const q=makeTaskQuest(def.engine,def.params,def.seed);
  Host.begin(q,def.title,stats,()=>Game.finishTask(def,stats));
  if(def.brief) Host.fb('<b>Mục tiêu:</b> '+def.brief,'info');
}

const Game = {
  activeInfo(){ const d=activeDef(); return d?{title:d.title,station:d.station}:null; },
  persist:save,

  enterPlay(fresh){
    G.screen='play'; UI.screen(null); Object.assign(G.player,{x:480,y:500,dir:'up',moving:false}); G.chip.x=450; G.chip.y=520; Input.keys={};
    if(G.stage>=6) ensureBoard();
    UI.updateHud(); if(fresh&&G.stage===0) Dialogue.open(TEXT.intro);
  },

  /* ----- Tương tác với vật thể / nhân vật ----- */
  interact(){
    const o=G.near; if(!canMove()||!o) return; Sound.click(); const [kind,arg]=o.act.split(':');
    if(o.act==='npc:teacher') return this.teacherTalk();
    if(o.act==='npc:khoa') return Dialogue.open([{who:'khoa',text:G.stage<6?TEXT.khoaTips[G.stage]:TEXT.khoaFree[(G.day+G.stage)%TEXT.khoaFree.length]}]);
    if(kind==='flavor') return Dialogue.open([{who:'chip',text:TEXT.flavor[arg]}]);
    if(o.act==='board') return G.stage<6?Dialogue.open([{who:'chip',text:'Bảng nhiệm vụ sẽ mở sau khi bạn hoàn thành chương hướng dẫn. Cô Minh Châu đang đợi bạn nè!'}]):Panels.quests();
    if(o.act==='shop') return Panels.shop();
    if(G.stage<6) return this.tutorialStation(o.act);
    this.careerStation(o.act);
  },
  tutorialStation(station){
    const map={whiteboard:[2,TEXT.q2intro],pcdesk:[3,TEXT.q3intro],bench:[4,TEXT.q4intro],layout:[5,TEXT.q5intro]}, [n,intro]=map[station];
    if(G.stage<n-1) return Dialogue.open([{who:'chip',text:`Chưa tới lượt đâu! Hãy làm xong “Nhiệm vụ ${G.stage+1}: ${QUEST_TITLES[G.stage]}” trước nhé. ${strip(OBJECTIVES[G.stage])}`}]);
    if(G.stage>=n) return Dialogue.open([{who:'chip',text:`Phần này bạn xong rồi! ${strip(OBJECTIVES[G.stage])}`}]);
    const open=()=>this.openTutorial(n);
    if(G.seen[n]) open(); else { G.seen[n]=true; Dialogue.open(intro,open); }
  },
  openTutorial(n){ Host.begin(Quests[n],'Nhiệm vụ '+n+' – '+QUEST_TITLES[n-1],attempt(n),lines=>Game.completeQuest(n,lines)); },
  careerStation(station){
    const def=activeDef();
    if(def&&def.station===station){
      if(def.kind!=='practice'&&G.energy<1) return Dialogue.open([{who:'chip',text:'Hết năng lượng rồi! Hãy nghỉ ngơi và bấm “Sang ngày mới” khi bạn sẵn sàng nha.'}]);
      return runTask(def);
    }
    if(def) return Dialogue.open([{who:'chip',text:`Việc bạn đang nhận (“${def.title}”) làm ở ${STATIONS[def.station]}. Đi tới đó nha!`}]);
    Dialogue.open([{who:'chip',text:'Bạn chưa nhận việc nào. Mở bảng nhiệm vụ để chọn nhé!'}],()=>Panels.quests());
  },
  teacherTalk(){
    if(G.stage===0){ const first=!G.seenAssign; G.seenAssign=true; Dialogue.open(first?TEXT.assign:TEXT.assignAgain,()=>this.openTutorial(1)); }
    else if(G.stage<5) Dialogue.open([{who:'teacher',text:`Em đang làm “Nhiệm vụ ${G.stage+1}: ${QUEST_TITLES[G.stage]}” đúng không? ${strip(OBJECTIVES[G.stage])}`}]);
    else if(G.stage===5) Dialogue.open(TEXT.handover,()=>this.finishTutorial());
    else Dialogue.open(TEXT.mentor[G.career].map(t=>({who:'teacher',text:t})),()=>Panels.quests());
  },

  /* ----- Chương hướng dẫn ----- */
  completeQuest(n,lines){
    if(G.stage>=n) return;
    const at=attempt(n), d=diff(); const sc=Math.max(CONFIG.minPoints,CONFIG.maxPoints-at.wrong*d.wrongPenalty-at.hints*d.hintPenalty);
    G.results[n]={score:sc,wrong:at.wrong,hints:at.hints}; G.stage=n;
    const r=grant({xp:TUTORIAL_REWARD.perQuest.xp,money:TUTORIAL_REWARD.perQuest.money,skill:TUTORIAL_REWARD.skills[n]},sc/100);
    save(); Host.close(); Fx.confetti(); Fx.banner(`✓ Hoàn thành nhiệm vụ ${n}!<br><span style="font-size:16px">${rewardText(r)}</span>`); Sound.ok(); UI.updateHud();
    if(lines) setTimeout(()=>{ if(!Dialogue.active) Dialogue.open(lines); },900);
  },
  finishTutorial(){
    G.stage=6; const r=grant(TUTORIAL_REWARD.handover,1);
    const ev=checkProgress(); topUpBoard(); ensureBoard(); save(); Fx.confetti(); UI.updateHud();
    UI.showEnd(r,ev);
  },

  /* ----- Hoàn thành nhiệm vụ trong chế độ sự nghiệp ----- */
  finishTask(def,stats){
    const d=diff(), perf=clamp(100-stats.wrong*d.wrongPenalty-stats.hints*d.hintPenalty,CONFIG.minPoints,100)/100;
    let reward=def.reward, capped=false;
    if(def.kind==='practice'){ if(G.stats.practiceToday>=5){ reward={xp:0,money:0,skill:{}}; capped=true; } else G.stats.practiceToday++; }
    const r=grant(reward,perf), lines=[];
    if(def.kind!=='practice') G.energy=Math.max(0,G.energy-1);
    G.stats.tasksDone++; if(def.engine==='debug') G.stats.debugDone++;
    if(def.kind==='daily'){ G.daily.tasks[def.idx].done=true; G.stats.dailyDone++; }
    if(def.kind==='project'){
      const p=PROJECT[def.pid], ps=projState(p.id); ps.step++;
      if(ps.step>=p.steps.length){ ps.done=true; ps.step=p.steps.length; G.history.push({id:p.id,day:G.day}); const pr=grant(p.done,1); r.xp+=pr.xp; r.money+=pr.money;
        lines.push({who:'teacher',text:`Chúc mừng ${G.name}! Em đã hoàn thành dự án “${p.name}” (thưởng thêm +${p.done.xp} XP, +${p.done.money} xu).`}); }
    }
    if(G.active&&G.active.kind===def.kind&&(def.kind!=='daily'||G.active.idx===def.idx)&&(def.kind!=='project'||G.active.pid===def.pid)&&(def.kind!=='practice'||G.active.pid===def.pid)) G.active=null;
    const ev=checkProgress(); if(ev.length||def.kind==='project') topUpBoard();
    save(); Host.close(); Fx.confetti(); Sound.ok(); UI.updateHud(); Panel.refresh();
    Fx.banner(`✓ Hoàn thành!<br><span style="font-size:16px">${capped?'Đã đủ 5 lượt thưởng luyện tập hôm nay':rewardText(r)}</span>`);
    for(const e of ev){ if(e.kind==='career') lines.push({who:'teacher',text:`Em đã được thăng cấp thành “${curCareer().name}”! Năng lượng mỗi ngày: ${energyMax()}, trợ cấp mỗi ngày: ${curCareer().allowance} xu.`}); else lines.push({who:'chip',text:'🏅 '+e.text}); }
    if(!lines.length&&def.kind!=='practice'&&G.energy<1) lines.push({who:'chip',text:'Hết năng lượng hôm nay rồi. Khi bạn sẵn sàng, bấm “Sang ngày mới” nha!'});
    if(lines.length) setTimeout(()=>{ if(!Dialogue.active) Dialogue.open(lines); },900);
  },

  /* ----- Sang ngày mới (chỉ khi người chơi chủ động bấm) ----- */
  askNextDay(){
    if(G.stage<6){ UI.toast('Hãy hoàn thành chương hướng dẫn trước khi sang ngày mới.'); return; }
    const left=G.daily?G.daily.tasks.filter(t=>!t.done).length:0;
    confirmBox('Sang ngày mới?',`Bạn còn <b>${G.energy}</b> năng lượng và <b>${left}</b> nhiệm vụ hằng ngày chưa làm (sẽ được thay bằng bảng mới). Tiến độ dự án được giữ nguyên.<br><span class="small">Trợ cấp mỗi ngày: +${curCareer().allowance} xu.</span>`,'Sang ngày mới',()=>Game.nextDay());
  },
  nextDay(){
    G.day++; const al=curCareer().allowance; G.money+=al; G.energy=energyMax(); G.stats.practiceToday=0;
    if(G.active&&G.active.kind==='daily') G.active=null;
    G.daily=buildBoard(G.day); const ev=checkProgress(); save(); UI.updateHud(); Panel.refresh();
    Fx.banner(`🌅 Ngày ${G.day}<br><span style="font-size:16px">+${al} xu trợ cấp · năng lượng ${G.energy}/${energyMax()}</span>`); Sound.coin();
    const lines=[{who:'chip',text:`Chào ngày ${G.day}! Bạn nhận ${al} xu trợ cấp. Hôm nay có ${G.daily.tasks.length} nhiệm vụ mới ở bảng nhiệm vụ.`}];
    for(const e of ev) lines.push({who:e.kind==='career'?'teacher':'chip',text:e.kind==='career'?`Em đã được thăng cấp thành “${curCareer().name}”!`:'🏅 '+e.text});
    setTimeout(()=>{ if(!Dialogue.active&&G.screen==='play') Dialogue.open(lines); },700);
  },

  /* ----- Cửa hàng ----- */
  buy(id){
    const it=ITEM[id]; if(!it||G.owned[id]) return;
    if(!unlockMet(it.unlock)){ UI.toast('Chưa mở khóa món này.'); return; }
    if(G.money<it.price){ UI.toast('Bạn chưa đủ xu.'); Sound.bad(); return; }
    G.money-=it.price; G.owned[id]=true; this.equip(id,true); Sound.coin();
    const ev=checkProgress(); for(const e of ev) Fx.banner('🏅 '+e.text); save(); UI.updateHud(); Panel.refresh();
  },
  equip(id,silent){
    const it=ITEM[id]; if(!it||!G.owned[id]) return;
    if(it.slot==='decor') G.equip.decor[id]=!G.equip.decor[id]||silent===true?true:false;
    else G.equip[it.slot]=(G.equip[it.slot]===id&&!silent&&it.slot!=='wall'&&it.slot!=='floor')?null:id;
    if(!silent){ Sound.click(); save(); Panel.refresh(); }
  },

  /* ----- Bản lưu ----- */
  restart(){
    Host.close(); if(Dialogue.active) Dialogue.close(); Panel.close(); Store.clear();
    applyState(Object.assign(defaultState(),{name:G.name,look:G.look,diff:G.diff})); UI.updateHud();
    G.screen='select'; UI.buildSelect(); UI.screen('#scrSelect');
  },
  loadSaved(){ const s=Store.load(); if(!s) return false; applyState(s); ensureBoardSafe(); const ev=checkProgress(); if(ev.length) save(); return s._migrated||false; }
};
function ensureBoardSafe(){ if(G.stage>=6){ ensureBoard(); } }

/* =====================================================================
   BẢNG: Nhiệm vụ, Hồ sơ, Cửa hàng, Lưu trữ
   ===================================================================== */
let qTab='today', shopTab='outfit';
const lockLine=c=>h('div',{class:'lk '+(c.ok?'ok':'no')},(c.ok?'✓ ':'✗ ')+c.text);
const Panels = {
  quests(tab){
    if(tab) qTab=tab;
    Panel.open('Nhiệm vụ',body=>{
      const top=h('div',{class:'row',style:'justify-content:space-between;margin-bottom:8px'},
        h('div',{class:'row'},h('span',{class:'pill'},'Ngày '+G.day),h('span',{class:'pill'},'⚡ '+G.energy+'/'+energyMax()),h('span',{class:'pill'},'🪙 '+G.money+' xu')),
        G.stage>=6?h('button',{class:'btn warn',onclick:()=>{ Panel.close(); Game.askNextDay(); }},'🌅 Sang ngày mới'):null);
      body.append(top);
      if(G.stage<6){
        body.append(h('div',{class:'tcard'},h('h3',null,'Chương 1 – Hướng dẫn: ngày đầu tiên ở lab'),
          h('div',{class:'small'},'Hoàn thành 6 nhiệm vụ này để mở khóa nhiệm vụ hằng ngày, dự án, cửa hàng và “Sang ngày mới”. Hãy đi tới đúng nơi trong phòng lab.'),
          h('ul',{class:'chk'},...QUEST_TITLES.map((t,i)=>h('li',{class:i<G.stage?'done':''},`${i+1}. ${t}`+(i===G.stage?' ← đang làm':'')+` (${i===0||i===5?'Cô Minh Châu':STATIONS[TUT_STATIONS[i]]})`)))));
        return;
      }
      body.append(h('div',{class:'tabs'},...[['today','Hôm nay'],['projects','Dự án'],['practice','Luyện tập']].map(([k,t])=>h('button',{class:'tab'+(qTab===k?' sel':''),onclick:()=>{ qTab=k; Panel.draw(0); }},t))));
      if(qTab==='today') this.dailyTab(body); else if(qTab==='projects') this.projectsTab(body); else this.practiceTab(body);
    });
  },
  actionBtn(def,isActive,onAccept){
    if(isActive) return h('div',{class:'row'},h('span',{class:'pill ok'},'Đang làm → '+STATIONS[def.station]),h('button',{class:'btn sm',onclick:()=>{ G.active=null; save(); UI.updateHud(); Panel.draw(1); }},'Hủy'));
    if(G.energy<1) return h('button',{class:'btn',disabled:true},'Hết năng lượng');
    return h('button',{class:'btn',onclick:onAccept},'Nhận việc');
  },
  dailyTab(body){
    ensureBoard();
    body.append(h('div',{class:'small',style:'margin-bottom:6px'},'Mỗi nhiệm vụ tốn 1 năng lượng. Bấm “Nhận việc” rồi đi tới đúng khu trong lab và nhấn E. Bảng được đổi mới khi bạn bấm “Sang ngày mới”.'));
    if(!G.daily.tasks.length) body.append(h('div',{class:'note'},'Chưa có nhiệm vụ nào khả dụng hôm nay. Hãy hoàn thành thêm dự án để mở khóa nhiệm vụ mới.'));
    G.daily.tasks.forEach((t,idx)=>{
      const d=DAILY_BY_ID[t.pid], def=taskDef('daily',{idx});
      const act=G.active&&G.active.kind==='daily'&&G.active.idx===idx;
      body.append(h('div',{class:'tcard'+(t.done?' done':'')},
        h('div',{class:'row',style:'justify-content:space-between'},h('h3',null,d.title),h('span',{class:'tag'},ENGINE_NAMES[d.engine])),
        h('div',{class:'small'},`${stars(d.tier)} · Làm ở: ${STATIONS[d.station]} · Thưởng: ${rewardText(d.reward)}`),
        t.done?h('div',{class:'pill ok'},'✓ Đã hoàn thành'):this.actionBtn(def,act,()=>{ G.active={kind:'daily',idx}; save(); Sound.click(); UI.updateHud(); Panel.close(); UI.toast('Đã nhận việc: '+d.title+'. Đi tới '+STATIONS[d.station]+'!'); })));
    });
  },
  projectsTab(body){
    for(const p of PROJECTS){
      const ps=projState(p.id), locks=[]; if(p.career>0) locks.push({ok:G.career>=p.career,text:'Cấp '+CAREERS[p.career].name}); for(const r of p.requires) locks.push({ok:isProjectDone(r),text:'Hoàn thành '+projName(r)});
      const open=locks.every(l=>l.ok), n=p.steps.length, pct=Math.round(100*(ps.done?n:ps.step)/n);
      const card=h('div',{class:'tcard'+(ps.done?' done':'')+(open?'':' locked')},
        h('div',{class:'row',style:'justify-content:space-between'},h('h3',null,p.icon+' '+p.name),h('span',{class:'tag'},ps.done?'Hoàn thành':open?`Bước ${ps.step+1}/${n}`:'🔒 Chưa mở khóa')),
        h('div',{class:'small'},p.blurb),
        h('div',{class:'bar'},h('i',{style:'width:'+pct+'%'})));
      if(!open) card.append(h('div',null,h('div',{class:'small'},'Điều kiện mở khóa:'),...locks.map(lockLine)));
      else {
        card.append(h('ol',{class:'steps'},...p.steps.map((s,i)=>h('li',{class:i<ps.step||ps.done?'done':(i===ps.step?'cur':'')},`${s.title} `,h('span',{class:'small'},`(${ENGINE_NAMES[s.engine]} · ${STATIONS[s.station]})`)))));
        if(ps.done){ const hs=G.history.find(x=>x.id===p.id); card.append(h('div',{class:'pill ok'},'✓ Hoàn thành'+(hs?' (ngày '+hs.day+')':''))); }
        else { const def=taskDef('project',{pid:p.id}), act=G.active&&G.active.kind==='project'&&G.active.pid===p.id;
          card.append(h('div',{class:'small'},`Bước tiếp theo: <b>${def.title}</b> · ${stars(def.tier)} · Thưởng: ${rewardText(def.reward)}`.replace(/<[^>]+>/g,'')),
            this.actionBtn(def,act,()=>{ G.active={kind:'project',pid:p.id}; save(); Sound.click(); UI.updateHud(); Panel.close(); UI.toast('Đã nhận việc: '+def.title+'. Đi tới '+STATIONS[def.station]+'!'); })); }
      }
      body.append(card);
    }
  },
  practiceTab(body){
    body.append(h('div',{class:'small',style:'margin-bottom:6px'},`Luyện tập không tốn năng lượng và làm ngay tại đây; mỗi ngày chỉ có 5 lượt nhận thưởng nhỏ (đã dùng ${G.stats.practiceToday}/5). Mỗi lần luyện là một biến thể mới.`));
    const list=DAILY.filter(dailyAvailable);
    if(!list.length) body.append(h('div',{class:'note'},'Chưa có bài luyện tập nào.'));
    for(const d of list) body.append(h('div',{class:'tcard'},
      h('div',{class:'row',style:'justify-content:space-between'},h('h3',null,d.title),h('span',{class:'tag'},ENGINE_NAMES[d.engine])),
      h('div',{class:'small'},stars(d.tier)),
      h('button',{class:'btn alt',onclick:()=>{ Panel.close(); const def=taskDef('practice',{pid:d.id}); runTask(def); }},'Luyện tập')));
  },

  profile(){
    Panel.open('Hồ sơ kỹ sư',body=>{
      const cv=h('canvas',{width:96,height:116,class:'avatar'});
      const c=curCareer(), nx=c.next;
      const hd=h('div',{class:'row',style:'gap:16px;align-items:center'},cv,h('div',null,h('h2',{style:'margin:0'},G.name),h('div',{class:'big'},c.name),h('div',{class:'small'},`Ngày ${G.day} · 🪙 ${G.money} xu · Độ khó: ${diff().label}`),h('div',{class:'small'},c.desc)));
      body.append(hd);
      setTimeout(()=>{ const x=cv.getContext('2d'); drawChibi(x,48,108,{look:curLook(),dir:'down',t:0.6,scale:1.35}); },0);
      // Kinh nghiệm & điều kiện lên cấp
      const xpCard=h('div',{class:'tcard'},h('h3',null,'Kinh nghiệm'));
      if(nx){ const pct=Math.min(100,Math.round(100*G.xp/nx.xp));
        xpCard.append(h('div',{class:'bar'},h('i',{style:'width:'+pct+'%'})),h('div',{class:'small'},`${G.xp} / ${nx.xp} XP để lên “${CAREERS[G.career+1].name}”`),
          h('div',{class:'small',style:'margin-top:6px'},'Điều kiện lên cấp:'),lockLine({ok:G.xp>=nx.xp,text:`Đạt ${nx.xp} XP`}),...nx.projects.map(p=>lockLine({ok:isProjectDone(p),text:'Hoàn thành '+projName(p)})));
      } else xpCard.append(h('div',{class:'pill ok'},'Đã đạt cấp cao nhất · '+G.xp+' XP'),h('div',{class:'small'},'Bạn vẫn có thể làm nhiệm vụ hằng ngày, luyện tập và trang trí phòng lab.'));
      body.append(xpCard);
      // Kỹ năng
      const sk=h('div',{class:'tcard'},h('h3',null,'Kỹ năng'));
      for(const s of SKILLS){ const pts=G.skills[s.id]||0, lv=skillLevel(s.id), nxt=SKILL_LEVELS[lv]; const pct=nxt==null?100:Math.round(100*(pts-SKILL_LEVELS[lv-1])/(nxt-SKILL_LEVELS[lv-1]));
        sk.append(h('div',{class:'skill'},h('span',null,s.name),h('span',{class:'small'},`Cấp ${lv} · ${pts} điểm`+(nxt!=null?` (cấp tiếp theo: ${nxt})`:' (tối đa)')),h('div',{class:'bar'},h('i',{style:'width:'+pct+'%'})))); }
      body.append(sk);
      // Huy hiệu
      const bg=h('div',{class:'tcard'},h('h3',null,`Huy hiệu (${badgeCount()}/${BADGES.length})`),h('div',{class:'badges'},...BADGES.map(b=>{ const got=G.badges[b.id]; return h('div',{class:'badge'+(got?' got':''),title:b.desc},h('div',{class:'bi'},got?'🏅':'🔒'),h('div',{class:'bn'},b.name),h('div',{class:'small'},got?'Ngày '+got:b.desc)); })));
      body.append(bg);
      // Dự án
      const done=[]; if(G.stage>=6) done.push('Chương 1 – Hướng dẫn: Mạch đếm 2 bit'); for(const p of PROJECTS) if(isProjectDone(p.id)){ const hs=G.history.find(x=>x.id===p.id); done.push(p.name+(hs?` (ngày ${hs.day})`:'')); }
      body.append(h('div',{class:'tcard'},h('h3',null,`Dự án đã hoàn thành (${done.length}/${PROJECTS.length+1})`),done.length?h('ul',{class:'chk'},...done.map(t=>h('li',{class:'done'},t))):h('div',{class:'small'},'Chưa có dự án nào.'),
        h('div',{class:'small'},`Nhiệm vụ đã làm: ${G.stats.tasksDone} · Hằng ngày: ${G.stats.dailyDone} · Sửa lỗi: ${G.stats.debugDone}`)));
      body.append(h('div',{class:'row c'},h('button',{class:'btn',onclick:()=>Panels.shop()},'Cửa hàng & trang phục'),h('button',{class:'btn ghost',onclick:()=>Panels.save()},'Xuất / nhập bản lưu')));
    });
  },

  shop(tab){
    if(tab) shopTab=tab;
    Panel.open('Cửa hàng linh kiện',body=>{
      const groups=[['outfit','Trang phục',['outfit']],['acc','Phụ kiện',['head','face','neck']],['chip','Chip Chip',['chip']],['room','Phòng lab',['wall','floor','decor']]];
      body.append(h('div',{class:'row',style:'justify-content:space-between;margin-bottom:6px'},h('span',{class:'pill'},'🪙 '+G.money+' xu'),h('span',{class:'small'},'Mua bằng xu kiếm được từ nhiệm vụ và trợ cấp hằng ngày.')));
      body.append(h('div',{class:'tabs'},...groups.map(([k,t])=>h('button',{class:'tab'+(shopTab===k?' sel':''),onclick:()=>{ shopTab=k; Panel.draw(0); }},t))));
      const slots=groups.find(g=>g[0]===shopTab)[2], names={wall:'Màu tường',floor:'Sàn nhà',decor:'Đồ trang trí',head:'Đầu',face:'Mặt',neck:'Cổ'};
      const grid=h('div',{class:'cardgrid'});
      for(const it of ITEMS.filter(i=>slots.includes(i.slot))){
        const owned=!!G.owned[it.id], eqd=it.slot==='decor'?!!G.equip.decor[it.id]:G.equip[it.slot]===it.id, locks=unlockChecks(it.unlock);
        const prev=h('canvas',{width:84,height:100,class:'prev'});
        setTimeout(()=>drawItemPreview(prev,it),0);
        let btn;
        if(owned) btn=h('button',{class:'btn '+(eqd?'ok':'alt'),onclick:()=>Game.equip(it.id)},eqd?((it.slot==='wall'||it.slot==='floor')?'✓ Đang dùng':'✓ Đang dùng · bỏ'):'Trang bị');
        else if(!unlockMet(it.unlock)) btn=h('button',{class:'btn',disabled:true},'🔒 Chưa mở khóa');
        else if(G.money<it.price) btn=h('button',{class:'btn',disabled:true},`Thiếu xu (${it.price})`);
        else btn=h('button',{class:'btn',onclick:()=>Game.buy(it.id)},`Mua · ${it.price} xu`);
        grid.append(h('div',{class:'icard'+(owned?' own':'')},prev,h('div',{class:'in'},it.name),h('div',{class:'small'},names[it.slot]||''),
          h('div',{class:'small'},it.price?`Giá: ${it.price} xu`:'Miễn phí'),
          locks.length?h('div',{class:'locks'},...locks.map(lockLine)):h('div',{class:'lk ok'},'✓ Không cần điều kiện'),btn));
      }
      body.append(grid);
    });
  },

  save(){
    Panel.open('Lưu trữ tiến độ',body=>{
      const out=h('textarea',{class:'savebox',readonly:true,rows:6}); out.value=exportText();
      const inp=h('textarea',{class:'savebox',rows:5,placeholder:'Dán nội dung bản lưu (JSON) vào đây…'}), msg=h('div',{class:'small'}), file=h('input',{type:'file',accept:'.json,application/json,text/plain'});
      file.addEventListener('change',()=>{ const f=file.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ inp.value=String(r.result||''); msg.textContent='Đã đọc file “'+f.name+'”. Bấm “Nhập bản lưu”.'; }; r.readAsText(f); });
      body.append(
        h('div',{class:'tcard'},h('h3',null,'Xuất bản lưu (sao lưu / chuyển máy)'),h('div',{class:'small'},'Game tự lưu trong trình duyệt sau mỗi thay đổi. Hãy xuất bản lưu để sao lưu hoặc chuyển sang máy khác.'),out,
          h('div',{class:'row'},h('button',{class:'btn',onclick:()=>{ out.value=exportText(); out.select();
              try{ navigator.clipboard.writeText(out.value).then(()=>msg.textContent='Đã sao chép vào clipboard.',()=>{ document.execCommand&&document.execCommand('copy'); msg.textContent='Đã chọn nội dung, nhấn Ctrl+C nếu chưa tự sao chép.'; }); }catch(e){ msg.textContent='Hãy nhấn Ctrl+C để sao chép nội dung đã chọn.'; } }},'Sao chép'),
            h('button',{class:'btn alt',onclick:()=>{ const blob=new Blob([exportText()],{type:'application/json'}), a=h('a',{href:URL.createObjectURL(blob),download:'sgu-hanh-trinh-ngay'+G.day+'.json'}); document.body.append(a); a.click(); a.remove(); msg.textContent='Đã tạo file tải về.'; }},'Tải file .json'))),
        h('div',{class:'tcard'},h('h3',null,'Nhập bản lưu'),h('div',{class:'small'},'Nhập sẽ <b>thay thế</b> tiến độ hiện tại. Bản lưu của game cũ cũng được chấp nhận và tự chuyển đổi.'.replace(/<[^>]+>/g,'')),inp,file,
          h('div',{class:'row'},h('button',{class:'btn ok',onclick:()=>{
            const r=importText(inp.value); if(!r.ok){ msg.textContent='❌ '+r.msg; Sound.bad(); return; }
            const s=r.state; confirmBox('Nhập bản lưu?',`Sẽ thay thế tiến độ hiện tại bằng: <b>${esc(s.name)}</b>, ngày ${s.day}, ${CAREERS[s.career].name}, ${s.xp} XP.`,'Nhập',()=>{ applyState(s); Host.close(); Panel.close(); ensureBoardSafe(); save(); Game.enterPlay(false); UI.toast('Đã nhập bản lưu.'); }); }},'Nhập bản lưu'))),
        msg);
    });
  }
};
function drawItemPreview(cv,it){
  const c=cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height);
  if(['outfit','head','face','neck'].includes(it.slot)){ const eq={...G.equip,[it.slot]:it.id}; drawChibi(c,42,92,{look:curLook(eq),dir:'down',t:0.5,scale:1.05}); }
  else if(it.slot==='chip') drawChip(c,42,84,0.4,1.8,it.id);
  else if(it.slot==='wall'){ c.fillStyle=it.color; c.fillRect(8,14,68,40); c.fillStyle=it.dark; c.fillRect(8,50,68,4); c.fillStyle='#fdf6ec'; c.fillRect(8,54,68,30); }
  else if(it.slot==='floor'){ for(let i=0;i<4;i++) for(let j=0;j<4;j++){ c.fillStyle=(i+j)%2?it.a:it.b; c.fillRect(10+i*16,18+j*16,16,16); } c.strokeStyle='#c9bfe6'; c.strokeRect(10,18,64,64); }
  else { c.font='44px sans-serif'; c.textAlign='center'; c.fillText(it.icon||'⭐',42,64); }
}

/* =====================================================================
   GIAO DIỆN: HUD, màn hình, chương hoàn thành
   ===================================================================== */
const overlayOpen=()=>['#scrHelp','#scrMenu','#scrEnd','#scrPanel','#scrConfirm'].some(s=>!$(s).classList.contains('hidden'));
const canMove=()=>G.screen==='play'&&!Dialogue.active&&!Host.active&&!overlayOpen();
const UI = {
  toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(this._tt); this._tt=setTimeout(()=>t.classList.add('hidden'),4200); },
  objective(){
    if(G.stage<6) return '<b>Chương 1:</b> '+OBJECTIVES[G.stage]+` <span class="small">(Nhiệm vụ ${G.stage+1}/6: ${QUEST_TITLES[G.stage]})</span>`;
    const a=Game.activeInfo(); if(a) return `<b>Đang làm:</b> ${esc(a.title)} → đến <b>${STATIONS[a.station]}</b>`;
    if(G.energy<1) return 'Hết năng lượng hôm nay! Nghỉ ngơi rồi bấm <b>Sang ngày mới</b> khi bạn sẵn sàng.';
    return `Mở <b>Nhiệm vụ</b> để chọn việc hôm nay (còn ${G.energy} năng lượng).`;
  },
  updateHud(){
    $('#objective').innerHTML=this.objective();
    const c=curCareer(); $('#hDay').textContent='Ngày '+G.day; $('#hCareer').textContent=c.name;
    $('#hMoney').textContent=G.money; $('#hEnergy').textContent=G.energy+'/'+energyMax();
    const nx=c.next, pct=nx?Math.min(100,Math.round(100*G.xp/nx.xp)):100;
    $('#hXpBar').style.width=pct+'%'; $('#hXpText').textContent=nx?`${G.xp}/${nx.xp} XP`:`${G.xp} XP (tối đa)`;
    const career=G.stage>=6; $('#btnNextDay').classList.toggle('dim',!career); $('#btnQuests').classList.toggle('dim',false);
  },
  screen(id){ for(const s of ['#scrTitle','#scrSelect','#scrHelp','#scrMenu','#scrEnd']) $(s).classList.add('hidden'); if(id) $(id).classList.remove('hidden'); },
  buildSelect(){
    const box=$('#looks'); box.innerHTML=''; this.previews=[];
    CONFIG.looks.forEach((L,i)=>{ const cv=h('canvas',{width:100,height:120}); const card=h('div',{class:'look'+(i===G.look?' sel':''),tabindex:0,onclick:()=>{ G.look=i; Sound.click(); [...box.children].forEach((c,k)=>c.classList.toggle('sel',k===i)); }},cv,h('div',null,h('b',null,L.name)),h('div',{class:'small'},L.gender));
      card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); card.click(); } }); box.append(card); this.previews.push({cv,L}); });
    const seg=$('#diffSeg'); seg.innerHTML='';
    for(const k in CONFIG.difficulties) seg.append(h('button',{class:G.diff===k?'sel':'',onclick:()=>{ G.diff=k; Sound.click(); [...seg.children].forEach(b=>b.classList.remove('sel')); [...seg.children][Object.keys(CONFIG.difficulties).indexOf(k)].classList.add('sel'); $('#diffDesc').textContent=CONFIG.difficulties[k].desc; }},CONFIG.difficulties[k].label));
    $('#diffDesc').textContent=diff().desc; $('#inName').value=G.name===CONFIG.defaultName?'':G.name;
  },
  showEnd(r,ev){
    const rows=[1,2,3,4,5].map(n=>{ const q=G.results[n]||{score:0,wrong:0,hints:0}; return `<tr><td>${n}. ${QUEST_TITLES[n-1]}</td><td><b>${q.score}</b>/${CONFIG.maxPoints}</td><td>${q.wrong}</td><td>${q.hints}</td></tr>`; }).join('');
    const badge=`<svg viewBox="0 0 280 150" width="240" role="img" aria-label="Huy hiệu"><rect x="6" y="6" width="268" height="138" rx="26" fill="#fff0b8" stroke="#e8b93a" stroke-width="5"/><g transform="translate(46,48)"><rect x="8" y="8" width="44" height="44" rx="9" fill="#8fd3c1" stroke="#5fa896" stroke-width="3.5"/><g fill="#5fa896"><rect x="0" y="16" width="8" height="5"/><rect x="0" y="32" width="8" height="5"/><rect x="52" y="16" width="8" height="5"/><rect x="52" y="32" width="8" height="5"/><rect x="16" y="0" width="5" height="8"/><rect x="38" y="0" width="5" height="8"/><rect x="16" y="52" width="5" height="8"/><rect x="38" y="52" width="5" height="8"/></g><circle cx="22" cy="28" r="3.5" fill="#2f2a3d"/><circle cx="38" cy="28" r="3.5" fill="#2f2a3d"/><path d="M23 38 Q30 45 37 38" stroke="#2f2a3d" stroke-width="2.5" fill="none" stroke-linecap="round"/></g><text x="180" y="62" text-anchor="middle" font-size="17" font-weight="800" fill="#4a4458">Kỹ sư vi mạch</text><text x="180" y="86" text-anchor="middle" font-size="17" font-weight="800" fill="#4a4458">tập sự SGU</text><text x="180" y="112" text-anchor="middle" font-size="22" fill="#e8b93a">★ ★ ★</text></svg>`;
    $('#endBox').innerHTML=`<div class="center"><h1>Hoàn thành Chương 1! 🎉</h1><div>${badge}</div><p style="margin:4px 0"><b>${esc(G.name)}</b> nhận huy hiệu “<b>Kỹ sư vi mạch tập sự SGU</b>”</p>
      ${r?`<p style="margin:2px 0">Thưởng bàn giao: <b>${rewardText(r)}</b></p>`:''}
      <p style="margin:6px 0"><b>Hành trình thật sự bắt đầu từ đây:</b> mỗi ngày bạn có năng lượng để làm nhiệm vụ, hoàn thành dự án, lên cấp và trang trí lab.</p></div>
      <table class="result" style="margin:10px 0"><tr><th>Nhiệm vụ</th><th>Điểm</th><th>Lần sai</th><th>Gợi ý</th></tr>${rows}</table>
      <h2 style="font-size:19px">Kiến thức đã học</h2><ul class="clean">
      <li><b>Yêu cầu thiết kế:</b> xác định tín hiệu vào/ra: clk, rst, Q[1:0].</li>
      <li><b>Sơ đồ khối:</b> clk, rst → bộ đếm 2 bit → Q → hiển thị.</li>
      <li><b>RTL:</b> <code>rising_edge(clk)</code>, reset đồng bộ kiểm tra bên trong cạnh lên, <code>unsigned</code> với <code>ieee.numeric_std</code>.</li>
      <li><b>Mô phỏng:</b> đọc waveform; Q chỉ đổi ở cạnh lên; phát hiện lỗi cạnh xuống.</li>
      <li><b>Layout:</b> bố trí và nối các phần tử trên chip; khoảng cách tối thiểu (mô hình minh họa).</li></ul>
      <div class="row c"><button id="endGo" class="btn" style="font-size:18px">Bắt đầu sự nghiệp ▶</button><button id="endStay" class="btn ghost">Ở lại tham quan lab</button></div>`;
    $('#endGo').onclick=()=>{ $('#scrEnd').classList.add('hidden'); Dialogue.open(TEXT.afterTutorial,()=>Panels.quests('projects')); };
    $('#endStay').onclick=()=>$('#scrEnd').classList.add('hidden');
    $('#scrEnd').classList.remove('hidden'); Sound.ok();
  }
};

/* =====================================================================
   KHỞI TẠO, SỰ KIỆN, VÒNG LẶP
   ===================================================================== */
const cv=$('#world'), ctx=cv.getContext('2d'), DPR=Math.min(2,window.devicePixelRatio||1);
cv.width=W*DPR; cv.height=H*DPR;
function fit(){ const wrap=$('#stageWrap'), s=Math.min(wrap.clientWidth/W,wrap.clientHeight/H); cv.style.width=Math.floor(W*s)+'px'; cv.style.height=Math.floor(H*s)+'px'; }
window.addEventListener('resize',fit);
function refreshTitle(){
  const has=Store.exists(); $('#btnContinue').classList.toggle('hidden',!has);
  const old=!Store.raw(SAVE_KEY)&&Store.raw(OLD_KEY); $('#oldNote').classList.toggle('hidden',!(has&&old));
}
$('#btnStart').onclick=()=>{ Sound.unlock(); Sound.click(); applyState(Object.assign(defaultState(),{name:G.name,look:G.look,diff:G.diff})); G.screen='select'; UI.buildSelect(); UI.screen('#scrSelect'); };
$('#btnContinue').onclick=()=>{ Sound.unlock(); Sound.click(); const mig=Game.loadSaved(); Game.enterPlay(false); if(mig){ save(); UI.toast('Đã chuyển đổi tiến độ từ game cũ sang phiên bản mới.'); } };
$('#btnImportTitle').onclick=()=>{ Sound.unlock(); Sound.click(); Panels.save(); };
$('#btnBack').onclick=()=>{ Sound.click(); G.screen='title'; refreshTitle(); UI.screen('#scrTitle'); };
$('#btnGo').onclick=()=>{
  Sound.unlock(); Sound.click();
  const nm=($('#inName').value.trim()||CONFIG.defaultName).slice(0,14);
  applyState(Object.assign(defaultState(),{name:nm,look:G.look,diff:G.diff})); save(); Game.enterPlay(true);
};
const openHelp=()=>{ Input.keys={}; $('#scrHelp').classList.remove('hidden'); };
$('#btnHelp2').onclick=openHelp; $('#btnHelpClose').onclick=()=>{ Sound.click(); $('#scrHelp').classList.add('hidden'); };
$('#btnSound').onclick=()=>{
  Sound.unlock(); Sound.set(!Sound.on); Sound.ok();
  if(Sound.on) setTimeout(()=>{ if(!Sound.ctx||Sound.ctx.state!=='running') UI.toast('Trình duyệt đang chặn âm thanh. Hãy thử mở game trong Chrome/Edge/Safari, bật loa và (iPhone) tắt công tắc im lặng.'); },400);
};
$('#btnMusic').onclick=()=>{ Sound.unlock(); Music.setOn(!Music.on); Sound.click(); };
$('#btnQuests').onclick=()=>{ if(G.screen!=='play') return; if(Host.active||Dialogue.active) return; Sound.click(); Panels.quests(); };
$('#btnProfile').onclick=()=>{ if(G.screen!=='play') return; if(Host.active||Dialogue.active) return; Sound.click(); Panels.profile(); };
$('#btnShop').onclick=()=>{ if(G.screen!=='play') return; if(Host.active||Dialogue.active) return; Sound.click(); Panels.shop(); };
$('#btnNextDay').onclick=()=>{ if(G.screen!=='play') return; if(Host.active||Dialogue.active) return; Sound.click(); Game.askNextDay(); };
$('#btnMenu').onclick=()=>{ if(G.screen!=='play') return; Input.keys={}; $('#saveNote').textContent=Store.ok?'Tiến độ được lưu tự động sau mỗi thay đổi.':'Trình duyệt không cho lưu: hãy dùng “Xuất bản lưu” để sao lưu thủ công.'; $('#scrMenu').classList.remove('hidden'); };
$('#mResume').onclick=()=>$('#scrMenu').classList.add('hidden');
$('#mHelp').onclick=()=>{ $('#scrMenu').classList.add('hidden'); openHelp(); };
$('#mSave').onclick=()=>{ $('#scrMenu').classList.add('hidden'); Panels.save(); };
$('#mRestart').onclick=()=>{ $('#scrMenu').classList.add('hidden'); confirmBox('Chơi lại từ đầu?','Toàn bộ tiến độ hiện tại (ngày, cấp, xu, đồ đã mua…) sẽ bị xóa. Hãy xuất bản lưu trước nếu muốn giữ.','Xóa và chơi lại',()=>Game.restart()); };
$('#mHome').onclick=()=>{ Host.close(); $('#scrMenu').classList.add('hidden'); G.screen='title'; refreshTitle(); UI.screen('#scrTitle'); };
$('#pnClose').onclick=()=>{ Sound.click(); Panel.close(); };
$('#dlgNext').onclick=()=>Dialogue.next();
$('#qHint').onclick=()=>Host.hint();
$('#qClose').onclick=()=>{ Sound.click(); Host.close(); };
$('#btnAct').onclick=e=>{ e.currentTarget.blur(); Game.interact(); };
document.querySelectorAll('#dpad button').forEach(b=>{ const k=b.dataset.k; const on=e=>{ e.preventDefault(); Input.virt[k]=true; }, off=()=>{ Input.virt[k]=false; };
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointerleave',off); b.addEventListener('pointercancel',off); });
['pointerdown','click','touchend'].forEach(ev=>document.addEventListener(ev,()=>Sound.unlock(),{passive:true}));
window.addEventListener('blur',()=>{ Input.keys={}; });
window.addEventListener('keyup',e=>{ const k=Input.map[e.code]; if(k) Input.keys[k]=false; });
window.addEventListener('keydown',e=>{
  Sound.unlock(); const tag=e.target.tagName; if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA') return;
  if(Dialogue.active){ if(e.code==='KeyE'||e.code==='Space'||e.code==='Enter'){ e.preventDefault(); if(!e.repeat) Dialogue.next(); } return; }
  if(!$('#scrConfirm').classList.contains('hidden')){ if(e.code==='Escape') $('#scrConfirm').classList.add('hidden'); return; }
  if(Host.active){ if(e.code==='Escape') Host.close(); return; }
  if(Panel.isOpen()){ if(e.code==='Escape') Panel.close(); return; }
  if(overlayOpen()){ if(e.code==='Escape'){ $('#scrHelp').classList.add('hidden'); $('#scrMenu').classList.add('hidden'); } return; }
  if(G.screen!=='play') return;
  const k=Input.map[e.code]; if(k){ Input.keys[k]=true; e.preventDefault(); return; }
  if(e.code==='KeyE'&&!e.repeat) Game.interact();
  else if(e.code==='KeyQ') $('#btnQuests').click();
  else if(e.code==='KeyP') $('#btnProfile').click();
  else if(e.code==='Escape') $('#btnMenu').click();
});

let lastTs=0;
function frame(ts){
  const dt=Math.min(0.05,(ts-lastTs)/1000||0); lastTs=ts;
  tick(dt);
  requestAnimationFrame(frame);
}
// Một bước cập nhật + vẽ (tách riêng để có thể gọi trực tiếp khi kiểm thử)
function tick(dt){
  G.t+=dt;
  if(canMove()) movePlayer(dt); else G.player.moving=false;
  const p=G.player, ch=G.chip, off={up:[0,28],down:[0,-26],left:[30,4],right:[-30,4]}[p.dir], k=Math.min(1,dt*4);
  ch.x+=(p.x+off[0]-ch.x)*k; ch.y+=(p.y+off[1]+4-ch.y)*k;
  G.near=canMove()?nearest():null;
  const ab=$('#btnAct'); if(G.near){ const o=G.near; ab.textContent='E · '+(o.act.startsWith('npc:')?'Nói chuyện với ':(o.act.startsWith('flavor')?'Xem ':'Dùng '))+o.name; ab.classList.remove('hidden'); } else ab.classList.add('hidden');
  Fx.update(dt); render(G.t);
  if(G.screen==='title'){ const c=$('#titleChip').getContext('2d'); c.clearRect(0,0,150,120); drawChip(c,75,104,G.t,2.2); }
  if(G.screen==='select'&&UI.previews) UI.previews.forEach(v=>{ const c=v.cv.getContext('2d'); c.clearRect(0,0,100,120); drawChibi(c,50,108,{look:v.L,dir:'down',moving:true,phase:G.t*8,t:G.t,scale:1.3}); });
}
fit(); UI.updateHud(); Sound.set(true); Music.load(); Music.label(); refreshTitle();
requestAnimationFrame(frame);
window.SGU={Music,Sound,tick,G,Game,UI,Panel,Panels,Host,Dialogue,Sim,DET,ENGINES,makeTaskQuest,L5,Store,migrate,sanitize,importText,exportText,snapshot,applyState,defaultState,buildBoard,taskDef,runTask,checkProgress,grant,CONFIG,CONTENT:{CAREERS,PROJECTS,DAILY,ITEMS,BADGES,CODE,DEBUG,DIAGRAMS,LAYOUTS},hitWorld,OBJ,NPC,save};
