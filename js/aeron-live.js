(() => {
"use strict";
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
const DW = 1491, DH = 1055;           // reference frame (design) space
const STORY = 15.0;                   // seconds until the title lockup has formed
const T_IMPACT = 6.40;
const PHASES = [[0,'Darkness'],[2.7,'Aeron enters'],[3.95,'First push'],[4.6,'Intensity builds'],[5.55,'Final push'],[6.36,'Impact'],[6.62,'Settle'],[8.2,'Graphic system'],[12.9,'Title']];

// Rim of the bright membrane in field.png (hand-measured from the supplied reference, design px)
const B0_PTS = [[0,1135],[50,1090],[100,1055],[150,1020],[200,1012],[250,1025],[300,1045],[350,1055],[400,1060],[450,1050],[500,1025],[550,1010],[600,1015],[650,1040],[700,1070],[750,1090],[800,1100],[850,1100],[900,1095],[950,1085],[1000,1080],[1055,1080]];
const B0_MEAN = 1056;
const GOG = { s:1.25, tx:2, ty:-46, pivot:[700,440] };   // exact landing placement of the supplied PNG on the final reference

// ---------- math helpers ----------
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function bez(x1,y1,x2,y2){ // cubic-bezier easing
  const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const sx=t=>((ax*t+bx)*t+cx)*t, sy=t=>((ay*t+by)*t+cy)*t, dx=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{ if(x<=0)return 0; if(x>=1)return 1; let t=x; for(let i=0;i<8;i++){const e=sx(t)-x,d=dx(t); if(Math.abs(e)<1e-6)break; if(Math.abs(d)<1e-6)break; t-=e/d;} t=clamp(t,0,1); return sy(t); };
}
const E = { push:bez(.52,0,.12,1), hard:bez(.78,0,.22,1), soft:bez(.45,0,.55,1), out:bez(.2,.7,.3,1), draw:bez(.62,0,.34,1), slam:bez(.6,0,.12,1) };
const seg=(t,a,b,v0,v1,ease)=>lerp(v0,v1,ease(clamp((t-a)/(b-a),0,1)));
function b0At(y){ y = y<0 ? -y : (y>DH ? 2*DH-y : y); y=clamp(y,0,DH);
  for(let i=1;i<B0_PTS.length;i++){ if(y<=B0_PTS[i][0]){ const [ya,xa]=B0_PTS[i-1],[yb,xb]=B0_PTS[i]; const u=(y-ya)/(yb-ya); const s=u*u*(3-2*u); return lerp(xa,xb,s);} }
  return B0_PTS[B0_PTS.length-1][1]; }

// ---------- view (design -> screen) ----------
const view = { k:1, ox:0, oy:0, L:0, R:DW, T:0, Bt:DH, W:1, H:1 };
function layout(W,H){
  const k = Math.max(H/DH, W/1750);
  const Wd = W/k, Hd = H/k;
  const R = Math.min(1488, 740 + Wd/2);
  const L = R - Wd;
  const T = 490 - Hd/2;
  Object.assign(view,{k,W,H,L,R,T,Bt:T+Hd,ox:-L*k,oy:-T*k});
}

// ---------- story: every animated value as a pure function of time ----------
function story(t){
  const s = {};
  const dxOff = view.R + 60 - (GOG.tx + GOG.s*510);
  // goggles travel (dx = offset from final landing position, design px)
  let dx;
  if (t < 2.7) dx = dxOff;
  else if (t < 4.05) dx = seg(t,2.7,4.05,dxOff,368,E.push);
  else if (t < 4.6) dx = seg(t,4.05,4.6,368,384,E.soft);
  else if (t < 5.55) dx = seg(t,4.6,5.55,384,350,E.soft);
  else if (t < 6.02) dx = seg(t,5.55,6.02,350,366,E.out) + Math.sin(t*140)*1.1*sstep(5.6,6.0,t);
  else if (t < T_IMPACT) dx = seg(t,6.02,T_IMPACT,366,-24,E.slam);
  else { const u=t-T_IMPACT; dx = -24*Math.exp(-5.2*u)*Math.cos(8.4*u); }
  // barely perceptible float (only once the product has arrived)
  const fl = sstep(4.0,5.0,t)*0.55 + sstep(6.6,8.0,t)*0.45;
  s.dx = dx + fl*1.6*Math.sin(t*0.55+2.0);
  s.dy = fl*(2.6*Math.sin(t*0.8) + 1.1*Math.sin(t*1.9+1.0));
  s.rot = fl*0.0022*Math.sin(t*0.7) ;
  s.scl = 1 + fl*0.0035*Math.sin(t*0.5+0.4);
  // membrane rest position relative to the reference rim (bright side expands after the product)
  const off0 = view.R + 140 - B0_MEAN;
  let off;
  if (t < 2.95) off = off0;
  else if (t < 4.9) off = seg(t,2.95,4.9,off0,118,E.push);
  else if (t < 6.05) off = seg(t,4.9,6.05,118,96,E.soft);
  else if (t < 6.62) off = seg(t,6.05,6.62,96,-286,E.slam);
  else off = -286 + 9*Math.sin((t-6.62)*0.33);
  s.restOff = off;
  // energy of the field
  let en = 0.62;
  en = seg(t,2.5,4.1,en,0.66,E.soft);
  if (t>4.1) en = seg(t,4.1,5.6,0.5,0.72,E.soft);
  if (t>5.6) en = seg(t,5.6,6.3,0.72,0.88,E.soft);
  if (t>6.3) en = seg(t,6.3,8.0,0.88,0.92,E.soft);
  const imT = t - T_IMPACT;
  const spike = imT>=0 ? Math.exp(-imT*2.6) : Math.exp(-(imT*imT)/(2*0.05*0.05))*0.35;
  s.energy = en + 0.9*spike;
  s.imT = imT;
  s.fade = E.out(clamp(t/1.6,0,1));
  s.circle = E.draw(clamp((t-8.2)/1.75,0,1));
  s.line = E.draw(clamp((t-9.55)/1.2,0,1));
  s.pres = sstep(420,40,dx);
  return s;
}

// ---------- title lockup: AERON ----------
const T_TITLE = 13.4;                                  // filled word lands at T_TITLE+0.16
const LOCK = { ox:110.7, oy:424.1, s:0.5344 };         // supplied type PNG placed as in the reference (design px)
const LK = [736,240], FILL_C=[348,115.5], OUT_C=[436,53], BOT_OFF=[-133,140];
const h1 = n => { const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const POP_COLS = [[.86,.97,.26],[.64,.94,.50],[.93,.99,.52],[.52,.92,.66],[.78,.96,.34]];
const POPS = [];
for(let k=0;k<9;k++){
  const cf = Math.pow(k/8,1.6), top = k%2===0;
  const rx = lerp(-160,1320,h1(k*3.1+.4)), ry = lerp(90,980,h1(k*5.7+1.3));
  const fin = top ? [LOCK.ox+LOCK.s*OUT_C[0], LOCK.oy+LOCK.s*OUT_C[1]] : [LOCK.ox+LOCK.s*(OUT_C[0]+BOT_OFF[0]), LOCK.oy+LOCK.s*(OUT_C[1]+BOT_OFF[1])];
  const cx = lerp(rx,fin[0],cf), cy = lerp(ry,fin[1],cf);
  POPS.push({ t:.27+k*.056, dur:k<7?.05:.034, x:cx, y:cy, top, scl:lerp(.75+h1(k*9.2)*1.9,1,cf), col:POP_COLS[k%POP_COLS.length], pan:clamp((cx-700)/800,-.9,.9), f:2400+h1(k*2.3)*2600 });
}
function outAt(x,y){ return [(x-LOCK.ox)/LOCK.s - OUT_C[0], (y-LOCK.oy)/LOCK.s - OUT_C[1]]; }  // design centre -> outline offset
function title(t){
  const r = t - T_TITLE, S = { fill:[0,0,1,0], fblur:0, outs:[], flash:0, lock:0, vec:1, air:r };
  if (r < -0.6) return S;
  if (r >= 0){
    const u = clamp(r/0.16,0,1), e = 1-Math.pow(1-u,4);
    let off = 950*(1-e); if (r>0.16){ const v=r-0.16; off = -10*Math.exp(-15*v)*Math.cos(27*v); }
    const vel = r<0.16 ? 950*4*Math.pow(1-u,3)/0.16 : 0;
    S.fill = [off/LOCK.s, 0, 1+1.4*(1-e), clamp(r/0.025,0,1)];
    S.fblur = vel/LOCK.s/60*0.85;
  }
  let fl = r>=0.16 ? Math.exp(-(r-0.16)*19)*1.0 : 0;
  fl += r>=0.80 ? Math.exp(-(r-0.80)*22)*0.45 : 0;
  // split: the outlines tear out of the filled word
  if (r>=0.16 && r<0.34){
    const sp=(r-0.16)/0.18, k=1-Math.pow(1-sp,3), a=1-sp;
    const base=[FILL_C[0]-OUT_C[0], FILL_C[1]-OUT_C[1]];
    S.outs.push({off:[base[0]+1150*k, base[1]-420*k], scl:1.1+.5*k, a, col:[.86,.97,.3], blur:sp<.7?60*(1-sp):0});
    S.outs.push({off:[base[0]-1150*k, base[1]+420*k], scl:1.1+.5*k, a, col:[.6,.94,.55], blur:sp<.7?60*(1-sp):0});
  }
  // strobe: outlines pop up around the frame, closing in on their marks
  for(const P of POPS){ if (r>=P.t && r<P.t+P.dur){ const q=(r-P.t)/P.dur; S.outs.push({off:outAt(P.x,P.y), scl:P.scl*(1+.05*q), a:1-.35*q, col:P.col, blur:8}); fl += .12*(1-(r-P.t)/P.dur); } }
  // form: both snap onto their marks and turn white
  if (r>=0.74){
    const u=clamp((r-0.74)/0.06,0,1), e=1-Math.pow(1-u,3);
    const lt=POPS[8], lb=POPS[7], ot=outAt(lt.x,lt.y), ob=outAt(lb.x,lb.y);
    const cw=(c)=>[lerp(c[0],1,e),lerp(c[1],1,e),lerp(c[2],1,e)];
    S.outs.push({off:[lerp(ot[0],0,e),lerp(ot[1],0,e)], scl:lerp(lt.scl,1,e), a:1, col:cw([.86,.97,.3]), blur:(1-e)*30});
    S.outs.push({off:[lerp(ob[0],BOT_OFF[0],e),lerp(ob[1],BOT_OFF[1],e)], scl:lerp(lb.scl,1,e), a:1, col:cw([.6,.94,.55]), blur:(1-e)*30});
    const ec = Math.exp(-(r-0.80)*5)*0.32*(r>0.8?1:0);
    if (ec>0.01){ S.outs.push({off:[14,0],scl:1,a:ec,col:[.8,.97,.4],blur:0}); S.outs.push({off:[BOT_OFF[0]-14,BOT_OFF[1]],scl:1,a:ec,col:[.55,.93,.6],blur:0}); }
  }
  S.flash = clamp(fl,0,1);
  S.lock = sstep(0.83,0.98,r); S.vec = 1-S.lock;
  return S;
}

// ---------- membrane (1D elastic sheet, x per row) ----------
const N=256, Y0=-700, HY=(DH+1400)/(N-1);
const M = { x:new Float32Array(N), v:new Float32Array(N), c:new Float32Array(N), b0:new Float32Array(N), t:0, prevGx:null };
for(let i=0;i<N;i++) M.b0[i]=b0At(Y0+i*HY);
let gogLeft = null, gogW=1222, gogH=864;
const kR=58, kT=2000000, damp=8.5, INSET=18, DT=1/240;
function gogPose(st){ return { tx:GOG.tx+st.dx, ty:GOG.ty+st.dy, s:GOG.s*st.scl, rot:st.rot }; }
function simReset(){ const st=story(0); for(let i=0;i<N;i++){ M.x[i]=M.b0[i]+st.restOff; M.v[i]=0; M.c[i]=0; } M.t=0; M.prevGx=null; }
function simTo(T){
  if (T < M.t - 1e-6) simReset();
  while (M.t + DT <= T + 1e-9){
    const st = story(M.t+DT), p = gogPose(st);
    const gxv = M.prevGx===null ? 0 : (p.tx - M.prevGx)/DT; M.prevGx = p.tx;
    const x=M.x, v=M.v, h2=HY*HY;
    for(let i=0;i<N;i++){
      const xl = x[i>0?i-1:i], xr = x[i<N-1?i+1:i];
      const a = kR*(M.b0[i]+st.restOff - x[i]) + kT*(xl+xr-2*x[i])/h2 - damp*v[i];
      v[i]+=a*DT;
    }
    for(let i=0;i<N;i++){
      x[i]+=v[i]*DT;
      let hit=false;
      if (gogLeft){
        const qy=(Y0+i*HY - p.ty)/p.s;
        if (qy>=0 && qy<gogH-1){ const r0=Math.floor(qy), l0=gogLeft[r0], l1=gogLeft[r0+1];
          if (l0>=0 && l1>=0){ const G = p.tx + p.s*lerp(l0,l1,qy-r0) + INSET;
            if (x[i] > G){ x[i]=G; v[i]=Math.min(v[i], gxv); hit=true; } } }
      }
      M.c[i] = hit ? 1 : M.c[i]*0.985;
    }
    M.t += DT;
  }
}

// ---------- WebGL ----------
const canvas = document.getElementById('ae-stage');
const gl = canvas.getContext('webgl2',{antialias:false,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:RENDER,powerPreference:'high-performance'});
if(!gl){ document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:auto 16px 16px;color:#cfe">This animation needs WebGL2. Open it in a current version of Chrome, Safari, Firefox or Edge.</p>'); return; }
gl.getExtension('EXT_color_buffer_float');

const VS=`#version 300 es
in vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;
const FS=`#version 300 es
precision highp float;
uniform sampler2D uField, uGog, uMem;
uniform vec2 uRes; uniform vec3 uView; uniform vec2 uLR;
uniform vec3 uPh;   // energy-driven phases, integrated on the CPU so speed changes never jump
uniform float uTime, uEnergy, uImpT, uFade, uCirc, uLine, uPres, uVel;
uniform vec4 uPose; uniform vec2 uPivot, uGogSize, uHit;
uniform sampler2D uTF, uTO, uTL;
uniform vec3 uLk; uniform vec4 uFill; uniform float uFBlur, uFlash, uLockA, uVecA, uAirT;
uniform vec4 uOA[12]; uniform vec4 uOB[12]; uniform int uON;
out vec4 o;
const float DW=1491., DH=1055., NN=256., Y0=-700., HY=${HY.toFixed(6)};
const float TAU=6.2831853;
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
vec2 vor(vec2 p){ vec2 n=floor(p), f=fract(p); float d1=9., d2=9.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(i,j); vec2 oo=vec2(h21(n+g),h21(n+g+19.7)); vec2 r=g+oo-f; float d=dot(r,r); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d; }
  return vec2(sqrt(d1), sqrt(d2)-sqrt(d1)); }
vec4 mem(float y){ float f=clamp((y-Y0)/HY,0.,NN-1.001); float i=floor(f);
  return mix(texelFetch(uMem,ivec2(int(i),0),0), texelFetch(uMem,ivec2(int(i)+1,0),0), f-i); }
uniform float uRay;
const vec3 PAPER=vec3(.937,.937,.925), BLUE=vec3(.055,.055,.052);
vec3 ink(vec3 c){ float w=min(c.r,min(c.g,c.b)); return mix(c*vec3(.5,.56,.2), vec3(.055,.055,.05), w*w); }
float mirY(float y){ return y<0. ? -y : (y>DH ? 2.*DH-y : y); }
// maps design point to the reference field so the texture's rim lands on the live membrane
vec3 field(vec2 p, float B, float B0){
  float xs = p.x<B ? B0*min(abs((p.x-uLR.x)/max(B-uLR.x,1.)),1.) : mix(B0, DW-1., clamp((p.x-B)/max(uLR.y-B,1.),0.,1.));
  vec2 uv = vec2(xs, mirY(p.y))/vec2(DW,DH);
  return texture(uField, uv).rgb;
}
vec3 fieldFlow(vec2 p, float B, float B0, float u){
  float wd = smoothstep(30., 260., u);
  vec2 dir = normalize(vec2(-1., (p.y-520.)/1100.));
  vec2 wob = (vec2(vn(p*.004+uTime*.05), vn(p*.004-uTime*.04+9.))-.5)*14.*wd;
  float sp = .09 + .12*clamp(uEnergy,0.,1.4);
  float ph = fract(uPh.z), ph2 = fract(uPh.z+.5);
  float L = 110.;
  vec3 a = field(p - dir*(ph -.5)*L*wd + wob, B, B0);
  vec3 b = field(p - dir*(ph2-.5)*L*wd + wob, B, B0);
  float w = abs(ph*2.-1.);
  return mix(a,b,w);
}
vec3 rays(vec2 p, float u){
  vec3 acc=vec3(0.);
  float en=clamp(uEnergy,0.,2.);
  for(int i=0;i<10;i++){
    float fi=float(i), h1=h11(fi*7.13+.3), h2=h11(fi*3.71+1.9), h3=h11(fi*11.3+2.7);
    float y0 = 80. + fi*96. + (h1-.5)*70.;
    float slope = (y0-520.)/520.*.34 + (h2-.5)*.14;
    float yc = y0 + slope*u + (h3-.5)*.00032*u*u + 16.*sin(u*.0042 + uTime*(.22+h1*.25) + fi*1.7);
    float w = 1.6 + u*.010;
    float dy = p.y-yc;
    float core = exp(-dy*dy/(w*w));
    float halo = exp(-abs(dy)/(w*7.));
    float P = 650.+h3*650.;
    float s = fract((uPh.x*(120.+h2*110.) - u)/P + h1);
    float trail = exp(-s*2.6)*.6 + .14;
    float along = smoothstep(0.,80.,u)*exp(-u/(420.+h2*700.));
    float vis = smoothstep(fi/10.-.12, fi/10.+.2, en*1.05+.12);
    acc += vec3(.30,.78,1.)*(core*.7+halo*.09)*trail*along*vis*(.45+.55*h3);
  }
  return acc*(.16+.46*en);
}
vec3 sparkle(vec2 p, float u){
  vec3 acc=vec3(0.);
  for(int L=0;L<2;L++){
    float fl=float(L), cs = 10. + fl*9.;
    vec2 drift = vec2(-uPh.y*(7.+fl*13.), sin(uTime*.23+fl)*5.);
    vec2 q=(p-drift)/cs, id=floor(q), f=fract(q)-.5;
    float h=h21(id+fl*37.);
    vec2 off=(vec2(h21(id+3.1),h21(id+7.7))-.5)*.7;
    float d=length((f-off)*cs);
    float dens = .008 + .55*exp(-u/190.)*(.45+.55*clamp(uEnergy,0.,1.5));
    float on = step(h21(id+11.3), dens);
    float sz = .45 + 1.05*h*h;
    float tw = .45+.55*sin(uTime*(1.6+h*5.)+h*50.);
    acc += vec3(.62,.92,1.)*exp(-d*d/(sz*sz))*tw*on*(.35+.65*h);
  }
  return acc*.8*smoothstep(-4.,24.,u);
}
vec2 toGog(vec2 p, vec4 pose){
  vec2 d = p - pose.xy - pose.z*uPivot;
  float c=cos(-pose.w), s=sin(-pose.w);
  d = vec2(c*d.x-s*d.y, s*d.x+c*d.y);
  return uPivot + d/pose.z;
}
vec4 gogAt(vec2 q, float lod){
  if(q.x<0.||q.y<0.||q.x>uGogSize.x||q.y>uGogSize.y) return vec4(0.);
  return textureLod(uGog, q/uGogSize, lod);
}
const vec2 LKS=vec2(736.,240.), FILL_C_=vec2(348.,115.5), OUT_C_=vec2(436.,53.);
vec4 tsamp(sampler2D tx, vec2 q, float lod){ if(q.x<0.||q.y<0.||q.x>LKS.x||q.y>LKS.y) return vec4(0.); return textureLod(tx,q/LKS,lod); }
float segD(vec2 p, vec2 a, vec2 b, out float t){ vec2 pa=p-a, ba=b-a; t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*t); }
void main(){
  vec2 fc = vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  vec2 p = (fc - uView.xy)/uView.z;               // design coordinates (y down)
  float px = 1./uView.z;                           // one screen pixel in design units

  // impact ripple (refraction through the membrane)
  vec2 rp = p;
  float ripple = 0.;
  if(uImpT>0. && uImpT<1.6){
    float r = length(p-uHit), R = uImpT*1350.;
    ripple = exp(-pow((r-R)/46.,2.))*exp(-uImpT*3.2);
    rp = p - normalize(p-uHit+1e-4)*ripple*7.;
  }
  vec4 m = mem(rp.y);
  float B = m.r, B0 = m.g, contact = m.b;
  float slope = (mem(rp.y+4.).r - mem(rp.y-4.).r)/8.;
  float crk = 0.;
  if(uImpT>-0.12 && uImpT<0.9){
    vec2 vv = vor(rp/34.);
    float env = uImpT<0. ? smoothstep(-.12,0.,uImpT)*.25 : exp(-uImpT*15.);
    crk = (1.-smoothstep(0.,.07,vv.y))*env;
    B += (vv.x-.45)*4.*env;
  }
  float u = B - rp.x;                               // distance into the dark side
  float dn = -u/sqrt(1.+slope*slope);               // signed normal distance (+ = bright side)

  vec3 col = fieldFlow(rp, B, B0, u);
  if(ripple>.02){ // subtle chromatic split on the ripple front
    vec2 dir = normalize(p-uHit+1e-4)*ripple*2.2;
    col.r = mix(col.r, field(rp+dir,B,B0).r, .8);
    col.b = mix(col.b, field(rp-dir,B,B0).b, .8);
  }
  float en = uEnergy;
  // darkness: the far field stays genuinely dark until the product arrives
  float dg = mix(.06, 1.0, smoothstep(.2,.9,min(en,1.)));
  float near = exp(-max(u,0.)/150.);
  col *= mix(1., mix(dg, 1.05, near), step(0.,u));
  col = mix(col, pow(col,vec3(1.28))*1.14, smoothstep(40.,320.,u));
  col *= mix(.5, 1., smoothstep(uLR.x, uLR.x+280., p.x));
  // contact shadow: dark pocket in front of the visor, soft shadow on the bright side
  vec4 pose = uPose;
  vec2 hitC = uHit + vec2(-40.,25.);
  float pocket = smoothstep(205.,110.,length(p-hitC))*smoothstep(-4.,-40.,dn)*uPres;
  col *= 1. - .72*pocket;
  vec2 qs = toGog(p - vec2(30.,40.), pose);
  float sh = gogAt(qs, 4.5).a;
  col *= 1. - .30*sh*smoothstep(-20.,40.,dn)*uPres;
  // volumetric light
  col += rays(p, max(u,0.))*step(0.,u);
  col += sparkle(p, u);
  col += vec3(.02,.13,.17)*exp(-max(u,0.)/320.)*(.6+.4*sin(uTime*.7+p.y*.004))*min(en,1.2)*step(0.,u);
  // membrane rim
  float rim = exp(-abs(dn)/4.5);
  col += vec3(.78,1.,1.)*rim*(.10+.22*min(en,1.6));
  col += vec3(.10,.55,.72)*exp(-max(-dn,0.)/80.)*step(dn,0.)*(.06+.16*min(en,1.5));
  col += vec3(.95,1.,1.)*exp(-abs(dn)/9.)*contact*(.18+.30*min(en,1.6));
  // glass stress: micro-fracture along the membrane and around the point of contact
  float band = exp(-abs(dn)/24.) + .35*exp(-length(p-uHit)/70.);
  col += vec3(.85,1.,1.)*crk*band*.6;
  col += vec3(.7,.95,1.)*ripple*.10;
  // persistent crystalline haze near the membrane
  if(u>0. && u<260.){ float ce = 1.-smoothstep(0.,.05,vor(p/22.+uTime*.02).y); col += vec3(.3,.8,.95)*ce*exp(-u/90.)*.05*min(en,1.2); }
  // horizontal flare aimed at the visor after impact
  if(uImpT>0.){ float fy = p.y-uHit.y+1.5; float fl = exp(-fy*fy/3.)*smoothstep(uHit.x-60.,uHit.x-900.,p.x)*0. + exp(-fy*fy/2.2)*step(p.x,uHit.x-40.)*smoothstep(-400.,uHit.x,p.x);
    col += vec3(.55,.92,1.)*fl*(.18+.5*exp(-uImpT*2.))*(.85+.15*sin(uTime*3.+p.x*.02)); }
  // bright world: slow light beams + breathing
  float bw = smoothstep(-10.,60.,dn);
  vec2 rq = vec2(p.x*.82 + p.y*.57, -p.x*.57 + p.y*.82);
  float beams = pow(.5+.5*sin(rq.y*.0105 + uTime*.18 + fbm(rq*.002+uTime*.03)*3.),7.);
  col += vec3(.9,1.,.97)*beams*.06*bw;
  col *= 1. + (fbm(p*.0025+vec2(uTime*.025,-uTime*.018))-.5)*.08*bw;

  // graphic system (sits behind the product)
  vec3 g = vec3(0.); float ga = 0.;
  if(uCirc>0.){
    vec2 C = vec2(716.,474.); float R=376.;
    vec2 d = p-C; float dist = abs(length(d)-R);
    float a0 = 2.3399; float ang = atan(d.y,d.x);
    float rel = fract((ang-a0)/TAU);
    float vis = 1.-smoothstep(uCirc-.0015, uCirc, rel);
    if(uCirc>=1.) vis=1.;
    float lw = .62*px;
    float a = (1.-smoothstep(lw, lw+px, dist))*vis;
    float tipA = a0 + uCirc*TAU; vec2 tip = C + R*vec2(cos(tipA),sin(tipA));
    float tg = exp(-length(p-tip)/(9.))*(1.-smoothstep(.93,1.,uCirc));
    ga = max(ga, a*.74); g += vec3(1.)*tg*.55 + vec3(.8,1.,1.)*exp(-dist/(2.5*px))*vis*.05;
  }
  if(uLine>0.){
    vec2 P0=vec2(228.,958.), P1=vec2(700.,519.), P2=vec2(781.,272.), P3=vec2(1040.,13.);
    float l1=length(P1-P0), l2=length(P2-P1), l3=length(P3-P2), LT=l1+l2+l3;
    float t1,t2,t3; float d1=segD(p,P0,P1,t1), d2=segD(p,P1,P2,t2), d3=segD(p,P2,P3,t3);
    float s1=t1*l1, s2=l1+t2*l2, s3=l1+l2+t3*l3;
    float dist=d1, s=s1; if(d2<dist){dist=d2;s=s2;} if(d3<dist){dist=d3;s=s3;}
    float head = uLine*LT;
    float vis = 1.-smoothstep(head-1.5, head, s); if(uLine>=1.) vis=1.;
    float lw=.6*px;
    float a=(1.-smoothstep(lw,lw+px,dist))*vis;
    vec2 tip = head<l1 ? mix(P0,P1,head/l1) : (head<l1+l2 ? mix(P1,P2,(head-l1)/l2) : mix(P2,P3,(head-l1-l2)/l3));
    float tg = exp(-length(p-tip)/9.)*(1.-smoothstep(.93,1.,uLine));
    ga = max(ga, a*.80); g += vec3(1.)*tg*.55 + vec3(.8,1.,1.)*exp(-dist/(2.5*px))*vis*.05;
  }
  col = mix(col, vec3(1.), ga) + g;
  // finishing on the environment only: the product keeps its original pixels
  // the dark side is paper: its light becomes blue ink, the lit gradient stays as it is
  float ws = smoothstep(30., 240., u);
  { vec3 hi = max(col-.86,0.); col = min(col,.86) + .14*(1.-exp(-hi/.14));
    float lum = max(col.r,max(col.g,col.b))*smoothstep(60.,320.,u)*uRay;
    vec3 paper = mix(PAPER, BLUE, smoothstep(.03,.6,lum)*.92);
    col = 1. - (1.-col)*(1. - PAPER*smoothstep(0.,70.,u));   // screen toward paper: no grey seam at the rim
    vec2 sv = fc/uRes - .5; sv.x *= uRes.x/uRes.y;
    col *= 1. - .22*pow(clamp(length(sv)*.95,0.,1.),2.6);
    col += (h21(fc + fract(uTime*37.)*vec2(113.,71.))-.5)*.022;
    col = mix(col, paper, ws); }

  // the product: the supplied PNG, sampled untouched (motion blur only while moving fast)
  vec2 q = toGog(p, pose);
  vec4 gg;
  float blur = abs(uVel)*(1./60.)*.55/pose.z;
  if(blur>1.2){ gg=vec4(0.); for(int i=0;i<9;i++){ float o2=(float(i)/8.-.5)*blur; gg+=gogAt(q+vec2(o2,0.),0.);} gg/=9.; }
  else gg = gogAt(q,0.);
  col = gg.rgb + col*(1.-gg.a);
  // light passing over the visor at the moment of impact
  if(uImpT>0. && uImpT<.8 && gg.a>0.){
    float xs = mix(470.,830.,clamp(uImpT/.6,0.,1.));
    float bandv = exp(-pow((q.x+(q.y-440.)*.35-xs)/38.,2.))*(1.-smoothstep(760.,800.,q.x));
    col += vec3(.9,1.,1.)*bandv*.16*gg.a*(1.-smoothstep(.45,.8,uImpT));
  }

  // ---- title: AERON ----
  if(uAirT>-.6){
    vec2 Lq = (p - uLk.xy)/uLk.z;                // lockup (type PNG) pixel space
    // air lines rushing past before the word lands
    if(uAirT<.5){
      float env = smoothstep(-.6,-.35,uAirT)*(1.-smoothstep(.1,.5,uAirT));
      for(int i=0;i<7;i++){ float fi=float(i), h=h11(fi*5.31+.7), h2=h11(fi*2.17+3.1);
        float yl = 470. + (h-.5)*300.; float sp = 4200.*(.75+.5*h2);
        float head = uLR.y + 300. - (uAirT+.6)*sp - h*500.;
        float s = (p.x-head)/(520.+h2*400.);
        float line = exp(-pow((p.y-yl)/(.7*px),2.))*step(0.,s)*pow(max(1.-s,0.),2.2);
        float la = line*env*(.35+.4*h2);
        col = mix(col + vec3(.85,1.,.9)*la, mix(col, BLUE, clamp(la*1.4,0.,1.)), ws); }
    }
    // filled word (motion-blurred while it slams in)
    if(uFill.w>0.){
      vec4 acc=vec4(0.); float n=1.;
      vec2 q = FILL_C_ + (Lq - FILL_C_ - uFill.xy)/vec2(uFill.z,1.);
      if(uFBlur>1.){ n=0.; for(int i=0;i<14;i++){ float o2=float(i)/13.*uFBlur; acc.r+=tsamp(uTF,q+vec2(o2+uFBlur*.025,0.),0.).a; acc.ga+=tsamp(uTF,q+vec2(o2,0.),0.).ga; acc.b+=tsamp(uTF,q+vec2(o2-uFBlur*.025,0.),0.).a; n+=1.; } acc/=n; }
      else { vec4 t4=tsamp(uTF,q,0.); acc=vec4(t4.a); }
      float a = acc.a*uFill.w*uVecA;
      vec3 fk = vec3(acc.r,acc.a,acc.b)*uFill.w*uVecA;
      col = mix(col*(1.-a) + fk, col*(1.-.94*fk), ws);
    }
    // outline words: split, strobe, form
    for(int i=0;i<12;i++){ if(i>=uON) break;
      vec4 A=uOA[i], Bc=uOB[i];
      vec2 q = OUT_C_ + (Lq - OUT_C_ - A.xy)/A.z;
      float a;
      if(Bc.w>1.){ a=0.; for(int j=0;j<10;j++){ a+=tsamp(uTO,q+vec2((float(j)/9.-.5)*Bc.w,0.),0.).a; } a/=10.; }
      else a=tsamp(uTO,q,0.).a;
      float glow = tsamp(uTO,q,3.5).a;
      float w = 1.-min(min(Bc.r,Bc.g),Bc.b);          // colour strength (0 = white)
      a *= A.w*uVecA;
      col = mix(col*(1.-a) + Bc.rgb*a + Bc.rgb*glow*A.w*uVecA*(.25+.6*w), col*(1.-a) + ink(Bc.rgb)*a, ws);
    }
    // the supplied lockup, exact, once formed
    if(uLockA>0.){ vec4 t4=tsamp(uTL,Lq,0.); col = col*(1.-t4.a*uLockA) + mix(t4.rgb, ink(vec3(1.))*t4.a, ws)*uLockA; }
    // flash: an exposure burst over the whole frame
    vec3 ft = vec3(.97,1.,.93);
    col += (col*2.6 + .22)*uFlash*ft;
    vec3 hx = max(col-.9,0.); col = min(col,.9) + .1*(1.-exp(-hx/.1));
  }
  col *= uFade;
  o = vec4(clamp(col,0.,1.),1.);
}`;
function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog=gl.createProgram(); gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(prog);
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const al=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
const U={}; for(const n of ['uRay','uField','uGog','uMem','uRes','uView','uLR','uTime','uPh','uEnergy','uImpT','uFade','uCirc','uLine','uPres','uVel','uPose','uPivot','uGogSize','uHit','uTF','uTO','uTL','uLk','uFill','uFBlur','uFlash','uLockA','uVecA','uAirT','uON']) U[n]=gl.getUniformLocation(prog,n);
U.uOA=gl.getUniformLocation(prog,'uOA[0]'); U.uOB=gl.getUniformLocation(prog,'uOB[0]');
function tex(unit){ const t=gl.createTexture(); gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,t); return t; }
const memTex = tex(2);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,N,1,0,gl.RGBA,gl.FLOAT,null);
const memData = new Float32Array(N*4);
function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('Could not load '+src)); i.src=src; }); }
function typeTex(unit, draw){ const c=document.createElement('canvas'); c.width=LK[0]*2; c.height=LK[1]*2; const x=c.getContext('2d'); x.scale(2,2); draw(x);
  const t=tex(unit); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,c); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false); return t; }
function word(x, size, track, left, top, stroke){ // Montserrat 900, per-letter tracking, ink box pinned to (left, top) in type-PNG pixels
  x.font = `900 ${size}px AeronDisplay`; x.textBaseline='alphabetic';
  let adv=0, minL=1e9, maxA=0; const L=[];
  for(const ch of 'AERON'){ const m=x.measureText(ch); L.push([ch,adv]); minL=Math.min(minL,adv-m.actualBoundingBoxLeft); maxA=Math.max(maxA,m.actualBoundingBoxAscent); adv+=m.width+track; }
  const ox=left-minL, oy=top+maxA;
  for(const [ch,a] of L){ if(stroke){ x.lineWidth=stroke; x.lineJoin='miter'; x.strokeStyle='#fff'; x.strokeText(ch,ox+a,oy);} else { x.fillStyle='#fff'; x.fillText(ch,ox+a,oy);} }
}
const font = new FontFace('AeronDisplay','url(assets/fonts/montserrat-900.woff2)',{weight:'900'});
const ready = Promise.all([loadImg('assets/images/aeron/field.webp'), loadImg('assets/images/aeron/aeron.png'), loadImg('assets/images/aeron/aeron-type.png'), font.load().then(f=>{document.fonts.add(f);})]).then(([f,g,ty])=>{
  typeTex(3, x=>word(x,140,36,8,64,0));
  typeTex(4, x=>word(x,127,30,133,6,4));
  { const t=tex(5); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,ty);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false); }
  tex(0); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,f);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  tex(1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,g); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gogW=g.naturalWidth; gogH=g.naturalHeight;
  const c2=document.createElement('canvas'); c2.width=gogW; c2.height=gogH; const x2=c2.getContext('2d',{willReadFrequently:true}); x2.drawImage(g,0,0);
  const d=x2.getImageData(0,0,gogW,gogH).data; gogLeft=new Int16Array(gogH);
  for(let y=0;y<gogH;y++){ let L=-1; for(let x=0;x<gogW;x++){ if(d[(y*gogW+x)*4+3]>110){L=x;break;} } gogLeft[y]=L; }
  gl.uniform1i(U.uField,0); gl.uniform1i(U.uGog,1); gl.uniform1i(U.uMem,2);
  gl.uniform2f(U.uPivot,GOG.pivot[0],GOG.pivot[1]); gl.uniform2f(U.uGogSize,gogW,gogH);
  gl.uniform1i(U.uTF,3); gl.uniform1i(U.uTO,4); gl.uniform1i(U.uTL,5); gl.uniform3f(U.uLk,LOCK.ox,LOCK.oy,LOCK.s);
});

function waves(y,t,en){ return (9*Math.sin(y*.011+t*.9) + 6*Math.sin(y*.023-t*1.3+1.7) + 3.5*Math.sin(y*.047+t*2.1+.4) + 5*Math.sin(t*.6))*(.75+.45*Math.min(en,1.3)); }
function hitPoint(p){ const qy=440, l=gogLeft?gogLeft[qy]:510; return [p.tx + p.s*l, p.ty + p.s*qy]; }
let lastPose=null, lastT=null;
const RAY0 = 4.3, RAY1 = 6.2;   // story seconds: the push lands, then the rays come in
// phases = ∫ speed(energy) dt over story time: same motion on every play, no jumps when energy changes
let PH = { t:0, r:0, s:0, f:0 };
function phTo(t){   // story() holds its final state past the end, so energy stays defined
  if (t < PH.t - 1e-6) PH = { t:0, r:0, s:0, f:0 };
  while (PH.t < t - 1e-6){ const d = Math.min(1/120, t - PH.t), e = story(PH.t + d*.5).energy;
    PH.r += d*(.55 + Math.min(2, Math.max(0, e))*.7); PH.s += d*(.5 + e*.7); PH.f += d*(.09 + .12*Math.min(1.4, Math.max(0, e))); PH.t += d; }
}
function draw(t, ambient, pt){
  simTo(t); phTo(pt == null ? t : pt);   // pt: unclamped story clock, so the phases keep flowing after the title
  const st = story(t), p = gogPose(st);
  for(let i=0;i<N;i++){ const y=Y0+i*HY; memData[i*4]=M.x[i] + waves(y,ambient,st.energy)*(1-M.c[i]); memData[i*4+1]=M.b0[i]; memData[i*4+2]=M.c[i]; memData[i*4+3]=0; }
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,memTex); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,1,gl.RGBA,gl.FLOAT,memData);
  const vel = (lastPose && lastT!==null && t>lastT && t-lastT<0.1) ? (p.tx-lastPose.tx)/(t-lastT) : 0;
  lastPose=p; lastT=t;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(U.uRes,canvas.width,canvas.height);
  gl.uniform3f(U.uView,view.ox,view.oy,view.k);
  gl.uniform2f(U.uLR,view.L,view.R);
  gl.uniform1f(U.uTime,ambient); gl.uniform3f(U.uPh,PH.r,PH.s,PH.f); gl.uniform1f(U.uEnergy,st.energy); gl.uniform1f(U.uImpT,st.imT);
  gl.uniform1f(U.uFade,st.fade); gl.uniform1f(U.uCirc,st.circle); gl.uniform1f(U.uLine,st.line);
  gl.uniform1f(U.uPres,st.pres); gl.uniform1f(U.uVel,vel);
  { const k = Math.min(1, Math.max(0, (t - RAY0)/(RAY1 - RAY0))); gl.uniform1f(U.uRay, k*k*(3-2*k)); }
  gl.uniform4f(U.uPose,p.tx,p.ty,p.s,p.rot);
  const hp = hitPoint(gogPose(story(Math.max(t,T_IMPACT)))); gl.uniform2f(U.uHit,hp[0],hp[1]);
  const ti = title(t);
  if (ti.flash>0) gl.uniform1f(U.uEnergy, st.energy + ti.flash*.5);
  gl.uniform4f(U.uFill,ti.fill[0],ti.fill[1],ti.fill[2],ti.fill[3]); gl.uniform1f(U.uFBlur,ti.fblur);
  gl.uniform1f(U.uFlash,ti.flash); gl.uniform1f(U.uLockA,ti.lock); gl.uniform1f(U.uVecA,ti.vec); gl.uniform1f(U.uAirT,ti.air);
  const n=Math.min(ti.outs.length,12), oa=new Float32Array(48), ob=new Float32Array(48);
  for(let i=0;i<n;i++){ const O=ti.outs[i]; oa.set([O.off[0],O.off[1],O.scl,O.a],i*4); ob.set([O.col[0],O.col[1],O.col[2],O.blur],i*4); }
  gl.uniform1i(U.uON,n); gl.uniform4fv(U.uOA,oa); gl.uniform4fv(U.uOB,ob);
  gl.drawArrays(gl.TRIANGLES,0,3);
}

function resize(w,h,dpr){
  const W=Math.round(w*dpr), H=Math.round(h*dpr);
  if(canvas.width!==W||canvas.height!==H){ canvas.width=W; canvas.height=H; }
  layout(W,H);
}

// ---------- sound (Web Audio, synthesized) ----------
function buildAudio(ctx, out, t0, len, amb){
  const sr=ctx.sampleRate;
  const nb=ctx.createBuffer(2,sr*4,sr); for(let c=0;c<2;c++){ const d=nb.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const ir=ctx.createBuffer(2,sr*3.2,sr); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<d.length;i++){ const x=i/sr; d[i]=(Math.random()*2-1)*Math.pow(1-x/3.2,2.4)*Math.exp(-x*1.1); } }
  const master=ctx.createGain(); master.gain.value=.9;
  const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=3; comp.attack.value=.004; comp.release.value=.25;
  master.connect(comp); comp.connect(out);
  const verb=ctx.createConvolver(); verb.buffer=ir; const wet=ctx.createGain(); wet.gain.value=.32; verb.connect(wet); wet.connect(master);
  const now0=ctx.currentTime, T=x=>Math.max(t0+x, now0);   // events before the entry point collapse to now
  const nodes=[];
  function noise(){ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.loopStart=Math.random()*2; nodes.push(s); return s; }
  function osc(type,f){ const o=ctx.createOscillator(); o.type=type; o.frequency.value=f; nodes.push(o); return o; }
  function bus(g,send=.2,pan=0){ const gn=ctx.createGain(); gn.gain.value=0; const p=ctx.createStereoPanner(); p.pan.value=pan; gn.connect(p); p.connect(master); if(send){ const s=ctx.createGain(); s.gain.value=send; p.connect(s); s.connect(verb);} return {g:gn,p}; }
  function ramp(param,pts){ param.setValueAtTime(pts[0][1],T(pts[0][0])); for(let i=1;i<pts.length;i++) param.linearRampToValueAtTime(pts[i][1],T(pts[i][0])); }
  function xramp(param,pts){ param.setValueAtTime(pts[0][1],T(pts[0][0])); for(let i=1;i<pts.length;i++) param.exponentialRampToValueAtTime(Math.max(pts[i][1],1e-4),T(pts[i][0])); }
  const start=(n,a,b)=>{ n.start(T(a)); if(b!==undefined) n.stop(T(b)); };
  // 1. deep space tone
  { const b=bus(0,.25); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=260; lp.connect(b.g);
    for(const [f,g,ty] of [[49,.55,'sine'],[73.4,.3,'sine'],[98.1,.12,'triangle']]){ const o=osc(ty,f); const og=ctx.createGain(); og.gain.value=g; o.connect(og); og.connect(lp); start(o,0,len); }
    const n=noise(); const nf=ctx.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=180; const ng=ctx.createGain(); ng.gain.value=.5; n.connect(nf); nf.connect(ng); ng.connect(lp); start(n,0,len);
    const lfo=osc('sine',.07); const lg=ctx.createGain(); lg.gain.value=70; lfo.connect(lg); lg.connect(lp.frequency); start(lfo,0,len);
    ramp(b.g.gain, amb?[[0,.07],[len,.07]]:[[0,0],[2.2,.13],[6.3,.15],[8.5,.07],[len,.07]]); }
  // 2. air + ray whooshes (they travel left, like the rays)
  { const b=bus(0,.3,-.1); const n=noise(); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=900; bp.Q.value=.6; n.connect(bp); bp.connect(b.g); start(n,0,len); ramp(b.g.gain, amb?[[0,.016],[len,.016]]:[[0,0],[2,.012],[6.4,.02],[len,.016]]); }
  const whooshAt=(t,dur,peak,f0,f1,f2,p0,p1)=>{ const b=bus(0,.35,p0); const n=noise(); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.1; n.connect(bp); bp.connect(b.g); start(n,t,t+dur+.1);
    xramp(bp.frequency,[[t,f0],[t+dur*.62,f1],[t+dur,f2]]); ramp(b.g.gain,[[t,0],[t+dur*.6,peak],[t+dur,0]]); ramp(b.p.pan,[[t,p0],[t+dur,p1]]); };
  if(!amb) whooshAt(.9,2.1,.035,380,1300,600,.5,-.6);
  for(let t=(amb?1.4:4.8);t<len-2;t+=3.1+((t*7.3)%1.3)) if(t<5.5||t>7.2) whooshAt(t,1.9,.028,420,1500,650,.45,-.65);
  if(!amb){
  // 3. entry: the product arrives from the right
  whooshAt(2.7,1.6,.24,240,2200,500,.85,.05);
  { const o=osc('sine',42); const b=bus(0,.1); o.connect(b.g); start(o,2.9,5.9); ramp(b.g.gain,[[2.9,0],[3.8,.13],[4.4,.09],[5.8,0]]); }
  // 4. first push: pressure, moving air
  { const n=noise(); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=150; const b=bus(0,.15); n.connect(lp); lp.connect(b.g); start(n,3.5,6.4); ramp(b.g.gain,[[3.5,0],[4.15,.55],[4.9,.3],[5.6,.34],[6.3,0]]); }
  // 5. resistance: tension builds before release
  { const o=osc('sine',190); const trem=osc('sine',22); const tg=ctx.createGain(); tg.gain.value=.5; const b=bus(0,.3); const vg=ctx.createGain(); vg.gain.value=.5; trem.connect(tg); tg.connect(vg.gain); o.connect(vg); vg.connect(b.g); start(o,5.45,6.45); start(trem,5.45,6.45);
    xramp(o.frequency,[[5.45,190],[6.36,330]]); ramp(b.g.gain,[[5.45,0],[6.25,.03],[6.4,0]]);
    const n=noise(); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3200; const b2=bus(0,.3,.2); n.connect(hp); hp.connect(b2.g); start(n,5.5,6.5); ramp(b2.g.gain,[[5.5,0],[6.34,.028],[6.4,0]]); }
  // 6. final push: strong cinematic whoosh + sub drop
  whooshAt(5.98,.62,.34,170,4800,900,.6,-.3);
  { const o=osc('sine',72); const b=bus(0,.15); o.connect(b.g); start(o,6.3,7.6); xramp(o.frequency,[[6.3,72],[7.4,31]]); ramp(b.g.gain,[[6.3,0],[6.4,.3],[7.5,0]]); }
  // 7. glass stress: crystalline crack, short and restrained
  { const I=T_IMPACT;
    const hb=bus(0,.55,-.05); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2600; hp.connect(hb.g); hb.g.gain.value=1;
    [-.024,-.016,-.011,-.004,0,.003,.009,.021].forEach((d,i)=>{ const n=noise(); const g=ctx.createGain(); g.gain.value=0; n.connect(g); g.connect(hp); start(n,I+d,I+d+.03); const a=i===4?.2:.07+.025*(i%3); ramp(g.gain,[[I+d,0],[I+d+.0015,a],[I+d+(i===4?.028:.006),0]]); });
    [[2371,.034,.95,-.4],[2383,.02,.8,.4],[3913,.03,.72,.2],[5620,.022,.55,-.3],[7841,.016,.42,.35],[9967,.011,.3,0],[4420,.012,.6,-.1]].forEach(([f,g,d,pn])=>{ const o=osc('sine',f); const b=bus(0,.6,pn); o.connect(b.g); start(o,I,I+d+.05); b.g.gain.setValueAtTime(0,T(I)); b.g.gain.linearRampToValueAtTime(g,T(I+.002)); b.g.gain.exponentialRampToValueAtTime(1e-4,T(I+d)); });
    const th=osc('sine',58); const tb=bus(0,.1); th.connect(tb.g); start(th,I,I+.4); ramp(tb.g.gain,[[I,0],[I+.006,.14],[I+.3,0]]); }
  }
  // 8. after impact: clean, futuristic atmosphere
  { const b=bus(0,.45); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2100; lp.Q.value=.3; lp.connect(b.g);
    [110,164.81,246.94,369.99,554.37].forEach((f,i)=>{ for(const dt of [-3,3]){ const o=osc(i<2?'sine':'triangle',f); o.detune.value=dt; const g=ctx.createGain(); g.gain.value=[.5,.4,.26,.16,.08][i]; o.connect(g); g.connect(lp); start(o,amb?0:6.5,len);} });
    ramp(b.g.gain, amb?[[0,.05],[len,.05]]:[[6.5,0],[8.6,.05],[len,.05]]);
    const n=noise(); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7500; const b2=bus(0,.4); n.connect(hp); hp.connect(b2.g); start(n,amb?0:6.6,len); ramp(b2.g.gain, amb?[[0,.004],[len,.004]]:[[6.6,0],[9,.004],[len,.004]]); }
  if(!amb){
  // 9. the circle and the line are drawn
  { const o=osc('sine',660); const b=bus(0,.6,-.2); o.connect(b.g); start(o,8.15,10.1); xramp(o.frequency,[[8.2,660],[9.95,990]]); ramp(b.g.gain,[[8.15,0],[8.5,.012],[9.7,.012],[10.05,0]]);
    const o2=osc('sine',1320); const b2=bus(0,.6,.25); o2.connect(b2.g); start(o2,9.5,10.95); xramp(o2.frequency,[[9.55,1320],[10.75,1760]]); ramp(b2.g.gain,[[9.5,0],[9.8,.007],[10.6,.007],[10.9,0]]); }
  // 10. title: air rush, slam, flash, strobe ticks, lock
  { const R=T_TITLE, F=R+.16, L=R+.80;
    whooshAt(R-.6,.66,.2,700,6200,2600,.9,-.9);
    { const n=noise(); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=.9; const b=bus(0,.2,.5); n.connect(bp); bp.connect(b.g); start(n,R-.03,R+.3); xramp(bp.frequency,[[R-.03,7200],[R+.16,850]]); ramp(b.g.gain,[[R-.03,0],[R+.11,.3],[R+.2,0]]); ramp(b.p.pan,[[R,.7],[R+.16,-.1]]); }
    { const o=osc('sine',112); const b=bus(0,.12); o.connect(b.g); start(o,F-.01,F+.6); xramp(o.frequency,[[F,112],[F+.5,38]]); ramp(b.g.gain,[[F-.01,0],[F+.004,.5],[F+.55,0]]); }
    { const n=noise(); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3000; const b=bus(0,.5); n.connect(hp); hp.connect(b.g); start(n,F,F+1.3); ramp(b.g.gain,[[F,0],[F+.003,.34],[F+.035,.07],[F+1.2,0]]); }
    [[1760,.03,.55,-.35],[2637,.022,.48,.35],[3520,.016,.42,-.2],[5274,.01,.36,.25]].forEach(([f,g,d,pn])=>{ const o=osc('sine',f); const b=bus(0,.7,pn); o.connect(b.g); start(o,F,F+d+.05); b.g.gain.setValueAtTime(0,T(F)); b.g.gain.linearRampToValueAtTime(g,T(F+.003)); b.g.gain.exponentialRampToValueAtTime(1e-4,T(F+d)); });
    for(const P of POPS){ const t=R+P.t; const o=osc('sine',P.f); const b=bus(0,.35,P.pan); o.connect(b.g); start(o,t,t+.07); ramp(b.g.gain,[[t,0],[t+.002,.045],[t+.05,0]]);
      const n=noise(); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=5200; const b2=bus(0,.3,P.pan); n.connect(hp); hp.connect(b2.g); start(n,t,t+.03); ramp(b2.g.gain,[[t,0],[t+.001,.11],[t+.012,0]]); }
    { const o=osc('sine',62); const b=bus(0,.15); o.connect(b.g); start(o,L,L+.55); ramp(b.g.gain,[[L,0],[L+.006,.42],[L+.5,0]]);
      const o2=osc('triangle',190); const b2=bus(0,.3); o2.connect(b2.g); start(o2,L,L+.22); xramp(o2.frequency,[[L,190],[L+.16,118]]); ramp(b2.g.gain,[[L,0],[L+.004,.11],[L+.17,0]]);
      const n=noise(); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=6000; const b3=bus(0,.5); n.connect(hp); hp.connect(b3.g); start(n,L,L+.9); ramp(b3.g.gain,[[L,0],[L+.003,.12],[L+.8,0]]); }
    whooshAt(L+.05,1.5,.07,2600,900,420,.2,-.8);
    { const b=bus(0,.5); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3000; lp.connect(b.g); [329.63,493.88,739.99].forEach((f,i)=>{ const o=osc('sine',f); const g=ctx.createGain(); g.gain.value=[.5,.35,.2][i]; o.connect(g); g.connect(lp); start(o,L,len); }); ramp(b.g.gain,[[L,0],[L+1.6,.022],[len,.022]]); }
  }
  }
  if(amb){ const b=bus(0,.5); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3000; lp.connect(b.g); [329.63,493.88,739.99].forEach((f,i)=>{ const o=osc('sine',f); const g=ctx.createGain(); g.gain.value=[.5,.35,.2][i]; o.connect(g); g.connect(lp); start(o,0,len); }); ramp(b.g.gain,[[0,.022],[len,.022]]); }
  return { stop(){ const now=ctx.currentTime; try{ master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(0,now,.08); }catch(e){} setTimeout(()=>{ for(const n of nodes){ try{n.stop();}catch(e){} } try{comp.disconnect();}catch(e){} },500); } };
}


// ---------- live page (portfolio) ----------
// hold on paper + blue rays (ENTRY_T, product off-screen). When the hero reaches the top of the viewport
// the page glides onto it, scroll locks, and the story plays in time with the full score; unlocks at the title.
const arrow = document.getElementById('ae-arrow'), hero = document.getElementById('ae-scroll');
const AUD = 240, ENTRY_T = 2.2, HOLD = STORY + 6;
let mode = 'hold', t0 = 0, loaded = false, played = false, locked = false, lockY = 0, done = false;
let actx = null, voice = null, chain = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function fit(){ resize(innerWidth, innerHeight, Math.min(devicePixelRatio||1, 1.75)); }
addEventListener('resize', fit); fit();
function swapVoice(full, overlap){
  if(!actx) return;
  const old = voice;
  voice = buildAudio(actx, actx.destination, actx.currentTime + 0.06 - (full ? ENTRY_T : 0), AUD, !full);
  if(old) setTimeout(() => old.stop(), overlap);
  clearTimeout(chain);
  chain = setTimeout(() => swapVoice(false, 450), (AUD - 6) * 1000);
}
let soundOn = null, mild = null;   // null until the gate is answered
function ensureAudio(){
  if(soundOn === false) return;
  try { if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); if(actx.state !== 'running') actx.resume(); } catch(e){}
}
['pointerdown','keydown','touchend'].forEach(ev => addEventListener(ev, ensureAudio, { once:true, passive:true }));
function play(){
  if(mode === 'story') return;
  mode = 'story'; t0 = performance.now();
  if(soundOn === false) return;
  ensureAudio(); if(actx) swapVoice(true, 600);
  if(mild){ const m = mild; mild = null; try { m.g.gain.setTargetAtTime(0, actx.currentTime, 0.5); } catch(e){} setTimeout(() => m.stop(), 3000); }
}
// a much milder version of the hero's air bed (same low rumble + bandpassed air), held until the hero takes over
function startMild(){
  if(!actx || mild) return;
  const c = actx, sr = c.sampleRate, nb = c.createBuffer(2, sr*4, sr);
  for(let ch=0; ch<2; ch++){ const d = nb.getChannelData(ch); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const g = c.createGain(); g.gain.value = 0; g.connect(c.destination);
  const src = [];
  const mk = (type, f, q, gain) => { const n = c.createBufferSource(); n.buffer = nb; n.loop = true; n.loopStart = Math.random()*2;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if(q) fl.Q.value = q; const ng = c.createGain(); ng.gain.value = gain;
    n.connect(fl); fl.connect(ng); ng.connect(g); n.start(); src.push(n); return fl; };
  const lp = mk('lowpass', 180, 0, 0.9); mk('bandpass', 900, 0.6, 0.35); mk('highpass', 7500, 0, 0.05);
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); src.push(lfo);
  g.gain.setTargetAtTime(0.045, c.currentTime + 0.05, 1.2);
  mild = { g, stop(){ src.forEach(n => { try { n.stop(); } catch(e){} }); g.disconnect(); } };
}
window.__aeron = { play, sound(on){
  soundOn = !!on;
  if(on){ ensureAudio(); if(mode !== 'story') startMild(); }
} };
// the header hands over halfway through its rush: the hero is pulled up and the story starts
// the header has dissolved to bare paper: cut straight onto the hero (also paper at ENTRY_T), no visible scroll
addEventListener('sh:handoff', () => { if(!played && loaded && hero) enter(0); });
const block = e => { if(locked) e.preventDefault(); };
addEventListener('wheel', block, { passive:false });
addEventListener('touchmove', block, { passive:false });
addEventListener('keydown', e => { if(locked && [' ','PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(e.key)) e.preventDefault(); });
addEventListener('scroll', () => {
  if(locked){ if(Math.abs(scrollY - lockY) > 1) scrollTo(0, lockY); return; }
  if(played || !loaded || !hero) return;
  if(hero.getBoundingClientRect().top <= innerHeight*0.3) enter();
}, { passive:true });
function enter(dur){
  played = true; locked = true;
  const y0 = scrollY, y1 = y0 + hero.getBoundingClientRect().top, d = dur ?? 650, st = performance.now();
  if(!d){ lockY = Math.round(y1); scrollTo(0, lockY); play(); return; }
  lockY = y0;
  (function glide(n){
    const k = Math.min(1, (n - st)/d), e = k<.5 ? 4*k*k*k : 1 - Math.pow(-2*k+2,3)/2;
    lockY = Math.round(y0 + (y1 - y0)*e); scrollTo(0, lockY);
    if(k < 1) requestAnimationFrame(glide); else play();
  })(st);
}
// sound belongs to this page only: silent when hidden or left, never outlives the tab
addEventListener('visibilitychange', () => { if(!actx) return; document.hidden ? actx.suspend() : actx.resume(); });
// a page kept alive in a hidden frame/tab (0x0 viewport, or no frames being drawn) goes silent too
let lastFrame = performance.now();
setInterval(() => {
  if(!actx) return;
  const away = document.hidden || innerWidth === 0 || innerHeight === 0 || performance.now() - lastFrame > 600;
  if(away && actx.state === 'running') actx.suspend();
  else if(!away && actx.state === 'suspended') actx.resume();
}, 250);
addEventListener('pagehide', () => {
  clearTimeout(chain);
  if(voice) { voice.stop(); voice = null; }
  if(actx) { actx.close(); actx = null; }
});
// leaving by any link (BACK, logo, nav): cut the sound the moment it's clicked
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if(!a || a.getAttribute('href').charAt(0) === '#') return;
  clearTimeout(chain);
  if(voice) { voice.stop(); voice = null; }
  if(actx) { actx.close(); actx = null; }
}, true);
addEventListener('pageshow', e => { if(e.persisted) location.reload(); });

// seam: the hero's bottom strip is averaged into 16 colours; the hero fades into them and the next page
// starts on exactly the same gradient, so the join is two identical fields
const band = document.getElementById('ae-band'), bandBase = document.getElementById('ae-band-base'), heroFade = document.getElementById('ae-fade');
const COLS = 16, probe = document.createElement('canvas'); probe.width = COLS*2; probe.height = 6;
const pctx = probe.getContext('2d', { willReadFrequently: true });
const acc = new Float32Array(COLS*3); let accInit = false, bandN = 0;
function bandSync(){
  if(!bandBase) return;
  if(done && heroFade && heroFade.style.opacity !== '1') heroFade.style.opacity = '1';
  if(bandN++ % 3) return;
  const cw = canvas.width, ch = canvas.height; if(!cw || !ch) return;
  const sh = Math.max(4, Math.round(ch*0.12));
  pctx.drawImage(canvas, 0, ch - sh, cw, sh, 0, 0, probe.width, probe.height);
  const d = pctx.getImageData(0, 0, probe.width, probe.height).data, w = probe.width;
  const k = accInit ? 0.18 : 1;
  for(let c=0;c<COLS;c++){
    let r=0,g=0,bb=0,n=0;
    for(let y=0;y<probe.height;y++) for(let x=c*2;x<c*2+2;x++){ const i=(y*w+x)*4; r+=d[i]; g+=d[i+1]; bb+=d[i+2]; n++; }
    acc[c*3] += (r/n - acc[c*3])*k; acc[c*3+1] += (g/n - acc[c*3+1])*k; acc[c*3+2] += (bb/n - acc[c*3+2])*k;
  }
  accInit = true;
  const st = [];
  for(let c=0;c<COLS;c++) st.push('rgb(' + (acc[c*3]|0) + ',' + (acc[c*3+1]|0) + ',' + (acc[c*3+2]|0) + ') ' + ((c+0.5)*100/COLS).toFixed(1) + '%');
  const grad = 'linear-gradient(to right, ' + st.join(', ') + ')';
  bandBase.style.background = grad;
  if(heroFade) heroFade.style.background = grad;
}
// same seam on top: the hero's top strip is averaged; the band above rises into it from paper and the
// hero's top fades into the same colours, dissolving once the scrub starts
const topG = document.getElementById('ae-topband-g'), topFade = document.getElementById('ae-topfade');
const tacc = new Float32Array(COLS*3); let taccInit = false, topN = 0;
function topSync(){
  if(!topG || topN++ % 3) return;
  const r = hero.getBoundingClientRect();
  if(topFade) topFade.style.opacity = clamp(1 + r.top/(innerHeight*0.35), 0, 1).toFixed(3);
  if(r.top > innerHeight*1.2 && taccInit) return;
  const cw = canvas.width, ch = canvas.height; if(!cw || !ch) return;
  pctx.drawImage(canvas, 0, 0, cw, Math.max(4, Math.round(ch*0.12)), 0, 0, probe.width, probe.height);
  const d = pctx.getImageData(0, 0, probe.width, probe.height).data, w = probe.width, k = taccInit ? 0.18 : 1;
  for(let c=0;c<COLS;c++){
    let rr=0,g=0,bb=0,n=0;
    for(let y=0;y<probe.height;y++) for(let x=c*2;x<c*2+2;x++){ const i=(y*w+x)*4; rr+=d[i]; g+=d[i+1]; bb+=d[i+2]; n++; }
    tacc[c*3] += (rr/n - tacc[c*3])*k; tacc[c*3+1] += (g/n - tacc[c*3+1])*k; tacc[c*3+2] += (bb/n - tacc[c*3+2])*k;
  }
  taccInit = true;
  const st = [];
  for(let c=0;c<COLS;c++) st.push('rgb(' + (tacc[c*3]|0) + ',' + (tacc[c*3+1]|0) + ',' + (tacc[c*3+2]|0) + ') ' + ((c+0.5)*100/COLS).toFixed(1) + '%');
  const grad = 'linear-gradient(to right, ' + st.join(', ') + ')';
  topG.style.background = grad; if(topFade) topFade.style.background = grad;
}
let warm = 0;
function frame(now){
  lastFrame = performance.now();
  const dpr = Math.min(devicePixelRatio||1, 1.75);
  if (canvas.width !== Math.round(innerWidth*dpr) || canvas.height !== Math.round(innerHeight*dpr)) fit();
  let T = ENTRY_T;
  if (mode === 'story') T = reduce ? HOLD : Math.min(ENTRY_T + (now - t0)/1000, HOLD);
  // while the header is being scrubbed the hero is off-screen: skip the GPU work and pixel readbacks entirely
  const hr = hero ? hero.getBoundingClientRect() : null;
  const far = mode !== 'story' && hr && (hr.top > innerHeight*1.6 || hr.bottom < -innerHeight*0.6);
  if (!far || warm < 3) { warm++; const pc = mode === 'story' ? ENTRY_T + (now - t0)/1000 : null;   // play-relative clock: every play identical
    draw(T, pc ?? now/1000, pc ?? ENTRY_T); bandSync(); topSync(); }
  if(mode === 'story' && !done && T > STORY + 0.6){ done = true; locked = false; if(arrow) arrow.style.opacity = '0.72'; }
  requestAnimationFrame(frame);
}
ready.then(() => {
  loaded = true; simReset(); fit();
  canvas.style.opacity = '1';
  requestAnimationFrame(frame);
  if(hero && hero.getBoundingClientRect().top <= innerHeight*0.3) enter();
}).catch(err => {
  document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;left:16px;bottom:16px;color:#cfe">'+err.message+'</p>');
});
})();
