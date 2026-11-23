// Run the classroom binary in a dedicated Velxio ESP32-C3 session on this computer.
(() => {
  const root = document.getElementById('neck-live');
  if (!root) return;
  root.innerHTML = `<style>
    #neck-live{border-top:1px solid #d2cdc2;margin-top:.35rem;padding:.6rem .8rem .3rem;font:14px/1.45 system-ui,sans-serif;color:#383a34}
    #neck-live .simulation-row{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem .65rem}
    #neck-live button{font:inherit;border:1px solid #aaa69c;border-radius:4px;padding:.32rem .55rem;background:#fff;color:#343b36;cursor:pointer}
    #neck-live button:disabled{opacity:.48;cursor:default}#neck-live [hidden]{display:none!important}
    #neck-live .readouts{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem 1rem;margin-top:.35rem;font-variant-numeric:tabular-nums}
    #neck-live canvas{width:96px;height:48px;background:#10191e;image-rendering:pixelated}
    #neck-live [role=status]{margin:.22rem 0 0}
    #neck-live details{margin:.25rem 0}#neck-live summary{cursor:pointer;text-decoration:underline}
    #neck-live input{max-width:100%;font:inherit}#neck-live small{display:block}
  </style><div class="simulation-row"><button type="button" data-action="connect">运行本机固件</button><span class="simulation-row" data-ui="controls" hidden><button data-action="tap">输入单击</button><button data-action="double">输入双击</button></span><button data-action="stop" hidden>停止仿真</button></div>
  <div data-ui="readouts" class="readouts" hidden><canvas width="128" height="64" aria-label="QEMU 经 I²C 输出的 OLED 实时画面"></canvas><span data-ui="pitch">俯仰 · 等待输出</span><span data-ui="yaw">水平 · 等待输出</span></div>
  <p role="status" data-ui="status">实时模式使用本机 3080 端口的 Velxio。</p>
  <details><summary>运行自己编译的版本</summary><label>选择 ESP32-C3 固件 <input type="file" accept=".bin" data-ui="firmware"></label> <button type="button" data-action="clear" hidden>恢复课程固件</button><small>用课程源码包中的 compile_head_motion.py 生成 .bin。沿用参考程序的 GPIO5、GPIO6 和两路 50 Hz 输出。</small></details>`;
  const get = key => root.querySelector(`[data-ui="${key}"], [data-action="${key}"]`);
  const input = get('firmware');
  function selectFile() {
    get('connect').textContent = input.files.length ? '运行所选固件' : '运行本机固件';
    get('clear').hidden = !input.files.length;
  }
  input.onchange = selectFile;
  get('clear').onclick = () => {input.value = ''; selectFile();};
  if (window.frameElement) {
    const frame = window.frameElement;
    new ResizeObserver(() => requestAnimationFrame(() => {
      const height = Math.ceil(document.body.getBoundingClientRect().height) + 12;
      if (Math.abs(frame.getBoundingClientRect().height - height) > 1) frame.style.height = height+'px';
    })).observe(document.body);
  }
  const canvas = root.querySelector('canvas');
  const display = canvas.getContext('2d');
  const memory = new Uint8Array(1024);
  const image = display.createImageData(128, 64);
  // The SSD1306 library writes windows and then streams columns in horizontal mode.
  const argumentCount = {0x20:1,0x21:2,0x22:2,0x81:1,0x8d:1,0xa8:1,0xd3:1,0xd5:1,0xd9:1,0xda:1,0xdb:1};
  let command, args, x, page, left, right, top, bottom;
  function clearDisplay() {
    memory.fill(0); command = null; args = []; left = x = top = page = 0; right = 127; bottom = 7;
    paint();
  }
  function paint() {
    for (let py = 0; py < 64; py++) {
      for (let px = 0; px < 128; px++) {
        const lit = memory[(py >> 3) * 128 + px] & (1 << (py % 8));
        const i = (py * 128 + px) * 4;
        image.data[i] = lit ? 154 : 7; image.data[i+1] = lit ? 224 : 16;
        image.data[i+2] = lit ? 242 : 21; image.data[i+3] = 255;
      }
    }
    display.putImageData(image, 0, 0);
    window.dispatchEvent(new CustomEvent('tobi-oled-frame', {detail:{canvas}}));
  }
  function oled(bytes) {
    if (!bytes?.length) return;
    for (let i = 1; i < bytes.length; i++) {
      const b = bytes[i];
      if (bytes[0] === 0x00) {
        if (command !== null) {
          args.push(b);
          if (args.length === argumentCount[command]) {
            if (command === 0x21) {left = x = args[0]; right = Math.min(127,args[1]);}
            if (command === 0x22) {top = page = args[0]; bottom = Math.min(7,args[1]);}
            command = null;
          }
        } else if (argumentCount[b]) {command = b; args = [];}
        else if (b >= 0xb0 && b <= 0xb7) page = b - 0xb0;
      } else if (bytes[0] === 0x40) {
        if (page < 8 && x < 128) memory[page * 128 + x] = b;
        if (++x > right) {x = left; if (++page > bottom) {page = top; paint();}}
      }
    }
  }
  let session = null;
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, {detail}));
  function send(s, type, data) {
    if (s.socket?.readyState === WebSocket.OPEN) s.socket.send(JSON.stringify({type, data}));
  }
  function stop(message) {
    const s = session;
    if (!s) return;
    session = null;
    s.abort.abort(); s.timers.forEach(clearTimeout); clearTimeout(s.bootTimer);
    send(s, 'esp32_gpio_in', {pin:10,state:0}); send(s, 'stop_esp32', {});
    s.socket?.close();
    input.disabled = get('clear').disabled = get('connect').disabled = false; get('controls').hidden = true;
    get('stop').hidden = true; get('readouts').hidden = true; get('status').textContent = message;
    emit('tobi-live-state', {active:false});
  }
  function ready(s) {
    clearTimeout(s.bootTimer); s.ready = true;
    send(s, 'esp32_gpio_in', {pin:10,state:0});
    get('controls').hidden = false; get('tap').disabled = false; get('double').disabled = false;
    get('status').textContent = '固件已启动。输入单击或双击，观察屏幕、脉宽与头部动作。';
  }
  function receive(s, raw) {
    if (session !== s) return;
    const {type, data = {}} = JSON.parse(raw);
    if (type === 'error') {stop('Velxio 未能启动这次仿真。请检查本机服务，或使用上方的运行记录。'); return;}
    if (type === 'i2c_transaction' && data.addr === 60) oled(data.data);
    if (type === 'serial_output') {
      s.serial += data.data || '';
      const lines = s.serial.split('\n'); s.serial = lines.pop().slice(-1024);
      for (const line of lines) {
        if (line.includes('TOBI READY') && !s.ready) ready(s);
        const mood = line.match(/MOOD=(\d+)/); if (mood) emit('tobi-mood', {mood:Number(mood[1])});
      }
    }
    // Fixed mapping for the shipped binary: first LEDC allocation is pitch, second is yaw.
    if (type === 'ledc_duty' && [0,1].includes(data.channel) && data.duty_pct >= 6.5 && data.duty_pct <= 8.5) {
      const pitch = data.channel === 0;
      const pulseUs = Math.round(20000 * data.duty_pct / 100);
      get(pitch ? 'pitch' : 'yaw').textContent = `${pitch ? '俯仰 GPIO5' : '水平 GPIO6'} · ${pulseUs} µs`;
      emit('tobi-servo-target', {pin:pitch ? 5 : 6, pulseUs});
    }
  }
  async function start() {
    if (session) return;
    const s = {abort:new AbortController(), timers:[], serial:'', ready:false}; session = s;
    input.disabled = get('clear').disabled = get('connect').disabled = true; get('stop').hidden = false; clearDisplay();
    get('pitch').textContent = '俯仰 · 等待输出'; get('yaw').textContent = '水平 · 等待输出';
    get('readouts').hidden = false; get('status').textContent = '正在本机启动 ESP32-C3 固件…';
    emit('tobi-live-state',{active:true});
    s.bootTimer = setTimeout(()=>{if(session===s) stop('未收到固件启动信号。可检查本机 Velxio 后重试，或使用上方的运行记录。');},35000);
    const unavailable = '无法连接本机 Velxio。可在启动 3080 端口的服务后重试，或使用上方的运行记录。';
    try {
      let firmware = input.files[0];
      if (!firmware) {
        const response = await fetch('../materials/head_motion.bin',{signal:s.abort.signal});
        if (session!==s) return;
        if (!response.ok) {stop('课程固件文件读取失败。请刷新或重新下载课程资料。'); return;}
        firmware = await response.blob();
      }
      if (firmware.size > 8*1024*1024) {stop('文件过大，请选择为 ESP32-C3 编译的 .bin。'); return;}
      const bytes = new Uint8Array(await firmware.arrayBuffer());
      if (session!==s) return;
      if (bytes[0] !== 0xe9 || bytes[12] !== 5 || bytes[13] !== 0 || bytes.length < 0x10000) {stop('文件格式不符，请用配套编译脚本生成 ESP32-C3 的 .bin。'); return;}
      let raw = ''; for(let i=0;i<bytes.length;i+=16384) raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
      if (session!==s) return;
      const id = 'tobi-class-'+(crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'));
      const ws = new WebSocket('ws://127.0.0.1:3080/api/simulation/ws/'+id); s.socket = ws;
      ws.onopen = () => {if(session===s) send(s,'start_esp32',{board:'aitewinrobot-esp32c3-supermini',firmware_b64:btoa(raw),sensors:[{pin:20,sensor_type:'ssd1306',addr:60,bus:0,owner:'oled'}]});};
      ws.onmessage = e => receive(s,e.data);
      ws.onclose = ws.onerror = () => {if(session===s) stop(unavailable);};
    } catch {if(session===s) stop(unavailable);}
  }
  function gesture(twice) {
    const s = session; if (!s?.ready || get('tap').disabled) return;
    get('tap').disabled = get('double').disabled = true;
    const transitions = twice ? [[0,1],[140,0],[240,1],[380,0]] : [[0,1],[140,0]];
    for (const [ms,state] of transitions) s.timers.push(setTimeout(()=>send(s,'esp32_gpio_in',{pin:10,state}),ms));
    s.timers.push(setTimeout(()=>{if(session===s){get('tap').disabled = get('double').disabled = false; s.timers=[];}}, transitions.at(-1)[0]+90));
  }
  get('connect').onclick = start; get('tap').onclick = ()=>gesture(false); get('double').onclick = ()=>gesture(true);
  get('stop').onclick = ()=>stop('实时仿真已停止。'); window.addEventListener('pagehide', ()=>stop('实时仿真已停止。'));
})();
