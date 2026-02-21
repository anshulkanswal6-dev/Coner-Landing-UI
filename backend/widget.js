(function(){
'use strict';
var script=document.currentScript||document.querySelector('script[data-project-key]');
if(!script)return;
var PK=script.getAttribute('data-project-key');
if(!PK)return;
var API=new URL(script.src).origin+'/api';
var SID=null,CFG={},MSGS=[],OPEN=false,VOICE=false,SENDING=false,LISTENING=false,RECOG=null;

// ─── Styles ───
var css=document.createElement('style');
css.textContent=`
.ep-widget *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
.ep-fab{position:fixed;bottom:20px;right:20px;z-index:99999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);transition:transform .2s,box-shadow .2s;}
.ep-fab:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.2);}
.ep-fab svg{width:24px;height:24px;fill:#fff;}
.ep-chat{position:fixed;bottom:88px;right:20px;z-index:99998;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.12);display:none;flex-direction:column;overflow:hidden;animation:epSlideUp .25s ease-out;}
.ep-chat.open{display:flex;}
@keyframes epSlideUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.ep-header{padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;}
.ep-header-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;flex-shrink:0;}
.ep-header-info{flex:1;min-width:0;}
.ep-header-name{font-size:14px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ep-header-sub{font-size:11px;color:#888;}
.ep-header-btns{display:flex;gap:6px;}
.ep-header-btn{width:32px;height:32px;border:none;border-radius:8px;background:#f5f5f5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-header-btn:hover{background:#eee;}
.ep-header-btn svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.ep-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.ep-msg{max-width:82%;animation:epFadeIn .2s ease-out;}
.ep-msg-bot{align-self:flex-start;}
.ep-msg-user{align-self:flex-end;}
.ep-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word;}
.ep-bubble-bot{background:#f4f4f5;color:#111;border-bottom-left-radius:4px;}
.ep-bubble-user{color:#fff;border-bottom-right-radius:4px;}
.ep-bubble p{margin:0 0 6px 0;}.ep-bubble p:last-child{margin:0;}
.ep-bubble code{background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;font-size:12px;font-family:monospace;}
.ep-feedback{display:flex;gap:4px;margin-top:6px;}
.ep-feedback button{border:none;background:none;cursor:pointer;padding:2px 4px;border-radius:4px;opacity:.5;transition:opacity .15s;}
.ep-feedback button:hover,.ep-feedback button.active{opacity:1;}
.ep-feedback svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
.ep-typing{display:flex;gap:4px;padding:10px 14px;background:#f4f4f5;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;animation:epFadeIn .2s;}
.ep-typing span{width:6px;height:6px;border-radius:50%;background:#aaa;animation:epBounce .6s infinite alternate;}
.ep-typing span:nth-child(2){animation-delay:.15s;}
.ep-typing span:nth-child(3){animation-delay:.3s;}
@keyframes epBounce{to{transform:translateY(-6px);opacity:.4;}}
@keyframes epFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.ep-input-wrap{padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px;align-items:center;}
.ep-input{flex:1;border:1px solid #e5e5e5;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;transition:border .15s;background:#fafafa;}
.ep-input:focus{border-color:var(--ep-color,#7C3AED);background:#fff;}
.ep-send-btn,.ep-mic-btn{width:36px;height:36px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ep-send-btn{background:var(--ep-color,#7C3AED);}
.ep-send-btn:disabled{opacity:.4;cursor:not-allowed;}
.ep-send-btn svg{width:16px;height:16px;fill:#fff;}
.ep-mic-btn{background:#f5f5f5;}
.ep-mic-btn.listening{background:#fee2e2;}
.ep-mic-btn svg{width:16px;height:16px;stroke:#555;fill:none;stroke-width:2;}
.ep-mic-btn.listening svg{stroke:#ef4444;}
/* Voice Island */
.ep-voice{position:absolute;inset:0;background:rgba(255,255,255,0.97);display:none;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:5;backdrop-filter:blur(10px);}
.ep-voice.active{display:flex;}
.ep-voice-circle{width:140px;height:140px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;}
.ep-voice-ring{position:absolute;inset:-10px;border-radius:50%;border:2px solid;opacity:.3;animation:epPulseRing 1.5s ease-in-out infinite;}
.ep-voice-ring:nth-child(2){inset:-22px;animation-delay:.3s;opacity:.15;}
.ep-voice-ring:nth-child(3){inset:-34px;animation-delay:.6s;opacity:.08;}
@keyframes epPulseRing{0%,100%{transform:scale(1);opacity:.3;}50%{transform:scale(1.08);opacity:.15;}}
.ep-voice-icon{width:48px;height:48px;fill:#fff;z-index:2;}
.ep-voice-label{font-size:14px;font-weight:500;color:#555;}
.ep-voice-close{border:none;background:#f4f4f5;padding:8px 20px;border-radius:8px;font-size:12px;color:#555;cursor:pointer;transition:background .15s;}
.ep-voice-close:hover{background:#e5e5e5;}
.ep-voice-wave{display:flex;align-items:center;gap:3px;height:40px;}
.ep-voice-wave span{width:3px;background:var(--ep-color,#7C3AED);border-radius:2px;animation:epWave .8s ease-in-out infinite alternate;}
.ep-voice-wave span:nth-child(1){height:12px;animation-delay:0s;}
.ep-voice-wave span:nth-child(2){height:24px;animation-delay:.1s;}
.ep-voice-wave span:nth-child(3){height:36px;animation-delay:.2s;}
.ep-voice-wave span:nth-child(4){height:24px;animation-delay:.3s;}
.ep-voice-wave span:nth-child(5){height:12px;animation-delay:.4s;}
@keyframes epWave{to{height:8px;}}
.ep-msgs::-webkit-scrollbar{width:4px;}.ep-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px;}
`;
document.head.appendChild(css);

// ─── DOM ───
var root=document.createElement('div');root.className='ep-widget';
root.innerHTML=`
<div class="ep-chat" id="ep-chat">
  <div class="ep-header">
    <div class="ep-header-dot"></div>
    <div class="ep-header-info"><div class="ep-header-name" id="ep-name">AI Assistant</div><div class="ep-header-sub">Online</div></div>
    <div class="ep-header-btns">
      <button class="ep-header-btn" id="ep-voice-btn" title="Voice mode"><svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
      <button class="ep-header-btn" id="ep-close" title="Close"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
  </div>
  <div class="ep-msgs" id="ep-msgs"></div>
  <div class="ep-input-wrap">
    <button class="ep-mic-btn" id="ep-mic" title="Voice input"><svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg></button>
    <input class="ep-input" id="ep-input" placeholder="Type a message..." autocomplete="off"/>
    <button class="ep-send-btn" id="ep-send" disabled><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>
  </div>
  <div class="ep-voice" id="ep-voice-overlay">
    <div class="ep-voice-circle" id="ep-voice-circle" style="background:var(--ep-color,#7C3AED)">
      <div class="ep-voice-ring" style="border-color:var(--ep-color,#7C3AED)"></div>
      <div class="ep-voice-ring" style="border-color:var(--ep-color,#7C3AED)"></div>
      <div class="ep-voice-ring" style="border-color:var(--ep-color,#7C3AED)"></div>
      <svg class="ep-voice-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="#fff" stroke-width="2"/><line x1="12" y1="19" x2="12" y2="23" stroke="#fff" stroke-width="2"/></svg>
    </div>
    <div class="ep-voice-wave" id="ep-voice-wave" style="display:none"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="ep-voice-label" id="ep-voice-label">Tap to speak</div>
    <button class="ep-voice-close" id="ep-voice-close">Back to chat</button>
  </div>
</div>
<button class="ep-fab" id="ep-fab" style="background:var(--ep-color,#7C3AED)">
  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
</button>`;
document.body.appendChild(root);

var $=function(id){return document.getElementById(id);};
var chat=$('ep-chat'),msgs=$('ep-msgs'),inp=$('ep-input'),fab=$('ep-fab'),sendBtn=$('ep-send');
var voiceOverlay=$('ep-voice-overlay'),voiceLabel=$('ep-voice-label'),voiceWave=$('ep-voice-wave'),voiceCircle=$('ep-voice-circle');

function setColor(c){root.style.setProperty('--ep-color',c);}

// ─── Init ───
function init(){
  fetch(API+'/widget/init',{method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK}})
  .then(function(r){return r.json();})
  .then(function(d){
    SID=d.session_id;CFG=d;
    $('ep-name').textContent=d.project_name||'AI Assistant';
    setColor(d.primary_color||'#7C3AED');
    sessionStorage.setItem('ep_sid_'+PK,SID);
    addMsg('bot',d.welcome_message||'Hi! How can I help?',null);
  }).catch(function(){});
}

// Check for existing session
var savedSid=sessionStorage.getItem('ep_sid_'+PK);
if(savedSid){SID=savedSid;init();}else{init();}

// ─── Messages ───
function addMsg(role,text,msgId){
  MSGS.push({role:role,text:text,id:msgId});
  var d=document.createElement('div');
  d.className='ep-msg ep-msg-'+role;
  var b=document.createElement('div');
  b.className='ep-bubble ep-bubble-'+role;
  if(role==='user'){b.style.background='var(--ep-color,#7C3AED)';}
  b.innerHTML=formatMd(text);
  d.appendChild(b);
  if(role==='bot'&&msgId){
    var fb=document.createElement('div');fb.className='ep-feedback';
    fb.innerHTML='<button data-fb="1" title="Good"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-fb="-1" title="Bad"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
    fb.querySelectorAll('button').forEach(function(btn){
      btn.onclick=function(){giveFeedback(msgId,parseInt(btn.getAttribute('data-fb')));btn.classList.add('active');};
    });
    d.appendChild(fb);
  }
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
  return b;
}

function addStreamingMsg(){
  var d=document.createElement('div');d.className='ep-msg ep-msg-bot';d.id='ep-streaming';
  var b=document.createElement('div');b.className='ep-bubble ep-bubble-bot';b.innerHTML='';
  d.appendChild(b);msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
  return b;
}

function showTyping(){
  var t=document.createElement('div');t.className='ep-typing';t.id='ep-typing';
  t.innerHTML='<span></span><span></span><span></span>';
  msgs.appendChild(t);msgs.scrollTop=msgs.scrollHeight;
}
function hideTyping(){var t=$('ep-typing');if(t)t.remove();}

function formatMd(t){
  if(!t)return'';
  return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`(.*?)`/g,'<code>$1</code>')
    .replace(/\n/g,'<br>');
}

// ─── Send (Streaming) ───
function send(){
  var text=inp.value.trim();if(!text||!SID||SENDING)return;
  addMsg('user',text,null);inp.value='';sendBtn.disabled=true;SENDING=true;
  showTyping();
  fetch(API+'/widget/message/stream',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-project-key':PK},
    body:JSON.stringify({session_id:SID,content:text,current_url:window.location.href})
  }).then(function(resp){
    hideTyping();
    var reader=resp.body.getReader();
    var decoder=new TextDecoder();
    var bubble=addStreamingMsg();
    var fullText='',msgId=null;
    function read(){
      reader.read().then(function(result){
        if(result.done){finalize();return;}
        var chunk=decoder.decode(result.value,{stream:true});
        var lines=chunk.split('\n');
        for(var i=0;i<lines.length;i++){
          var line=lines[i].trim();
          if(line.startsWith('data: ')){
            try{
              var d=JSON.parse(line.slice(6));
              if(d.token){fullText+=d.token;bubble.innerHTML=formatMd(fullText);msgs.scrollTop=msgs.scrollHeight;}
              if(d.done){msgId=d.message_id;}
            }catch(e){}
          }
        }
        read();
      }).catch(function(){finalize();});
    }
    function finalize(){
      var sd=$('ep-streaming');if(sd){sd.removeAttribute('id');MSGS.push({role:'bot',text:fullText,id:msgId});}
      if(msgId){
        var fb=document.createElement('div');fb.className='ep-feedback';
        fb.innerHTML='<button data-fb="1" title="Good"><svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></button><button data-fb="-1" title="Bad"><svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg></button>';
        fb.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){giveFeedback(msgId,parseInt(btn.getAttribute('data-fb')));btn.classList.add('active');};});
        if(sd)sd.appendChild(fb);
      }
      SENDING=false;sendBtn.disabled=!inp.value.trim();
      // TTS for voice mode
      if(VOICE&&fullText&&'speechSynthesis' in window){
        var u=new SpeechSynthesisUtterance(fullText.replace(/[#*_`]/g,''));u.rate=1;
        voiceLabel.textContent='Speaking...';voiceWave.style.display='flex';
        u.onend=function(){voiceLabel.textContent='Tap to speak';voiceWave.style.display='none';};
        window.speechSynthesis.speak(u);
      }
    }
    read();
  }).catch(function(){
    hideTyping();SENDING=false;
    addMsg('bot','Sorry, something went wrong. Please try again.',null);
  });
}

function giveFeedback(msgId,val){
  fetch(API+'/widget/feedback',{
    method:'POST',headers:{'Content-Type':'application/json','x-project-key':PK},
    body:JSON.stringify({message_id:msgId,feedback:val})
  }).catch(function(){});
}

// ─── Events ───
fab.onclick=function(){
  OPEN=!OPEN;chat.classList.toggle('open',OPEN);
  fab.innerHTML=OPEN?'<svg viewBox="0 0 24 24" style="fill:#fff;width:24px;height:24px"><line x1="18" y1="6" x2="6" y2="18" stroke="#fff" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="#fff" stroke-width="2"/></svg>':'<svg viewBox="0 0 24 24" style="fill:#fff;width:24px;height:24px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
};
$('ep-close').onclick=function(){OPEN=false;chat.classList.remove('open');fab.innerHTML='<svg viewBox="0 0 24 24" style="fill:#fff;width:24px;height:24px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';};
inp.oninput=function(){sendBtn.disabled=!inp.value.trim()||SENDING;};
inp.onkeydown=function(e){if(e.key==='Enter')send();};
sendBtn.onclick=send;

// ─── Voice Mode ───
$('ep-voice-btn').onclick=function(){VOICE=true;voiceOverlay.classList.add('active');voiceLabel.textContent='Tap to speak';};
$('ep-voice-close').onclick=function(){
  VOICE=false;voiceOverlay.classList.remove('active');
  if(RECOG){try{RECOG.stop();}catch(e){}}LISTENING=false;
  window.speechSynthesis.cancel();
};

voiceCircle.onclick=function(){
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){voiceLabel.textContent='Not supported';return;}
  if(LISTENING){if(RECOG)RECOG.stop();return;}
  window.speechSynthesis.cancel();
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  RECOG=new SR();RECOG.continuous=false;RECOG.interimResults=false;
  RECOG.onstart=function(){LISTENING=true;voiceLabel.textContent='Listening...';voiceWave.style.display='flex';};
  RECOG.onresult=function(e){
    var t=e.results[0][0].transcript;
    voiceLabel.textContent='Processing...';voiceWave.style.display='none';LISTENING=false;
    inp.value=t;send();
  };
  RECOG.onerror=function(){LISTENING=false;voiceLabel.textContent='Tap to speak';voiceWave.style.display='none';};
  RECOG.onend=function(){LISTENING=false;if(voiceLabel.textContent==='Listening...')voiceLabel.textContent='Tap to speak';voiceWave.style.display='none';};
  RECOG.start();
};

// ─── Mic button in input bar ───
$('ep-mic').onclick=function(){
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window))return;
  var btn=$('ep-mic');
  if(LISTENING){if(RECOG)RECOG.stop();btn.classList.remove('listening');LISTENING=false;return;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  RECOG=new SR();RECOG.continuous=false;RECOG.interimResults=false;
  RECOG.onstart=function(){LISTENING=true;btn.classList.add('listening');};
  RECOG.onresult=function(e){inp.value=e.results[0][0].transcript;sendBtn.disabled=false;btn.classList.remove('listening');LISTENING=false;};
  RECOG.onerror=function(){btn.classList.remove('listening');LISTENING=false;};
  RECOG.onend=function(){btn.classList.remove('listening');LISTENING=false;};
  RECOG.start();
};
})();
