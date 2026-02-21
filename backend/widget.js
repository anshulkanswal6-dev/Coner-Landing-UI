(function(){
'use strict';
var script=document.currentScript||document.querySelector('script[data-project-key]');
if(!script)return;
var PK=script.getAttribute('data-project-key');
if(!PK)return;
var API=new URL(script.src).origin+'/api';

/* ── State ── */
var SID=null,CFG={},MSGS=[],OPEN=false,VOICE=false,SENDING=false,LISTENING=false,MUTED=false,RECOG=null;
var VSTATE='idle'; // idle | listening | processing | speaking

/* ── Persistence (localStorage) ── */
var LS_KEY='ep_data_'+PK;
function saveLocal(){try{localStorage.setItem(LS_KEY,JSON.stringify({sid:SID,msgs:MSGS.slice(-50)}));}catch(e){}}
function loadLocal(){try{var d=JSON.parse(localStorage.getItem(LS_KEY));return d;}catch(e){return null;}}

/* ── Styles ── */
var css=document.createElement('style');
css.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
.ep-widget *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}

/* FAB */
.ep-fab{position:fixed;bottom:20px;right:20px;z-index:99999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s,opacity .3s;}
.ep-fab:hover{transform:scale(1.08);}
.ep-fab.hidden{transform:scale(0);opacity:0;pointer-events:none;}
.ep-fab svg{width:24px;height:24px;fill:#fff;}

/* Chat Panel */
.ep-chat{position:fixed;bottom:88px;right:20px;z-index:99998;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.12);display:none;flex-direction:column;overflow:hidden;
  transform-origin:bottom right;transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .25s;}
.ep-chat.open{display:flex;animation:epChatIn .3s ease-out both;}
.ep-chat.morphing-out{animation:epChatOut .3s ease-in both;}
@keyframes epChatIn{from{opacity:0;transform:scale(.92) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes epChatOut{from{opacity:1;transform:scale(1);}to{opacity:0;transform:scale(.88) translateY(20px);}}

/* Header */
.ep-header{padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;}
.ep-header-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;flex-shrink:0;}
.ep-header-info{flex:1;min-width:0;}
.ep-header-name{font-size:14px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ep-header-sub{font-size:11px;color:#888;}
.ep-header-btns{display:flex;gap:6px;}
.ep-hbtn{width:32px;height:32px;border:none;border-radius:8px;background:#f5f5f5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-hbtn:hover{background:#eee;}
.ep-hbtn svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

/* Messages */
.ep-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.ep-msgs::-webkit-scrollbar{width:4px;}.ep-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px;}
.ep-msg{max-width:82%;animation:epFadeIn .2s ease-out;}
.ep-msg-bot{align-self:flex-start;}.ep-msg-user{align-self:flex-end;}
.ep-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word;}
.ep-bubble-bot{background:#f4f4f5;color:#111;border-bottom-left-radius:4px;}
.ep-bubble-user{color:#fff;border-bottom-right-radius:4px;}
.ep-bubble p{margin:0 0 6px 0;}.ep-bubble p:last-child{margin:0;}
.ep-bubble code{background:rgba(0,0,0,.06);padding:1px 4px;border-radius:3px;font-size:12px;font-family:monospace;}
.ep-fb{display:flex;gap:4px;margin-top:6px;}
.ep-fb button{border:none;background:none;cursor:pointer;padding:2px 4px;border-radius:4px;opacity:.5;transition:opacity .15s;}
.ep-fb button:hover,.ep-fb button.active{opacity:1;}
.ep-fb svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
.ep-typing{display:flex;gap:4px;padding:10px 14px;background:#f4f4f5;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;}
.ep-typing span{width:6px;height:6px;border-radius:50%;background:#aaa;animation:epBounce .6s infinite alternate;}
.ep-typing span:nth-child(2){animation-delay:.15s;}.ep-typing span:nth-child(3){animation-delay:.3s;}
@keyframes epBounce{to{transform:translateY(-6px);opacity:.4;}}
@keyframes epFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

/* Input */
.ep-input-wrap{padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px;align-items:center;}
.ep-input{flex:1;border:1px solid #e5e5e5;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;transition:border .15s;background:#fafafa;}
.ep-input:focus{border-color:var(--ep-c,#7C3AED);background:#fff;}
.ep-ibtn{width:36px;height:36px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;}
.ep-ibtn:active{transform:scale(.92);}
.ep-send{background:var(--ep-c,#7C3AED);}.ep-send:disabled{opacity:.4;cursor:not-allowed;}
.ep-send svg{width:16px;height:16px;fill:#fff;}
.ep-mic{background:#f5f5f5;}
.ep-mic svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

/* ──────── Voice Island ──────── */
.ep-vi{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;pointer-events:none;}
.ep-vi.active{display:flex;pointer-events:auto;}

/* Backdrop */
.ep-vi-bg{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .4s;}
.ep-vi.active .ep-vi-bg{opacity:1;}

/* Oval container */
.ep-vi-oval{position:relative;width:340px;max-width:90vw;background:rgba(20,20,22,.92);border:1px solid rgba(255,255,255,.08);border-radius:32px;padding:40px 32px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  transform:scale(.6);opacity:0;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s .05s;}
.ep-vi.active .ep-vi-oval{transform:scale(1);opacity:1;}

/* Close btn */
.ep-vi-close{position:absolute;top:12px;right:14px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-vi-close:hover{background:rgba(255,255,255,.15);}
.ep-vi-close svg{width:14px;height:14px;stroke:#aaa;fill:none;stroke-width:2;stroke-linecap:round;}

/* Orb */
.ep-vi-orb{width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:background .4s,transform .3s;}
.ep-vi-orb:active{transform:scale(.94);}
.ep-vi-orb svg{width:36px;height:36px;fill:rgba(255,255,255,.9);position:relative;z-index:2;}
.ep-vi-orb.idle{background:var(--ep-c,#7C3AED);}
.ep-vi-orb.listening{background:#ef4444;animation:epOrbPulse 1.2s ease-in-out infinite;}
.ep-vi-orb.processing{background:#eab308;animation:epOrbSpin 1s linear infinite;}
.ep-vi-orb.speaking{background:#14b8a6;}
.ep-vi-orb.muted{background:#555;}
@keyframes epOrbPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
@keyframes epOrbSpin{from{box-shadow:0 0 0 4px rgba(234,179,8,.3);}to{box-shadow:0 0 0 20px rgba(234,179,8,0);}}

/* Rings around orb */
.ep-vi-ring{position:absolute;border-radius:50%;border:1.5px solid;opacity:0;transition:opacity .3s;}
.ep-vi-orb.listening .ep-vi-ring,.ep-vi-orb.speaking .ep-vi-ring{opacity:1;animation:epRingGrow 2s ease-in-out infinite;}
.ep-vi-ring:nth-child(1){inset:-14px;animation-delay:0s!important;}
.ep-vi-ring:nth-child(2){inset:-28px;animation-delay:.4s!important;opacity:0;}
.ep-vi-ring:nth-child(3){inset:-42px;animation-delay:.8s!important;opacity:0;}
.ep-vi-orb.listening .ep-vi-ring{border-color:rgba(239,68,68,.35);}
.ep-vi-orb.speaking .ep-vi-ring{border-color:rgba(20,184,166,.35);}
@keyframes epRingGrow{0%{transform:scale(.95);opacity:.4;}50%{transform:scale(1.06);opacity:.15;}100%{transform:scale(.95);opacity:.4;}}

/* Transcript texts */
.ep-vi-txt{text-align:center;max-width:280px;min-height:18px;}
.ep-vi-usr{font-size:11px;color:rgba(255,255,255,.4);line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ep-vi-bot{font-size:12px;color:rgba(255,255,255,.6);line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.ep-vi-lbl{font-size:13px;font-weight:500;color:rgba(255,255,255,.75);min-height:20px;}

/* Mute + controls */
.ep-vi-ctrls{display:flex;gap:12px;margin-top:4px;}
.ep-vi-ctrl{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-vi-ctrl:hover{background:rgba(255,255,255,.12);}
.ep-vi-ctrl.active{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);}
.ep-vi-ctrl svg{width:16px;height:16px;stroke:rgba(255,255,255,.7);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.ep-vi-ctrl.active svg{stroke:#ef4444;}

/* ──── Bottom Wave ──── */
.ep-vi-wave{position:fixed;bottom:0;left:0;right:0;height:60px;z-index:99997;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .4s;}
.ep-vi.active .ep-vi-wave{opacity:1;}
.ep-vi-wave svg{width:100%;height:100%;position:absolute;bottom:0;}
.ep-vi-wave .w1{animation:epW1 3s ease-in-out infinite;}
.ep-vi-wave .w2{animation:epW2 4s ease-in-out infinite;}
.ep-vi-wave .w3{animation:epW3 5s ease-in-out infinite;}
@keyframes epW1{0%,100%{transform:translateX(0);}50%{transform:translateX(-5%);}}
@keyframes epW2{0%,100%{transform:translateX(0);}50%{transform:translateX(4%);}}
@keyframes epW3{0%,100%{transform:translateX(0);}50%{transform:translateX(-3%);}}
.ep-vi-wave.listening .w1 path{fill:rgba(239,68,68,.18);}.ep-vi-wave.listening .w2 path{fill:rgba(239,68,68,.10);}.ep-vi-wave.listening .w3 path{fill:rgba(239,68,68,.05);}
.ep-vi-wave.speaking .w1 path{fill:rgba(20,184,166,.18);}.ep-vi-wave.speaking .w2 path{fill:rgba(20,184,166,.10);}.ep-vi-wave.speaking .w3 path{fill:rgba(20,184,166,.05);}
.ep-vi-wave.idle .w1 path{fill:rgba(124,58,237,.12);}.ep-vi-wave.idle .w2 path{fill:rgba(124,58,237,.07);}.ep-vi-wave.idle .w3 path{fill:rgba(124,58,237,.03);}
.ep-vi-wave.processing .w1 path{fill:rgba(234,179,8,.15);}.ep-vi-wave.processing .w2 path{fill:rgba(234,179,8,.08);}.ep-vi-wave.processing .w3 path{fill:rgba(234,179,8,.04);}
`;
document.head.appendChild(css);

/* ── SVG helpers ── */
var SVG_CHAT='<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var SVG_X='<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
var SVG_MIC='<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
var SVG_MIC_OFF='<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
var SVG_SEND='<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';

var WAVE_SVG='<svg class="w1" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0,30 C360,55 720,5 1080,30 C1260,42 1380,35 1440,30 L1440,60 L0,60 Z"/></svg><svg class="w2" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0,35 C240,10 480,50 720,25 C960,5 1200,45 1440,35 L1440,60 L0,60 Z"/></svg><svg class="w3" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0,25 C180,45 540,10 900,38 C1100,48 1320,20 1440,30 L1440,60 L0,60 Z"/></svg>';

/* ── DOM ── */
var root=document.createElement('div');root.className='ep-widget';
root.innerHTML=
'<div class="ep-chat" id="ep-chat">'+
  '<div class="ep-header">'+
    '<div class="ep-header-dot"></div>'+
    '<div class="ep-header-info"><div class="ep-header-name" id="ep-name">AI Assistant</div><div class="ep-header-sub">Online</div></div>'+
    '<div class="ep-header-btns">'+
      '<button class="ep-hbtn" id="ep-close" title="Close">'+SVG_X+'</button>'+
    '</div>'+
  '</div>'+
  '<div class="ep-msgs" id="ep-msgs"></div>'+
  '<div class="ep-input-wrap">'+
    '<button class="ep-ibtn ep-mic" id="ep-mic" title="Voice conversation">'+SVG_MIC+'</button>'+
    '<input class="ep-input" id="ep-input" placeholder="Type a message..." autocomplete="off"/>'+
    '<button class="ep-ibtn ep-send" id="ep-send" disabled>'+SVG_SEND+'</button>'+
  '</div>'+
'</div>'+

'<div class="ep-vi" id="ep-vi">'+
  '<div class="ep-vi-bg"></div>'+
  '<div class="ep-vi-oval">'+
    '<button class="ep-vi-close" id="ep-vi-x">'+SVG_X+'</button>'+
    '<div class="ep-vi-orb idle" id="ep-vi-orb">'+
      '<div class="ep-vi-ring"></div><div class="ep-vi-ring"></div><div class="ep-vi-ring"></div>'+
      '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="2"/><line x1="12" y1="19" x2="12" y2="23" stroke="rgba(255,255,255,.9)" stroke-width="2"/></svg>'+
    '</div>'+
    '<div class="ep-vi-lbl" id="ep-vi-lbl">Tap to speak</div>'+
    '<div class="ep-vi-txt"><div class="ep-vi-usr" id="ep-vi-usr"></div></div>'+
    '<div class="ep-vi-txt"><div class="ep-vi-bot" id="ep-vi-bot"></div></div>'+
    '<div class="ep-vi-ctrls">'+
      '<button class="ep-vi-ctrl" id="ep-vi-mute" title="Mute mic">'+SVG_MIC+'</button>'+
    '</div>'+
  '</div>'+
  '<div class="ep-vi-wave idle" id="ep-vi-wave">'+WAVE_SVG+'</div>'+
'</div>'+

'<button class="ep-fab" id="ep-fab" style="background:var(--ep-c,#7C3AED)">'+SVG_CHAT+'</button>';

document.body.appendChild(root);

var $=function(id){return document.getElementById(id);};
var chat=$('ep-chat'),msgsCt=$('ep-msgs'),inp=$('ep-input'),fab=$('ep-fab'),sendBtn=$('ep-send');
var vi=$('ep-vi'),viOrb=$('ep-vi-orb'),viLbl=$('ep-vi-lbl'),viUsr=$('ep-vi-usr'),viBot=$('ep-vi-bot'),viWave=$('ep-vi-wave'),viMute=$('ep-vi-mute');

function setColor(c){root.style.setProperty('--ep-c',c);}

/* ── Init ── */
function init(){
  var saved=loadLocal();
  fetch(API+'/widget/init',{method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK}})
  .then(function(r){return r.json();})
  .then(function(d){
    SID=d.session_id;CFG=d;
    $('ep-name').textContent=d.project_name||'AI Assistant';
    setColor(d.primary_color||'#7C3AED');
    /* Restore history */
    if(saved&&saved.msgs&&saved.msgs.length>0){
      MSGS=[];
      saved.msgs.forEach(function(m){renderMsg(m.role,m.text,m.id,true);});
    } else {
      renderMsg('bot',d.welcome_message||'Hi! How can I help?',null,false);
    }
    saveLocal();
  }).catch(function(){});
}
init();

/* ── Messages ── */
function renderMsg(role,text,msgId,silent){
  MSGS.push({role:role,text:text,id:msgId});
  var d=document.createElement('div');d.className='ep-msg ep-msg-'+role;
  var b=document.createElement('div');b.className='ep-bubble ep-bubble-'+role;
  if(role==='user')b.style.background='var(--ep-c,#7C3AED)';
  b.innerHTML=fmtMd(text);
  d.appendChild(b);
  if(role==='bot'&&msgId){
    var fb=document.createElement('div');fb.className='ep-fb';
    fb.innerHTML='<button data-v="1" title="Good"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-v="-1" title="Bad"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
    fb.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){sendFb(msgId,+btn.getAttribute('data-v'));btn.classList.add('active');};});
    d.appendChild(fb);
  }
  msgsCt.appendChild(d);
  msgsCt.scrollTop=msgsCt.scrollHeight;
  if(!silent)saveLocal();
  return b;
}

function mkStream(){
  var d=document.createElement('div');d.className='ep-msg ep-msg-bot';d.id='ep-strm';
  var b=document.createElement('div');b.className='ep-bubble ep-bubble-bot';
  d.appendChild(b);msgsCt.appendChild(d);msgsCt.scrollTop=msgsCt.scrollHeight;
  return b;
}
function showDots(){var t=document.createElement('div');t.className='ep-typing';t.id='ep-dots';t.innerHTML='<span></span><span></span><span></span>';msgsCt.appendChild(t);msgsCt.scrollTop=msgsCt.scrollHeight;}
function hideDots(){var t=$('ep-dots');if(t)t.remove();}
function fmtMd(t){if(!t)return'';return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/\n/g,'<br>');}
function lastMsg(role){for(var i=MSGS.length-1;i>=0;i--)if(MSGS[i].role===role)return MSGS[i].text;return'';}

/* ── Send (streaming) ── */
function sendText(text){
  if(!text||!SID||SENDING)return;
  renderMsg('user',text,null);
  inp.value='';sendBtn.disabled=true;SENDING=true;
  if(VOICE){viUsr.textContent='"'+text+'"';setVState('processing');}
  else showDots();

  fetch(API+'/widget/message/stream',{
    method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK},
    body:JSON.stringify({session_id:SID,content:text,current_url:window.location.href})
  }).then(function(resp){
    hideDots();
    var reader=resp.body.getReader(),dec=new TextDecoder(),bubble=VOICE?null:mkStream(),full='',mid=null;
    function pump(){
      reader.read().then(function(r){
        if(r.done){done();return;}
        var lines=dec.decode(r.value,{stream:true}).split('\n');
        for(var i=0;i<lines.length;i++){
          var ln=lines[i].trim();
          if(!ln.startsWith('data: '))continue;
          try{
            var p=JSON.parse(ln.slice(6));
            if(p.token){full+=p.token;if(bubble)bubble.innerHTML=fmtMd(full);if(VOICE)viBot.textContent=full.slice(-120);msgsCt.scrollTop=msgsCt.scrollHeight;}
            if(p.done)mid=p.message_id;
          }catch(e){}
        }
        pump();
      }).catch(function(){done();});
    }
    function done(){
      var s=$('ep-strm');if(s){s.removeAttribute('id');MSGS.push({role:'bot',text:full,id:mid});}
      if(!VOICE&&mid){
        var fb=document.createElement('div');fb.className='ep-fb';
        fb.innerHTML='<button data-v="1"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-v="-1"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
        fb.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){sendFb(mid,+btn.getAttribute('data-v'));btn.classList.add('active');};});
        if(s)s.appendChild(fb);
      }
      if(VOICE&&full){
        MSGS.push({role:'bot',text:full,id:mid});
        speakTTS(full);
      } else if(VOICE){setVState('idle');}
      SENDING=false;sendBtn.disabled=!inp.value.trim();
      saveLocal();
    }
    pump();
  }).catch(function(){hideDots();SENDING=false;if(VOICE)setVState('idle');renderMsg('bot','Something went wrong.',null);});
}

function sendFb(mid,v){fetch(API+'/widget/feedback',{method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK},body:JSON.stringify({message_id:mid,feedback:v})}).catch(function(){});}

/* ── TTS ── */
function speakTTS(text){
  if(!('speechSynthesis' in window)){setVState('idle');return;}
  window.speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(text.replace(/[#*_`>\[\]]/g,'').slice(0,500));
  u.rate=1.05;u.pitch=1;
  setVState('speaking');
  u.onend=function(){
    if(!VOICE)return;
    setVState('idle');
    /* Auto-listen again after AI finishes speaking */
    if(!MUTED)setTimeout(function(){if(VOICE&&VSTATE==='idle')startListening();},600);
  };
  u.onerror=function(){setVState('idle');};
  window.speechSynthesis.speak(u);
}

/* ── Voice State ── */
function setVState(s){
  VSTATE=s;
  viOrb.className='ep-vi-orb '+(MUTED&&s==='idle'?'muted':s);
  viWave.className='ep-vi-wave '+s;
  var labels={idle:'Tap to speak',listening:'Listening...',processing:'Thinking...',speaking:'Speaking...'};
  if(MUTED&&s==='idle')viLbl.textContent='Muted — tap orb to speak';
  else viLbl.textContent=labels[s]||'';
}

/* ── STT ── */
function startListening(){
  if(MUTED||LISTENING||SENDING)return;
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){viLbl.textContent='Not supported';return;}
  window.speechSynthesis.cancel();
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  RECOG=new SR();RECOG.continuous=false;RECOG.interimResults=false;RECOG.lang='';
  RECOG.onstart=function(){LISTENING=true;setVState('listening');};
  RECOG.onresult=function(e){var t=e.results[0][0].transcript;LISTENING=false;sendText(t);};
  RECOG.onerror=function(){LISTENING=false;setVState('idle');};
  RECOG.onend=function(){LISTENING=false;if(VSTATE==='listening')setVState('idle');};
  RECOG.start();
}

function stopListening(){if(RECOG){try{RECOG.stop();}catch(e){}}LISTENING=false;}

/* ════════ Events ════════ */

/* FAB */
fab.onclick=function(){
  if(VOICE)return;
  OPEN=!OPEN;
  if(OPEN){chat.classList.remove('morphing-out');chat.classList.add('open');fab.innerHTML=SVG_X;}
  else{chat.classList.add('morphing-out');setTimeout(function(){chat.classList.remove('open','morphing-out');},300);fab.innerHTML=SVG_CHAT;}
};

/* Close chat */
$('ep-close').onclick=function(){
  OPEN=false;chat.classList.add('morphing-out');
  setTimeout(function(){chat.classList.remove('open','morphing-out');},300);
  fab.innerHTML=SVG_CHAT;
};

/* Input */
inp.oninput=function(){sendBtn.disabled=!inp.value.trim()||SENDING;};
inp.onkeydown=function(e){if(e.key==='Enter')sendText(inp.value.trim());};
sendBtn.onclick=function(){sendText(inp.value.trim());};

/* ── Mic button → open Voice Island ── */
$('ep-mic').onclick=function(){openVoice();};

function openVoice(){
  VOICE=true;MUTED=false;
  viMute.classList.remove('active');viMute.innerHTML=SVG_MIC;
  viUsr.textContent=lastMsg('user')?'"'+lastMsg('user').slice(0,80)+'"':'';
  viBot.textContent=lastMsg('bot')?lastMsg('bot').slice(0,120):'';
  /* Morph: hide chat → hide fab → show island */
  if(OPEN){chat.classList.add('morphing-out');setTimeout(function(){chat.classList.remove('open','morphing-out');},280);}
  fab.classList.add('hidden');
  setTimeout(function(){vi.classList.add('active');setVState('idle');},OPEN?300:50);
  OPEN=false;
}

/* Close voice island */
$('ep-vi-x').onclick=closeVoice;
function closeVoice(){
  stopListening();window.speechSynthesis.cancel();
  vi.classList.remove('active');VOICE=false;VSTATE='idle';MUTED=false;
  setTimeout(function(){fab.classList.remove('hidden');fab.innerHTML=SVG_CHAT;},350);
}

/* Orb tap → start listening */
viOrb.onclick=function(){
  if(VSTATE==='idle'||VSTATE==='muted'){if(MUTED){MUTED=false;viMute.classList.remove('active');viMute.innerHTML=SVG_MIC;}startListening();}
  else if(VSTATE==='listening'){stopListening();}
  else if(VSTATE==='speaking'){window.speechSynthesis.cancel();setVState('idle');}
};

/* Mute toggle */
viMute.onclick=function(){
  MUTED=!MUTED;
  if(MUTED){stopListening();viMute.classList.add('active');viMute.innerHTML=SVG_MIC_OFF;if(VSTATE==='listening'||VSTATE==='idle')setVState('idle');}
  else{viMute.classList.remove('active');viMute.innerHTML=SVG_MIC;}
};
})();
