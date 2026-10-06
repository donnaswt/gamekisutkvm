'use strict';
/* =====================================================================
   ENGINES: các LOẠI nhiệm vụ. Mỗi engine nhận (params, rng) từ dữ liệu trong content.js và trả về
   {build(body,host), hint(), cleanup?}. Muốn thêm loại nhiệm vụ mới: viết thêm một hàm ở đây rồi đăng ký ở ENGINES.
   ===================================================================== */
const pickVariant=(params,rng)=>params.variants?pickOne(rng,params.variants):params;
const ul=arr=>'<ul class="clean">'+arr.map(m=>'<li>'+m+'</li>').join('')+'</ul>';

/* ---------------------------------------------------------------------
   1. SƠ ĐỒ KHỐI (kéo thả / bấm để đặt khối, nối dây, sửa kết nối)
   --------------------------------------------------------------------- */
const KIND_VN={clk:'clock',rst:'reset',en:'enable',data:'dữ liệu'};
function makeDiagram(def,lines){
  const S={blocks:[],wires:[],sel:null};
  return {
    build(body,host){
      S.blocks=def.blocks.map(b=>{
        const ins=(b.in||[]).map(p=>({...p,side:'in'})), outs=(b.out||[]).map(p=>({...p,side:'out'}));
        const w=b.w||110, hh=b.h||Math.max(46,24*Math.max(ins.length,outs.length)+24);
        ins.forEach((p,i)=>{p.x=0;p.y=hh*(i+1)/(ins.length+1);}); outs.forEach((p,i)=>{p.x=w;p.y=hh*(i+1)/(outs.length+1);});
        return {id:b.id,label:b.label,sub:b.sub||'',color:b.color||'#e9e4f2',extra:!!b.extra,w,h:hh,ports:[...ins,...outs],def:b.def,placed:false,x:0,y:0,tx:12,ty:0};
      });
      let ty=34; S.blocks.forEach(b=>{ b.ty=ty; ty+=b.h+10; });
      const VH=Math.max(390,ty+16), VW=700;
      S.wires=[]; S.sel=null;
      const blocks=S.blocks, byId=id=>blocks.find(b=>b.id===id), lab=id=>byId(id).label;
      const portOf=ref=>{ const [b,p]=ref.split('.'); return byId(b).ports.find(x=>x.id===p); };
      const svg=sv('svg',{viewBox:`0 0 ${VW} ${VH}`,class:'diagram'});
      const gBg=sv('g'),gWires=sv('g'),gBlocks=sv('g'); svg.append(gBg,gWires,gBlocks);
      gBg.append(sv('rect',{x:0,y:0,width:165,height:VH,fill:'#f4f0fb'}),sv('text',{x:12,y:22,'font-size':14,'font-weight':700,fill:PAL.ink2},'Khay khối'),
        sv('text',{x:182,y:22,'font-size':14,'font-weight':700,fill:PAL.ink2},'Bảng trắng (thả khối vào đây)'));
      const pos=b=>b.placed?[b.x,b.y]:[b.tx,b.ty];
      const P=(bid,pid)=>{ const b=byId(bid), p=b.ports.find(x=>x.id===pid), [x,y]=pos(b); return [x+p.x,y+p.y]; };
      const toSvg=e=>{ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
      const dropWires=id=>{ S.wires=S.wires.filter(w=>!w.from.startsWith(id+'.')&&!w.to.startsWith(id+'.')); };
      function drawWires(){
        gWires.innerHTML='';
        for(const w of S.wires){ const [f1,f2]=w.from.split('.'),[t1,t2]=w.to.split('.'); const a=P(f1,f2),b=P(t1,t2);
          const d=`M${a[0]} ${a[1]} C${a[0]+60} ${a[1]},${b[0]-60} ${b[1]},${b[0]} ${b[1]}`;
          gWires.append(sv('path',{d,fill:'none',stroke:'#8f7fd1','stroke-width':3.5,'stroke-linecap':'round'}));
          const hit=sv('path',{d,fill:'none',stroke:'transparent','stroke-width':16,style:'cursor:pointer','data-w':w.from+'>'+w.to});
          hit.addEventListener('pointerdown',e=>{ e.stopPropagation(); S.wires=S.wires.filter(x=>x!==w); Sound.click(); host.fb('Đã xóa một dây. Bạn có thể nối lại.','info'); drawWires(); });
          gWires.append(hit); }
      }
      function portClick(bid,port){
        const key=bid+'.'+port.id;
        if(S.sel===key){ S.sel=null; renderBlocks(); return; }
        if(!S.sel){ S.sel=key; Sound.click(); host.fb('Đã chọn cổng <b>'+lab(bid)+(port.name?' ('+port.name+')':'')+'</b>. Bấm một cổng khác để nối.','info'); renderBlocks(); return; }
        const pt1=portOf(S.sel);
        if(pt1.side===port.side){ S.sel=key; host.fb('Hai cổng cùng loại. Hãy nối <b>ngõ ra</b> (chấm hồng) với <b>ngõ vào</b> (chấm xanh).','bad'); Sound.bad(); renderBlocks(); return; }
        const from=pt1.side==='out'?S.sel:key, to=pt1.side==='out'?key:S.sel;
        S.wires=S.wires.filter(w=>w.to!==to); S.wires.push({from,to}); S.sel=null; Sound.click();
        host.fb(`Đã nối <b>${lab(from.split('.')[0])}</b> → <b>${lab(to.split('.')[0])}</b>. Bấm vào dây để xóa nếu muốn sửa.`,'info'); renderBlocks(); drawWires();
      }
      function renderBlocks(){
        gBlocks.innerHTML='';
        for(const b of blocks){
          if(b.placed) gBlocks.append(sv('rect',{x:b.tx,y:b.ty,width:b.w,height:b.h,rx:10,fill:'none',stroke:'#cbbfe8','stroke-dasharray':'5 4'}));
          const [x,y]=pos(b), g=sv('g',{transform:`translate(${x},${y})`,style:'cursor:grab','data-b':b.id});
          const tall=b.h>=80||b.ports.length>=3;
          g.append(sv('rect',{width:b.w,height:b.h,rx:10,fill:b.color,stroke:PAL.ink2,'stroke-width':2.5}),
            sv('text',{x:b.w/2,y:tall?18:b.h/2-(b.sub?2:-5),'text-anchor':'middle','font-size':b.w>120?14:15,'font-weight':800,fill:PAL.ink},b.label),
            b.sub?sv('text',{x:b.w/2,y:tall?b.h-8:b.h/2+14,'text-anchor':'middle','font-size':11,fill:PAL.ink2},b.sub):null);
          if(b.placed){
            const x2=sv('g',{style:'cursor:pointer'},sv('circle',{cx:b.w-2,cy:2,r:9,fill:'#fff',stroke:PAL.ink2}),sv('text',{x:b.w-2,y:6,'text-anchor':'middle','font-size':12,'font-weight':800,fill:'#e0587a'},'✕'));
            x2.addEventListener('pointerdown',e=>{ e.stopPropagation(); b.placed=false; dropWires(b.id); S.sel=null; Sound.click(); renderBlocks(); drawWires(); });
            g.append(x2);
            for(const p of b.ports){
              const key=b.id+'.'+p.id, c=sv('circle',{cx:p.x,cy:p.y,r:8,fill:p.side==='out'?'#ff9eb5':'#7ecbe8',stroke:S.sel===key?'#4a4458':'#fff','stroke-width':S.sel===key?4:3,style:'cursor:crosshair'});
              c.addEventListener('pointerdown',e=>{ e.stopPropagation(); e.preventDefault(); portClick(b.id,p); });
              g.append(c);
              if(p.name) g.append(sv('text',{x:p.side==='in'?13:p.x-13,y:p.y+4,'text-anchor':p.side==='in'?'start':'end','font-size':11,'font-weight':700,fill:PAL.ink,'pointer-events':'none'},p.name));
            }
          }
          g.addEventListener('pointerdown',e=>startDrag(e,b,g));
          gBlocks.append(g);
        }
      }
      function startDrag(e,b,g){
        e.preventDefault(); const p0=toSvg(e), [bx,by]=pos(b), ox=p0.x-bx, oy=p0.y-by; let moved=false;
        const move=ev=>{ const p=toSvg(ev); if(Math.hypot(p.x-p0.x,p.y-p0.y)>4) moved=true; if(!moved) return;
          const nx=clamp(p.x-ox,0,VW-b.w), ny=clamp(p.y-oy,0,VH-b.h); b.x=nx; b.y=ny; g.setAttribute('transform',`translate(${nx},${ny})`); if(b.placed) drawWires(); };
        const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
          if(!moved){ if(!b.placed){ b.placed=true; [b.x,b.y]=b.def; Sound.click(); host.fb('Đã đặt khối <b>'+b.label+'</b>.','info'); } }
          else { if(b.x+b.w/2>=170){ b.placed=true; Sound.click(); } else { b.placed=false; dropWires(b.id); } }
          renderBlocks(); drawWires(); };
        window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
      }
      function wireWhy(w){
        const k=w.from+'>'+w.to; if(def.why&&def.why[k]) return def.why[k];
        const pf=portOf(w.from), pt=portOf(w.to), bf=byId(w.from.split('.')[0]), bt=byId(w.to.split('.')[0]);
        if(bf.extra||bt.extra) return `<b>${(bf.extra?bf:bt).label}</b> không thuộc thiết kế này.`;
        if(pf.kind!==pt.kind) return `Dây từ <b>${bf.label}</b> (tín hiệu ${KIND_VN[pf.kind]}) đang nối vào cổng <b>${pt.name||bt.label}</b> của ${bt.label} (tín hiệu ${KIND_VN[pt.kind]}): hai loại này không dùng thay nhau được.`;
        return `Dây <b>${bf.label} → ${bt.label}</b> không có trong sơ đồ yêu cầu (xem lại luồng dữ liệu).`;
      }
      function missing(){
        const placedIds=blocks.filter(b=>b.placed).map(b=>b.id), msgs=[];
        for(const b of def.blocks) if(!b.extra&&!placedIds.includes(b.id)) msgs.push(`Chưa đặt khối <b>${b.label}</b> lên bảng.`);
        for(const b of blocks) if(b.placed&&b.extra) msgs.push(`<b>${b.label}</b> không cần cho bài này, hãy gỡ nó (bấm ✕).`);
        for(const w of S.wires) if(!def.wires.some(r=>r.f===w.from&&r.t===w.to)) msgs.push(wireWhy(w));
        for(const r of def.wires){ const a=r.f.split('.')[0], b=r.t.split('.')[0];
          if(placedIds.includes(a)&&placedIds.includes(b)&&!S.wires.some(w=>w.from===r.f&&w.to===r.t)) msgs.push(r.miss); }
        return [...new Set(msgs)];
      }
      function check(){
        const msgs=missing();
        if(msgs.length){ host.wrong('Sơ đồ chưa đúng, chỉnh lại nhé:'+ul(msgs)); return; }
        host.success(def.okHtml,lines);
      }
      S.hint=()=>{ const m=missing(); return m.length?m[0]:'Sơ đồ đã đủ, hãy bấm “Kiểm tra sơ đồ”!'; };
      body.append(
        h('div',{class:'card',html:def.intro+'<br><span class="small"><b>Kéo thả</b> khối từ khay sang bảng (hoặc <b>bấm</b> vào khối để tự đặt). Bấm một chấm <span style="color:#ff6f95">hồng (ngõ ra)</span> rồi một chấm <span style="color:#2f8fc0">xanh (ngõ vào)</span> để nối. Bấm vào dây để xóa, ✕ để gỡ khối.</span>'}),
        svg,
        h('div',{class:'row c',style:'margin-top:10px'},
          h('button',{class:'btn',onclick:check},'Kiểm tra sơ đồ'),
          h('button',{class:'btn ghost',onclick:()=>{ S.wires=[]; S.sel=null; renderBlocks(); drawWires(); host.fb('Đã xóa hết dây.','info'); }},'Xóa tất cả dây'),
          h('button',{class:'btn ghost',onclick:()=>{ blocks.forEach(b=>b.placed=false); S.wires=[]; S.sel=null; renderBlocks(); drawWires(); host.fb(''); }},'Đặt lại')));
      renderBlocks(); drawWires();
    },
    hint(){ return S.hint?S.hint():'Hãy đặt các khối cần thiết rồi nối dây.'; }
  };
}

/* ---------------------------------------------------------------------
   2. LAYOUT TRÊN LƯỚI (mô hình minh họa: khoảng cách tối thiểu 1 ô, định tuyến dây Manhattan)
   --------------------------------------------------------------------- */
const C5=44, OX5=12, OY5=12;
const L5={
  violations(blocks,cols,rows){
    const v={}; const add=(id,m)=>{ (v[id]=v[id]||[]).push(m); };
    for(const b of blocks) if(b.x<0||b.y<0||b.x+b.w>cols||b.y+b.h>rows) add(b.id,'nằm ngoài lưới');
    for(let i=0;i<blocks.length;i++) for(let j=i+1;j<blocks.length;j++){
      const a=blocks[i], b=blocks[j];
      const gx=Math.max(a.x-(b.x+b.w),b.x-(a.x+a.w)), gy=Math.max(a.y-(b.y+b.h),b.y-(a.y+a.h));
      if(gx<1&&gy<1){ const how=(gx<0&&gy<0)?'chồng lên':'quá sát'; add(a.id,`${how} khối ${b.label}`); add(b.id,`${how} khối ${a.label}`); }
    }
    return v;
  },
  pin(blocks,ref){ const [bid,pid]=ref.split('.'); const b=blocks.find(x=>x.id===bid), p=b.pins.find(x=>x.id===pid); return {b,p}; },
  cell(blocks,ref){ const {b,p}=this.pin(blocks,ref); return p.dir==='in'?[b.x-1,b.y+p.row]:[b.x+b.w,b.y+p.row]; },
  point(blocks,ref){ const {b,p}=this.pin(blocks,ref); return [OX5+(p.dir==='in'?b.x:b.x+b.w)*C5, OY5+(b.y+p.row)*C5+C5/2]; },
  route(blocks,from,to,cols,rows){
    const blocked=(x,y)=>x<0||y<0||x>=cols||y>=rows||blocks.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);
    const s=this.cell(blocks,from), g=this.cell(blocks,to);
    if(blocked(s[0],s[1])||blocked(g[0],g[1])) return null;
    const D=[[1,0],[-1,0],[0,1],[0,-1]], key=(x,y,d)=>(y*cols+x)*5+d;
    const dist=new Map(), prev=new Map(), open=[]; const k0=key(s[0],s[1],4); dist.set(k0,0); open.push([0,s[0],s[1],4]);
    let endKey=null;
    while(open.length){
      let bi=0; for(let i=1;i<open.length;i++) if(open[i][0]<open[bi][0]) bi=i;
      const [cd,x,y,d]=open.splice(bi,1)[0]; const k=key(x,y,d);
      if(cd>dist.get(k)) continue;
      if(x===g[0]&&y===g[1]){ endKey=k; break; }
      for(let nd=0;nd<4;nd++){ const nx=x+D[nd][0], ny=y+D[nd][1]; if(blocked(nx,ny)) continue;
        const cost=cd+1+((d!==4&&d!==nd)?0.6:0), nk=key(nx,ny,nd);
        if(!dist.has(nk)||cost<dist.get(nk)){ dist.set(nk,cost); prev.set(nk,k); open.push([cost,nx,ny,nd]); } }
    }
    if(endKey==null) return null;
    const path=[]; let k=endKey; while(k!=null){ const d=k%5, cidx=(k-d)/5; path.push([cidx%cols,Math.floor(cidx/cols)]); k=prev.get(k); }
    return path.reverse();
  }
};
function makeLayout(def,lines){
  const S={blocks:[],wires:[],sel:null,drag:null};
  return {
    build(body,host){
      const cols=def.cols, rows=def.rows, VW=cols*C5+24, VH=rows*C5+24;
      S.blocks=def.blocks.map(b=>({...b})); S.wires=[]; S.sel=null; S.drag=null;
      const svg=sv('svg',{viewBox:`0 0 ${VW} ${VH}`,class:'diagram'});
      const status=h('div',{class:'readout'});
      const nm=r=>(def.names&&def.names[r])||r;
      const toSvg=e=>{ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
      const routes=()=>S.wires.map(w=>({w,path:L5.route(S.blocks,w.from,w.to,cols,rows)}));
      function render(){
        svg.innerHTML=''; const vio=L5.violations(S.blocks,cols,rows);
        for(let i=0;i<=cols;i++) svg.append(sv('line',{x1:OX5+i*C5,y1:OY5,x2:OX5+i*C5,y2:OY5+rows*C5,stroke:'#e5def5','stroke-width':1}));
        for(let j=0;j<=rows;j++) svg.append(sv('line',{x1:OX5,y1:OY5+j*C5,x2:OX5+cols*C5,y2:OY5+j*C5,stroke:'#e5def5','stroke-width':1}));
        for(const b of S.blocks){ if(!(diff().haloAlways||S.drag===b.id)) continue; const bad=!!vio[b.id];
          svg.append(sv('rect',{x:OX5+(b.x-1)*C5,y:OY5+(b.y-1)*C5,width:(b.w+2)*C5,height:(b.h+2)*C5,rx:8,fill:bad?'rgba(224,88,122,.10)':'rgba(143,127,209,.08)',stroke:bad?'#e0587a':'#8f7fd1','stroke-dasharray':'6 4','stroke-width':1.5})); }
        let okWires=0;
        for(const {w,path} of routes()){
          const a=L5.point(S.blocks,w.from), b=L5.point(S.blocks,w.to);
          if(!path){ svg.append(sv('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#e0587a','stroke-width':3,'stroke-dasharray':'3 5'})); continue; }
          okWires++;
          const pts=[a,...path.map(c=>[OX5+c[0]*C5+C5/2,OY5+c[1]*C5+C5/2]),b].map(p=>p.join(',')).join(' ');
          svg.append(sv('polyline',{points:pts,fill:'none',stroke:'#5aa9d6','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}));
          const hit=sv('polyline',{points:pts,fill:'none',stroke:'transparent','stroke-width':16,style:'cursor:pointer'});
          hit.addEventListener('pointerdown',e=>{ e.stopPropagation(); S.wires=S.wires.filter(x=>x!==w); Sound.click(); host.fb('Đã xóa một dây.','info'); render(); });
          svg.append(hit);
        }
        for(const b of S.blocks){
          const bad=!!vio[b.id], g=sv('g',{style:'cursor:grab'});
          g.append(sv('rect',{x:OX5+b.x*C5+2,y:OY5+b.y*C5+2,width:b.w*C5-4,height:b.h*C5-4,rx:8,fill:bad?'#ffc9d6':b.col,stroke:bad?'#e0587a':PAL.ink2,'stroke-width':bad?3.5:2.5}),
            sv('text',{x:OX5+(b.x+b.w/2)*C5,y:OY5+(b.y+b.h/2)*C5+(b.sub?-2:5),'text-anchor':'middle','font-size':14,'font-weight':800,fill:PAL.ink},b.label));
          if(b.sub) g.append(sv('text',{x:OX5+(b.x+b.w/2)*C5,y:OY5+(b.y+b.h/2)*C5+14,'text-anchor':'middle','font-size':10,fill:PAL.ink2},b.sub));
          if(bad) g.append(sv('text',{x:OX5+b.x*C5+8,y:OY5+b.y*C5+16,'font-size':15,'font-weight':900,fill:'#e0587a'},'!'));
          g.addEventListener('pointerdown',e=>startDrag(e,b));
          svg.append(g);
          for(const p of b.pins){ const [px,py]=L5.point(S.blocks,b.id+'.'+p.id), key=b.id+'.'+p.id;
            const c=sv('circle',{cx:px,cy:py,r:7,fill:p.dir==='out'?'#ff9eb5':'#7ecbe8',stroke:S.sel===key?'#4a4458':'#fff','stroke-width':S.sel===key?4:2.5,style:'cursor:crosshair'});
            c.addEventListener('pointerdown',e=>{ e.stopPropagation(); e.preventDefault(); pinClick(key); }); svg.append(c);
            if(p.name) svg.append(sv('text',{x:px+(p.dir==='in'?12:-12),y:py+4,'text-anchor':p.dir==='in'?'start':'end','font-size':11,'font-weight':700,fill:PAL.ink,'pointer-events':'none'},p.name)); }
        }
        const nv=Object.keys(vio).length;
        status.innerHTML=`Khối vi phạm: <b style="color:${nv?'#e0587a':'#2f9c74'}">${nv}</b> · Dây nối được: <b>${okWires}/${def.wires.length}</b>`;
      }
      function startDrag(e,b){
        e.preventDefault(); const p0=toSvg(e), gx=Math.floor((p0.x-OX5)/C5)-b.x, gy=Math.floor((p0.y-OY5)/C5)-b.y; S.drag=b.id;
        const move=ev=>{ const p=toSvg(ev); const nx=clamp(Math.floor((p.x-OX5)/C5)-gx,0,cols-b.w), ny=clamp(Math.floor((p.y-OY5)/C5)-gy,0,rows-b.h); if(nx!==b.x||ny!==b.y){ b.x=nx; b.y=ny; render(); } };
        const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); S.drag=null; Sound.click(); render(); };
        window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); render();
      }
      function pinClick(key){
        if(S.sel===key){ S.sel=null; render(); return; }
        if(!S.sel){ S.sel=key; Sound.click(); host.fb('Đã chọn chân <b>'+nm(key)+'</b>. Bấm một chân khác để nối.','info'); render(); return; }
        const a=L5.pin(S.blocks,S.sel), b=L5.pin(S.blocks,key);
        if(a.p.dir===b.p.dir){ S.sel=key; Sound.bad(); host.fb('Hãy nối một <b>ngõ ra</b> (chấm hồng, bên phải khối) với một <b>ngõ vào</b> (chấm xanh, bên trái khối).','bad'); render(); return; }
        const from=a.p.dir==='out'?S.sel:key, to=a.p.dir==='out'?key:S.sel; S.sel=null;
        if(S.wires.some(w=>w.from===from&&w.to===to)){ host.fb('Dây này đã có rồi.','info'); render(); return; }
        if(!def.wires.some(r=>r[0]===from&&r[1]===to)){ Sound.bad(); host.fb(`Mạch này không cần dây ${nm(from)} → ${nm(to)}. ${def.hintWrong||''}`,'bad'); render(); return; }
        S.wires.push({from,to}); Sound.click(); host.fb(`Đã nối ${nm(from)} → ${nm(to)}. Bấm vào dây để xóa.`,'info'); render();
      }
      function problems(){
        const msgs=[], vio=L5.violations(S.blocks,cols,rows);
        for(const b of S.blocks) if(vio[b.id]) msgs.push(`Khối <b>${b.label}</b> ${[...new Set(vio[b.id])].join(', ')} → cần cách khối khác ít nhất 1 ô trống.`);
        for(const r of def.wires){ const w=S.wires.find(x=>x.from===r[0]&&x.to===r[1]);
          if(!w) msgs.push(`Chưa nối <b>${nm(r[0])} → ${nm(r[1])}</b>.`);
          else if(!L5.route(S.blocks,w.from,w.to,cols,rows)) msgs.push(`Dây <b>${nm(r[0])} → ${nm(r[1])}</b> chưa đi được (bị khối chặn hoặc sát mép lưới); hãy dời khối ra.`); }
        return msgs;
      }
      function check(){
        const msgs=problems();
        if(msgs.length){ host.wrong('Layout chưa đạt, chỉnh lại nhé (đã làm được gì vẫn giữ nguyên):'+ul(msgs)); return; }
        host.success(def.okHtml+'<span class="small">Đây chỉ là mô hình minh họa, <b>không phải layout đủ điều kiện chế tạo</b> và không dùng quy tắc công nghệ thực tế.</span>',lines);
      }
      S.hint=()=>{
        const vio=L5.violations(S.blocks,cols,rows), ids=Object.keys(vio);
        if(ids.length){ const b=S.blocks.find(x=>x.id===ids[0]); return `Khối ${b.label} ${vio[ids[0]][0]}. Kéo nó ra xa để chừa ít nhất 1 ô trống (cả theo đường chéo).`; }
        for(const r of def.wires) if(!S.wires.some(w=>w.from===r[0]&&w.to===r[1])) return `Thử nối ${nm(r[0])} → ${nm(r[1])}.`;
        return 'Mọi thứ có vẻ ổn, hãy bấm “Kiểm tra layout”!';
      };
      S.render=render;
      body.append(
        h('div',{class:'card',html:def.intro+' Bấm chân hồng rồi chân xanh để nối; bấm vào dây để xóa.'}),
        h('div',{class:'note warn'},'Mô hình minh họa đơn giản trong game, không phải layout đủ điều kiện chế tạo và không dùng quy tắc công nghệ thực tế.'),
        svg,status,
        h('div',{class:'legend',html:'<span><i style="background:#c6e6fb"></i>khối hợp lệ</span><span><i style="background:#ffc9d6;border-color:#e0587a"></i>khối vi phạm</span><span><i style="background:rgba(143,127,209,.15);border-style:dashed"></i>vùng cách ly 1 ô</span><span><i style="background:#ff9eb5"></i>ngõ ra</span><span><i style="background:#7ecbe8"></i>ngõ vào</span>'}),
        h('div',{class:'row c'},h('button',{class:'btn',onclick:check},'Kiểm tra layout'),
          h('button',{class:'btn ghost',onclick:()=>{ S.wires=[]; S.sel=null; render(); host.fb('Đã xóa hết dây.','info'); }},'Xóa tất cả dây')));
      render();
    },
    hint(){ return S.hint?S.hint():'Hãy kéo các khối cách nhau ít nhất 1 ô rồi nối dây.'; },
    _S:S
  };
}

/* ---------------------------------------------------------------------
   3. BẢNG CHÂN TRỊ
   --------------------------------------------------------------------- */
function evalBool(expr,env){
  const tok=expr.match(/\(|\)|[A-Za-z]+/g); let i=0;
  const bin={AND:(a,b)=>a&b,OR:(a,b)=>a|b,XOR:(a,b)=>a^b,NAND:(a,b)=>1-(a&b),NOR:(a,b)=>1-(a|b),XNOR:(a,b)=>1-(a^b)};
  function prim(){ const t=tok[i++]; if(t==='('){ const v=ex(); i++; return v; } if(t==='NOT') return 1-prim(); if(t in env) return env[t]; throw new Error('Biểu thức lỗi: '+t); }
  function ex(){ let v=prim(); while(i<tok.length&&bin[tok[i]]){ const op=tok[i++]; v=bin[op](v,prim()); } return v; }
  return ex();
}
const GATE_RULE={AND:'AND chỉ bằng 1 khi tất cả đầu vào bằng 1.',OR:'OR bằng 1 khi có ít nhất một đầu vào bằng 1.',NOT:'NOT đảo bit: 0 thành 1, 1 thành 0.',NAND:'NAND = NOT(AND): chỉ bằng 0 khi tất cả đầu vào bằng 1.',NOR:'NOR = NOT(OR): chỉ bằng 1 khi tất cả đầu vào bằng 0.',XOR:'XOR bằng 1 khi hai đầu vào KHÁC nhau (số bit 1 là lẻ).',XNOR:'XNOR là đảo của XOR: bằng 1 khi hai đầu vào GIỐNG nhau.'};
function makeTruth(params,rng){
  const pick=Math.min(params.pick||1,params.exprs.length);
  const exprs=shuffled(rng,params.exprs).slice(0,pick);
  const vars=[...new Set(exprs.join(' ').match(/\b[A-Z]\b/g))].sort();
  const rows=[]; for(let m=0;m<(1<<vars.length);m++){ const env={}; vars.forEach((v,i)=>env[v]=(m>>(vars.length-1-i))&1); rows.push(env); }
  const expect=exprs.map(e=>rows.map(env=>evalBool(e,env)));
  const ans=exprs.map(()=>rows.map(()=>null));
  const ops=[...new Set(exprs.join(' ').match(/\b(AND|OR|NOT|NAND|NOR|XOR|XNOR)\b/g))];
  return {
    build(body,host){
      const cells=exprs.map(()=>[]);
      const tbl=h('table',{class:'tbl'});
      tbl.append(h('tr',null,vars.map(v=>h('th',null,v)),exprs.map((e,k)=>h('th',{class:'out'},exprs.length>1?'Y'+(k+1):'Y'))));
      rows.forEach((env,r)=>{
        tbl.append(h('tr',null,vars.map(v=>h('td',null,String(env[v]))),exprs.map((e,k)=>{
          const b=h('button',{class:'cellbtn',onclick:()=>{ ans[k][r]=ans[k][r]===null?0:(ans[k][r]===0?1:null); b.textContent=ans[k][r]===null?'?':String(ans[k][r]); b.classList.remove('bad','good'); Sound.click(); }},'?');
          cells[k][r]=b; return h('td',null,b); })));
      });
      function check(){
        const msgs=[]; let bad=false;
        exprs.forEach((e,k)=>rows.forEach((env,r)=>{ const b=cells[k][r]; b.classList.remove('bad','good');
          if(ans[k][r]===null){ bad=true; b.classList.add('bad'); } else if(ans[k][r]!==expect[k][r]){ bad=true; b.classList.add('bad');
            if(msgs.length<3) msgs.push(`Hàng ${vars.map(v=>v+'='+env[v]).join(', ')}: <b>${e.replace(/\b[A-Z]\b/g,m=>env[m])}</b> = ${expect[k][r]}`+(exprs.length>1?` (cột Y${k+1})`:'')); } else b.classList.add('good'); }));
        if(bad){ host.wrong((msgs.length?'Có ô chưa đúng (ô đỏ). Ví dụ:'+ul(msgs):'Còn ô chưa điền (ô đỏ).')); return; }
        host.success('Mỗi hàng được tính bằng cách thay giá trị vào biểu thức:'+ul(exprs.map(e=>`<code>Y = ${e}</code> &nbsp;(VHDL: <code>y &lt;= ${e.toLowerCase()};</code>)`))+ul(ops.map(o=>GATE_RULE[o])));
      }
      body.append(
        h('div',{class:'card',html:'Điền đầu ra cho <b>mọi tổ hợp</b> đầu vào (bấm ô để đổi ? → 0 → 1).'+exprs.map((e,k)=>`<div style="margin-top:6px;font-size:18px"><b>${exprs.length>1?'Y'+(k+1):'Y'} = ${e}</b> <span class="small">(VHDL: <code>${e.toLowerCase()}</code>)</span></div>`).join('')}),
        h('div',{class:'scrollx'},tbl), h('div',{class:'row c',style:'margin-top:10px'},h('button',{class:'btn',onclick:check},'Kiểm tra bảng')));
    },
    hint(){ return ops.map(o=>GATE_RULE[o]).join(' ')+' Hãy tính từng hàng một.'; }
  };
}

/* ---------------------------------------------------------------------
   4. DỰ ĐOÁN WAVEFORM / HÀNH VI MẠCH TUẦN TỰ (mỗi mô hình là một hàm trạng thái thuần)
   Giá trị đầu vào được lấy mẫu ngay trước mỗi cạnh LÊN của clk; người chơi điền Q sau mỗi cạnh.
   --------------------------------------------------------------------- */
const B2opts=n=>Array.from({length:1<<n},(_,v)=>({v:String(v),t:bin(v,n)+(n>1?` (${v})`:'')}));
function genBits(rng,n,minOnes,minZeros){ for(let t=0;t<40;t++){ const a=Array.from({length:n},()=>rint(rng,2)); const o=a.filter(Boolean).length; if(o>=minOnes&&n-o>=minZeros) return a; } return Array.from({length:n},(_,i)=>i%2); }
const SEQ={
  dff:{ n:8,
    spec:p=>`<b>D flip-flop</b> kích cạnh LÊN của clk${p.rst?'; reset đồng bộ mức cao (<b>rst</b> = 1 → Q = 0, ưu tiên cao nhất)':''}${p.en?'; chỉ nạp D khi <b>en</b> = 1, ngược lại giữ Q':''}. Q ban đầu = 0.`,
    inputs:p=>[{k:'d',t:'D'}].concat(p.rst?[{k:'rst',t:'rst'}]:[],p.en?[{k:'en',t:'en'}]:[]),
    outs:()=>[{k:'q',t:'Q',opts:B2opts(1)}], init:()=>0,
    gen(rng,p,n){ const d=genBits(rng,n,3,3), rst=p.rst?genBits(rng,n,1,5).map((v,i)=>i<2?0:v):d.map(()=>0), en=p.en?genBits(rng,n,3,2):d.map(()=>1); return d.map((_,i)=>({d:d[i],rst:rst[i],en:en[i]})); },
    step(s,i,p){ if(p.rst&&i.rst) return {s:0,o:{q:'0'},why:`rst = 1 ở cạnh lên → reset đồng bộ: Q = 0.`};
      if(p.en&&!i.en) return {s,o:{q:String(s)},why:`en = 0 → giữ nguyên Q = ${s}.`};
      return {s:i.d,o:{q:String(i.d)},why:`Cạnh lên: Q nhận giá trị D ngay trước cạnh = ${i.d}.`}; },
    rule:p=>`Q chỉ đổi ở cạnh lên; giá trị D được lấy mẫu ngay trước cạnh.${p.rst?' Reset đồng bộ có ưu tiên cao hơn nạp.':''}${p.en?' en = 0 làm Q giữ nguyên.':''}`,
    hint:'Tại mỗi cạnh lên: nếu có rst = 1 thì Q = 0; nếu en = 0 thì giữ; còn lại Q = D.'
  },
  tff:{ n:8,
    spec:p=>`<b>T flip-flop</b> kích cạnh LÊN của clk: <b>T = 1</b> thì Q đảo, <b>T = 0</b> thì giữ.${p.rst?' Reset đồng bộ mức cao (rst = 1 → Q = 0, ưu tiên cao nhất).':''} Q ban đầu = 0.`,
    inputs:p=>[{k:'t',t:'T'}].concat(p.rst?[{k:'rst',t:'rst'}]:[]),
    outs:()=>[{k:'q',t:'Q',opts:B2opts(1)}], init:()=>0,
    gen(rng,p,n){ const t=genBits(rng,n,4,2), rst=p.rst?genBits(rng,n,1,5).map((v,i)=>i<3?0:v):t.map(()=>0); return t.map((_,i)=>({t:t[i],rst:rst[i]})); },
    step(s,i,p){ if(p.rst&&i.rst) return {s:0,o:{q:'0'},why:'rst = 1 ở cạnh lên → reset đồng bộ: Q = 0.'};
      if(i.t) return {s:1-s,o:{q:String(1-s)},why:`T = 1 → Q đảo: ${s} thành ${1-s}.`};
      return {s,o:{q:String(s)},why:`T = 0 → Q giữ nguyên ${s}.`}; },
    rule:()=>'T = 1 làm Q đảo ở cạnh lên; T = 0 giữ nguyên; reset (nếu có) ưu tiên cao nhất.',
    hint:'Nếu rst = 1 thì Q = 0. Nếu không, T = 1 thì đảo Q, T = 0 thì giữ Q.'
  },
  cnt:{ n:9,
    spec:p=>{ const m=p.mod||(1<<p.bits); return `Bộ đếm <b>${p.bits} bit${m<(1<<p.bits)?` modulo-${m} (đếm 0 → ${m-1} rồi về 0)`:''}</b>${p.updown?', có tín hiệu hướng <b>dir</b> (1 = đếm lên, 0 = đếm xuống)':''}: ở cạnh lên, <b>rst</b> = 1 → Q = 0 (ưu tiên cao nhất); nếu <b>en</b> = 1 thì đếm; en = 0 giữ nguyên. Q ban đầu = 0.`; },
    inputs:p=>[{k:'rst',t:'rst'},{k:'en',t:'en'}].concat(p.updown?[{k:'dir',t:'dir'}]:[]),
    outs:p=>[{k:'q',t:'Q',opts:B2opts(p.bits).slice(0,p.mod||(1<<p.bits))}], init:()=>0,
    gen(rng,p,n){ const rst=genBits(rng,n,1,6).map((v,i)=>i<3?0:(v&&rng()<0.6?v:0)); if(!rst.some(Boolean)) rst[n-3]=1; const en=genBits(rng,n,5,1), dir=p.updown?genBits(rng,n,3,3):en.map(()=>1); return rst.map((_,i)=>({rst:rst[i],en:en[i],dir:dir[i]})); },
    step(s,i,p){ const m=p.mod||(1<<p.bits);
      if(i.rst) return {s:0,o:{q:'0'},why:'rst = 1 ở cạnh lên → reset đồng bộ: Q = 0.'};
      if(!i.en) return {s,o:{q:String(s)},why:`en = 0 → giữ nguyên Q = ${s}.`};
      const up=p.updown?!!i.dir:true, ns=up?(s+1)%m:(s-1+m)%m;
      return {s:ns,o:{q:String(ns)},why:`en = 1, ${up?'đếm lên':'đếm xuống'}: ${s} → ${ns}${(up&&ns===0)?` (quay về 0 sau ${m-1})`:(!up&&ns===m-1&&s===0)?` (từ 0 quay về ${m-1})`:''}.`}; },
    rule:p=>'Reset đồng bộ có ưu tiên cao nhất, rồi đến enable; giá trị đếm quay vòng theo modulo.'+(p.updown?' dir quyết định đếm lên hay xuống.':''),
    hint:'Mỗi cạnh lên: rst = 1 → 0; en = 0 → giữ; en = 1 → tăng (hoặc giảm nếu dir = 0), quay vòng ở giá trị cuối.'
  },
  reg:{ n:7,
    spec:p=>`<b>Thanh ghi ${p.bits} bit có nạp</b>: ở cạnh lên, <b>rst</b> = 1 → Q = 0000 (ưu tiên cao nhất); nếu <b>load</b> = 1 thì Q nhận <b>d</b>; ngược lại giữ nguyên. Q ban đầu = ${bin(0,p.bits)}.`,
    inputs:p=>[{k:'d',t:'d',fmt:v=>bin(v,p.bits)},{k:'load',t:'load'},{k:'rst',t:'rst'}],
    outs:p=>[{k:'q',t:'Q',opts:B2opts(p.bits).map(o=>({v:o.v,t:bin(+o.v,p.bits)}))}], init:()=>0,
    gen(rng,p,n){ const ld=genBits(rng,n,2,3), out=[]; for(let i=0;i<n;i++) out.push({d:1+rint(rng,(1<<p.bits)-1),load:ld[i],rst:(i===n-2&&rng()<0.7)?1:0}); return out; },
    step(s,i,p){ if(i.rst) return {s:0,o:{q:'0'},why:`rst = 1 → Q = ${bin(0,p.bits)}.`};
      if(i.load) return {s:i.d,o:{q:String(i.d)},why:`load = 1 → Q nhận d = ${bin(i.d,p.bits)}.`};
      return {s,o:{q:String(s)},why:`load = 0 → giữ nguyên Q = ${bin(s,p.bits)}.`}; },
    rule:()=>'Reset ưu tiên cao nhất, rồi đến nạp (load); không có gì thì thanh ghi giữ giá trị.',
    hint:'Mỗi cạnh lên: rst = 1 → 0000; load = 1 → Q = d; còn lại giữ Q.'
  },
  shift:{ n:8,
    spec:p=>`<b>Thanh ghi dịch ${p.bits} bit, dịch ${p.dir==='left'?'TRÁI':'PHẢI'}</b>: ở mỗi cạnh lên, bit <b>sin</b> đi vào ${p.dir==='left'?'bit 0 (bên phải), các bit khác nhích sang trái':'bit cao nhất (bên trái), các bit khác nhích sang phải'}. Q ban đầu = ${bin(0,p.bits)}.`,
    inputs:()=>[{k:'sin',t:'sin'}],
    outs:p=>[{k:'q',t:'Q',opts:B2opts(p.bits).map(o=>({v:o.v,t:bin(+o.v,p.bits)}))}], init:()=>0,
    gen(rng,p,n){ return genBits(rng,n,4,2).map(v=>({sin:v})); },
    step(s,i,p){ const mask=(1<<p.bits)-1; const ns=p.dir==='left'?(((s<<1)&mask)|i.sin):((s>>1)|(i.sin<<(p.bits-1)));
      return {s:ns,o:{q:String(ns)},why:`Dịch ${p.dir==='left'?'trái':'phải'} ${bin(s,p.bits)} và đưa sin = ${i.sin} vào ${p.dir==='left'?'bên phải':'bên trái'} → ${bin(ns,p.bits)}.`}; },
    rule:p=>`Mỗi cạnh lên dữ liệu nhích một vị trí ${p.dir==='left'?'sang trái':'sang phải'}, bit mới vào đầu còn lại.`,
    hint:p=>p.dir==='left'?'Dịch trái: bỏ bit trái nhất, các bit còn lại nhích sang trái, sin thành bit phải nhất.':'Dịch phải: bỏ bit phải nhất, các bit còn lại nhích sang phải, sin thành bit trái nhất.'
  },
  fsm:{ n:9,
    spec:p=>`Máy <b>${p.type==='moore'?'Moore':'Mealy'}</b> phát hiện chuỗi <b>${p.pattern}</b> (${p.overlap?'cho phép chồng lấn':'không chồng lấn'}). <b>S<sub>k</sub></b> = đã khớp k bit đầu của mẫu. ${p.type==='moore'?`z = 1 khi ở S${p.pattern.length} (đầu ra chỉ phụ thuộc trạng thái sau cạnh).`:'z = 1 ngay tại nhịp nhận bit cuối của mẫu (phụ thuộc trạng thái trước và bit vào).'} Ban đầu ở S0.`,
    inputs:()=>[{k:'x',t:'x'}],
    outs:p=>[{k:'s',t:'Trạng thái sau cạnh',opts:Array.from({length:DET.states(p.pattern,p.type)},(_,i)=>({v:String(i),t:'S'+i}))},{k:'z',t:'z',opts:B2opts(1)}], init:()=>0,
    gen(rng,p,n){ const L=p.pattern.length, bits=Array.from({length:n},()=>rint(rng,2)); const at=rint(rng,n-L+1); for(let i=0;i<L;i++) bits[at+i]=+p.pattern[i]; return bits.map(x=>({x})); },
    step(s,i,p){ const r=DET.step(p.pattern,p.type,p.overlap,s,String(i.x)), z=p.type==='moore'?DET.zMoore(p.pattern,r.ns):r.z;
      return {s:r.ns,o:{s:String(r.ns),z:String(z)},why:fsmWhy(p.pattern,p.type,p.overlap,s,String(i.x),r,z)}; },
    rule:()=>'Mỗi bit vào đưa máy sang trạng thái ứng với phần cuối dài nhất của chuỗi đã nhận mà trùng với phần đầu của mẫu.',
    hint:'Với mỗi bit: ghép bit vào sau phần đã khớp, rồi tìm phần cuối dài nhất trùng với phần đầu của mẫu để biết trạng thái mới.'
  }
};
function fsmWhy(pat,type,overlap,s,c,r,z){
  const L=pat.length; let eff=s, note='';
  if(type==='moore'&&s===L&&!overlap){ eff=0; note=' (không chồng lấn: sau khi khớp đủ mẫu thì bắt đầu lại từ S0)'; }
  const cand=pat.slice(0,eff)+c;
  if(type==='mealy'&&cand===pat) return `Ở S${s} (đã khớp "${pat.slice(0,eff)}") nhận ${c} → khớp đủ "${pat}" nên z = 1; ${overlap?`cho phép chồng lấn nên về S${r.ns} (phần cuối dài nhất trùng với đầu mẫu: "${pat.slice(0,r.ns)}")`:'không chồng lấn nên về S0'}.`;
  return `Ở S${s}${note} đã khớp "${pat.slice(0,eff)}", nhận ${c} → chuỗi cuối "${cand}"; phần cuối dài nhất trùng với đầu mẫu là "${pat.slice(0,r.ns)}" (${r.ns} bit) → S${r.ns}, z = ${z}.`;
}
function makeSeq(params,rng){
  const P=pickVariant(params,rng), M=SEQ[P.model], n=M.n;
  const ins=M.inputs(P), outs=M.outs(P), seq=M.gen(rng,P,n);
  let s=M.init(P); const exp=[]; for(const i of seq){ const r=M.step(s,i,P); s=r.s; exp.push(r); }
  const sel=outs.map(()=>[]);      // select elements
  let done=false;
  const firstBad=()=>{ for(let c=0;c<n;c++) for(let r=0;r<outs.length;r++) if(sel[r][c].value!==exp[c].o[outs[r].k]) return [r,c]; return null; };
  return {
    build(body,host){
      const tbl=h('table',{class:'tbl seq'});
      tbl.append(h('tr',null,h('th',null,'Cạnh lên ↑'),Array.from({length:n},(_,c)=>h('th',null,String(c+1)))));
      for(const inp of ins) tbl.append(h('tr',null,h('th',null,inp.t),seq.map(v=>h('td',null,inp.fmt?inp.fmt(v[inp.k]):String(v[inp.k])))));
      outs.forEach((o,r)=>tbl.append(h('tr',{class:'ans'},h('th',{class:'out'},o.t),Array.from({length:n},(_,c)=>{
        const sl=h('select',{onchange:()=>{ sl.classList.remove('bad','good'); Sound.click(); }},h('option',{value:''},'?'),o.opts.map(op=>h('option',{value:op.v},op.t)));
        sel[r][c]=sl; return h('td',null,sl); }))));
      function check(){
        if(done) return; let bad=false, first=null;
        for(let c=0;c<n;c++) for(let r=0;r<outs.length;r++){ const sl=sel[r][c]; sl.classList.remove('bad','good');
          if(sl.value!==exp[c].o[outs[r].k]){ bad=true; sl.classList.add('bad'); if(first===null) first=c; } else sl.classList.add('good'); }
        if(bad){ host.wrong(`Có ô chưa đúng hoặc còn trống (ô đỏ). Xét <b>nhịp ${first+1}</b>: ${exp[first].why}<br><span class="small">Các ô sau nhịp đó phụ thuộc vào trạng thái đúng của nhịp này.</span>`); return; }
        done=true; $$('select',tbl).forEach(x=>x.disabled=true);
        host.success(`<ul class="clean"><li>${M.rule(P)}</li><li>Giá trị lấy mẫu là giá trị <b>ngay trước</b> mỗi cạnh lên; giữa hai cạnh, Q không đổi.</li></ul>`);
      }
      this._reveal=()=>{ const fb=firstBad(); if(!fb) return null; const [r,c]=fb; const sl=sel[r][c]; sl.value=exp[c].o[outs[r].k]; sl.classList.add('good'); return `Ở nhịp ${c+1}, ô “${outs[r].t}” = <b>${sel[r][c].selectedOptions[0].textContent}</b>. ${exp[c].why}`; };
      body.append(h('div',{class:'card',html:M.spec(P)+'<br><span class="small">Mỗi cột là một cạnh lên của clock. Các giá trị đầu vào bên trên được lấy mẫu ngay trước cạnh lên đó. Hãy chọn giá trị đầu ra sau cạnh.</span>'}),
        h('div',{class:'scrollx'},tbl),h('div',{class:'row c',style:'margin-top:10px'},h('button',{class:'btn',onclick:check},'Kiểm tra')));
    },
    hint(){ const r=this._reveal&&this._reveal(); const base=typeof M.hint==='function'?M.hint(P):M.hint; return (r?r+'<br>':'')+base; }
  };
}

/* ---------------------------------------------------------------------
   5. ĐIỀN CODE VHDL (chỗ trống {1}, {2}…; mỗi chỗ trống có danh sách lựa chọn kèm lý do sai)
   --------------------------------------------------------------------- */
function makeCode(variant,o){
  o=o||{}; const rng=o.rng;
  const S={pick:{},cur:null,done:false};
  const opts={}; for(const k in variant.blanks){ const arr=variant.blanks[k].opts; opts[k]=(rng&&o.shuffle!==false)?shuffled(rng,arr):arr; }
  return {
    build(body,host){
      const pre=h('pre',{class:'code'}), optsBox=h('div',{class:'opts'}), info=h('div',{class:'small',style:'margin-bottom:6px'}), expl=h('div',{class:'card hidden'});
      function paint(res){
        pre.innerHTML='';
        variant.lines.forEach(ln=>{
          for(const part of ln.split(/(\{\d\})/)){ const m=part.match(/^\{(\d)\}$/);
            if(!m){ pre.append(part); continue; }
            const k=+m[1], pk=S.pick[k];
            pre.append(h('button',{class:'blank'+(pk!=null?' filled':'')+(S.cur===k?' cur':'')+(res&&res[k]?' '+res[k]:''),title:'Bấm để chọn mảnh code',onclick:()=>{ S.cur=k; Sound.click(); paint(res); showOpts(); }},pk!=null?opts[k][pk].t:`[ ${k}: ? ]`)); }
          pre.append('\n');
        });
      }
      function showOpts(){
        optsBox.innerHTML=''; if(S.cur==null){ info.textContent='Bấm vào một chỗ trống [ ? ] trong code để chọn mảnh phù hợp.'; return; }
        const B=variant.blanks[S.cur]; info.innerHTML=`Chỗ trống <b>${S.cur}</b> – ${B.label}:`;
        opts[S.cur].forEach((op,i)=>optsBox.append(h('button',{class:'opt'+(S.pick[S.cur]===i?' sel':''),onclick:()=>{ if(S.done) return; S.pick[S.cur]=i; Sound.click(); paint(); showOpts(); }},op.t)));
      }
      function check(){
        if(S.done) return; const res={}, msgs=[]; let bad=false;
        for(const k in variant.blanks){ const pk=S.pick[k];
          if(pk==null){ bad=true; msgs.push(`Chỗ trống ${k} (${variant.blanks[k].label}) chưa chọn.`); }
          else if(opts[k][pk].ok) res[k]='good';
          else { bad=true; res[k]='bad'; msgs.push(`Chỗ trống ${k}: <code>${esc(opts[k][pk].t)}</code> – ${opts[k][pk].why}`); } }
        paint(res);
        if(bad){ host.wrong('Chưa đúng hết (các chỗ đúng đã tô xanh, giữ nguyên):'+ul(msgs)); return; }
        S.done=true; optsBox.innerHTML=''; info.textContent='Code hoàn chỉnh!';
        host.success(o.okHtml||ul(variant.explain.map(e=>`<code>${esc(e[0])}</code> – ${e[1]}`)),o.lines);
      }
      this._S=S;
      expl.innerHTML='<b>Giải thích từng phần:</b>'+ul(variant.explain.map(e=>`<code>${esc(e[0])}</code> – ${e[1]}`));
      body.append(
        h('div',{class:'card',html:variant.intro+'<br><span class="small">Bấm chỗ trống rồi chọn mảnh code. Bạn <b>không cần tự gõ</b> code. “Giải thích code” miễn phí; “Gợi ý” ở phía trên có thể bị trừ thưởng.</span>'}),
        pre,info,optsBox,
        h('div',{class:'row c'},h('button',{class:'btn',onclick:check},'Kiểm tra code'),
          h('button',{class:'btn alt',onclick:()=>{ Sound.click(); expl.classList.toggle('hidden'); }},'Giải thích code'),
          h('button',{class:'btn ghost',onclick:()=>{ if(S.done) return; S.pick={}; S.cur=null; paint(); showOpts(); host.fb(''); }},'Xóa lựa chọn')),
        expl);
      paint(); showOpts();
    },
    hint(){
      let k=S.cur; const wrongNow=kk=>S.pick[kk]==null||!opts[kk][S.pick[kk]].ok;
      if(k==null||!wrongNow(k)){ k=null; for(const kk in variant.blanks) if(wrongNow(kk)){ k=kk; break; } }
      if(k==null) return 'Tất cả đã đúng, bấm “Kiểm tra code” nhé!';
      return `Chỗ trống ${k} (${variant.blanks[k].label}): ${variant.blanks[k].hint}`;
    }
  };
}

/* ---------------------------------------------------------------------
   6. SỬA LỖI CODE: bước 1 chọn dòng lỗi, bước 2 chọn cách sửa
   --------------------------------------------------------------------- */
function makeDebug(sc,rng){
  const S={stage:'line',pickLine:null,fixPick:-1,done:false};
  const fixes=rng?shuffled(rng,sc.fixes):sc.fixes;
  return {
    build(body,host){
      const codeBox=h('div',{class:'dbg'}), side=h('div');
      function paintCode(final){
        codeBox.innerHTML='';
        let lines=sc.lines.slice();
        if(final){ const f=fixes[S.fixPick].t; if(sc.mode==='insert') lines.splice(sc.bug,0,'    '+f); else lines[sc.bug]=lines[sc.bug].match(/^\s*/)[0]+f; }
        lines.forEach((ln,i)=>{
          const isFix=final&&(sc.mode==='insert'?i===sc.bug:i===sc.bug);
          const row=h('button',{class:'cl'+(S.stage==='fix'&&i===sc.bug&&!final?' sus':'')+(isFix?' fixed':''),disabled:S.stage!=='line'||undefined,onclick:()=>pickLine(i)},h('span',{class:'ln'},String(i+1)),h('span',{class:'tx'},ln||' '));
          codeBox.append(row);
        });
      }
      function pickLine(i){
        if(S.stage!=='line') return; Sound.click();
        if(i!==sc.bug){ host.wrong(`Dòng ${i+1} chưa phải nguyên nhân. `+((sc.lineNotes&&sc.lineNotes[i])||'Hãy đối chiếu lại với triệu chứng.')); return; }
        S.stage='fix'; host.fb(`Đúng, lỗi nằm ${sc.mode==='insert'?'ngay trước dòng này (đang thiếu một dòng)':'ở dòng này'}! Giờ chọn cách sửa.`,'ok'); Sound.ok(); paintCode(); renderSide();
      }
      function renderSide(){
        side.innerHTML='';
        if(S.stage==='line'){ side.append(h('div',{class:'small'},'Bấm vào dòng mà bạn nghĩ là nguyên nhân gây ra triệu chứng.')); return; }
        side.append(h('div',{style:'margin:8px 0 4px'},h('b',null,sc.mode==='insert'?'Chọn dòng cần THÊM:':'Chọn dòng thay thế:')),
          ...fixes.map((f,i)=>h('label',{class:'radio mono'},h('input',{type:'radio',name:'dbgfix',onchange:()=>{S.fixPick=i;}}),f.t)),
          h('button',{class:'btn',onclick:()=>{
            if(S.fixPick<0){ host.fb('Hãy chọn một phương án trước nhé.','info'); return; }
            const f=fixes[S.fixPick]; if(!f.ok){ host.wrong('Chưa đúng: '+f.why); return; }
            S.stage='done'; S.done=true; paintCode(true); side.innerHTML='';
            host.success(`<b>Nguyên nhân:</b> ${sc.why}<br><span class="small">Dòng được tô xanh là dòng đã sửa.</span>`);
          }},'Áp dụng sửa'));
      }
      this._S=S;
      body.append(h('div',{class:'card',html:`<b>${sc.title}</b><br><b>Triệu chứng:</b> ${sc.symptom}`}),codeBox,side);
      paintCode(); renderSide();
    },
    hint(){
      if(S.stage==='line') return `Lỗi nằm quanh dòng ${Math.max(1,sc.bug)}–${Math.min(sc.lines.length,sc.bug+2)}. Đọc kỹ triệu chứng rồi xem dòng nào liên quan.`;
      return sc.why;
    }
  };
}

/* ---------------------------------------------------------------------
   7. BẢNG CHUYỂN TRẠNG THÁI FSM (bộ phát hiện chuỗi; Moore hoặc Mealy)
   --------------------------------------------------------------------- */
function makeFsmTable(params,rng){
  const pat=pickOne(rng,params.patterns), type=pickOne(rng,params.types), overlap=pickOne(rng,params.overlap);
  const nS=DET.states(pat,type), L=pat.length;
  const exp=[]; for(let s=0;s<nS;s++){ exp[s]={}; for(const c of ['0','1']){ const r=DET.step(pat,type,overlap,s,c); exp[s][c]={ns:r.ns,z:type==='moore'?DET.zMoore(pat,s):r.z,r}; } }
  const cells=[]; // {el,s,c,kind,want}
  let done=false;
  const stOpt=()=>Array.from({length:nS},(_,i)=>h('option',{value:String(i)},'S'+i));
  return {
    build(body,host){
      const tbl=h('table',{class:'tbl'});
      const head=type==='moore'?['Trạng thái','x = 0 → kế','x = 1 → kế','z (đầu ra)']:['Trạng thái','x = 0: kế','x = 0: z','x = 1: kế','x = 1: z'];
      tbl.append(h('tr',null,head.map(t=>h('th',null,t))));
      const mk=(s,c,kind,want,opts)=>{ const sl=h('select',{onchange:()=>{ sl.classList.remove('bad','good'); Sound.click(); }},h('option',{value:''},'?'),opts); cells.push({el:sl,s,c,kind,want}); return h('td',null,sl); };
      for(let s=0;s<nS;s++){
        const tds=[h('th',null,'S'+s)];
        if(type==='moore'){ tds.push(mk(s,'0','ns',String(exp[s]['0'].ns),stOpt()),mk(s,'1','ns',String(exp[s]['1'].ns),stOpt()),mk(s,'0','z',String(exp[s]['0'].z),[h('option',{value:'0'},'0'),h('option',{value:'1'},'1')])); }
        else for(const c of ['0','1']) tds.push(mk(s,c,'ns',String(exp[s][c].ns),stOpt()),mk(s,c,'z',String(exp[s][c].z),[h('option',{value:'0'},'0'),h('option',{value:'1'},'1')]));
        tbl.append(h('tr',null,tds));
      }
      const explain=(cell)=>{ const r=exp[cell.s][cell.c].r; return cell.kind==='z'
        ? (type==='moore'?`Moore: z chỉ phụ thuộc trạng thái; z = 1 chỉ ở S${L} (đã khớp đủ mẫu "${pat}").`:`Mealy: z = 1 chỉ khi bit vừa nhận hoàn tất mẫu "${pat}" (từ S${L-1} nhận ${pat[L-1]}).`)
        : fsmWhy(pat,type,overlap,cell.s,cell.c,r,exp[cell.s][cell.c].z); };
      const wrongCells=()=>cells.filter(c=>c.el.value!==c.want);
      function check(){
        if(done) return; cells.forEach(c=>c.el.classList.remove('bad','good'));
        const bad=wrongCells(); bad.forEach(c=>c.el.classList.add('bad')); cells.filter(c=>c.el.value===c.want).forEach(c=>c.el.classList.add('good'));
        if(bad.length){ const f=bad.find(c=>c.el.value!=='')||bad[0]; host.wrong(`Có ${bad.length} ô chưa đúng hoặc còn trống (ô đỏ). Ví dụ — S${f.s}, x = ${f.c}${f.kind==='z'?' (đầu ra z)':''}: ${explain(f)}`); return; }
        done=true; cells.forEach(c=>c.el.disabled=true);
        host.success(`<ul class="clean"><li>Mỗi trạng thái S<sub>k</sub> nghĩa là đã khớp <b>k bit đầu</b> của mẫu “${pat}”.</li><li>Với mỗi bit vào, trạng thái mới là phần cuối <b>dài nhất</b> của chuỗi đã nhận mà trùng với phần đầu của mẫu.</li><li>${type==='moore'?`Moore: z = 1 chỉ ở S${L}.`:'Mealy: z = 1 ngay tại nhịp hoàn tất mẫu.'} ${overlap?'Cho phép chồng lấn nên sau khi khớp đủ mẫu vẫn tận dụng phần cuối của mẫu.':'Không chồng lấn: sau khi khớp đủ mẫu thì bắt đầu lại từ S0.'}</li></ul>`);
      }
      this._rev=()=>{ const f=wrongCells()[0]; if(!f) return null; f.el.value=f.want; f.el.classList.add('good'); return `S${f.s}, x = ${f.c}${f.kind==='z'?' (z)':''} = <b>${f.el.selectedOptions[0].textContent}</b>. ${explain(f)}`; };
      const meaning=Array.from({length:nS},(_,i)=>`S${i}: đã khớp "${pat.slice(0,i)||'(chưa bit nào)'}"`).join(' · ');
      body.append(h('div',{class:'card',html:`Thiết kế máy <b>${type==='moore'?'Moore':'Mealy'}</b> phát hiện chuỗi <b>${pat}</b> trên đầu vào nối tiếp x (${overlap?'<b>cho phép chồng lấn</b>':'<b>không chồng lấn</b>'}). Trạng thái ban đầu S0.<br><span class="small">${meaning}.</span><br><span class="small">Điền <b>trạng thái kế tiếp</b>${type==='mealy'?' và <b>z</b> cho từng ô':' và <b>z</b> của từng trạng thái'}.</span>`}),
        h('div',{class:'scrollx'},tbl),h('div',{class:'row c',style:'margin-top:10px'},h('button',{class:'btn',onclick:check},'Kiểm tra bảng')));
    },
    hint(){ const r=this._rev&&this._rev(); return r||'Bảng đã đúng hết, hãy bấm “Kiểm tra bảng”.'; }
  };
}

/* ---------------------------------------------------------------------
   Đăng ký các loại nhiệm vụ. Thêm loại mới: ENGINES.tenmoi = (params, rng) => ({build, hint}).
   --------------------------------------------------------------------- */
const ENGINES={
  truth:(p,rng)=>makeTruth(p,rng),
  seq:(p,rng)=>makeSeq(p,rng),
  code:(p,rng)=>{ const t=pickOne(rng,p.templates), v=pickOne(rng,CODE[t].variants); return makeCode(v,{rng}); },
  debug:(p,rng)=>{ const ids=p.group?DEBUG_GROUPS[p.group]:p.scenarios; return makeDebug(DEBUG[pickOne(rng,ids)],rng); },
  fsm:(p,rng)=>makeFsmTable(p,rng),
  diagram:(p,rng)=>makeDiagram(DIAGRAMS[pickOne(rng,p.defs)]),
  layout:(p,rng)=>makeLayout(LAYOUTS[pickOne(rng,p.defs)])
};
const ENGINE_NAMES={truth:'Bảng chân trị',seq:'Dự đoán hành vi mạch',code:'Điền code VHDL',debug:'Sửa lỗi',fsm:'Bảng trạng thái',diagram:'Sơ đồ khối',layout:'Layout'};
function makeTaskQuest(engine,params,seed){ return ENGINES[engine](params,mulberry32((seed>>>0)||1)); }
