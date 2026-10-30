(() => {
  const root = document.querySelector('[data-passion]');
  const canvas = document.getElementById('passion-canvas');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('passion-status');
  const mode = root.dataset.passion, W = 640, H = 360;
  const held = new Set(), pressed = new Set();
  let state, frame, last;
  let particles = [];
  const spriteNames = ['ship','enemy','meteor','bird','fish','car','traffic','snake','explorer','crate','floor','star'];
  const sprites = Object.fromEntries(spriteNames.map(name => { const img = new Image(); img.src = 'assets/game-sprites/' + name + '.png'; img.onload = () => { if (state && !state.running) draw(); }; return [name, img]; }));
  function sprite(name,x,y,w,h,fallback) { const image=sprites[name]; if (image.complete && image.naturalWidth) ctx.drawImage(image,x,y,w,h); else rect(x,y,w,h,fallback); }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const random = (a,b) => a + Math.random() * (b-a);
  const hit = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const say = value => { status.textContent = value; };
  const rect = (x,y,w,h,color) => { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); };
  const circle = (x,y,r,color) => { ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); };
  const keyMap = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',' ':'action'};
  function press(name) { if (!held.has(name)) pressed.add(name); held.add(name); }
  function release(name) { held.delete(name); }
  document.onkeydown = event => { const name=keyMap[event.key]; if (!name || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; event.preventDefault(); press(name); };
  document.onkeyup = event => { const name=keyMap[event.key]; if(name) release(name); };
  root.querySelectorAll('[data-control]').forEach(button=>{
    const name=button.dataset.control;
    button.onpointerdown = event => { event.preventDefault(); button.setPointerCapture(event.pointerId); press(name); };
    button.onpointerup = () => release(name);
    button.onpointercancel = () => release(name);
    button.onlostpointercapture = () => release(name);
    button.onclick = event => { if (event.detail === 0) { press(name); setTimeout(()=>release(name),120); } };
  });
  canvas.onpointerdown = event => { if(mode==='flappy'||mode==='runner') { canvas.setPointerCapture(event.pointerId); press('action'); } };
  canvas.onpointerup = () => release('action');
  canvas.onpointercancel = () => release('action');
  canvas.onlostpointercapture = () => release('action');
  window.addEventListener('blur',()=>held.clear());
  function pulse() {
    if (reducedMotion.matches) return;
    canvas.classList.remove('game-impact');
    void canvas.offsetWidth;
    canvas.classList.add('game-impact');
  }
  function end(message) { if (!state.running) return; state.running=false; pulse(); say(message+' Press Start / restart to play again.'); }
  function maze() {
    const cols=15,rows=9,grid=Array.from({length:rows},()=>Array(cols).fill(1));
    function carve(x,y){grid[y][x]=0;const dirs=[[2,0],[-2,0],[0,2],[0,-2]].sort(()=>Math.random()-.5);for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&grid[ny][nx]){grid[y+dy/2][x+dx/2]=0;carve(nx,ny);}}}carve(0,0);return grid;
  }
  function reset() {
    cancelAnimationFrame(frame);held.clear();pressed.clear();particles = [];
    state={running:true,time:0,score:0,spawn:0,player:{x:70,y:260,w:24,h:24},items:[],shots:[],cooldown:0,step:0};
    if(mode==='maze'){state.grid=maze();state.x=0;state.y=0;}
    if(mode==='ocean'){state.player={x:70,y:160,w:24,h:24};state.jellies=Array.from({length:4},(_,i)=>({x:220+i*95,y:random(35,320),w:25,h:25,dy:i%2?80:-90}));state.items=Array.from({length:10},(_,i)=>({x:150+(i%5)*95,y:55+Math.floor(i/5)*230,w:16,h:16}));}
    if(mode==='dodge')state.player={x:300,y:320,w:40,h:18};
    if(mode==='breakout'){state.player={x:275,y:330,w:90,h:12};state.ball={x:320,y:290,vx:165,vy:-180,r:7};state.bricks=Array.from({length:32},(_,i)=>({x:28+(i%8)*74,y:48+Math.floor(i/8)*25,w:66,h:17}));}
    if(mode==='shooter')state.player={x:300,y:318,w:35,h:22};
    if(mode==='platform'){state.player={x:35,y:310,w:22,h:26,vy:0,onGround:true};state.platforms=[{x:0,y:340,w:640,h:20},{x:95,y:280,w:110,h:12},{x:250,y:220,w:110,h:12},{x:400,y:160,w:110,h:12},{x:270,y:100,w:95,h:12},{x:110,y:45,w:100,h:12}];}
    if(mode==='crossing'){state.player={x:300,y:325,w:25,h:25};state.cars=Array.from({length:12},(_,i)=>({x:(i%3)*240-80,y:55+Math.floor(i/3)*65,w:55,h:30,speed:i<6?95:-120}));}
    if(mode==='flappy')state.player={x:100,y:175,w:26,h:26,vy:0};
    if(mode==='runner')state.player={x:90,y:286,w:28,h:34,vy:0,onGround:true};
    if(mode==='relic'){state.room=['########','#......#','#......#','#......#','#......#','#......#','########'];state.hero={x:2,y:1};state.crates=[{x:3,y:2},{x:4,y:2}];state.goals=[{x:3,y:4},{x:4,y:4}];state.moves=0;}
    if(mode==='catch'){state.player={x:275,y:320,w:90,h:20};state.misses=0;}
    if(mode==='race'){state.player={x:300,y:290,w:30,h:48};}
    if(mode==='snake'){state.snake=[{x:5,y:4},{x:4,y:4},{x:3,y:4}];state.direction={x:1,y:0};state.next={x:1,y:0};state.apple={x:12,y:4};}
    last=performance.now();say('Game started. Good luck!');frame=requestAnimationFrame(tick);
  }
  function tick(now) {
    if(!state.running)return;
    const dt=Math.min((now-last)/1000,.04);last=now;state.time+=dt;state.spawn+=dt;state.cooldown=Math.max(0,state.cooldown-dt);
    const p=state.player;
    const previousScore = state.score;
    if(mode==='maze'){
      if(state.cooldown===0){let dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0),dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);let nx=state.x+dx,ny=state.y+dy;if((dx||dy)&&nx>=0&&nx<15&&ny>=0&&ny<9&&!state.grid[ny][nx]){state.x=nx;state.y=ny;state.cooldown=.12;}if(state.x===14&&state.y===8)end('You escaped the maze!');}
    }
    if(mode==='ocean'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*180*dt));p.y=Math.max(0,Math.min(H-p.h,p.y+((held.has('down')?1:0)-(held.has('up')?1:0))*180*dt));
      state.jellies.forEach(j=>{j.y+=j.dy*dt;if(j.y<0||j.y>H-j.h)j.dy*=-1;if(hit(p,j))end('A jellyfish caught you.');});state.items=state.items.filter(item=>{if(hit(p,item)){state.score++;say('Treasures collected: '+state.score+' / 10.');return false;}return true;});if(state.score===10)end('You collected all ten treasures!');
    }
    if(mode==='dodge'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*280*dt));if(state.spawn>.45){state.spawn=0;state.items.push({x:random(0,610),y:-25,w:24,h:24,vy:random(130,240)});}state.items.forEach(m=>{m.y+=m.vy*dt;if(hit(p,m))end('A meteor hit your ship.');});state.items=state.items.filter(m=>m.y<H);if(state.time>=30)end('You survived the meteor storm!');
    }
    if(mode==='breakout'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*360*dt));let b=state.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<7||b.x>633)b.vx*=-1;if(b.y<7)b.vy=Math.abs(b.vy);if(b.vy>0&&hit({x:b.x-7,y:b.y-7,w:14,h:14},p)){b.y=p.y-7;b.vy=-Math.abs(b.vy);b.vx=(b.x-(p.x+p.w/2))*4;}state.bricks=state.bricks.filter(brick=>{if(hit({x:b.x-7,y:b.y-7,w:14,h:14},brick)){b.vy*=-1;state.score++;return false;}return true;});if(!state.bricks.length)end('All bricks cleared!');if(b.y>H+10)end('The ball slipped past the paddle.');
    }
    if(mode==='shooter'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*260*dt));if((held.has('action')||pressed.has('up'))&&state.cooldown===0){state.shots.push({x:p.x+15,y:p.y,w:5,h:14});state.cooldown=.22;}if(state.spawn>.75){state.spawn=0;state.items.push({x:random(10,600),y:-25,w:28,h:24});}state.shots.forEach(a=>a.y-=350*dt);state.items.forEach(e=>e.y+=90*dt);for(const e of state.items){for(const a of state.shots)if(!e.dead&&!a.dead&&hit(e,a)){e.dead=true;a.dead=true;state.score++;}if(!e.dead&&(hit(p,e)||e.y>H))end('An enemy got through.');}state.items=state.items.filter(e=>!e.dead);state.shots=state.shots.filter(a=>!a.dead&&a.y> -20);if(state.score>=20)end('You defended the stars!');
    }
    if(mode==='platform'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*200*dt));if((pressed.has('action')||pressed.has('up'))&&p.onGround){p.vy=-410;p.onGround=false;}let old=p.y+p.h;p.vy+=900*dt;p.y+=p.vy*dt;p.onGround=false;for(const pl of state.platforms){if(p.vy>=0&&old<=pl.y&&p.y+p.h>=pl.y&&p.x+p.w>pl.x&&p.x<pl.x+pl.w){p.y=pl.y-p.h;p.vy=0;p.onGround=true;}}if(hit(p,{x:150,y:12,w:25,h:25}))end('You reached the star!');
    }
    if(mode==='crossing'){
      if(state.cooldown===0){let dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0),dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);if(dx||dy){p.x=Math.max(0,Math.min(W-p.w,p.x+dx*40));p.y=Math.max(0,Math.min(H-p.h,p.y+dy*40));state.cooldown=.15;}}state.cars.forEach(c=>{c.x+=c.speed*dt;if(c.x>W)c.x=-c.w;if(c.x< -c.w)c.x=W;if(hit(p,c))end('A car caught you.');});if(p.y<35)end('You made it across!');
    }
    if(mode==='flappy'){
      if(pressed.has('action')||pressed.has('up'))p.vy=-260;p.vy+=700*dt;p.y+=p.vy*dt;if(state.spawn>1.8){state.spawn=0;state.items.push({x:650,gap:random(35,185),scored:false});}for(const pipe of state.items){pipe.x-=155*dt;if(!pipe.scored&&pipe.x+54<p.x){pipe.scored=true;state.score++;say('Score: '+state.score+'.');}if(p.x+p.w>pipe.x&&p.x<pipe.x+54&&(p.y<pipe.gap||p.y+p.h>pipe.gap+140))end('Flight over. Score: '+state.score+'.');}state.items=state.items.filter(a=>a.x> -60);if(p.y<0||p.y+p.h>H)end('Flight over. Score: '+state.score+'.');
    }
    if(mode==='runner'){
      if((pressed.has('action')||pressed.has('up'))&&p.onGround){p.vy=-390;p.onGround=false;}p.vy+=1000*dt;p.y+=p.vy*dt;if(p.y>=286){p.y=286;p.vy=0;p.onGround=true;}if(state.spawn>1.3){state.spawn=0;state.items.push({x:650,y:random(0,1)>.5?291:300,w:25,h:30});}state.items.forEach(o=>{o.x-=240*dt;if(hit(p,o))end('You hit an obstacle.');});state.items=state.items.filter(o=>o.x> -30);if(state.time>=30)end('You reached the horizon!');
    }
    if(mode==='relic'){
      const dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0),dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);
      if ((dx || dy) && !(dx && dy)) {
        const x=state.hero.x+dx,y=state.hero.y+dy,box=state.crates.find(a=>a.x===x&&a.y===y);
        const wall=(cx,cy)=>!state.room[cy]||state.room[cy][cx]!=='.';
        if (!wall(x,y) && (!box || (!wall(x+dx,y+dy) && !state.crates.some(a=>a.x===x+dx&&a.y===y+dy)))) {
          if(box){box.x+=dx;box.y+=dy;}
          state.hero={x,y};state.moves++;
          const placed=state.goals.filter(goal=>state.crates.some(a=>a.x===goal.x&&a.y===goal.y)).length;
          say('Relics on pedestals: '+placed+' / 2. Moves: '+state.moves+'.');
          if(placed===2)end('Both relics are restored in '+state.moves+' moves!');
        }
      }
    }
    if(mode==='catch'){
      p.x=Math.max(0,Math.min(W-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*300*dt));if(state.spawn>.9){state.spawn=0;state.items.push({x:random(20,600),y:-20,w:20,h:20,vy:random(120,190)});}state.items.forEach(item=>{item.y+=item.vy*dt;if(!item.done&&hit(p,item)){item.done=true;state.score++;say('Stars: '+state.score+' / 10. Missed: '+state.misses+' / 3.');}else if(!item.done&&item.y>H){item.done=true;state.misses++;pulse();say('Missed: '+state.misses+' / 3.');}});state.items=state.items.filter(item=>!item.done);if(state.score>=10)end('You caught ten stars!');else if(state.misses>=3)end('Three stars slipped past.');
    }
    if(mode==='race'){
      p.x=Math.max(155,Math.min(455-p.w,p.x+((held.has('right')?1:0)-(held.has('left')?1:0))*220*dt));if(state.spawn>1.05){state.spawn=0;state.items.push({x:random(160,420),y:-55,w:30,h:48,vy:random(160,220)});}state.items.forEach(car=>{car.y+=car.vy*dt;if(hit(p,car))end('A car crossed your path.');});state.items=state.items.filter(car=>car.y<H+55);if(state.time>=30)end('You reached the finish!');
    }
    if(mode==='snake'){
      let d=state.direction;if(pressed.has('left')&&d.x!==1)state.next={x:-1,y:0};else if(pressed.has('right')&&d.x!==-1)state.next={x:1,y:0};else if(pressed.has('up')&&d.y!==1)state.next={x:0,y:-1};else if(pressed.has('down')&&d.y!==-1)state.next={x:0,y:1};state.step+=dt;if(state.step>=.16){state.step=0;state.direction=state.next;const head={x:state.snake[0].x+state.direction.x,y:state.snake[0].y+state.direction.y};const eating=head.x===state.apple.x&&head.y===state.apple.y;const body=eating?state.snake:state.snake.slice(0,-1);if(head.x<0||head.x>=16||head.y<0||head.y>=9||body.some(a=>a.x===head.x&&a.y===head.y))end('The snake crashed. Score: '+state.score+'.');else{state.snake.unshift(head);if(eating){state.score++;if(state.score>=10)end('Ten apples collected. You win!');else {do{state.apple={x:Math.floor(random(0,16)),y:Math.floor(random(0,9))};}while(state.snake.some(a=>a.x===state.apple.x&&a.y===state.apple.y));}}else state.snake.pop();}}
    }
    if (state.score > previousScore && !reducedMotion.matches) {
      const x = Math.max(20, Math.min(W-20, p.x + p.w / 2));
      const y = Math.max(20, Math.min(H-20, p.y + p.h / 2));
      for (let i=0; i<8; i++) particles.push({x,y,vx:random(-85,85),vy:random(-100,20),life:.5});
    }
    particles.forEach(a=>{a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;});particles=particles.filter(a=>a.life>0);
    pressed.clear();draw();if(state.running)frame=requestAnimationFrame(tick);
  }
  function draw(){
    rect(0,0,W,H,'#f5f0e8');const p=state.player;
    if(mode==='maze'){
      state.grid.forEach((row,y)=>row.forEach((cell,x)=>{if(cell)rect(20+x*40,y*40,40,40,'#252320');else {rect(20+x*40,y*40,40,40,'#efe9de');rect(20+x*40+1,y*40+1,38,38,'#f5f0e8');}}));sprite('star',20+14*40+6,8*40+6,28,28,'#cc785c');sprite('explorer',20+state.x*40+3,state.y*40+3,34,34,'#141413');
    } else if(mode==='ocean'){
      rect(0,0,W,H,'#e8e0d2');for(let i=0;i<8;i++){ctx.strokeStyle='#c9bbab';ctx.beginPath();ctx.arc(i*90+20,175,30,0,Math.PI);ctx.stroke();}state.items.forEach(a=>{circle(a.x+8,a.y+8,8,'#cc785c');circle(a.x+8,a.y+8,3,'#faf9f5');});state.jellies.forEach(j=>{circle(j.x+12,j.y+12,12,'#252320');rect(j.x+5,j.y+18,3,10,'#252320');rect(j.x+17,j.y+18,3,10,'#252320');});sprite('fish',p.x-6,p.y-5,38,34,'#a9583e');
    } else if(mode==='dodge'){
      rect(0,0,W,H,'#181715');for(let i=0;i<30;i++)circle((i*97)%W,(i*43)%H,1,'#a09d96');state.items.forEach(m=>sprite('meteor',m.x-3,m.y-3,30,30,'#cc785c'));sprite('ship',p.x,p.y-12,p.w,32,'#faf9f5');
    } else if(mode==='breakout'){
      state.bricks.forEach((b,i)=>rect(b.x,b.y,b.w,b.h,i%2?'#cc785c':'#252320'));rect(p.x,p.y,p.w,p.h,'#252320');sprite('star',state.ball.x-9,state.ball.y-9,18,18,'#cc785c');
    } else if(mode==='shooter'){
      rect(0,0,W,H,'#181715');for(let i=0;i<30;i++)circle((i*97)%W,(i*43+state.time*30)%H,1,'#a09d96');state.items.forEach(e=>sprite('enemy',e.x,e.y,e.w,e.h,'#cc785c'));state.shots.forEach(a=>rect(a.x,a.y,a.w,a.h,'#faf9f5'));sprite('ship',p.x,p.y-8,p.w,p.h+8,'#faf9f5');
    } else if(mode==='platform'){
      state.platforms.forEach(pl=>rect(pl.x,pl.y,pl.w,pl.h,'#252320'));sprite('star',150,12,25,25,'#cc785c');sprite('explorer',p.x-4,p.y-4,p.w+8,p.h+8,'#cc785c');
    } else if(mode==='crossing'){
      rect(0,40,W,260,'#252320');for(let y=100;y<300;y+=65)for(let x=0;x<W;x+=70)rect(x,y,35,2,'#a09d96');state.cars.forEach(c=>sprite('traffic',c.x,c.y,c.w,c.h,'#cc785c'));sprite('explorer',p.x,p.y,p.w,p.h,'#141413');
    } else if(mode==='flappy'){
      for(let i=0;i<6;i++){ctx.fillStyle='#e8e0d2';ctx.beginPath();ctx.ellipse(((i*150-state.time*25)%800+800)%800-70,60+(i%2)*40,36,10,0,0,Math.PI*2);ctx.fill();}state.items.forEach(a=>{rect(a.x,0,54,a.gap,'#252320');rect(a.x,a.gap+140,54,H-a.gap-140,'#252320');});sprite('bird',p.x-3,p.y-3,p.w+6,p.h+6,'#cc785c');
    } else if(mode==='runner'){
      rect(0,320,W,40,'#e8e0d2');for(let i=0;i<6;i++)circle((i*160-state.time*60+1000)%800-50,90,22,'#e8e0d2');state.items.forEach(o=>rect(o.x,o.y,o.w,o.h,'#252320'));sprite('explorer',p.x-4,p.y-4,p.w+8,p.h+8,'#cc785c');
    } else if(mode==='relic'){
      rect(0,0,W,H,'#181715');const tile=44,ox=144,oy=26;
      state.room.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='#'){rect(ox+x*tile,oy+y*tile,tile-1,tile-1,'#3d3d3a');rect(ox+x*tile+5,oy+y*tile+4,tile-10,3,'#6c6a64');}else sprite('floor',ox+x*tile,oy+y*tile,tile,tile,'#e8e0d2');}));
      state.goals.forEach(a=>{circle(ox+a.x*tile+22,oy+a.y*tile+22,14,'#cc785c');circle(ox+a.x*tile+22,oy+a.y*tile+22,8,'#faf9f5');});
      state.crates.forEach(a=>sprite('crate',ox+a.x*tile+3,oy+a.y*tile+3,38,38,'#a9583e'));
      sprite('explorer',ox+state.hero.x*tile+3,oy+state.hero.y*tile+3,38,38,'#cc785c');
    } else if(mode==='catch'){
      rect(0,0,W,H,'#181715');for(let i=0;i<42;i++)circle((i*97)%W,(i*53)%H,i%5===0?2:1,'#a09d96');state.items.forEach(a=>sprite('star',a.x-2,a.y-2,24,24,'#cc785c'));rect(p.x,p.y,p.w,p.h,'#cc785c');rect(p.x+8,p.y+4,p.w-16,5,'#faf9f5');
    } else if(mode==='race'){
      rect(0,0,W,H,'#e8e0d2');rect(145,0,310,H,'#252320');for(let y=-60;y<H;y+=70){rect(295,(y+state.time*140)%420-40,5,35,'#a09d96');rect(345,(y+state.time*140)%420-40,5,35,'#a09d96');}state.items.forEach(a=>sprite('traffic',a.x,a.y,a.w,a.h,'#a09d96'));sprite('car',p.x,p.y,p.w,p.h,'#cc785c');
    } else if(mode==='snake'){
      for(let x=0;x<16;x++)for(let y=0;y<9;y++)if((x+y)%2===0)rect(x*40,y*40,40,40,'#efe9de');state.snake.forEach((a,i)=>rect(a.x*40+3,a.y*40+3,34,34,i?'#a9583e':'#252320'));sprite('star',state.apple.x*40+6,state.apple.y*40+6,28,28,'#cc785c');sprite('snake',state.snake[0].x*40+3,state.snake[0].y*40+3,34,34,'#252320');
    }
    particles.forEach(a=>{ctx.globalAlpha=Math.min(1,a.life*2);circle(a.x,a.y,3,'#cc785c');});ctx.globalAlpha=1;
    ctx.font='500 16px sans-serif';ctx.fillStyle=['dodge','shooter'].includes(mode)?'#faf9f5':'#141413';const label=mode==='dodge'||mode==='runner'||mode==='race'?'TIME '+Math.max(0,30-Math.floor(state.time)):['snake','flappy','shooter','ocean','breakout','catch'].includes(mode)?'SCORE '+state.score:'';if(label)ctx.fillText(label,12,22);
  }
  const controls = {maze:['up','down','left','right'],ocean:['up','down','left','right'],dodge:['left','right'],breakout:['left','right'],shooter:['left','right','action'],platform:['left','right','action'],crossing:['up','down','left','right'],flappy:['action'],runner:['action'],snake:['up','down','left','right'],relic:['up','down','left','right'],catch:['left','right'],race:['left','right']};
  root.querySelectorAll('[data-control]').forEach(button => { if (!controls[mode].includes(button.dataset.control)) button.hidden = true; });
  root.querySelector('[data-action="start"]').onclick=() => { reset(); canvas.focus({preventScroll:true}); };
  reset();cancelAnimationFrame(frame);state.running=false;say('Press Start / restart to begin.');draw();
})();
