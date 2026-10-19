(function(){
'use strict';

/* Kerala auto-rickshaw tariff (revision effective 1 May 2022).
   min    = minimum fare in Rs, covers the first minKm km
   km     = Rs per extra km after the minimum distance
   wait   = Rs per minute of waiting (Rs 10 per 15 minutes = 0.67)
   night  = extra % of the fare at night
   from/to = night hours (22 = 10 pm, 5 = 5 am)
   Check the latest order from the Kerala Motor Vehicles Department and update here if it changes. */
const DEF={min:30,minKm:1.5,km:15,wait:0.67,night:50,from:22,to:5};
let T={...DEF};
try{Object.assign(T,JSON.parse(localStorage.getItem('tariffKL2022')||'{}'))}catch(e){}
const $=id=>document.getElementById(id);
let payee='Auto driver';
const isNight=()=>{const h=new Date().getHours();return T.from>T.to?(h>=T.from||h<T.to):(h>=T.from&&h<T.to)};
const calc=(km,w,n)=>{let f=km<=T.minKm?T.min:T.min+(km-T.minKm)*T.km;f+=w*T.wait;if(n)f*=1+T.night/100;return Math.round(f)};
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const hav=(a,b,c,d)=>{const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,q=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 12742000*Math.asin(Math.sqrt(q))};

/* ---------- Map ---------- */
const map=L.map('map').setView([10.7867,76.6548],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
let routeLine=null,pins=[],route=[],fromPt=null,planKm=0;
const trail=L.polyline([],{color:'#d6341f',weight:6}).addTo(map);
const me=L.circleMarker([0,0],{radius:9,color:'#fff',weight:3,fillColor:'#1c6ef2',fillOpacity:1});

window.addEventListener('load',()=>map.invalidateSize());

/* ---------- Tabs ---------- */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('hide',t.id!==b.dataset.tab));
});

/* ---------- Plan trip ---------- */
async function geocode(q){
  const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q='+encodeURIComponent(q));
  const j=await r.json();
  if(!j.length)throw new Error('Could not find "'+q+'". Try a nearby landmark.');
  return {lat:+j[0].lat,lng:+j[0].lon};
}
$('locBtn').onclick=()=>navigator.geolocation.getCurrentPosition(p=>{
  fromPt={lat:p.coords.latitude,lng:p.coords.longitude};$('from').value='My location';
},()=>$('planMsg').textContent='Allow location access to use this button.');
$('routeBtn').onclick=async()=>{
  const msg=$('planMsg');msg.textContent='Finding route…';
  try{
    const a=($('from').value==='My location'&&fromPt)?fromPt:await geocode($('from').value);
    const b=await geocode($('to').value);
    const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
    const j=await r.json();
    if(!j.routes||!j.routes.length)throw new Error('No road route found.');
    const rt=j.routes[0];
    route=rt.geometry.coordinates.map(c=>[c[1],c[0]]);
    if(routeLine)map.removeLayer(routeLine);pins.forEach(p=>map.removeLayer(p));
    routeLine=L.polyline(route,{color:'#1c2b24',weight:6}).addTo(map);
    pins=[L.marker([a.lat,a.lng]).addTo(map),L.marker([b.lat,b.lng]).addTo(map)];
    map.fitBounds(routeLine.getBounds(),{padding:[30,30]});
    planKm=rt.distance/1000;
    $('pKm').textContent=planKm.toFixed(1)+' km';$('pMin').textContent=Math.round(rt.duration/60)+' min';
    $('pn').checked=isNight();$('planOut').classList.remove('hide');msg.textContent='';
    showPlan();
  }catch(e){msg.textContent=e.message||'Something went wrong. Check your internet.'}
};
function showPlan(){
  if(!planKm)return;
  const f=calc(planKm,+$('pw').value||0,$('pn').checked);
  $('pFare').textContent='₹'+f;
  const a=parseFloat($('pAsk').value),v=$('pVerdict');
  if(isNaN(a)){v.textContent='';return}
  const d=a-f;v.className='hint '+(d<=0?'ok':'bad');
  v.textContent=d<=0?'This price is fair.':'The driver is asking ₹'+d+' more than the tariff fare.';
}
['pw','pn','pAsk'].forEach(id=>$(id).oninput=showPlan);

/* ---------- Live ride ---------- */
const S={on:false,dist:0,wait:0,last:null,speed:0,watch:null,timer:null,pos:null,i:0,fare:0};
function render(){
  S.fare=calc(S.dist/1000,S.wait/60,isNight());
  $('fare').textContent=S.fare;$('dist').textContent=(S.dist/1000).toFixed(2)+' km';
  $('wait').textContent=mmss(S.wait);$('nf').textContent=isNight()?'On':'Off';
}
const status=t=>$('status').textContent=t;
function fix(lat,lng,acc,dt){
  S.pos={lat,lng};me.setLatLng([lat,lng]).addTo(map);
  if(acc>40){status('GPS signal is weak. Waiting for a better fix…');return}
  if(S.last){
    const d=hav(S.last.lat,S.last.lng,lat,lng);
    if(d<4)S.speed=0;else{S.dist+=d;S.speed=d/Math.max(dt,1);S.last={lat,lng};trail.addLatLng([lat,lng])}
  }else{S.last={lat,lng};trail.addLatLng([lat,lng])}
  map.panTo([lat,lng]);render();
}
$('startBtn').onclick=()=>{
  Object.assign(S,{on:true,dist:0,wait:0,last:null,speed:0,i:0});trail.setLatLngs([]);
  $('startBtn').classList.add('hide');$('endBtn').classList.remove('hide');$('summary').classList.add('hide');
  if($('demo').checked){
    if(route.length<2){status('Plan a trip first, then run demo mode.');endRide(true);return}
    status('Demo ride running.');
  }else{
    if(!navigator.geolocation){status('No GPS on this device. Use demo mode.');endRide(true);return}
    status('Finding your location…');let t=Date.now();
    S.watch=navigator.geolocation.watchPosition(p=>{const n=Date.now();fix(p.coords.latitude,p.coords.longitude,p.coords.accuracy,(n-t)/1000);t=n;status('Tracking by GPS. Accuracy about '+Math.round(p.coords.accuracy)+' m.')},
      e=>status(e.code===1?'Location is blocked. Allow it, or use demo mode.':'Could not get GPS.'),{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  }
  S.timer=setInterval(()=>{
    if($('demo').checked){
      if(S.i%30<24&&S.i<route.length-1){S.i+=2;const p=route[Math.min(S.i,route.length-1)];fix(p[0],p[1],5,1)}else S.speed=0;
      S.i++;
    }
    if(S.speed<1.2)S.wait++;
    render();
  },1000);
  render();
};
function endRide(silent){
  S.on=false;clearInterval(S.timer);
  if(S.watch!==null){navigator.geolocation.clearWatch(S.watch);S.watch=null}
  $('endBtn').classList.add('hide');$('startBtn').classList.remove('hide');
  if(silent)return;
  status('Ride ended.');render();
  $('summary').classList.remove('hide');$('sumFare').textContent='₹'+S.fare;
  $('sumDetail').textContent=(S.dist/1000).toFixed(2)+' km, '+mmss(S.wait)+' waiting'+(isNight()?', night rate included':'');
  asked();pay();
  try{const h=JSON.parse(localStorage.getItem('rides')||'[]');h.unshift({t:new Date().toLocaleString(),km:(S.dist/1000).toFixed(2),f:S.fare});localStorage.setItem('rides',JSON.stringify(h.slice(0,5)))}catch(e){}
  hist();
}
$('endBtn').onclick=()=>endRide(false);
function asked(){
  const a=parseFloat($('asked').value),el=$('askedOut');
  if(isNaN(a)){el.textContent='';return}
  const d=a-S.fare;el.className='hint '+(d<=0?'ok':'bad');
  el.textContent=d<=0?'That is fair. You are not overpaying.':'The driver asked ₹'+d+' more than the meter fare.';
}
function pay(){
  const u=$('upi').value.trim(),a=$('pay');
  a.href=u?`upi://pay?pa=${encodeURIComponent(u)}&pn=${encodeURIComponent(payee)}&am=${S.fare}&cu=INR&tn=${encodeURIComponent('Auto fare')}`:'#';
  a.style.opacity=u?1:.55;
}
$('asked').oninput=asked;$('upi').oninput=()=>{payee='Auto driver';pay()};
const payMsgEl=document.createElement('div');payMsgEl.className='hint';$('pay').parentNode.after(payMsgEl);
const payMsg=t=>payMsgEl.textContent=t;
const isPhone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
$('pay').onclick=async e=>{
  const a=e.currentTarget,link=a.getAttribute('href');
  if(link==='#'){e.preventDefault();payMsg('Type the driver\u2019s UPI ID first.');$('upi').focus();return}
  if(!isPhone){
    e.preventDefault();
    try{await navigator.clipboard.writeText(link)}catch(err){}
    payMsg('UPI payment opens only on a phone with a UPI app (GPay, PhonePe, Paytm). Open this page on your phone to pay. The payment link was copied.');
  }else payMsg('Opening your UPI app\u2026 If nothing opens, check that a UPI app is installed.');
};
$('shareBtn').onclick=async()=>{
  const l=S.pos?' Location: https://www.openstreetmap.org/?mlat='+S.pos.lat+'&mlon='+S.pos.lng+'#map=17/'+S.pos.lat+'/'+S.pos.lng:'';
  const t='I am in an auto. Distance '+(S.dist/1000).toFixed(2)+' km, fare ₹'+S.fare+'.'+l;
  try{if(navigator.share){await navigator.share({text:t});return}}catch(err){if(err&&err.name==='AbortError')return}
  try{await navigator.clipboard.writeText(t);payMsg('Trip details copied. Paste them in WhatsApp or Messages.')}catch(err){payMsg('Opening WhatsApp\u2026')}
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
};
function hist(){
  let h=[];try{h=JSON.parse(localStorage.getItem('rides')||'[]')}catch(e){}
  $('hist').textContent='';h.forEach(r=>{const li=document.createElement('li');li.textContent=`${r.t}: ${r.km} km, ₹${r.f}`;$('hist').appendChild(li)});
  $('histCard').classList.toggle('hide',!h.length);
}

/* ---------- Scan the driver's UPI QR code with the camera ---------- */
const scanBtn=document.createElement('button');
scanBtn.type='button';scanBtn.className='main ghost';scanBtn.textContent='📷 Scan driver’s QR code';
$('upi').after(scanBtn);
let stream=null,scanning=false;
const box=document.createElement('div');
box.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;color:#fff;text-align:center';
const vid=document.createElement('video');vid.setAttribute('playsinline','');vid.muted=true;
vid.style.cssText='width:100%;max-width:420px;border-radius:16px;border:4px solid #f7c61b';
const boxMsg=document.createElement('div');
const cancel=document.createElement('button');cancel.type='button';cancel.className='main stop';cancel.style.maxWidth='420px';cancel.textContent='Cancel';
box.append(vid,boxMsg,cancel);document.body.appendChild(box);
function stopScan(){
  scanning=false;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  vid.srcObject=null;box.style.display='none';
}
cancel.onclick=stopScan;
const loadJsQR=()=>new Promise((ok,no)=>{
  if(window.jsQR)return ok();
  const sc=document.createElement('script');
  sc.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  sc.onload=ok;sc.onerror=()=>no(new Error('Could not load the QR reader. Check your internet.'));
  document.head.appendChild(sc);
});
function readUpi(text){
  if(!/^upi:\/\/pay\?/i.test(text))return null;
  const q=new URLSearchParams(text.split('?')[1]);
  const pa=(q.get('pa')||'').trim();
  return pa?{pa,pn:(q.get('pn')||'').trim()}:null;
}
scanBtn.onclick=async()=>{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    payMsg('The camera is not available here. Open the https link on your phone, or type the UPI ID.');return;
  }
  try{
    await loadJsQR();
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  }catch(err){
    payMsg(err&&err.name==='NotAllowedError'?'Camera permission is blocked. Allow the camera, or type the UPI ID.':((err&&err.message)||'Could not start the camera.'));
    stopScan();return;
  }
  vid.srcObject=stream;await vid.play();
  box.style.display='flex';boxMsg.textContent='Point the camera at the driver’s QR code';
  scanning=true;
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  const loop=()=>{
    if(!scanning)return;
    if(vid.readyState>=2&&vid.videoWidth){
      const k=Math.min(1,640/vid.videoWidth);
      cv.width=Math.round(vid.videoWidth*k);cv.height=Math.round(vid.videoHeight*k);
      cx.drawImage(vid,0,0,cv.width,cv.height);
      const img=cx.getImageData(0,0,cv.width,cv.height);
      const code=window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});
      if(code&&code.data){
        const r=readUpi(code.data);
        if(r){
          stopScan();$('upi').value=r.pa;payee=r.pn||'Auto driver';pay();
          payMsg('QR scanned: '+(r.pn?r.pn+' ':'')+'('+r.pa+'). Check that the name is correct before you pay.');
          return;
        }
        boxMsg.textContent='This is not a UPI payment QR. Try the driver’s payment QR.';
      }
    }
    requestAnimationFrame(loop);
  };
  loop();
};

/* ---------- Fare chart and tariff ---------- */
function chart(){
  const rows=[];
  for(let k=1;k<=20;k++)rows.push(`<tr><td>${k} km</td><td>₹${calc(k,0,false)}</td><td>₹${calc(k,0,true)}</td></tr>`);
  $('chartBody').innerHTML=rows.join('');
}
const M={min:'tMin',minKm:'tMinKm',km:'tKm',wait:'tWait',night:'tNight',from:'tFrom',to:'tTo'};
const fill=()=>Object.keys(M).forEach(k=>$(M[k]).value=T[k]);
function readT(){
  Object.keys(M).forEach(k=>{const v=parseFloat($(M[k]).value);if(!isNaN(v))T[k]=v});
  try{localStorage.setItem('tariffKL2022',JSON.stringify(T))}catch(e){}
  chart();render();showPlan();
}
Object.values(M).forEach(id=>$(id).oninput=readT);
$('resetT').onclick=()=>{T={...DEF};fill();readT()};
fill();chart();render();hist();pay();
})();
