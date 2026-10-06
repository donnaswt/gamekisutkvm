'use strict';
/* =====================================================================
   HOST: hội thoại, khung nhiệm vụ dùng chung (mọi loại nhiệm vụ), bảng (panel), hộp xác nhận
   ===================================================================== */

/* ---------- Hội thoại ---------- */
const SPEAKERS = {
  teacher:()=>({name:CONFIG.teacher.name+' · '+CONFIG.teacher.role, look:lookTeacher()}),
  khoa:()=>({name:CONFIG.teammate.name+' · '+CONFIG.teammate.role, look:lookKhoa()}),
  chip:()=>({name:CONFIG.mascot.name, chip:true}),
  me:()=>({name:G.name, look:curLook()}),
  sys:()=>({name:'Hệ thống', chip:true})
};
const fmt=s=>String(s).replaceAll('{name}',G.name);
function drawPortrait(canvas,who){
  const c=canvas.getContext('2d'), sp=SPEAKERS[who]();
  c.clearRect(0,0,canvas.width,canvas.height);
  if(sp.chip) drawChip(c,42,88,0.4,1.7,G.equip.chip); else drawChibi(c,42,92,{look:sp.look,dir:'down',t:0.5,scale:1.15});
}
const Dialogue = {
  active:false, lines:[], i:0, done:null, typing:false, full:'', pos:0, timer:null,
  open(lines,done){
    this.lines=lines.map(l=>({who:l.who,text:fmt(l.text)})); this.i=0; this.done=done||null; this.active=true;
    $('#dialog').classList.remove('hidden'); $('#btnAct').classList.add('hidden'); this.say();
  },
  say(){
    const l=this.lines[this.i]; $('#dlgName').textContent=SPEAKERS[l.who]().name; drawPortrait($('#dlgPortrait'),l.who);
    this.full=l.text; this.pos=0; this.typing=true; $('#dlgText').textContent='';
    $('#dlgNext').textContent=(this.i===this.lines.length-1)?'Xong ✓':'Tiếp ▶';
    clearInterval(this.timer);
    this.timer=setInterval(()=>{ this.pos+=2; $('#dlgText').textContent=this.full.slice(0,this.pos); if(this.pos>=this.full.length){ clearInterval(this.timer); this.typing=false; } },16);
    Sound.blip();
  },
  next(){
    if(!this.active) return;
    if(this.typing){ clearInterval(this.timer); this.typing=false; $('#dlgText').textContent=this.full; return; }
    Sound.click(); this.i++;
    if(this.i>=this.lines.length) this.close(); else this.say();
  },
  close(){ clearInterval(this.timer); this.active=false; $('#dialog').classList.add('hidden'); const d=this.done; this.done=null; if(d) d(); }
};

/* ---------- Khung nhiệm vụ: mọi loại nhiệm vụ (hướng dẫn, dự án, hằng ngày, luyện tập) đều chạy qua đây ----------
   q = {build(body,host), hint(), cleanup()}. stats = {wrong,hints}. onDone(lines) gọi khi người chơi bấm "Hoàn thành". */
const Host = {
  active:false, q:null, stats:null, onDone:null,
  begin(q,title,stats,onDone){
    this.q=q; this.stats=stats; this.onDone=onDone; this.active=true;
    $('#quest').classList.remove('hidden'); $('#btnAct').classList.add('hidden');
    $('#qTitle').textContent=title;
    const pen=diff().hintPenalty; $('#qHint').textContent='Gợi ý'+(pen?` (−${pen}%)`:'');
    $('#qBody').innerHTML=''; $('#qResult').innerHTML=''; this.fb('');
    q.build($('#qBody'),this);
  },
  close(){
    if(!this.active) return; if(this.q&&this.q.cleanup) this.q.cleanup();
    this.active=false; $('#quest').classList.add('hidden'); $('#qBody').innerHTML='';
  },
  fb(html,kind){ const e=$('#qFb'); e.className=html?('show '+(kind||'info')):''; e.innerHTML=html||''; },
  wrong(html){ this.stats.wrong++; save(); Sound.bad(); this.fb(html,'bad'); },
  hint(){
    const txt=this.q.hint?this.q.hint():null; if(!txt) return;
    this.stats.hints++; save(); UI.updateHud(); Sound.click(); this.fb('💡 <b>Gợi ý:</b> '+txt,'info');
  },
  success(html,lines){
    Sound.ok(); this.fb('');
    const r=$('#qResult'); r.innerHTML='';
    r.append(h('div',{class:'card',style:'border-color:var(--ok);background:var(--mint)',html:'<b>✓ Chính xác! Vì sao đúng?</b><br>'+html}),
      h('div',{class:'row c'},h('button',{class:'btn ok',onclick:()=>{ const f=this.onDone; if(f) f(lines); }},'Hoàn thành nhiệm vụ ▶')));
    r.scrollIntoView({block:'nearest'});
  }
};

/* ---------- Bảng (panel) dùng chung: nhiệm vụ, hồ sơ, cửa hàng, lưu trữ ---------- */
const Panel = {
  render:null, title:'',
  open(title,render){
    this.render=render; this.title=title; $('#pnTitle').textContent=title;
    $('#scrPanel').classList.remove('hidden'); $('#btnAct').classList.add('hidden'); Input.keys={};
    this.draw(0);
  },
  draw(keepScroll){
    const b=$('#pnBody'), sc=keepScroll?b.scrollTop:0; b.innerHTML=''; this.render(b); b.scrollTop=sc;
  },
  refresh(){ if(this.isOpen()) this.draw(1); },
  close(){ $('#scrPanel').classList.add('hidden'); this.render=null; },
  isOpen(){ return !$('#scrPanel').classList.contains('hidden'); }
};
// Hộp xác nhận nhỏ (thay cho window.confirm)
function confirmBox(title,html,yesLabel,onYes,noLabel){
  $('#cfTitle').textContent=title; $('#cfBody').innerHTML=html;
  const y=$('#cfYes'), n=$('#cfNo'); y.textContent=yesLabel||'Đồng ý'; n.textContent=noLabel||'Hủy';
  y.onclick=()=>{ $('#scrConfirm').classList.add('hidden'); onYes&&onYes(); };
  n.onclick=()=>$('#scrConfirm').classList.add('hidden');
  $('#scrConfirm').classList.remove('hidden');
}
