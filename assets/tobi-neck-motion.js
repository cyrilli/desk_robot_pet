// Neutral assembly axes follow OpenSCAD: X across the ears, Z up, front toward -Y.
(() => {
  const view = document.getElementById('neck-view');
  const ctx = view.getContext('2d');
  const status = document.getElementById('record');
  const nod = document.getElementById('nod');
  const shake = document.getElementById('shake');
  const center = document.getElementById('center');
  const values = {5: document.getElementById('pitch-value'), 6: document.getElementById('yaw-value')};
  const groups = [];
  const textures = {};
  const events = [];
  const timers = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pitchHeight = 62;
  let pitch = 0, yaw = 0, targetPitch = 0, targetYaw = 0, mood = 0;
  let frame = 0, lastTime = 0, live = false, modelReady = false, logReady = false;
  let liveDisplay = null;
  let activePin = 0, readState = '';
  const initial = '选择一段记录，查看触摸手势触发的舵机动作。';

  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const n=Math.hypot(...a)||1; return a.map(v=>v/n); };
  const camera = unit([0.62,-1,0.42]);
  const right = unit(cross([0,0,1],camera));
  const up = cross(camera,right);
  const sun = unit([0.28,-0.64,0.91]);
  const styles = {
    base:['fixed','#747d86'], yaw_servo:['fixed','#438e89'], yaw_hub:['turn','#53968e'],
    yoke:['turn','#59717e'], pitch_servo:['turn','#c48460'], ear_pads:['nod','#9d674a'],
    helmet:['nod','#e8b576'], core:['nod','#737774'], display:['nod','#364448'], eyes:['nod','#aad9dd']
  };

  function addGroup(name, vertices, faces) {
    const [motion,hex] = styles[name];
    const rgb = hex.slice(1).match(/../g).map(n=>parseInt(n,16));
    // A small palette avoids allocating a color string for every STL triangle on every frame.
    const palette = Array.from({length:48}, (_,i)=>'rgb('+rgb.map(v=>Math.round(v*(.60+.50*i/47))).join(',')+')');
    const triangles = faces.map(([a,b,c])=>({
      a,b,c, normal:unit(cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a])))
    }));
    groups.push({name,motion,palette,vertices,triangles});
  }
  function readSTL(name,buffer) {
    const data=new DataView(buffer), count=data.getUint32(80,true);
    if (buffer.byteLength!==84+50*count) throw Error('STL 文件不完整');
    const vertices=[], faces=[], indices=new Map();
    for (let i=0;i<count;i++) {
      const f=[];
      for (let k=0;k<3;k++) {
        const off=96+50*i+12*k;
        const v=[0,1,2].map(a=>data.getFloat32(off+a*4,true));
        const key=v.join(',');
        if (!indices.has(key)) {
          indices.set(key,vertices.length);
          vertices.push([v[0]-.1,v[1]+2.1,v[2]+pitchHeight-18.5]);
        }
        f.push(indices.get(key));
      }
      faces.push(f);
    }
    addGroup(name,vertices,faces);
  }
  function loadTexture(which, name) {
    const img=new Image();
    img.onload=()=>{textures[which]=img; queue();};
    img.src='capture-original-'+name+'.png';
  }
  function draw() {
    const w=view.clientWidth,h=view.clientHeight;
    if (!ctx || !w || !h) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if (view.width!==Math.round(w*dpr) || view.height!==Math.round(h*dpr)) {
      view.width=Math.round(w*dpr); view.height=Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#faf9f5';ctx.fillRect(0,0,w,h);
    if (!modelReady) return;
    const cosP=Math.cos(pitch*Math.PI/180),sinP=Math.sin(pitch*Math.PI/180);
    const cosY=Math.cos(yaw*Math.PI/180),sinY=Math.sin(yaw*Math.PI/180);
    function transform(v,motion,normal=false) {
      let [x,y,z]=v;
      if (motion==='nod') {
        const dz=normal?z:z-pitchHeight;
        const next=y*cosP-dz*sinP;
        z=y*sinP+dz*cosP+(normal?0:pitchHeight);y=next;
      }
      if (motion!=='fixed') {
        const next=x*cosY-y*sinY;y=x*sinY+y*cosY;x=next;
      }
      return [x,y,z];
    }
    const scale=Math.min(w/115,h/109);
    function project(v) {
      const offset=[v[0]-3,v[1],v[2]-41];
      return [w*.5+scale*dot(offset,right),h*.5-scale*dot(offset,up),dot(v,camera)];
    }
    const rendered=[];
    const useLive=live && liveDisplay;
    const tex=useLive||textures[mood]||textures[0];
    for (const g of groups) {
      if(tex && g.name==='eyes') continue;
      const pts=g.vertices.map(v=>project(transform(v,g.motion)));
      for (const t of g.triangles) {
        if(tex && g.name==='display' && t.normal[1]<-.98) continue;
        const n=transform(t.normal,g.motion,true);
        if(dot(n,camera)<.002) continue;
        const a=pts[t.a],b=pts[t.b],c=pts[t.c];
        const light=Math.max(0,Math.min(47,Math.round(47*dot(n,sun))));
        rendered.push({a,b,c,color:g.palette[light],depth:(a[2]+b[2]+c[2])/3});
      }
    }
    if (tex) {
      // The real 128 × 64 OLED image occupies the 640 × 320 viewport in the QEMU captures.
      const pts=[[-12.6,-10.4,69.3],[12.4,-10.4,69.3],[-12.6,-10.4,52.3]].map(p=>project(transform(p,'nod')));
      rendered.push({texture:tex,pts,depth:(pts[1][2]+pts[2][2])*.5+.02});
    }
    rendered.sort((a,b)=>a.depth-b.depth);
    ctx.lineWidth=.48;ctx.lineJoin='round';
    for (const p of rendered) {
      if (p.texture) {
        const [a,b,c]=p.pts;
        ctx.save();ctx.transform(b[0]-a[0],b[1]-a[1],c[0]-a[0],c[1]-a[1],a[0],a[1]);
        ctx.fillStyle='#253235';ctx.fillRect(0,0,1,1);
        if(useLive) ctx.drawImage(p.texture,.06,.16,.88,.66);
        else ctx.drawImage(p.texture,64,78,640,320,.06,.16,.88,.66);
        ctx.restore();continue;
      }
      ctx.fillStyle=p.color;ctx.strokeStyle=p.color;ctx.beginPath();ctx.moveTo(p.a[0],p.a[1]);
      ctx.lineTo(p.b[0],p.b[1]);ctx.lineTo(p.c[0],p.c[1]);ctx.closePath();ctx.fill();ctx.stroke();
    }
    function axis(a,b,color,width) {
      const p=project(a),q=project(b);
      ctx.strokeStyle=color;ctx.lineWidth=width;
      ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(q[0],q[1],2.3,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();
    }
    if (activePin!==6) axis(transform([-37,0,pitchHeight],'turn'),transform([57,0,pitchHeight],'turn'),'#8c452e',activePin===5?2:1.4);
    if (activePin!==5) axis([0,0,-2],[0,0,37],'#17645c',activePin===6?2:1.4);
  }
  function step(t) {
    const dt=lastTime?Math.max(0,t-lastTime):16; lastTime=t;frame=0;
    // The visual transition is illustrative. Servo target timing comes from the recorded firmware.
    const gain=reduced.matches?1:1-Math.exp(-Math.min(150,dt)/48);
    pitch+=(targetPitch-pitch)*gain;yaw+=(targetYaw-yaw)*gain;
    if(Math.abs(pitch-targetPitch)<.03) pitch=targetPitch;
    if(Math.abs(yaw-targetYaw)<.03) yaw=targetYaw;
    draw();
    if(pitch!==targetPitch || yaw!==targetYaw) queue(); else lastTime=0;
  }
  function queue() {if(!frame) frame=requestAnimationFrame(step);}
  function pulse(pin,us) {
    if(!(pin in values) || !Number.isFinite(us)) return;
    values[pin].textContent=us+' µs';
    if(pin===5) targetPitch=Math.max(-12,Math.min(12,(us-1500)*12/80));
    if(pin===6) targetYaw=Math.max(-18,Math.min(18,(us-1500)*18/100));
    if(us!==1500) activePin=pin;
    queue();
  }
  function stop() {
    for(const t of timers) clearTimeout(t);
    timers.clear(); mood=0;activePin=0;pulse(5,1500);pulse(6,1500);
    nod.setAttribute('aria-pressed','false');shake.setAttribute('aria-pressed','false');
  }
  function setRecord(text) {status.textContent=text;}
  function controls() {
    nod.disabled=shake.disabled=live||!modelReady||!logReady;
    center.disabled=live||!modelReady;
  }
  function replay(which) {
    if(live||!logReady) return;
    stop();
    const start=events.findIndex(e=>e.mood===which);
    const end=events.findIndex((e,i)=>i>start && e.mood===0);
    if(start<0 || end<0) return;
    const name=which===1?'点头':'摇头';
    (which===1?nod:shake).setAttribute('aria-pressed','true');
    const play=e=>{
      if(e.pin) {
        pulse(e.pin,e.us);setRecord('固件记录　t = '+e.t+' ms　·　GPIO'+e.pin+' → '+e.us+' µs');
      } else {
        mood=e.mood;queue();
        if(!mood) {stop();setRecord(name+'回放结束，双轴在中位。');}
      }
    };
    const first=events[start].t;
    for(const e of events.slice(start,end+1)) {
      if(e.t===first) play(e);
      else {
        const timer=setTimeout(()=>{timers.delete(timer);play(e);},e.t-first);
        timers.add(timer);
      }
    }
  }
  nod.onclick=()=>replay(1);shake.onclick=()=>replay(5);
  center.onclick=()=>{stop();setRecord(readState || initial);};
  window.addEventListener('tobi-servo-target',e=>{const d=e.detail||{};if(live) pulse(Number(d.pin),Number(d.pulseUs));});
  window.addEventListener('tobi-oled-frame',e=>{if(live && e.detail?.canvas){liveDisplay=e.detail.canvas;queue();}});
  window.addEventListener('tobi-mood',e=>{if(live){mood=Number(e.detail?.mood)||0;queue();}});
  window.addEventListener('tobi-live-state',e=>{
    live=Boolean(e.detail?.active); liveDisplay=null;stop();controls();
    setRecord(live?'模型正在接收实时固件信号。':(readState||initial));
  });
  window.addEventListener('pagehide',()=>{stop();});
  new ResizeObserver(queue).observe(view);
  async function load() {
    try {
      for(const [name,[v,f]] of Object.entries(neckParts)) addGroup(name,v,f);
      await Promise.all([['helmet','Helmet1.stl'],['core','Core%20.stl']].map(async([name,file])=>{
        const res=await fetch('../materials/'+file);if(!res.ok) throw Error();
        readSTL(name,await res.arrayBuffer());
      }));
      modelReady=true;queue();controls();
      for (const [which,name] of [[0,'default'],[1,'happy'],[5,'crying']]) loadTexture(which,name);
    } catch {
      readState='头盔模型载入失败。请从课程网站打开此页，或下载 OpenSCAD 源码查看。';
      setRecord(readState);return;
    }
    try {
      const res=await fetch('../materials/head_motion-serial.txt');if(!res.ok) throw Error();
      for(const line of (await res.text()).split(/\r?\n/)) {
        const m=line.match(/^MOOD=(\d+) t=(\d+)/),p=line.match(/^HEAD GPIO([56])=(\d+)us t=(\d+)/);
        if(m) events.push({mood:Number(m[1]),t:Number(m[2])});
        if(p) events.push({pin:Number(p[1]),us:Number(p[2]),t:Number(p[3])});
      }
      if(![1,5].every(n=>events.some(e=>e.mood===n)) || !events.some(e=>e.us!==undefined && e.us!==1500)) throw Error();
      logReady=true;controls();if(!live) setRecord(initial);
    } catch {
      readState='没有读到本次固件记录，无法回放。';
      if(!live) setRecord(readState);
    }
  }
  load();
})();
