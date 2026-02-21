(function(){
'use strict';
var script=document.currentScript||document.querySelector('script[data-project-key]');
if(!script)return;
var PK=script.getAttribute('data-project-key');
if(!PK)return;
var API=new URL(script.src).origin+'/api';

/* ── State ── */
var SID=null,CFG={},MSGS=[],OPEN=false,VOICE=false,SENDING=false,MUTED=false,RECOG=null,IREC=null;
var VSTATE='idle'; // idle | listening | processing | speaking
var LAST_FINAL_TXT='',LAST_FINAL_TIME=0,SILENCE_TIMER=null,CURR_UTT=null;
/* Preview detection: in an iframe = Emergent sandbox/preview, top-level = production embed */
var IS_IFRAME=(window.self!==window.top);
/* Voice selection */
var SELECTED_VOICE=null,VOICE_READY=false;
/* TTS queue for sentence chunking */
var TTS_QUEUE=[],TTS_ACTIVE=false;
/* Web Audio API for real mic visualization */
var AUDIO_CTX=null,ANALYSER=null,MIC_STREAM=null,ANIM_FRAME=null;
/* SSE stream reference for cleanup */
var ACTIVE_SSE_READER=null;
/* Debounce localStorage */
var SAVE_TIMEOUT=null;

/* ── Persistence (debounced) ── */
var LS_KEY='ep_data_'+PK;
function saveLocal(){
  clearTimeout(SAVE_TIMEOUT);
  SAVE_TIMEOUT=setTimeout(function(){
    try{localStorage.setItem(LS_KEY,JSON.stringify({sid:SID,msgs:MSGS.slice(-50)}));}catch(e){}
  },300);
}
function loadLocal(){try{return JSON.parse(localStorage.getItem(LS_KEY));}catch(e){return null;}}

/* ── CSS ── */
var css=document.createElement('style');
css.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
.ep-widget *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}

/* ── FAB ── */
.ep-fab{position:fixed;bottom:20px;right:20px;z-index:99999;background:var(--ep-c,#7C3AED);width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.15);transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s,opacity .2s;}
.ep-fab:hover{transform:scale(1.08);}
.ep-fab svg{width:24px;height:24px;fill:#fff;}

/* ── Chat Panel ── */
.ep-chat{position:fixed;bottom:88px;right:20px;z-index:99998;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.12);display:none;flex-direction:column;overflow:hidden;transform-origin:bottom right;}
.ep-chat.open{display:flex;animation:epChatIn .3s cubic-bezier(.4,0,.2,1) both;}
.ep-chat.morphing-out{animation:epChatOut .28s cubic-bezier(.4,0,.2,1) both;}
@keyframes epChatIn{from{opacity:0;transform:scale(.92) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes epChatOut{from{opacity:1;transform:scale(1);}to{opacity:0;transform:scale(.88) translateY(20px);}}

/* ── Header ── */
.ep-header{padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;}
.ep-header-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;flex-shrink:0;}
.ep-header-info{flex:1;min-width:0;}
.ep-header-name{font-size:14px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ep-header-sub{font-size:11px;color:#888;}
.ep-hbtn{width:32px;height:32px;border:none;border-radius:8px;background:#f5f5f5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-hbtn:hover{background:#eee;}
.ep-hbtn svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

/* ── Messages ── */
.ep-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.ep-msgs::-webkit-scrollbar{width:4px;}.ep-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px;}
.ep-msg{max-width:82%;animation:epFadeUp .2s ease-out;}
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
@keyframes epFadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

/* ── Input bar ── */
.ep-input-wrap{padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px;align-items:center;}
.ep-input{flex:1;border:1px solid #e5e5e5;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;transition:border .15s;background:#fafafa;}
.ep-input:focus{border-color:var(--ep-c,#7C3AED);background:#fff;}
.ep-ibtn{width:36px;height:36px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;}
.ep-ibtn:active{transform:scale(.92);}
.ep-send{background:var(--ep-c,#7C3AED);}.ep-send:disabled{opacity:.4;cursor:not-allowed;}
.ep-send svg{width:16px;height:16px;fill:#fff;}
.ep-mic-btn{background:#f5f5f5;}
.ep-mic-btn svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

/* ══════════════════════════════════════════
   VOICE ISLAND — bottom-center cinematic
   ══════════════════════════════════════════ */

/* Backdrop */
.ep-vi-bg{
  position:fixed;inset:0;z-index:99999;
  background:rgba(0,0,0,0);
  pointer-events:none;
  transition:background .32s cubic-bezier(.4,0,.2,1),backdrop-filter .32s;
}
.ep-vi-bg.active{
  background:rgba(0,0,0,.52);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  pointer-events:auto;
}

/* Island pill — fixed bottom-center */
.ep-vi-island{
  position:fixed;
  bottom:24px;
  left:50%;
  z-index:100000;
  width:320px;
  max-width:calc(100vw - 32px);
  background:rgba(0,0,0,.75);
  border:1px solid rgba(255,255,255,.08);
  border-radius:50%;
  backdrop-filter:blur(24px);
  -webkit-backdrop-filter:blur(24px);
  transform:translateX(-50%) scale(0.17);
  opacity:0;
  pointer-events:none;
}
.ep-vi-island.vi-entering{
  pointer-events:none;
  animation:epViIn 320ms cubic-bezier(.4,0,.2,1) forwards;
}
.ep-vi-island.vi-open{
  transform:translateX(-50%) scale(1);
  border-radius:32px;
  opacity:1;
  pointer-events:auto;
}
.ep-vi-island.vi-leaving{
  pointer-events:none;
  animation:epViOut 280ms cubic-bezier(.4,0,.2,1) forwards;
}

/* Morph: FAB position → bottom-center, circle → pill */
@keyframes epViIn{
  0%{
    transform:translateX(calc(-50% + var(--vi-dx,42vw))) scale(.17);
    border-radius:50%;
    opacity:.35;
  }
  52%{
    transform:translateX(-50%) scale(.17);
    border-radius:28px;
    opacity:1;
  }
  100%{
    transform:translateX(-50%) scale(1);
    border-radius:32px;
    opacity:1;
  }
}
@keyframes epViOut{
  0%{
    transform:translateX(-50%) scale(1);
    border-radius:32px;
    opacity:1;
  }
  48%{
    transform:translateX(-50%) scale(.17);
    border-radius:28px;
    opacity:1;
  }
  100%{
    transform:translateX(calc(-50% + var(--vi-dx,42vw))) scale(.17);
    border-radius:50%;
    opacity:0;
  }
}

/* Island body */
.ep-vi-body{
  display:flex;flex-direction:column;align-items:center;
  gap:10px;padding:26px 22px 18px;
}
.ep-vi-x-btn{
  position:absolute;top:10px;right:10px;
  width:26px;height:26px;border-radius:50%;border:none;
  background:rgba(255,255,255,.06);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .15s;
}
.ep-vi-x-btn:hover{background:rgba(255,255,255,.14);}
.ep-vi-x-btn svg{width:11px;height:11px;stroke:rgba(255,255,255,.55);fill:none;stroke-width:2.5;stroke-linecap:round;}

/* ── Orb ── */
.ep-vi-orb{
  position:relative;
  width:80px;height:80px;
  border-radius:50%;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
  transition:transform .2s cubic-bezier(.4,0,.2,1);
  z-index:1;
}
.ep-vi-orb:active{transform:scale(.93)!important;}

.ep-vi-orb-bg{
  position:absolute;inset:0;border-radius:50%;
  transition:background .4s,box-shadow .4s;
}
.ep-vi-orb.idle .ep-vi-orb-bg{
  background:var(--ep-c,#7C3AED);
  box-shadow:0 0 22px rgba(124,58,237,.4),0 0 0 6px rgba(124,58,237,.1);
}
.ep-vi-orb.muted .ep-vi-orb-bg{background:#3f3f46;box-shadow:none;}
.ep-vi-orb.listening .ep-vi-orb-bg{
  background:#ef4444;
  box-shadow:0 0 28px rgba(239,68,68,.55),0 0 0 10px rgba(239,68,68,.12),0 0 0 22px rgba(239,68,68,.05);
  animation:epOrbP .88s ease-in-out infinite;
}
.ep-vi-orb.processing .ep-vi-orb-bg{
  background:rgba(12,12,16,.9);
  box-shadow:0 0 18px rgba(124,58,237,.25);
}
.ep-vi-orb.speaking .ep-vi-orb-bg{
  background:#14b8a6;
  box-shadow:0 0 26px rgba(20,184,166,.5),0 0 0 10px rgba(20,184,166,.1),0 0 0 22px rgba(20,184,166,.04);
  animation:epOrbP 1.85s ease-in-out infinite;
}
@keyframes epOrbP{0%,100%{transform:scale(1);}50%{transform:scale(1.07);}}

/* Processing spinner ring */
.ep-vi-spin{
  position:absolute;inset:-5px;border-radius:50%;
  border:2px solid transparent;
  border-top-color:var(--ep-c,#7C3AED);
  border-right-color:rgba(124,58,237,.25);
  opacity:0;transition:opacity .3s;
}
.ep-vi-orb.processing .ep-vi-spin{opacity:1;animation:epSpin .88s linear infinite;}
@keyframes epSpin{to{transform:rotate(360deg);}}

/* Orb mic icon */
.ep-vi-orb-icon{position:relative;z-index:2;width:30px;height:30px;}

/* ── Audio bars (below orb) ── */
.ep-vi-bars{
  display:flex;align-items:flex-end;gap:2.5px;
  height:20px;
  opacity:0;
  transition:opacity .35s;
}
.ep-vi-island[data-vstate=listening] .ep-vi-bars,
.ep-vi-island[data-vstate=speaking] .ep-vi-bars{opacity:1;}
.ep-vi-bar{
  width:2.5px;min-height:3px;border-radius:2px;
  background:rgba(255,255,255,.75);
  transform-origin:bottom;
}
/* Listening: fast energetic bars */
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(1){animation:epBar .40s ease-in-out 0.00s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(2){animation:epBar .40s ease-in-out 0.06s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(3){animation:epBar .40s ease-in-out 0.12s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(4){animation:epBar .40s ease-in-out 0.18s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(5){animation:epBar .40s ease-in-out 0.12s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(6){animation:epBar .40s ease-in-out 0.06s infinite alternate;}
.ep-vi-island[data-vstate=listening] .ep-vi-bar:nth-child(7){animation:epBar .40s ease-in-out 0.00s infinite alternate;}
/* Speaking: smooth rhythmic bars */
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(1){animation:epBar 1.10s ease-in-out 0.00s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(2){animation:epBar 1.10s ease-in-out 0.15s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(3){animation:epBar 1.10s ease-in-out 0.30s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(4){animation:epBar 1.10s ease-in-out 0.42s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(5){animation:epBar 1.10s ease-in-out 0.30s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(6){animation:epBar 1.10s ease-in-out 0.15s infinite alternate;}
.ep-vi-island[data-vstate=speaking] .ep-vi-bar:nth-child(7){animation:epBar 1.10s ease-in-out 0.00s infinite alternate;}
@keyframes epBar{from{height:3px;}to{height:17px;}}

/* ── State label ── */
.ep-vi-lbl{
  font-size:12px;font-weight:500;letter-spacing:.2px;
  color:rgba(255,255,255,.6);min-height:16px;
  transition:color .2s;
}

/* ── Transcript panel ── */
.ep-vi-transcript{
  text-align:center;width:100%;padding:0 6px;
  min-height:44px;
}
.ep-vi-usr-line{
  font-size:11.5px;line-height:1.5;
  color:rgba(255,255,255,.5);
  overflow:hidden;display:-webkit-box;
  -webkit-line-clamp:2;-webkit-box-orient:vertical;
  min-height:17px;transition:color .2s;
}
.ep-vi-usr-line.live{color:rgba(255,255,255,.85);font-style:italic;}
.ep-vi-bot-line{
  font-size:11px;line-height:1.5;
  color:rgba(255,255,255,.35);margin-top:5px;
  overflow:hidden;display:-webkit-box;
  -webkit-line-clamp:3;-webkit-box-orient:vertical;
}

/* ── Controls ── */
.ep-vi-ctrls{display:flex;gap:10px;margin-top:2px;}
.ep-vi-ctrl{
  width:36px;height:36px;border-radius:50%;
  border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.05);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .15s,border-color .15s;
}
.ep-vi-ctrl:hover{background:rgba(255,255,255,.1);}
.ep-vi-ctrl.on{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);}
.ep-vi-ctrl svg{width:14px;height:14px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

/* ── Bottom wave ── */
.ep-vi-wave{
  position:fixed;bottom:0;left:0;right:0;height:62px;
  z-index:99998;pointer-events:none;overflow:hidden;
  opacity:0;transition:opacity .4s;
}
.ep-vi-wave.show{opacity:1;}
.ep-vi-wave svg{width:100%;height:100%;position:absolute;bottom:0;}
.ep-vi-wave .w1{animation:epW1 3s ease-in-out infinite;}
.ep-vi-wave .w2{animation:epW2 4.3s ease-in-out infinite;}
.ep-vi-wave .w3{animation:epW3 5.6s ease-in-out infinite;}
@keyframes epW1{0%,100%{transform:translateX(0);}50%{transform:translateX(-4%);}}
@keyframes epW2{0%,100%{transform:translateX(0);}50%{transform:translateX(3.5%);}}
@keyframes epW3{0%,100%{transform:translateX(0);}50%{transform:translateX(-2.5%);}}
/* Wave color states */
.ep-vi-wave[data-s=idle] .w1 path{fill:rgba(124,58,237,.09);}.ep-vi-wave[data-s=idle] .w2 path{fill:rgba(124,58,237,.05);}.ep-vi-wave[data-s=idle] .w3 path{fill:rgba(124,58,237,.025);}
.ep-vi-wave[data-s=listening] .w1 path{fill:rgba(239,68,68,.17);}.ep-vi-wave[data-s=listening] .w2 path{fill:rgba(239,68,68,.09);}.ep-vi-wave[data-s=listening] .w3 path{fill:rgba(239,68,68,.04);}
.ep-vi-wave[data-s=processing] .w1 path{fill:rgba(124,58,237,.13);}.ep-vi-wave[data-s=processing] .w2 path{fill:rgba(124,58,237,.07);}.ep-vi-wave[data-s=processing] .w3 path{fill:rgba(124,58,237,.033);}
.ep-vi-wave[data-s=speaking] .w1 path{fill:rgba(20,184,166,.15);}.ep-vi-wave[data-s=speaking] .w2 path{fill:rgba(20,184,166,.08);}.ep-vi-wave[data-s=speaking] .w3 path{fill:rgba(20,184,166,.038);}

@media (prefers-reduced-motion: reduce){
  .ep-vi-island.vi-entering{animation:epViInFast 80ms ease both;}
  .ep-vi-island.vi-leaving{animation:epViOutFast 60ms ease both;}
  @keyframes epViInFast{from{opacity:0;transform:translateX(-50%) scale(.8);}to{opacity:1;transform:translateX(-50%) scale(1);border-radius:32px;}}
  @keyframes epViOutFast{to{opacity:0;transform:translateX(-50%) scale(.8);}}
}
`;
document.head.appendChild(css);

/* ── SVGs ── */
var SVG_CHAT='<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var SVG_X_16='<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
var SVG_X_11='<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:rgba(255,255,255,.55);fill:none;stroke-width:2.5;stroke-linecap:round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
var SVG_SEND='<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
var MIC_ICON='<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="rgba(255,255,255,.9)" stroke="none"/><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="rgba(255,255,255,.9)" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="23" x2="16" y2="23" stroke="rgba(255,255,255,.9)" stroke-width="2" stroke-linecap="round"/>';
var SVG_CTRL_MIC='<svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="rgba(255,255,255,.65)" stroke="none"/><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="rgba(255,255,255,.65)" stroke-width="2" stroke-linecap="round"/></svg>';
var SVG_CTRL_MIC_OFF='<svg viewBox="0 0 24 24" style="width:14px;height:14px"><line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><path d="M9 9v3a3 3 0 005.12 2.12" fill="none" stroke="rgba(239,68,68,.8)" stroke-width="2" stroke-linecap="round"/><path d="M15 9.34V4a3 3 0 00-5.94-.6" fill="none" stroke="rgba(239,68,68,.8)" stroke-width="2" stroke-linecap="round"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2" fill="none" stroke="rgba(239,68,68,.8)" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="rgba(239,68,68,.8)" stroke-width="2" stroke-linecap="round"/></svg>';
var BARS_HTML='<div class="ep-vi-bar"></div><div class="ep-vi-bar"></div><div class="ep-vi-bar"></div><div class="ep-vi-bar"></div><div class="ep-vi-bar"></div><div class="ep-vi-bar"></div><div class="ep-vi-bar"></div>';
var WAVE_SVG='<svg class="w1" viewBox="0 0 1440 62" preserveAspectRatio="none"><path d="M0,30 C360,56 720,6 1080,30 C1260,42 1380,36 1440,30 L1440,62 L0,62 Z"/></svg><svg class="w2" viewBox="0 0 1440 62" preserveAspectRatio="none"><path d="M0,36 C240,10 480,52 720,26 C960,4 1200,48 1440,36 L1440,62 L0,62 Z"/></svg><svg class="w3" viewBox="0 0 1440 62" preserveAspectRatio="none"><path d="M0,26 C180,48 540,10 900,38 C1100,50 1320,20 1440,30 L1440,62 L0,62 Z"/></svg>';

/* ── DOM ── */
var root=document.createElement('div');root.className='ep-widget';
root.innerHTML=
/* Chat Panel */
'<div class="ep-chat" id="ep-chat">'+
  '<div class="ep-header">'+
    '<div class="ep-header-dot"></div>'+
    '<div class="ep-header-info"><div class="ep-header-name" id="ep-name">AI Assistant</div><div class="ep-header-sub">Online</div></div>'+
    '<div style="display:flex;gap:6px"><button class="ep-hbtn" id="ep-close">'+SVG_X_16+'</button></div>'+
  '</div>'+
  '<div class="ep-msgs" id="ep-msgs"></div>'+
  '<div class="ep-input-wrap">'+
    '<button class="ep-ibtn ep-mic-btn" id="ep-mic" title="Voice mode">'+
      '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'+
    '</button>'+
    '<input class="ep-input" id="ep-input" placeholder="Type a message..." autocomplete="off"/>'+
    '<button class="ep-ibtn ep-send" id="ep-send" disabled>'+SVG_SEND+'</button>'+
  '</div>'+
'</div>'+

/* Backdrop */
'<div class="ep-vi-bg" id="ep-vi-bg"></div>'+

/* Voice Island */
'<div class="ep-vi-island" id="ep-vi-island" data-vstate="idle">'+
  '<button class="ep-vi-x-btn" id="ep-vi-x">'+SVG_X_11+'</button>'+
  '<div class="ep-vi-body">'+
    '<div class="ep-vi-orb idle" id="ep-vi-orb">'+
      '<div class="ep-vi-orb-bg"></div>'+
      '<div class="ep-vi-spin"></div>'+
      '<div class="ep-vi-orb-icon"><svg viewBox="0 0 24 24">'+MIC_ICON+'</svg></div>'+
    '</div>'+
    '<div class="ep-vi-bars" id="ep-vi-bars">'+BARS_HTML+'</div>'+
    '<div class="ep-vi-lbl" id="ep-vi-lbl">Tap to speak</div>'+
    '<div class="ep-vi-transcript">'+
      '<div class="ep-vi-usr-line" id="ep-vi-usr"></div>'+
      '<div class="ep-vi-bot-line" id="ep-vi-bot"></div>'+
    '</div>'+
    '<div class="ep-vi-ctrls">'+
      '<button class="ep-vi-ctrl" id="ep-vi-mute" title="Mute">'+SVG_CTRL_MIC+'</button>'+
    '</div>'+
  '</div>'+
'</div>'+

/* Bottom wave */
'<div class="ep-vi-wave" id="ep-vi-wave" data-s="idle">'+WAVE_SVG+'</div>'+

/* FAB */
'<button class="ep-fab" id="ep-fab">'+SVG_CHAT+'</button>';

document.body.appendChild(root);

/* ── Refs ── */
var $=function(id){return document.getElementById(id);};
var chat=$('ep-chat'),msgsCt=$('ep-msgs'),inp=$('ep-input'),fab=$('ep-fab'),sendBtn=$('ep-send');
var viBg=$('ep-vi-bg'),viIsland=$('ep-vi-island'),viOrb=$('ep-vi-orb'),viLbl=$('ep-vi-lbl');
var viUsr=$('ep-vi-usr'),viBot=$('ep-vi-bot'),viWave=$('ep-vi-wave'),viMute=$('ep-vi-mute');

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
    if(saved&&saved.msgs&&saved.msgs.length>0){MSGS=[];saved.msgs.forEach(function(m){renderMsg(m.role,m.text,m.id,true);});}
    else renderMsg('bot',d.welcome_message||'Hi! How can I help?',null,false);
    saveLocal();
  }).catch(function(){});
}
init();

/* ── Intelligent Voice Selection ── */
function selectBestVoice(){
  if(!('speechSynthesis' in window))return null;
  var voices=window.speechSynthesis.getVoices();
  if(!voices||voices.length===0)return null;
  
  /* Tier 1: Microsoft premium voices */
  var ms=['aria','guy','jenny'];
  for(var i=0;i<ms.length;i++){
    var v=voices.find(function(x){return x.name.toLowerCase().includes(ms[i]);});
    if(v)return v;
  }
  
  /* Tier 2: Google natural */
  var goog=voices.find(function(x){return x.name.toLowerCase().includes('google')&&(x.name.toLowerCase().includes('natural')||x.name.toLowerCase().includes('neural'));});
  if(goog)return goog;
  
  /* Tier 3: Any Natural/Neural */
  var nat=voices.find(function(x){return x.name.toLowerCase().includes('natural')||x.name.toLowerCase().includes('neural');});
  if(nat)return nat;
  
  /* Tier 4: Default */
  return voices[0]||null;
}

function initVoice(){
  SELECTED_VOICE=selectBestVoice();
  VOICE_READY=true;
}

if('speechSynthesis' in window){
  if(window.speechSynthesis.getVoices().length>0)initVoice();
  else window.speechSynthesis.onvoiceschanged=initVoice;
}

/* ── Render message ── */
function renderMsg(role,text,msgId,silent){
  MSGS.push({role:role,text:text,id:msgId});
  var d=document.createElement('div');d.className='ep-msg ep-msg-'+role;
  var b=document.createElement('div');b.className='ep-bubble ep-bubble-'+role;
  if(role==='user')b.style.background='var(--ep-c,#7C3AED)';
  b.innerHTML=fmtMd(text);d.appendChild(b);
  if(role==='bot'&&msgId){
    var fb=document.createElement('div');fb.className='ep-fb';
    fb.innerHTML='<button data-v="1" title="Good"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-v="-1" title="Bad"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
    fb.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){sendFb(msgId,+btn.getAttribute('data-v'));btn.classList.add('active');};});
    d.appendChild(fb);
  }
  msgsCt.appendChild(d);msgsCt.scrollTop=msgsCt.scrollHeight;
  if(!silent)saveLocal();
  return b;
}
function mkStream(){
  var d=document.createElement('div');d.className='ep-msg ep-msg-bot';d.id='ep-strm';
  var b=document.createElement('div');b.className='ep-bubble ep-bubble-bot';
  d.appendChild(b);msgsCt.appendChild(d);msgsCt.scrollTop=msgsCt.scrollHeight;return b;
}
function showDots(){var t=document.createElement('div');t.className='ep-typing';t.id='ep-dots';t.innerHTML='<span></span><span></span><span></span>';msgsCt.appendChild(t);msgsCt.scrollTop=msgsCt.scrollHeight;}
function hideDots(){var t=$('ep-dots');if(t)t.remove();}
function fmtMd(t){if(!t)return'';return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/\n/g,'<br>');}

/* ── Send (streaming) ── */
function sendText(txt){
  if(!txt||!SID||SENDING)return;
  /* Dedup: ignore same text within 1.5s */
  var now=Date.now();
  if(txt===LAST_FINAL_TXT&&now-LAST_FINAL_TIME<1500)return;
  LAST_FINAL_TXT=txt;LAST_FINAL_TIME=now;

  renderMsg('user',txt,null);
  inp.value='';sendBtn.disabled=true;SENDING=true;
  if(VOICE){
    viUsr.textContent='\u201c'+txt+'\u201d';
    viUsr.classList.remove('live');
    setVState('processing');
  } else showDots();

  fetch(API+'/widget/message/stream',{
    method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK},
    body:JSON.stringify({session_id:SID,content:txt,current_url:window.location.href})
  }).then(function(resp){
    hideDots();
    var reader=resp.body.getReader(),dec=new TextDecoder();
    var bubble=VOICE?null:mkStream(),full='',mid=null;
    function pump(){
      reader.read().then(function(r){
        if(r.done){done();return;}
        var lines=dec.decode(r.value,{stream:true}).split('\n');
        for(var i=0;i<lines.length;i++){
          var ln=lines[i].trim();
          if(!ln.startsWith('data: '))continue;
          try{
            var p=JSON.parse(ln.slice(6));
            if(p.token){full+=p.token;if(bubble)bubble.innerHTML=fmtMd(full);if(VOICE)viBot.textContent=full.slice(-160);msgsCt.scrollTop=msgsCt.scrollHeight;}
            if(p.done)mid=p.message_id;
          }catch(e){}
        }
        pump();
      }).catch(function(){done();});
    }
    function done(){
      var s=$('ep-strm');
      if(s){s.removeAttribute('id');MSGS.push({role:'bot',text:full,id:mid});}
      if(!VOICE&&mid){
        var fb=document.createElement('div');fb.className='ep-fb';
        fb.innerHTML='<button data-v="1"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-v="-1"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
        fb.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){sendFb(mid,+btn.getAttribute('data-v'));btn.classList.add('active');};});
        if(s)s.appendChild(fb);
      }
      if(VOICE&&full){
        /* Render to shared chat store so history is visible when chat reopens */
        renderMsg('bot',full,mid,true);
        speakTTS(full);
      }
      else if(VOICE)setVState('idle');
      SENDING=false;sendBtn.disabled=!inp.value.trim();
      saveLocal();
    }
    pump();
  }).catch(function(){
    hideDots();SENDING=false;
    if(VOICE)setVState('idle');
    renderMsg('bot','Something went wrong.',null);
  });
}
function sendFb(mid,v){fetch(API+'/widget/feedback',{method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK},body:JSON.stringify({message_id:mid,feedback:v})}).catch(function(){});}

/* ── TTS ── */
function speakTTS(text){
  if(!('speechSynthesis' in window)){setVState('idle');return;}
  stopTTS();
  viBot.textContent='';
  var clean=text.replace(/[#*_`>\[\]]/g,'').slice(0,600);
  var u=new SpeechSynthesisUtterance(clean);
  CURR_UTT=u;u.rate=1.05;u.pitch=1;
  setVState('speaking');
  u.onend=function(){
    CURR_UTT=null;
    if(!VOICE)return;
    setVState('idle');
    /* Auto-restart loop only in production (not preview iframe) */
    if(!MUTED&&!IS_IFRAME)setTimeout(function(){if(VOICE&&VSTATE==='idle')startListening();},650);
  };
  u.onerror=function(){CURR_UTT=null;if(VOICE)setVState('idle');};
  window.speechSynthesis.speak(u);
  /* Background interrupt watcher — non-iframe production only */
  if(!IS_IFRAME&&!MUTED){
    setTimeout(function(){if(VSTATE==='speaking')startInterruptWatcher();},400);
  }
}
function stopTTS(){
  stopInterruptWatcher();
  if(CURR_UTT){CURR_UTT.onend=null;CURR_UTT.onerror=null;CURR_UTT=null;}
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
}

/* ── Background interrupt watcher (non-iframe only) ── */
function startInterruptWatcher(){
  if(IREC||MUTED||!VOICE||IS_IFRAME)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return;
  IREC=new SR();IREC.continuous=false;IREC.interimResults=false;
  IREC.onresult=function(e){
    if(VSTATE!=='speaking')return;
    var txt=(e.results[0]&&e.results[0][0]?e.results[0][0].transcript:'').trim();
    stopTTS(); // cancels speech + stops IREC
    if(txt)sendText(txt);
    else{setVState('idle');setTimeout(function(){if(VOICE&&!MUTED)startListening();},200);}
  };
  IREC.onerror=function(){IREC=null;};
  IREC.onend=function(){
    IREC=null;
    /* Restart watcher if still speaking */
    if(VSTATE==='speaking'&&VOICE&&!MUTED)
      setTimeout(function(){if(VSTATE==='speaking')startInterruptWatcher();},200);
  };
  try{IREC.start();}catch(e){IREC=null;}
}
function stopInterruptWatcher(){if(IREC){try{IREC.stop();}catch(e){}IREC=null;}}

/* ── Voice State Machine ── */
function setVState(s){
  VSTATE=s;
  var key=MUTED&&s==='idle'?'muted':s;
  viOrb.className='ep-vi-orb '+key;
  viIsland.setAttribute('data-vstate',key);
  viWave.setAttribute('data-s',s);
  var map={idle:'Tap to speak',listening:'Listening\u2026',processing:'Thinking\u2026',speaking:'Speaking\u2026'};
  viLbl.textContent=(MUTED&&s==='idle')?'Muted \u2014 tap orb to speak':(map[s]||'');
}

/* ── STT ── */
function startListening(){
  if(MUTED||SENDING)return;
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){viLbl.textContent='Voice unsupported';return;}
  stopTTS();
  if(RECOG){try{RECOG.stop();}catch(e){}RECOG=null;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  RECOG=new SR();
  /* continuous:true  = keeps mic alive, no premature no-speech timeout
     interimResults:true = live transcript while the user speaks
     We stop manually as soon as isFinal fires (avoids the 800ms timer race) */
  RECOG.continuous=true;
  RECOG.interimResults=true;
  RECOG.lang='';

  RECOG.onstart=function(){
    setVState('listening');
    viUsr.textContent='';
    viUsr.classList.add('live');
  };

  RECOG.onresult=function(e){
    var res=e.results[e.results.length-1];
    var txt=res[0].transcript;
    viUsr.textContent=txt;
    if(res.isFinal&&txt.trim()){
      /* Stop recognition immediately, then send */
      if(RECOG){try{RECOG.stop();}catch(x){}}
      sendText(txt.trim());
    }
  };

  RECOG.onerror=function(e){
    if(e.error==='not-allowed'){viLbl.textContent='Mic access denied';setVState('idle');}
    else if(e.error!=='no-speech'&&e.error!=='aborted')setVState('idle');
  };

  /* onend fires after we call stop() — by that point VSTATE is 'processing',
     so this guard won't accidentally reset back to idle                       */
  RECOG.onend=function(){
    viUsr.classList.remove('live');
    if(VSTATE==='listening')setVState('idle');
  };

  try{RECOG.start();}catch(e){}
}
function stopListening(){
  clearTimeout(SILENCE_TIMER);
  if(RECOG){try{RECOG.stop();}catch(e){}RECOG=null;}
}

/* ── Open Voice (morph FAB → island) ── */
function openVoice(){
  VOICE=true;MUTED=false;
  viMute.classList.remove('on');
  viMute.innerHTML=SVG_CTRL_MIC;

  /* Seed transcript with last conversation */
  var lu=MSGS.slice().reverse().find(function(m){return m.role==='user';});
  var lb=MSGS.slice().reverse().find(function(m){return m.role==='bot';});
  viUsr.textContent=lu?'\u201c'+lu.text.slice(0,80)+'\u201d':'';
  viUsr.classList.remove('live');
  viBot.textContent=lb?lb.text.slice(0,140):'';

  /* Compute dx: FAB center relative to page center */
  var dx=(window.innerWidth-48)-(window.innerWidth/2);
  viIsland.style.setProperty('--vi-dx',dx+'px');

  var wasOpen=OPEN;OPEN=false;

  /* Collapse chat if open */
  if(wasOpen){
    chat.classList.add('morphing-out');
    setTimeout(function(){chat.classList.remove('open','morphing-out');},280);
  }

  /* Shrink FAB */
  fab.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;background:var(--ep-c,#7C3AED);transition:transform 200ms cubic-bezier(.4,0,.2,1),opacity 180ms;transform:scale(0);opacity:0;pointer-events:none;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;';

  /* Show backdrop + morph island in */
  setTimeout(function(){
    viBg.classList.add('active');
    viWave.classList.add('show');
    viIsland.className='ep-vi-island vi-entering';
    viIsland.setAttribute('data-vstate','idle');

    var ANIM_T=setTimeout(onIslandOpen,380);
    function onIslandOpen(){
      clearTimeout(ANIM_T);
      viIsland.className='ep-vi-island vi-open';
      setVState('idle');
      if(!MUTED)setTimeout(function(){if(VOICE&&VSTATE==='idle')startListening();},320);
    }
    viIsland.addEventListener('animationend',function once(e){
      if(e.target!==viIsland)return;
      clearTimeout(ANIM_T);
      viIsland.removeEventListener('animationend',once);
      onIslandOpen();
    });
  },wasOpen?300:90);
}

/* ── Close Voice (morph island → FAB, reopen chat) ── */
function closeVoice(){
  stopListening();stopTTS();MUTED=false;
  viBg.classList.remove('active');
  viWave.classList.remove('show');

  viIsland.className='ep-vi-island vi-leaving';

  var ANIM_T=setTimeout(onIslandClosed,340);
  function onIslandClosed(){
    clearTimeout(ANIM_T);
    viIsland.className='ep-vi-island';
    VOICE=false;VSTATE='idle';
    /* Restore FAB with spring */
    fab.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;background:var(--ep-c,#7C3AED);transition:transform 300ms cubic-bezier(.34,1.56,.64,1),opacity 200ms;transform:scale(1);opacity:1;pointer-events:auto;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.15);';
    fab.innerHTML=SVG_X_16;
    /* Re-open chat with full history */
    setTimeout(function(){
      OPEN=true;
      chat.classList.remove('morphing-out');
      chat.classList.add('open');
      setTimeout(function(){fab.style.cssText='';fab.innerHTML=SVG_X_16;},310);
    },180);
  }
  viIsland.addEventListener('animationend',function once(e){
    if(e.target!==viIsland)return;
    clearTimeout(ANIM_T);
    viIsland.removeEventListener('animationend',once);
    onIslandClosed();
  });
}

/* ══════════ Events ══════════ */

/* FAB */
fab.onclick=function(){
  if(VOICE)return;
  OPEN=!OPEN;
  if(OPEN){chat.classList.remove('morphing-out');chat.classList.add('open');fab.innerHTML=SVG_X_16;}
  else{chat.classList.add('morphing-out');setTimeout(function(){chat.classList.remove('open','morphing-out');},300);fab.innerHTML=SVG_CHAT;}
};

/* Close chat header button */
$('ep-close').onclick=function(){
  OPEN=false;chat.classList.add('morphing-out');
  setTimeout(function(){chat.classList.remove('open','morphing-out');},300);
  fab.innerHTML=SVG_CHAT;
};

/* Input */
inp.oninput=function(){sendBtn.disabled=!inp.value.trim()||SENDING;};
inp.onkeydown=function(e){if(e.key==='Enter'&&!SENDING)sendText(inp.value.trim());};
sendBtn.onclick=function(){sendText(inp.value.trim());};

/* Mic → enter voice mode */
$('ep-mic').onclick=openVoice;

/* Island close button */
$('ep-vi-x').onclick=closeVoice;

/* Backdrop click → close */
$('ep-vi-bg').onclick=function(e){if(e.target===$('ep-vi-bg'))closeVoice();};

/* Orb tap */
viOrb.onclick=function(){
  if(VSTATE==='idle'){
    if(MUTED){MUTED=false;viMute.classList.remove('on');viMute.innerHTML=SVG_CTRL_MIC;}
    startListening();
  } else if(VSTATE==='listening'){
    stopListening();
  } else if(VSTATE==='speaking'){
    /* Interrupt AI speech */
    stopTTS();
    setVState('idle');
    setTimeout(function(){if(VOICE&&!MUTED)startListening();},300);
  }
};

/* Mute toggle */
viMute.onclick=function(){
  MUTED=!MUTED;
  if(MUTED){
    stopListening();stopTTS();
    viMute.classList.add('on');
    viMute.innerHTML=SVG_CTRL_MIC_OFF;
    if(VSTATE!=='processing')setVState('idle');
  } else {
    viMute.classList.remove('on');
    viMute.innerHTML=SVG_CTRL_MIC;
  }
};
})();
