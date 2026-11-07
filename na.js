/* NeuralArt site toolkit — theme switcher, generative plates, reveal + clock helpers. No dependencies. */
const NA = (() => {
  /* ---------- noise ---------- */
  function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const P=new Uint8Array(512);{const r=rng(1337),q=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[q[i],q[j]]=[q[j],q[i]]}for(let i=0;i<512;i++)P[i]=q[i&255]}
  const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+(b-a)*t;
  const grad=(h,x,y,z)=>{const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v)};
  function noise(x,y,z){const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
    const u=fade(x),v=fade(y),w=fade(z),A=P[X]+Y,AA=P[A]+Z,AB=P[A+1]+Z,B=P[X+1]+Y,BA=P[B]+Z,BB=P[B+1]+Z;
    return lerp(lerp(lerp(grad(P[AA]&15,x,y,z),grad(P[BA]&15,x-1,y,z),u),lerp(grad(P[AB]&15,x,y-1,z),grad(P[BB]&15,x-1,y-1,z),u),v),
      lerp(lerp(grad(P[AA+1]&15,x,y,z-1),grad(P[BA+1]&15,x-1,y,z-1),u),lerp(grad(P[AB+1]&15,x,y-1,z-1),grad(P[BB+1]&15,x-1,y-1,z-1),u),v),w)}

  /* ---------- theme ---------- */
  const T={};const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function readTheme(){const cs=getComputedStyle(document.documentElement);['ink','paper','accent','art','art-bg','on-accent','soft'].forEach(k=>T[k]=cs.getPropertyValue('--'+k).trim())}
  readTheme();
  const rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]};
  function switcher(presets,label='Theme'){
    const el=document.createElement('div');el.className='na-switch';
    el.innerHTML=`<span>${label}</span>`+presets.map((p,i)=>`<button data-t="${p.id}" title="${p.name}" style="--a:${p.swatch[0]};--b:${p.swatch[1]}" ${i?'':'aria-pressed="true"'}></button>`).join('');
    document.body.appendChild(el);
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.documentElement.dataset.theme=b.dataset.t;
      el.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-pressed'));b.setAttribute('aria-pressed','true');readTheme();dispatchEvent(new Event('na:theme'))});
    const s=document.createElement('style');s.textContent=`.na-switch{position:fixed;left:16px;bottom:16px;z-index:99;display:flex;gap:8px;align-items:center;background:rgba(20,20,20,.88);backdrop-filter:blur(8px);color:#fff;padding:8px 10px 8px 14px;border-radius:999px;font:500 11px/1 ui-monospace,'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase}
.na-switch button{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:linear-gradient(135deg,var(--a) 50%,var(--b) 50%);padding:0}
.na-switch button[aria-pressed]{border-color:#fff}`;document.head.appendChild(s);
  }

  /* ---------- canvas runtime ---------- */
  /* scroll guard: decorative canvases pause while the page is actively scrolling, so scrolling stays smooth */
  let scrolling=false,st_=0;addEventListener('scroll',()=>{scrolling=true;clearTimeout(st_);st_=setTimeout(()=>scrolling=false,140)},{passive:true});
  function mount(canvas,draw,opts={}){
    const st={mx:-1e4,my:-1e4,inside:false,hover:0,t:Math.random()*10,speed:1,w:0,h:0};
    const dpr=Math.min(2,devicePixelRatio||1),g=canvas.getContext('2d');
    function size(){const r=canvas.getBoundingClientRect();if(!r.width)return;st.w=r.width;st.h=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);g.setTransform(dpr,0,0,dpr,0,0);opts.resize&&opts.resize(g,st.w,st.h,st)}
    new ResizeObserver(size).observe(canvas);size();
    const tgt=opts.pointer||canvas;
    tgt.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();st.mx=e.clientX-r.left;st.my=e.clientY-r.top;st.inside=true});
    tgt.addEventListener('pointerleave',()=>st.inside=false);
    let vis=true;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(canvas);
    let last=performance.now(),frames=0;
    const loop=(function(now){const dt=Math.min(.05,(now-last)/1000);last=now;st.hover+=((st.inside?1:0)-st.hover)*.08;
      if(vis&&st.w&&(!(opts.yieldToScroll&&scrolling)||!st.drawn||frames%4===0)){st.t+=dt*st.speed;draw(g,st.w,st.h,st,dt);st.drawn=true}
      frames++;if(!reduce||frames<240)requestAnimationFrame(loop)});requestAnimationFrame(loop);
    return st;
  }

  /* Small plates — animated studies used for service cards. */
  const plates={
    rings(g,w,h,s,col){g.clearRect(0,0,w,h);g.strokeStyle=col;g.lineWidth=.9;const z=s.t*.25,cx=w/2+(s.inside?(s.mx-w/2)*.15:0),cy=h/2+(s.inside?(s.my-h/2)*.15:0);
      for(let r=5;r<Math.max(w,h)*.75;r+=7){g.beginPath();for(let a=0;a<=6.3;a+=.04){const k=r+noise(Math.cos(a)*1.4+r*.004,Math.sin(a)*1.4,z)*r*.35;const x=cx+Math.cos(a)*k,y=cy+Math.sin(a)*k;a?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}},
    dots(g,w,h,s,col){g.clearRect(0,0,w,h);g.fillStyle=col;const S=Math.max(9,w/34),z=s.t*.3;
      for(let y=S/2;y<h;y+=S)for(let x=S/2;x<w;x+=S){let v=noise(x*.011,y*.011,z)*.9+.5;const d=Math.hypot(x-s.mx,y-s.my);if(d<120)v+=(1-d/120)*.6*s.hover;
        const r=Math.max(0,Math.min(1,v))**1.6*S*.6;if(r>.3){g.beginPath();g.arc(x,y,r,0,7);g.fill()}}},
    bars(g,w,h,s,col){g.clearRect(0,0,w,h);g.fillStyle=col;const n=Math.round(w/9),rows=22,bw=w/n,bh=h/rows,z=s.t*.35;
      for(let i=0;i<n;i++)for(let j=0;j<rows;j++){let v=noise(i*.09,j*.16,z)*.9+.5;const d=Math.hypot(i*bw-s.mx,j*bh-s.my);if(d<110)v+=(1-d/110)*.5*s.hover;
        v=Math.max(.05,Math.min(1,v));g.fillRect(i*bw+1,j*bh+bh*(1-v)/2,bw-2,bh*v*.9)}},
    threads(g,w,h,s,col){g.clearRect(0,0,w,h);g.strokeStyle=col;g.lineWidth=.8;g.lineJoin='round';const z=s.t*.2,N=46,step=6;
      // smoothed pointer + velocity, so the lines respond with a little inertia
      if(s.px==null){s.px=s.mx;s.py=s.my;s.vx=0;s.vy=0}
      const nx=s.px+(s.mx-s.px)*.18,ny=s.py+(s.my-s.py)*.18;s.vx+=((nx-s.px)-s.vx)*.2;s.vy+=((ny-s.py)-s.vy)*.2;s.px=nx;s.py=ny;
      const hv=s.hover,R=Math.min(w,h)*.26,R2=2*R*R,mx=s.px,my=s.py,vx=Math.max(-40,Math.min(40,s.vx)),vy=Math.max(-40,Math.min(40,s.vy));
      for(let j=0;j<N;j++){g.beginPath();let y0=h*(j+.5)/N;
        for(let x=0;x<=w+step;x+=step){
          let y=y0+noise(x*.006,j*.08,z)*h*.35, X=x;                        // original look
          if(hv>.01){const dx=x-mx,dy=y-my,e=Math.exp(-(dx*dx+dy*dy)/R2)*hv;
            y+=dy*e*.9;                                                      // lens: threads part smoothly around the cursor
            y+=vy*e*3.2;X+=vx*e*2.2}                                         // comb: moving the cursor drags them along
          x?g.lineTo(X,y):g.moveTo(X,y)}
        g.stroke()}}
  };
  function plate(canvas,kind,o={}){const st=mount(canvas,(g,w,h,s)=>{s.speed=1+s.hover*((s.kind||kind)==='threads'?.6:2.5);plates[s.kind||kind](g,w,h,s,T[o.colorKey||'art'])},{pointer:o.pointer,yieldToScroll:o.yieldToScroll!==false});st.kind=kind;return st}

  /* ---------- page helpers ---------- */
  function reveal(sel='[data-reveal]'){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});document.querySelectorAll(sel).forEach(el=>io.observe(el))}
  function clock(el,tz='America/Vancouver'){const f=()=>el.textContent=new Date().toLocaleTimeString('en-CA',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});f();setInterval(f,1000)}

  return {noise,T,readTheme,switcher,mount,plate,plates,reveal,clock,reduce};
})();
