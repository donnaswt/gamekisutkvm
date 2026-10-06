'use strict';
/* =====================================================================
   CHƯƠNG 1 – HƯỚNG DẪN (6 nhiệm vụ cũ: "Một ngày làm kỹ sư thiết kế vi mạch – SGU")
   Nhiệm vụ 2, 3, 5 dùng lại engine chung (sơ đồ khối, điền code, layout); 1 và 4 giữ riêng.
   ===================================================================== */

/* ---------- Mô hình mô phỏng bộ đếm 2 bit (mô hình giáo dục; waveform vẽ từ cùng một trạng thái) ----------
   Mỗi phần tử hist = MỘT NỬA chu kỳ clock. rst trong phần tử cuối là giá trị đang giữ; khi tới cạnh, mạch "lấy mẫu" rst đó.
   mode 'good': đếm ở cạnh lên; 'bug': đếm ở cạnh xuống (lỗi). */
const Sim = {
  create(mode){ return {mode, hist:[{clk:0,rst:0,q:0,edge:null,active:false,rises:0,rstSampled:0}]}; },
  cur(s){ return s.hist[s.hist.length-1]; },
  setRst(s,v){ this.cur(s).rst=v?1:0; },
  step(s){
    const c=this.cur(s), nclk=1-c.clk, rise=nclk===1;
    const active = s.mode==='good' ? rise : !rise;
    let q=c.q, reset=false;
    if(active){ if(c.rst===1){ q=0; reset=c.q!==0; } else q=(c.q+1)&3; }
    const ev={edge:rise?'rise':'fall',active,rstSampled:c.rst,qBefore:c.q,qAfter:q,changed:q!==c.q,reset};
    s.hist.push({clk:nclk,rst:c.rst,q,edge:ev.edge,active,rises:c.rises+(rise?1:0),rstSampled:c.rst});
    if(s.hist.length>400) s.hist.shift();
    return ev;
  },
  describe(ev){
    const e=ev.edge==='rise'?'Cạnh LÊN của clk':'Cạnh XUỐNG của clk';
    if(!ev.active) return `${e}: mạch không phản ứng ở cạnh này → Q giữ ${bin(ev.qAfter)}.`;
    if(ev.rstSampled===1) return `${e}: lấy mẫu rst = 1 → Q = 00 (reset đồng bộ).`;
    return `${e}: rst = 0 → Q = ${bin(ev.qBefore)} + 1 = ${bin(ev.qAfter)}.`;
  },
  draw(canvas,s){
    const dpr=canvas._dpr||1, c=canvas.getContext('2d'), Wd=canvas.width/dpr, Hd=canvas.height/dpr;
    c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,Wd,Hd);
    const N=16, lm=96, pw=(Wd-lm-12)/N, hist=s.hist, start=Math.max(0,hist.length-N), n=hist.length-start;
    const rows={clk:[22,58],rst:[100,136],q:[176,224]};
    c.font='bold 14px "Segoe UI",sans-serif'; c.textAlign='left'; c.fillStyle=PAL.ink;
    c.fillText('clk',12,44); c.fillText('rst',12,122); c.fillText('Q[1:0]',12,204);
    c.font='11px "Segoe UI",sans-serif'; c.fillStyle=PAL.ink2; c.fillText('(đồng bộ, mức cao)',12,138);
    const cx=lm+(n-1)*pw; c.fillStyle='rgba(255,240,184,.55)'; c.fillRect(cx,6,pw,Hd-24);
    c.fillStyle=PAL.ink2; c.font='11px "Segoe UI",sans-serif'; c.textAlign='center'; c.fillText('bây giờ',cx+pw/2,Hd-6);
    for(let i=start;i<hist.length;i++){ const e=hist[i]; if(!e.edge) continue; const x=lm+(i-start)*pw;
      c.setLineDash([4,4]); c.strokeStyle=e.active?PAL.coral:'rgba(122,115,144,.35)'; c.lineWidth=e.active?1.6:1; c.beginPath(); c.moveTo(x,8); c.lineTo(x,Hd-20); c.stroke(); c.setLineDash([]);
      c.fillStyle=e.active?PAL.coral:PAL.ink2; c.font='bold 11px "Segoe UI",sans-serif'; c.textAlign='center'; c.fillText(e.edge==='rise'?'▲':'▼',x,14);
      if(e.edge==='rise'){ c.fillStyle=PAL.ink2; c.font='10px "Segoe UI",sans-serif'; c.fillText(String(e.rises),x+pw/2,Hd-6); }
    }
    const step=(key,[yh,yl],col)=>{ c.strokeStyle=col; c.lineWidth=2.5; c.beginPath();
      for(let i=start;i<hist.length;i++){ const x0=lm+(i-start)*pw, y=hist[i][key]?yh:yl; if(i===start) c.moveTo(x0,y); else c.lineTo(x0,y); c.lineTo(x0+pw,y); } c.stroke(); };
    step('clk',rows.clk,'#5aa9d6'); step('rst',rows.rst,'#e0587a');
    for(let i=Math.max(start,1);i<hist.length;i++){ const e=hist[i]; if(e.edge&&e.active){ const x=lm+(i-start)*pw, y=e.rstSampled?rows.rst[0]:rows.rst[1]; c.beginPath(); c.arc(x,y,4.5,0,7); c.fillStyle='#fff'; c.fill(); c.strokeStyle=PAL.coral; c.lineWidth=2; c.stroke(); } }
    let i=start;
    while(i<hist.length){ let j=i; while(j+1<hist.length&&hist[j+1].q===hist[i].q) j++;
      const xa=lm+(i-start)*pw, xb=lm+(j-start+1)*pw, yt=rows.q[0], yb=rows.q[1], ym=(yt+yb)/2, k=Math.min(6,(xb-xa)/2);
      c.beginPath(); c.moveTo(xa+k,yt); c.lineTo(xb-k,yt); c.lineTo(xb,ym); c.lineTo(xb-k,yb); c.lineTo(xa+k,yb); c.lineTo(xa,ym); c.closePath();
      c.fillStyle=hist[i].q===0?'#e4f6ee':'#f1e9ff'; c.fill(); c.strokeStyle='#8f7fd1'; c.lineWidth=2; c.stroke();
      c.fillStyle=PAL.ink; c.font='bold 15px Consolas,monospace'; c.textAlign='center'; c.fillText(bin(hist[i].q),(xa+xb)/2,ym+5);
      i=j+1; }
  }
};

/* ---------- Các nhiệm vụ hướng dẫn ---------- */
const Quests = {};

// Nhiệm vụ 1: chọn tín hiệu vào/ra
const Q1_SIGNALS=[
  {id:'clk', dir:'in', label:'clk', sub:'xung nhịp, 1 bit', ok:true, miss:'Mạch đồng bộ cần clock để biết khi nào cập nhật.'},
  {id:'rst', dir:'in', label:'rst', sub:'reset đồng bộ mức cao, 1 bit', ok:true, miss:'Đề có yêu cầu reset để đưa bộ đếm về 00.'},
  {id:'en',  dir:'in', label:'enable', sub:'cho phép đếm', ok:false, why:'Đề không có tín hiệu cho phép đếm: bộ đếm đếm ở mọi cạnh lên của clock.'},
  {id:'din', dir:'in', label:'data_in[1:0]', sub:'dữ liệu nạp vào', ok:false, why:'Đề không nạp giá trị ban đầu; chỉ reset mới đưa về 00.'},
  {id:'q',   dir:'out',label:'Q[1:0]', sub:'giá trị đếm, 2 bit', ok:true, miss:'Cần ngõ ra Q 2 bit để đưa giá trị đếm ra ngoài.'},
  {id:'q8',  dir:'out',label:'Q[7:0]', sub:'8 bit', ok:false, why:'Đếm 00 → 11 chỉ cần 2 bit, không phải 8 bit.'},
  {id:'done',dir:'out',label:'done', sub:'báo hoàn tất', ok:false, why:'Bộ đếm lặp vòng liên tục, đề không có tín hiệu “hoàn tất”.'}
];
Quests[1]={
  build(body,host){
    const sel=new Set(), btns={};
    const mk=s=>{ const b=h('button',{class:'sig',onclick:()=>{ Sound.click(); if(sel.has(s.id)){sel.delete(s.id);b.classList.remove('sel');} else {sel.add(s.id);b.classList.add('sel');} b.classList.remove('bad','good'); }},h('b',null,s.label),h('div',{class:'small'},s.sub)); btns[s.id]=b; return b; };
    body.append(
      h('div',{class:'card',html:`<b>Đề bài của ${esc(CONFIG.teacher.name)}</b><br>Thiết kế <b>mạch đếm 2 bit</b>: đếm theo chu kỳ <b>00 → 01 → 10 → 11 → 00</b> ở mỗi <b>cạnh lên</b> của clock, có <b>reset đồng bộ mức cao</b>.<br><span class="small">Hãy bấm chọn các thẻ tín hiệu mà mạch THỰC SỰ cần (bấm lần nữa để bỏ chọn).</span>`}),
      h('div',{class:'cols'},
        h('div',null,h('h3',{style:'margin:4px 0'},'Ngõ vào (input)'),Q1_SIGNALS.filter(s=>s.dir==='in').map(mk)),
        h('div',null,h('h3',{style:'margin:4px 0'},'Ngõ ra (output)'),Q1_SIGNALS.filter(s=>s.dir==='out').map(mk))),
      h('div',{class:'row c'},h('button',{class:'btn',onclick:()=>{
        const msgs=[]; let bad=false;
        for(const s of Q1_SIGNALS){ const b=btns[s.id]; b.classList.remove('bad','good');
          if(s.ok&&!sel.has(s.id)){ bad=true; msgs.push(`Còn thiếu <b>${esc(s.label)}</b>: ${s.miss}`); }
          else if(!s.ok&&sel.has(s.id)){ bad=true; b.classList.add('bad'); msgs.push(`<b>${esc(s.label)}</b> chưa cần: ${s.why}`); }
          else if(s.ok) b.classList.add('good'); }
        if(bad) host.wrong('Chưa đúng, thử lại nhé (tiến độ vẫn được giữ):'+ul(msgs));
        else host.onDone(TEXT.q1done);
      }},'Kiểm tra lựa chọn')));
  },
  hint(){ return 'Đọc lại đề: mạch có nhịp clock, có reset và một ngõ ra 2 bit. Thứ gì đề không nhắc (enable, nạp dữ liệu, done…) thì chưa cần.'; }
};

// Nhiệm vụ 2 và 5: dùng engine chung
Quests[2]=makeDiagram(DIAGRAMS.counter2,TEXT.q2done);
Quests[5]=makeLayout(LAYOUTS.counter2,TEXT.q5done);

// Nhiệm vụ 3: điền code VHDL (dữ liệu khung code)
const Q3_VARIANT={
  intro:'Hoàn thiện bộ đếm 2 bit bằng VHDL: bấm chỗ trống rồi chọn mảnh code.',
  lines:L(`
library ieee;
use ieee.std_logic_1164.all;
use ieee.{1}.all;

entity counter2 is
  port ( clk : in  std_logic;
         rst : in  std_logic;
         q   : out std_logic_vector(1 downto 0) );
end entity;

architecture rtl of counter2 is
  signal cnt : {2} := "00";
begin
  process(clk)
  begin
    if {3} then
      if {4} then
        cnt <= {5};
      else
        cnt <= {6};
      end if;
    end if;
  end process;

  q <= std_logic_vector(cnt);
end architecture;`),
  blanks:{
    1:{label:'thư viện',hint:'Kiểu unsigned chuẩn IEEE nằm trong thư viện có tên bắt đầu bằng “numeric”.',opts:[
      N('std_logic_arith','std_logic_arith không phải thư viện chuẩn IEEE; đề yêu cầu dùng ieee.numeric_std.'), Y('numeric_std'),
      N('std_logic_unsigned','std_logic_unsigned cũng không chuẩn IEEE và không cung cấp kiểu unsigned.'), N('textio','textio dùng để đọc/ghi file văn bản, không có kiểu unsigned.')]},
    2:{label:'kiểu của cnt',hint:'Bộ đếm 2 bit, đếm số không dấu: cần kiểu unsigned có độ rộng 2 bit.',opts:[
      N('unsigned(7 downto 0)','8 bit là quá rộng; bộ đếm 2 bit chỉ cần (1 downto 0).'), N('std_logic','std_logic chỉ có 1 bit, không đếm tới 11 được.'),
      Y('unsigned(1 downto 0)'), N('integer','integer không có độ rộng bit rõ ràng, khó đảm bảo đúng 2 bit.')]},
    3:{label:'điều kiện clock',hint:'Mạch chạy ở cạnh lên của clock: hàm VHDL tên rising_edge.',opts:[
      N('falling_edge(clk)','falling_edge là cạnh XUỐNG, đề yêu cầu cạnh lên.'), N("clk = '1'","clk = '1' là kiểm tra MỨC cao (kéo dài nửa chu kỳ), không phải một cạnh."),
      N("clk'event","clk'event đúng ở cả cạnh lên lẫn cạnh xuống (mọi thay đổi)."), Y('rising_edge(clk)')]},
    4:{label:'điều kiện reset',hint:'Reset tích cực mức cao nghĩa là reset khi rst bằng 1. Điều kiện này nằm TRONG khối cạnh lên nên là reset đồng bộ.',opts:[
      N("rst = '0'","rst = '0' là reset tích cực mức THẤP; đề yêu cầu mức cao."), Y("rst = '1'"), N("rst'event","rst'event chỉ bắt thay đổi của rst, không kiểm tra mức, và sẽ thành reset không đồng bộ.")]},
    5:{label:'giá trị khi reset',hint:'Khi reset thì bộ đếm về 00.',opts:[
      N('cnt + 1','Reset không được làm bộ đếm tăng; phải đưa về 00.'), N('"11"','Reset phải đưa về 00, không phải 11.'), Y('"00"'), N("(others => '1')",'Toàn bit 1 là 11, trong khi reset cần về 00.')]},
    6:{label:'khi không reset',hint:'Mỗi cạnh lên (không reset) bộ đếm tăng thêm 1, 11 tăng 1 sẽ tràn về 00.',opts:[
      N('cnt - 1','cnt - 1 là đếm lùi; đề yêu cầu đếm lên.'), Y('cnt + 1'), N('cnt','Giữ nguyên thì bộ đếm không bao giờ đếm.'), N('cnt + 2','Tăng 2 sẽ bỏ qua giá trị (00 → 10), không đúng chu kỳ 00 → 01 → 10 → 11.')]}
  },
  explain:[
    ['use ieee.numeric_std.all;','Thư viện chuẩn cho kiểu unsigned và phép cộng với số nguyên.'],
    ['signal cnt : unsigned(1 downto 0)','Biến nội bộ 2 bit lưu giá trị đếm. Khởi tạo "00" cho mô phỏng.'],
    ['process(clk)','Quá trình chỉ cần “nghe” clk vì đây là mạch đồng bộ.'],
    ['if rising_edge(clk) then','Mọi thứ xảy ra ở cạnh lên của clock.'],
    ["if rst = '1' then cnt <= \"00\"",'Reset đồng bộ: rst được kiểm tra BÊN TRONG cạnh lên, nên reset chỉ có tác dụng ở cạnh lên khi rst = 1.'],
    ['else cnt <= cnt + 1;','Không reset thì tăng 1. Vì cnt chỉ có 2 bit, 11 + 1 quay về 00 (đúng chu kỳ yêu cầu).'],
    ['q <= std_logic_vector(cnt);','Đổi unsigned sang std_logic_vector để đưa ra cổng.']
  ]
};
Quests[3]=makeCode(Q3_VARIANT,{shuffle:false,lines:TEXT.q3done,
  okHtml:'<ul class="clean"><li><code>rising_edge(clk)</code>: chỉ phản ứng ở cạnh lên của clock.</li><li><code>rst = \'1\'</code> nằm <b>bên trong</b> điều kiện cạnh lên → reset <b>đồng bộ</b>, tích cực mức cao.</li><li><code>unsigned(1 downto 0)</code> với <code>ieee.numeric_std</code>: cnt + 1 đúng chuẩn, và 11 + 1 tự quay về 00.</li></ul>'});

// Nhiệm vụ 4: mô phỏng waveform + sửa lỗi cạnh xuống
const Q4_DIAG=[
  {t:'Q đổi giá trị ở cạnh XUỐNG của clock thay vì cạnh lên', ok:true},
  {t:'Reset đang hoạt động ở mức thấp', ok:false, why:'Reset không phải vấn đề: rst vẫn là mức cao. Hãy nhìn kỹ Q đổi vào cạnh nào của clk.'},
  {t:'Bộ đếm đang đếm lùi (11 → 10 → 01)', ok:false, why:'Q vẫn tăng dần 00 → 01 → 10 → 11, không đếm lùi.'},
  {t:'Ngõ ra Q bị rộng hơn 2 bit', ok:false, why:'Q vẫn chỉ có 2 bit (00..11). Lỗi nằm ở thời điểm Q đổi.'}
];
const Q4_FIX=[
  {t:'if clk = \'0\' then', ok:false, why:'Mức 0 không phải là một cạnh: mạch sẽ tính toán liên tục suốt nửa chu kỳ clock thấp.'},
  {t:'if rising_edge(clk) then', ok:true},
  {t:'if falling_edge(rst) then', ok:false, why:'Cạnh phải lấy từ clock chứ không phải từ rst.'},
  {t:'if rising_edge(rst) then', ok:false, why:'Mạch đếm theo nhịp clk; rst chỉ là tín hiệu điều khiển được kiểm tra bên trong.'}
];
Quests[4]={
  cleanup(){ if(this._S) { clearInterval(this._S.timer); this._S.timer=null; } },
  build(body,host){
    const S={sim:Sim.create('good'),stage:'A',timer:null,speed:600,last:null,obs:{wrap:false,reset:false,bug:false,verify:0},finished:false};
    this._S=S;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const cv=h('canvas',{class:'wave'}); cv._dpr=dpr; cv.width=900*dpr; cv.height=250*dpr;
    const modeLbl=h('div',{class:'small',style:'margin:6px 0'});
    const readout=h('div',{class:'readout'});
    const side=h('div');
    const btnRst=h('button',{class:'btn ghost',onclick:()=>{ Sim.setRst(S.sim,Sim.cur(S.sim).rst?0:1); Sound.click(); redraw(); }},'rst');
    const spd=h('select',{onchange:e=>{ S.speed=+e.target.value; if(S.timer){ pause(); run(); } },style:'padding:6px;border-radius:10px;border:2px solid var(--lav)'},
      h('option',{value:900},'Chậm'),h('option',{value:600,selected:true},'Vừa'),h('option',{value:300},'Nhanh'));
    function redraw(){
      Sim.draw(cv,S.sim); const c=Sim.cur(S.sim);
      readout.innerHTML=`clk = <b>${c.clk}</b> · rst = <b>${c.rst}</b> · Q = <b>${bin(c.q)}</b> (${c.q})<br>${S.last?Sim.describe(S.last):'Nhấn “Chạy” hoặc “Tiến 1 cạnh clock” để bắt đầu.'}`;
      btnRst.textContent='rst = '+c.rst+(c.rst?' (bấm để tắt)':' (bấm để bật)'); btnRst.className='btn '+(c.rst?'warn':'ghost');
      modeLbl.innerHTML='Đang mô phỏng: <b>'+((S.stage==='B'||S.stage==='B2')?'bản code của '+esc(CONFIG.teammate.name):'thiết kế của bạn')+'</b>. ▲ cạnh lên, ▼ cạnh xuống; đường nét đỏ = chỗ mạch cập nhật Q; vòng tròn trên rst = lúc mạch lấy mẫu rst.';
    }
    function run(){ if(!S.timer) S.timer=setInterval(stepOnce,S.speed); }
    function pause(){ clearInterval(S.timer); S.timer=null; }
    function observe(ev){
      const o=S.obs; const before=JSON.stringify(o);
      if(S.stage==='A'){ if(ev.edge==='rise'&&ev.active&&ev.rstSampled===0&&ev.qBefore===3&&ev.qAfter===0) o.wrap=true; if(ev.reset) o.reset=true; }
      else if(S.stage==='B'){ if(ev.edge==='fall'&&ev.changed) o.bug=true; }
      else if(S.stage==='C'){ if(ev.edge==='rise'&&ev.active&&ev.changed&&!ev.rstSampled) o.verify++; }
      if(JSON.stringify(o)!==before){ renderSide(); }
    }
    function stepOnce(){ const ev=Sim.step(S.sim); S.last=ev; observe(ev); redraw(); }
    function restart(){ pause(); S.sim=Sim.create(S.sim.mode); S.last=null; redraw(); }
    function renderSide(){
      side.innerHTML=''; const o=S.obs;
      if(S.stage==='A'){
        side.append(h('b',null,'Mục tiêu 1: kiểm tra thiết kế của bạn'),
          h('ul',{class:'chk'},h('li',{class:o.wrap?'done':''},'Quan sát Q đếm đủ vòng 00 → 01 → 10 → 11 → 00 (rst = 0).'),
            h('li',{class:o.reset?'done':''},'Kiểm tra reset: khi Q ≠ 00, bật rst = 1 rồi cho clock đi qua một cạnh LÊN → Q về 00.')),
          h('div',{class:'small'},'Mẹo: reset là đồng bộ nên chỉ có tác dụng ở cạnh lên của clock.'));
        if(o.wrap&&o.reset) side.append(h('button',{class:'btn',style:'margin-top:8px',onclick:()=>{
          pause(); S.stage='B'; S.sim=Sim.create('bug'); S.last=null; o.bug=false; Sound.ok();
          host.fb(`💬 <b>${esc(CONFIG.teammate.name)}:</b> “Mình vừa gộp thêm code mới vào, bạn chạy thử xem có ổn không nha!”`,'info'); renderSide(); redraw(); }},'Thiết kế ổn! Nhận bản của '+CONFIG.teammate.name+' ▶'));
      } else if(S.stage==='B'){
        side.append(h('b',null,'Mục tiêu 2: tìm lỗi'),
          h('ul',{class:'chk'},h('li',{class:o.bug?'done':''},'Chạy mô phỏng và quan sát Q đổi giá trị ở cạnh nào của clock.')));
        if(!o.bug) side.append(h('div',{class:'small'},'Hãy chạy thêm vài cạnh clock rồi mới chẩn đoán nhé.'));
        else {
          let pick=-1;
          side.append(h('div',{style:'margin-top:6px'},h('b',null,'Lỗi nằm ở đâu?')),
            ...Q4_DIAG.map((d,i)=>h('label',{class:'radio'},h('input',{type:'radio',name:'diag',onchange:()=>{pick=i;}}),d.t)),
            h('button',{class:'btn',onclick:()=>{
              if(pick<0){ host.fb('Hãy chọn một đáp án trước nhé.','info'); return; }
              const d=Q4_DIAG[pick]; if(!d.ok){ host.wrong('Chưa đúng: '+d.why); return; }
              Sound.ok(); S.stage='B2'; host.fb('Đúng rồi! Bản của Khoa dùng cạnh XUỐNG. Giờ chọn cách sửa.','ok'); pause(); renderSide(); redraw(); }},'Chẩn đoán'));
        }
      } else if(S.stage==='B2'){
        side.append(h('b',null,'Mục tiêu 3: sửa lỗi'),
          h('pre',{class:'code',style:'margin-top:6px',html:'process(clk)\nbegin\n  <span style="background:#a3365a">if falling_edge(clk) then</span>   <span class="cm">-- dòng lỗi</span>\n    if rst = \'1\' then cnt &lt;= "00";\n    else cnt &lt;= cnt + 1;\n    end if;\n  end if;\nend process;'}),
          h('div',null,'Chọn dòng thay thế:'));
        let pick=-1;
        side.append(...Q4_FIX.map((d,i)=>h('label',{class:'radio mono'},h('input',{type:'radio',name:'fix',onchange:()=>{pick=i;}}),d.t)),
          h('button',{class:'btn',onclick:()=>{
            if(pick<0){ host.fb('Hãy chọn một dòng trước nhé.','info'); return; }
            const d=Q4_FIX[pick]; if(!d.ok){ host.wrong('Chưa đúng: '+d.why); return; }
            S.stage='C'; S.sim=Sim.create('good'); S.last=null; o.verify=0; Sound.ok();
            host.fb('Đã sửa thành <code>rising_edge(clk)</code>. Chạy lại để kiểm chứng!','ok'); renderSide(); redraw(); }},'Áp dụng sửa'));
      } else {
        side.append(h('b',null,'Mục tiêu 4: kiểm chứng sau khi sửa'),
          h('ul',{class:'chk'},h('li',{class:o.verify>=4?'done':''},`Quan sát Q tăng ở 4 cạnh LÊN liên tiếp (${Math.min(4,o.verify)}/4) và không đổi ở cạnh xuống.`)));
        if(o.verify>=4&&!S.finished){ S.finished=true; pause();
          host.success('<ul class="clean"><li>Trên waveform, Q chỉ đổi ở cạnh <b>lên</b> (▲) của clk: 00 → 01 → 10 → 11 → 00.</li><li>Reset đồng bộ: Q chỉ về 00 ở cạnh lên <b>khi rst đang ở mức 1</b>.</li><li>Lỗi của bản cũ là dùng <code>falling_edge</code>; sửa thành <code>rising_edge(clk)</code>.</li></ul><span class="small">Nhắc lại: đây là mô hình mô phỏng giáo dục trong game, không phải phần mềm mô phỏng HDL thực tế.</span>',TEXT.q4done); }
      }
    }
    body.append(
      h('div',{class:'note warn',html:'⚠ Đây là <b>mô hình mô phỏng giáo dục trong game</b>, không phải phần mềm mô phỏng HDL thực tế. Waveform bên dưới được vẽ từ chính trạng thái mô phỏng của game.'}),
      modeLbl,cv,readout,
      h('div',{class:'row'},h('button',{class:'btn ok',onclick:run},'▶ Chạy'),h('button',{class:'btn warn',onclick:pause},'⏸ Tạm dừng'),
        h('button',{class:'btn alt',onclick:()=>{ pause(); stepOnce(); }},'⏭ Tiến 1 cạnh clock'),btnRst,
        h('button',{class:'btn ghost',onclick:restart},'↺ Làm lại'),h('span',{class:'small'},'Tốc độ:'),spd),
      side);
    renderSide(); redraw();
  },
  hint(){
    const S=this._S, o=S.obs;
    if(S.stage==='A'){ if(!o.wrap) return 'Nhấn Chạy (hoặc Tiến 1 cạnh clock) và nhìn Q đổi ở mỗi cạnh LÊN (▲). Cần 4 cạnh lên để Q đi 00 → 01 → 10 → 11 → 00.'; return 'Khi Q ≠ 00, bấm nút rst để bật rst = 1, rồi tiến tới cạnh LÊN kế tiếp: Q sẽ về 00.'; }
    if(S.stage==='B'){ return o.bug?'Nhìn các đường nét đỏ: Q thay đổi tại cạnh ▼ (xuống) chứ không phải ▲.':'Chạy thêm vài cạnh và để ý: Q đổi ở cạnh ▲ hay ▼?'; }
    if(S.stage==='B2') return 'Đề yêu cầu cạnh lên của clock: hàm rising_edge(clk).';
    return 'Nhấn Chạy và đếm 4 cạnh lên ▲ liên tiếp; nhớ tắt rst.';
  }
};
