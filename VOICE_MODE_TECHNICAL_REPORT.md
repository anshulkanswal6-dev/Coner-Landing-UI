# Voice Mode & Widget UI Implementation Report
**EmergentPulse AI - Technical Deep Dive**  
**Date:** February 21, 2026  
**Files Analyzed:**
- `/app/backend/widget.js` (Standalone widget, lines 1-770)
- `/app/frontend/src/components/SandboxTab.js` (React sandbox component, lines 1-600+)

---

## 1️⃣ VOICE INPUT LIFECYCLE

### SpeechRecognition Initialization

**Location:** 
- `widget.js`: Lines 577-622 (`startListening()` function)
- `SandboxTab.js`: Lines 246-300 (`startListeningInner()` function)

**Configuration:**

```javascript
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const RECOG = new SR();

RECOG.continuous     = true;   // Keeps mic alive, prevents premature timeout
RECOG.interimResults = true;   // Enables live transcript updates
RECOG.lang           = "";     // Default language (browser auto-detects)
```

**Why `continuous: true`?**  
Previous implementation used `continuous: false`, which caused an 800ms race condition between the browser's `onend` event and a manual debounce timer. Setting `continuous: true` and manually calling `.stop()` on `isFinal` avoids this race entirely.

---

### Event Handlers

#### **1. `onstart` Event**

**Fires:** When browser grants mic access and recognition begins

**widget.js (lines 592-596):**
```javascript
RECOG.onstart = function() {
  setVState('listening');           // State: IDLE → LISTENING
  viUsr.textContent = '';           // Clear previous transcript
  viUsr.classList.add('live');      // Add "live" pulse animation
};
```

**SandboxTab.js (lines 266-269):**
```javascript
r.onstart = () => {
  setVState("listening");           // State: IDLE → LISTENING
  setLiveText("");                  // Clear React state transcript
};
```

**UI Updates:**
- Voice orb changes from purple (#7C3AED) → red (#ef4444)
- Wave animation switches from idle → listening bars
- Label updates to "Listening…"
- User transcript area gets "live" class (pulsing cursor/border)

---

#### **2. `onresult` Event**

**Fires:** Every time speech recognition produces a result (interim or final)

**widget.js (lines 598-607):**
```javascript
RECOG.onresult = function(e) {
  var res = e.results[e.results.length - 1];  // Get latest result
  var txt = res[0].transcript;                 // Extract text
  viUsr.textContent = txt;                     // Live display transcript

  if (res.isFinal && txt.trim()) {
    /* Stop recognition immediately to prevent race condition */
    if (RECOG) { try { RECOG.stop(); } catch(x) {} }
    sendText(txt.trim());                      // Submit to API
  }
};
```

**SandboxTab.js (lines 271-280):**
```javascript
r.onresult = (e) => {
  const res = e.results[e.results.length - 1];
  const txt = res[0].transcript;
  setLiveText(txt);                            // React state update

  if (res.isFinal && txt.trim()) {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    sendText(txt.trim());
  }
};
```

**State Transitions:**
- **Interim results:** `LISTENING` (continues) → UI shows live text
- **Final result:** `LISTENING` → `PROCESSING` (triggered inside `sendText()`)

**UI Updates:**
- Live transcript updates in real-time in the user text area
- When final: transcript frozen, state label changes to "Thinking…"

---

#### **3. `onend` Event**

**Fires:** After `.stop()` is called OR browser auto-stops after timeout

**widget.js (lines 616-619):**
```javascript
RECOG.onend = function() {
  viUsr.classList.remove('live');              // Remove pulse animation
  if (VSTATE === 'listening') setVState('idle'); // Reset only if still listening
};
```

**SandboxTab.js (lines 293-296):**
```javascript
r.onend = () => {
  setLiveText("");                             // Clear live transcript
  if (vStateRef.current === "listening") setVState("idle");
};
```

**Critical Guard Condition:**  
Only resets to `IDLE` if currently in `LISTENING`. This prevents race conditions where `onend` fires AFTER the user has already submitted text and state is now `PROCESSING`.

**UI Updates:**
- Live pulse animation stops
- If state returns to IDLE: orb returns to purple, label to "Tap to speak"

---

#### **4. `onerror` Event**

**Fires:** On errors like mic permission denial, no-speech timeout, abort

**widget.js (lines 609-612):**
```javascript
RECOG.onerror = function(e) {
  if (e.error === 'not-allowed') {
    viLbl.textContent = 'Mic access denied';
    setVState('idle');
  } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
    setVState('idle');
  }
};
```

**SandboxTab.js (lines 282-289):**
```javascript
r.onerror = (e) => {
  if (e.error === "not-allowed") {
    toast.error("Microphone access denied");
    setVState("idle");
  } else if (e.error !== "no-speech" && e.error !== "aborted") {
    setVState("idle");
  }
};
```

**Error Handling:**
- `not-allowed`: User denied mic permission → Show error, reset to IDLE
- `no-speech`: Ignored (common timeout, not critical)
- `aborted`: Ignored (happens on manual stop)
- Other errors: Reset to IDLE

---

### Complete State Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE INPUT STATE MACHINE                     │
└─────────────────────────────────────────────────────────────────┘

     User clicks mic button
              │
              ▼
         ┌─────────┐
    ┌───│  IDLE   │◄──────────────────────────┐
    │   └─────────┘                            │
    │        │                                 │
    │        │ startListening()                │
    │        │ • RECOG.start()                 │
    │        ▼                                 │
    │   ┌─────────┐                            │
    │   │ STARTING│ (brief)                    │
    │   └─────────┘                            │
    │        │                                 │
    │        │ onstart fires                   │
    │        ▼                                 │
    │   ┌──────────┐                           │
    │   │LISTENING │                           │
    │   └──────────┘                           │
    │        │                                 │
    │        │ User speaks                     │
    │        │ • interim results show          │
    │        │ • viUsr updates live            │
    │        │                                 │
    │        │ User finishes sentence          │
    │        │ • res.isFinal = true            │
    │        │ • RECOG.stop()                  │
    │        │ • sendText(txt)                 │
    │        ▼                                 │
    │  ┌───────────┐                           │
    │  │PROCESSING │                           │
    │  └───────────┘                           │
    │        │                                 │
    │        │ API streaming response          │
    │        │ • Tokens accumulate             │
    │        │ • viBot updates                 │
    │        │                                 │
    │        │ Stream complete                 │
    │        │ • speakTTS(text)                │
    │        ▼                                 │
    │   ┌─────────┐                            │
    │   │SPEAKING │                            │
    │   └─────────┘                            │
    │        │                                 │
    │        │ TTS finishes (u.onend)          │
    │        │                                 │
    │        │ [PRODUCTION ONLY]               │
    │        │ setTimeout(() => {              │
    │        │   if (!IS_IFRAME && !MUTED)     │
    │        │     startListening()  // loop   │
    │        │ }, 650ms)                       │
    │        │                                 │
    │        │ [SANDBOX ALWAYS]                │
    └────────┴─────────────────────────────────┘
             Returns to IDLE (manual restart)
```

**Key Observations:**
1. **Manual Stop on Final:** `.stop()` is called immediately when `isFinal` fires, avoiding race conditions
2. **Auto-Loop:** Only in production (`!IS_IFRAME`), after 650ms delay
3. **Sandbox:** Always requires manual mic button click to restart
4. **Deduplication:** 1.5s window prevents duplicate sends of same text

---

## 2️⃣ AI RESPONSE → TEXT → SPEECH FLOW

### Streaming Response Reception

**Location:**
- `widget.js`: Lines 463-509 (`sendText()` function)
- `SandboxTab.js`: Lines 161-243 (`sendText()` callback)

**Flow Diagram:**

```
User sends text
      │
      ▼
POST /api/widget/message/stream
      │
      ├─ Headers: x-project-key
      ├─ Body: {session_id, content, current_url}
      │
      ▼
Server returns SSE (Server-Sent Events) stream
      │
      ├─ Event: data: {"token": "Hello"}
      ├─ Event: data: {"token": " there"}
      ├─ Event: data: {"token": "!"}
      ├─ Event: data: {"done": true, "message_id": "msg_abc123"}
      │
      ▼
Client accumulates tokens
      │
      ├─ In VOICE mode:  viBot.textContent (last 160 chars)
      ├─ In CHAT mode:   bubble.innerHTML (full text)
      │
      ▼
Stream complete (done: true)
      │
      ├─ Store message in MSGS array
      ├─ Add message_id for feedback
      ├─ In VOICE mode:  → speakTTS(full)
      └─ In CHAT mode:   → Render final bubble
```

**Code - widget.js (lines 469-503):**
```javascript
var reader = resp.body.getReader(), dec = new TextDecoder();
var bubble = VOICE ? null : mkStream(), full = '', mid = null;

function pump() {
  reader.read().then(function(r) {
    if (r.done) { done(); return; }
    
    var lines = dec.decode(r.value, { stream: true }).split('\n');
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln.startsWith('data: ')) continue;
      
      try {
        var p = JSON.parse(ln.slice(6));
        
        if (p.token) {
          full += p.token;
          if (bubble) bubble.innerHTML = fmtMd(full);         // CHAT mode
          if (VOICE) viBot.textContent = full.slice(-160);    // VOICE mode (last 160 chars)
          msgsCt.scrollTop = msgsCt.scrollHeight;
        }
        
        if (p.done) mid = p.message_id;
      } catch(e) {}
    }
    pump();  // Continue reading stream
  }).catch(function() { done(); });
}
pump();  // Start pump
```

---

### Message Store Creation

**Assistant message is created in TWO stages:**

#### **Stage 1: During Streaming (CHAT mode only)**
- `mkStream()` creates a temporary `<div id="ep-strm">` with a bubble
- Tokens are appended to `bubble.innerHTML` in real-time
- This allows user to see AI typing effect

#### **Stage 2: On Stream Complete**

**widget.js (lines 486-503):**
```javascript
function done() {
  var s = $('ep-strm');
  if (s) {
    s.removeAttribute('id');  // Remove temp ID
    MSGS.push({ role: 'bot', text: full, id: mid });  // Add to store
  }
  
  if (!VOICE && mid) {
    // Add feedback buttons to chat bubble
    var fb = document.createElement('div'); fb.className = 'ep-fb';
    fb.innerHTML = '...<thumbs up/down>...';
    if (s) s.appendChild(fb);
  }
  
  if (VOICE && full) {
    // Render to shared MSGS array (unified history)
    renderMsg('bot', full, mid, true);  // silent=true (no scroll)
    speakTTS(full);                      // Start TTS
  }
  
  SENDING = false;
  saveLocal();  // Persist to localStorage
}
```

**SandboxTab.js (lines 209-234):**
```javascript
setStreamingText("");
setMessages(prev => [...prev, { 
  role: "assistant", 
  content: full, 
  id: msgId, 
  source: "rag" 
}]);

if (voiceModeRef.current && full) {
  if ("speechSynthesis" in window) {
    stopTTS();
    setBotTxt("");
    const clean = full.replace(/[#*_`>\[\]]/g, "").slice(0, 600);
    const u = new SpeechSynthesisUtterance(clean);
    utteranceRef.current = u;
    u.rate = 1.05; u.pitch = 1;
    setVState("speaking");
    u.onend = () => { /* ... */ };
    window.speechSynthesis.speak(u);
  }
}
```

---

### TTS (Text-to-Speech) Engine

**Engine:** Browser's native `speechSynthesis` Web API

**No external TTS service is used.** This is a native browser feature with these characteristics:
- Works offline
- No API costs
- Voice quality varies by OS/browser
- Limited voice customization

**Voice Configuration:**

**widget.js (lines 514-530):**
```javascript
function speakTTS(text) {
  if (!('speechSynthesis' in window)) { setVState('idle'); return; }
  
  stopTTS();  // Cancel any ongoing speech
  viBot.textContent = '';
  
  // Text cleaning
  var clean = text
    .replace(/[#*_`>\[\]]/g, '')  // Remove markdown chars
    .slice(0, 600);                // Limit to 600 chars
  
  var u = new SpeechSynthesisUtterance(clean);
  CURR_UTT = u;
  
  /* Voice parameters */
  u.rate   = 1.05;     // 5% faster than normal
  u.pitch  = 1;        // Normal pitch
  u.volume = 1;        // Full volume (implicit default)
  u.voice  = null;     // Browser default voice (not explicitly set)
  u.lang   = '';       // Auto-detect language
  
  setVState('speaking');
  
  u.onend = function() { /* ... */ };
  u.onerror = function() { /* ... */ };
  
  window.speechSynthesis.speak(u);
}
```

**SandboxTab.js uses identical configuration (lines 216-228).**

---

### Sentence Chunking

**Current Implementation:** **NO CHUNKING**

The entire response text is spoken as a single utterance:
```javascript
var clean = text.replace(/[#*_`>\[\]]/g, '').slice(0, 600);
var u = new SpeechSynthesisUtterance(clean);
window.speechSynthesis.speak(u);  // Single utterance
```

**Implications:**
- Speech cannot be paused mid-sentence
- Interruption requires full cancel (`speechSynthesis.cancel()`)
- No natural sentence boundaries for better UX
- 600-character limit may cut off long responses mid-sentence

**Potential Improvement:**
```javascript
// Future: Split into sentences
var sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
sentences.forEach((s, i) => {
  var u = new SpeechSynthesisUtterance(s.trim());
  u.onend = () => {
    if (i === sentences.length - 1) setVState('idle');
  };
  window.speechSynthesis.speak(u);
});
```

---

### TTS Interruption & Cancelability

**Is speech cancelable?** **YES** - via two methods:

#### **Method 1: Explicit Cancel**
```javascript
function stopTTS() {
  stopInterruptWatcher();
  if (CURR_UTT) {
    CURR_UTT.onend = null;      // Clear callbacks to prevent side effects
    CURR_UTT.onerror = null;
    CURR_UTT = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
```

**Triggers:**
- User taps orb during `SPEAKING` state
- User clicks mute button
- User closes voice island
- New speech recognition starts (interrupt watcher)

#### **Method 2: Background Interrupt Watcher (Production Only)**

**Location:** `widget.js` lines 542-564

**Purpose:** Detect when user starts speaking WHILE AI is talking, and immediately stop AI speech.

**Configuration:**
```javascript
function startInterruptWatcher() {
  if (IREC || MUTED || !VOICE || IS_IFRAME) return;  // Skip in sandbox
  
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  
  IREC = new SR();
  IREC.continuous     = false;   // Single detection
  IREC.interimResults = false;   // Final result only
  
  IREC.onresult = function(e) {
    if (VSTATE !== 'speaking') return;  // Only interrupt if still speaking
    
    var txt = (e.results[0] && e.results[0][0] 
               ? e.results[0][0].transcript 
               : '').trim();
    
    stopTTS();  // Immediately cancel AI speech
    
    if (txt) sendText(txt);  // Send user's interruption as new message
    else {
      setVState('idle');
      setTimeout(() => { 
        if (VOICE && !MUTED) startListening(); 
      }, 200);
    }
  };
  
  IREC.onerror = function() { IREC = null; };
  
  IREC.onend = function() {
    IREC = null;
    // Restart watcher if AI is STILL speaking
    if (VSTATE === 'speaking' && VOICE && !MUTED) {
      setTimeout(() => { 
        if (VSTATE === 'speaking') startInterruptWatcher(); 
      }, 200);
    }
  };
  
  try { IREC.start(); } catch(e) { IREC = null; }
}
```

**Auto-starts:** 400ms after TTS begins (widget.js line 533)

**NOT used in SandboxTab.js** - interruption is orb-tap only.

---

## 3️⃣ INTERRUPTION LOGIC

### What Happens When User Speaks While AI Is Speaking

**Two different behaviors:**

#### **A. Production Widget (`widget.js`) - Background Watcher**

```
AI starts speaking
      │
      ▼
400ms delay
      │
      ▼
startInterruptWatcher()
      │ (Passive SpeechRecognition listening in background)
      │
      ▼
User starts speaking
      │
      ▼
IREC.onresult fires
      │
      ├─ stopTTS()              ← Cancels AI speech immediately
      ├─ VSTATE: SPEAKING → LISTENING
      │
      ├─ If transcript detected:
      │    sendText(txt)         ← Submit user's interruption
      │
      └─ If no transcript:
           setVState('idle')
           setTimeout(() => startListening(), 200ms)
```

**Priority:** User speech > AI speech (AI stops immediately)

**Event:** `IREC.onresult` (background recognition)

---

#### **B. Sandbox Component (`SandboxTab.js`) - Manual Tap Only

```
AI is speaking
      │
      ▼
User taps orb
      │
      ▼
handleOrbTap() called
      │
      ├─ vStateRef.current === 'speaking'
      │
      ▼
stopTTS()                    ← Cancels AI speech
setVState('idle')
      │
      ▼
setTimeout(() => {
  if (voiceModeRef.current && !mutedRef.current) {
    startListeningInner();   ← Restart mic after 300ms
  }
}, 300);
```

**Priority:** Manual tap interrupts AI, then restarts listening

**Event:** User tap on orb (lines 339-345)

**No background watcher** - must be explicit user action.

---

### Current Priority Rules

**widget.js (Production):**
1. **User speech detected (IREC)** → Immediate TTS cancel → Send user text
2. **User taps orb** → Immediate TTS cancel → Start listening
3. **User taps mute** → Stop TTS + listening
4. **User closes island** → Stop everything

**SandboxTab.js (Sandbox):**
1. **User taps orb** → Cancel TTS → Restart listening (300ms delay)
2. **User taps mute** → Stop TTS + listening
3. **User closes island** → Stop everything

**Priority Hierarchy:**
```
User Input (tap/speech) > AI Speech > Silence > Auto-restart
```

---

## 4️⃣ WAVE / AUDIO ANIMATION SYSTEM

### What Drives the Wave Animation?

**Method:** **Pure CSS loop** (NOT tied to real audio amplitude)

**Location:** `widget.js` lines 180-210, `SandboxTab.js` lines 10-27

**CSS Animation Definition:**

```css
@keyframes sbBar {
  from { height: 3px; }
  to { height: 16px; }
}

.sb-bar {
  width: 2.5px;
  min-height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,.75);
  transform-origin: bottom;
  animation: sbBar var(--dur) ease-in-out infinite alternate;
}
```

**7 bars with staggered delays:**

```javascript
/* widget.js lines 205-206 */
var L_DELAYS = [0, 60, 120, 180, 120, 60, 0];       // Listening delays (ms)
var S_DELAYS = [0, 150, 300, 420, 300, 150, 0];    // Speaking delays (ms)

/* Bars are rendered with inline animation-delay: */
<div style="animation-delay: ${delay}ms"></div>
```

**HTML Structure (widget.js lines 207-210):**
```html
<div class="ep-vi-wave" data-s="idle">
  <div class="sb-bar" style="animation-delay: 0ms"></div>
  <div class="sb-bar" style="animation-delay: 60ms"></div>
  <div class="sb-bar" style="animation-delay: 120ms"></div>
  <!-- ... 7 bars total ... -->
</div>
```

---

### State-Based Animation Changes

**Controlled by `data-s` attribute on wave container:**

```javascript
viWave.setAttribute('data-s', state);  // 'idle' | 'listening' | 'processing' | 'speaking'
```

**CSS selectors adjust animation based on state:**

```css
/* widget.js lines 180-210 */

/* LISTENING: Faster bars, red tint */
.ep-vi-wave[data-s="listening"] .sb-bar {
  animation: sbBar 0.45s ease-in-out infinite alternate;
  background: rgba(239, 68, 68, 0.75);  /* Red */
}

/* SPEAKING: Slower bars, teal tint */
.ep-vi-wave[data-s="speaking"] .sb-bar {
  animation: sbBar 0.65s ease-in-out infinite alternate;
  background: rgba(20, 184, 166, 0.75);  /* Teal */
}

/* PROCESSING: Medium speed, purple tint */
.ep-vi-wave[data-s="processing"] .sb-bar {
  animation: sbBar 0.55s ease-in-out infinite alternate;
  background: rgba(124, 58, 237, 0.75);  /* Purple */
}

/* IDLE: No animation or very slow pulse */
.ep-vi-wave[data-s="idle"] .sb-bar {
  animation: none;
  height: 3px;
  opacity: 0.3;
}
```

---

### Why Wave Appears Unsynced with Real Audio

**Root Cause:** Animation is **NOT driven by microphone input or TTS audio output**.

**Technical Limitations:**

1. **No Real-Time Audio Analysis:**
   - No Web Audio API `AnalyserNode` connected to mic input
   - No FFT (Fast Fourier Transform) for frequency analysis
   - No RMS (Root Mean Square) for volume detection

2. **Pure CSS Loop:**
   - Bars animate at fixed intervals regardless of sound
   - Animation continues even when user is silent
   - Animation continues during AI speech without sync to waveform

3. **No Browser API for TTS Waveform:**
   - `speechSynthesis` API does not expose audio stream
   - Cannot analyze AI speech amplitude in real-time

**Current Behavior:**
```
User speaks loudly  → Bars animate at fixed speed
User speaks softly  → Bars animate at fixed speed (SAME)
User is silent      → Bars still animate (looks wrong)
AI speaks           → Bars animate at different fixed speed
```

**Result:** Bars are **decorative**, not **reactive**.

---

### Horizontal vs Vertical Animation Method

**Current:** **Vertical animation** (height changes)

**Implementation:**
```css
@keyframes sbBar {
  from { height: 3px; }
  to { height: 16px; }
}

.sb-bar {
  transform-origin: bottom;  /* Grow upward from base */
}
```

**Alternative - Horizontal waveform (not used):**
```css
/* Would require different structure */
.wave-horizontal {
  display: flex;
  align-items: center;
}
.sb-bar-hz {
  width: 16px;
  height: 2.5px;
  animation: sbBarHz 0.45s ease-in-out infinite alternate;
}
@keyframes sbBarHz {
  from { width: 3px; }
  to { width: 16px; }
}
```

**Why vertical was chosen:**
- More compact in horizontal space
- Classic audio visualizer aesthetic
- Fits pill shape of voice island

---

### Animation Speed & Scale Control

**Speed Control:**

```javascript
/* Set via CSS animation duration */
listening:  0.45s  (fast, energetic)
processing: 0.55s  (medium)
speaking:   0.65s  (slower, calmer)
idle:       none   (static)
```

**Scale Control:**

```css
@keyframes sbBar {
  from { height: 3px; }   /* Min height */
  to { height: 16px; }    /* Max height (scale factor ~5.3x) */
}
```

**Stagger Control (creates wave effect):**

```javascript
/* Listening: tight stagger */
var L_DELAYS = [0, 60, 120, 180, 120, 60, 0];  // Peak in middle

/* Speaking: wider stagger */
var S_DELAYS = [0, 150, 300, 420, 300, 150, 0];  // Slower ripple
```

**Visual Effect:**
- Bars animate out-of-phase
- Creates left-to-right then right-to-left wave
- Symmetrical pattern (first and last bar mirror each other)

---

## 5️⃣ VOICE ISLAND UI MOTION SYSTEM

### Morph Animation Implementation

**Purpose:** Transition from FAB (floating action button) position → bottom-center pill shape

**Location:** 
- `widget.js`: Lines 131-169 (@keyframes epViIn, epViOut)
- `SandboxTab.js`: Lines 11-20 (@keyframes sbViIn, sbViOut)

---

### Animated Properties

**1. `transform` (position + scale)**

```css
@keyframes epViIn {
  0% {
    /* Start: FAB position, tiny circle */
    transform: translateX(calc(-50% + var(--vi-dx, 42vw))) scale(0.17);
    border-radius: 50%;
    opacity: 0.35;
  }
  52% {
    /* Middle: bottom-center, still tiny but becoming pill */
    transform: translateX(-50%) scale(0.17);
    border-radius: 28px;
    opacity: 1;
  }
  100% {
    /* End: bottom-center, full size pill */
    transform: translateX(-50%) scale(1);
    border-radius: 32px;
    opacity: 1;
  }
}
```

**2. `width/height`** - Indirectly via `scale()`

**3. `border-radius`**
- `50%` (circle) → `28px` → `32px` (pill)

**4. `opacity`**
- `0.35` → `1` (fade in)

---

### How `--vi-dx` is Computed

**Purpose:** Calculate horizontal distance from FAB to bottom-center

**widget.js (lines 641-643):**
```javascript
/* Compute dx: FAB center relative to page center */
var dx = (window.innerWidth - 48) - (window.innerWidth / 2);
viIsland.style.setProperty('--vi-dx', dx + 'px');
```

**Breakdown:**
```
FAB position:      right: 20px, width: 56px
FAB center X:      window.innerWidth - 20 - 28 = window.innerWidth - 48

Page center X:     window.innerWidth / 2

Offset (dx):       (window.innerWidth - 48) - (window.innerWidth / 2)
                 = window.innerWidth / 2 - 48
                 ≈ 50% of viewport width - 48px
```

**Example:**
- Viewport width: 1920px
- FAB center: 1920 - 48 = 1872px
- Page center: 960px
- dx = 1872 - 960 = **912px** (FAB is 912px to the right of center)

**SandboxTab.js (lines 310-318):**
```javascript
/* Compute morph dx: mic button center → container center */
if (micBtnRef.current && sandboxRef.current) {
  const mic = micBtnRef.current.getBoundingClientRect();
  const box = sandboxRef.current.getBoundingClientRect();
  const micCX       = mic.left + mic.width / 2 - box.left;
  const containerCX = box.width / 2;
  const dx = micCX - containerCX;
  if (islandRef.current) islandRef.current.style.setProperty("--sb-dx", dx + "px");
}
```

**Difference:** Sandbox calculates relative to container, not viewport.

---

### What Triggers the Transition

**Opening Animation:**

**widget.js (lines 656-676):**
```javascript
function openVoice() {
  /* ... setup ... */
  
  setTimeout(function() {
    viBg.classList.add('active');          // Fade in backdrop
    viWave.classList.add('show');          // Show wave bars
    viIsland.className = 'ep-vi-island vi-entering';  // Trigger animation
    
    var ANIM_T = setTimeout(onIslandOpen, 380);  // Fallback timeout
    
    function onIslandOpen() {
      clearTimeout(ANIM_T);
      viIsland.className = 'ep-vi-island vi-open';  // Final state
      setVState('idle');
      if (!MUTED) setTimeout(() => {
        if (VOICE && VSTATE === 'idle') startListening();
      }, 320);
    }
    
    /* Listen for CSS animationend event */
    viIsland.addEventListener('animationend', function once(e) {
      if (e.target !== viIsland) return;
      clearTimeout(ANIM_T);
      viIsland.removeEventListener('animationend', once);
      onIslandOpen();
    });
  }, wasOpen ? 300 : 90);  // Delay if chat was open (to close first)
}
```

**Closing Animation:**

**widget.js (lines 679-707):**
```javascript
function closeVoice() {
  stopListening(); stopTTS(); MUTED = false;
  viBg.classList.remove('active');        // Fade out backdrop
  viWave.classList.remove('show');        // Hide wave
  
  viIsland.className = 'ep-vi-island vi-leaving';  // Trigger reverse animation
  
  var ANIM_T = setTimeout(onIslandClosed, 340);  // Fallback timeout
  
  function onIslandClosed() {
    clearTimeout(ANIM_T);
    viIsland.className = 'ep-vi-island';  // Remove all classes
    VOICE = false; VSTATE = 'idle';
    
    /* Restore FAB with spring animation */
    fab.style.cssText = '... transform: scale(1); opacity: 1; ...';
    fab.innerHTML = SVG_X_16;
    
    /* Re-open chat with history */
    setTimeout(() => {
      OPEN = true;
      chat.classList.add('open');
    }, 50);
  }
  
  viIsland.addEventListener('animationend', function once(e) {
    if (e.target !== viIsland) return;
    clearTimeout(ANIM_T);
    viIsland.removeEventListener('animationend', once);
    onIslandClosed();
  });
}
```

**Trigger Sources:**
1. **User clicks mic button** → `openVoice()`
2. **User taps X or backdrop** → `closeVoice()`
3. **User presses ESC key** → `closeVoice()`

---

### Animation Timing

**Opening:**
- **Total duration:** 320ms
- **Keyframes:**
  - `0%`: FAB position, scale(0.17), circle
  - `52%`: Center, scale(0.17), pill shape (166ms)
  - `100%`: Center, scale(1), pill shape (320ms)
- **Delay before start:** 90ms (normal) or 300ms (if chat was open)
- **Delay before auto-listen:** 320ms after opening completes

**Closing:**
- **Total duration:** 280ms
- **Keyframes:** Reverse of opening
- **FAB restore delay:** 340ms (animation + buffer)

**CSS Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard ease)

---

## 6️⃣ CHAT LAUNCHER UI STATE

### How Launcher Stores Visual State

**Method:** **Inline `style.cssText` manipulation**

**Location:** `widget.js` lines 653-654, 693-694

**Initial State (page load):**
```html
<button class="ep-fab" style="
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  background: var(--ep-c, #7C3AED);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  ...
">
  <svg>...</svg> <!-- X icon -->
</button>
```

**Stored in:** DOM element's `style` attribute

**Controlled by:** CSS variable `--ep-c` (set via `setColor()` function)

---

### Why Color Resets After Exiting Voice Mode

**Issue:** Launcher button color resets to default purple after voice island closes.

**Root Cause:** `style.cssText` is **overwritten entirely** during voice island close.

**Code Analysis:**

**Opening voice (lines 653-654):**
```javascript
/* Shrink FAB during voice mode */
fab.style.cssText = 'position:fixed;bottom:20px;right:20px;...transform:scale(0);opacity:0;pointer-events:none;...';
```
**Problem:** This **removes** `background: var(--ep-c)` from inline styles.

**Closing voice (lines 693-694, 700):**
```javascript
/* Restore FAB */
fab.style.cssText = 'position:fixed;bottom:20px;right:20px;...background:var(--ep-c,#7C3AED);...transform:scale(1);opacity:1;...';
fab.innerHTML = SVG_X_16;  // Restore icon

/* Final cleanup */
setTimeout(function() {
  fab.style.cssText = '';      // ❌ CLEARS ALL INLINE STYLES
  fab.innerHTML = SVG_X_16;
}, 310);
```

**The Bug:**
- Line 700: `fab.style.cssText = ''` clears **all** inline styles
- CSS variable `--ep-c` falls back to default `#7C3AED` (purple)
- Any custom project color is lost

**Fix (not applied):**
```javascript
/* Instead of clearing entirely: */
fab.style.cssText = 'background:var(--ep-c,' + CFG.primary_color + ');';
```

---

### Component Remount vs Restyle

**widget.js Behavior:** **Restyle only** (no remount)

- FAB is created once on page load (lines 280-300)
- `style.cssText` is manipulated to shrink/restore
- innerHTML is swapped (X icon ↔ chat icon)
- **Never removed from DOM**

**SandboxTab.js Behavior:** **React re-render** (not remount)

- Launcher is a persistent React component
- `className` and `style` props change
- React reconciliation updates DOM properties
- **Component never unmounts** (unless parent unmounts)

**Key Difference:**
- **widget.js**: Imperative DOM manipulation
- **SandboxTab.js**: Declarative React state updates

---

## 7️⃣ MESSAGE STORE ARCHITECTURE

### Where Conversation Messages Are Stored

**widget.js:**
```javascript
/* Global state (lines 9-12) */
var SID = null;        // Session ID
var MSGS = [];         // Array of {role, text, id}

/* Message structure */
MSGS = [
  { role: 'bot', text: 'Hi! How can I help?', id: null },
  { role: 'user', text: 'Hello', id: 'msg_123' },
  { role: 'bot', text: 'Hi there!', id: 'msg_456' }
];

/* localStorage persistence (lines 16-19) */
var LS_KEY = 'ep_data_' + PK;  // ep_data_<project_key>

function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      sid: SID,
      msgs: MSGS.slice(-50)  // Keep last 50 messages only
    }));
  } catch(e) {}
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY));
  } catch(e) {
    return null;
  }
}
```

**SandboxTab.js:**
```javascript
/* React state (lines 46-49) */
const [messages, setMessages] = useState([]);

/* Message structure */
messages = [
  { role: 'assistant', content: 'Hi!', id: 'welcome', source: 'rag' },
  { role: 'user', content: 'Hello', id: 'u_1234567890' },
  { role: 'assistant', content: 'Hi there!', id: 'msg_456', source: 'rag' }
];
```

**Storage Comparison:**

| Aspect | widget.js | SandboxTab.js |
|--------|-----------|---------------|
| **Store** | `MSGS` array (global var) | `messages` state (React) |
| **Persistence** | localStorage | Session only (no persist) |
| **Capacity** | 50 messages max | Unlimited (session memory) |
| **Key** | `ep_data_<project_key>` | N/A |
| **Reload behavior** | Restores last 50 msgs | Reinitializes session |

---

### How Voice Mode Writes to Store

**widget.js (lines 495-497):**
```javascript
if (VOICE && full) {
  /* Render to shared chat store so history is visible when chat reopens */
  renderMsg('bot', full, mid, true);  // silent=true (no animation)
  speakTTS(full);                      // Start TTS
}

/* renderMsg() function (lines 422-436) */
function renderMsg(role, text, msgId, silent) {
  MSGS.push({ role: role, text: text, id: msgId });  // ← ADD TO STORE
  
  /* Create DOM element */
  var d = document.createElement('div'); d.className = 'ep-msg ep-msg-' + role;
  var b = document.createElement('div'); b.className = 'ep-bubble ep-bubble-' + role;
  b.innerHTML = fmtMd(text);
  d.appendChild(b);
  msgsCt.appendChild(d);  // Add to chat UI
  
  if (!silent) saveLocal();  // Persist to localStorage
}
```

**Key Point:** Voice messages are added to the **same `MSGS` array** as chat messages.

**Result:** When voice island closes and chat reopens, all voice messages appear in chat history.

---

**SandboxTab.js (lines 209-210):**
```javascript
setStreamingText("");
setMessages(prev => [...prev, { 
  role: "assistant", 
  content: full, 
  id: msgId, 
  source: "rag" 
}]);
```

**Unified Store:** Both text chat and voice mode append to the same `messages` state array.

---

### How Chat Mode Reads from Store

**widget.js:**
- Chat UI directly iterates over `MSGS` array
- DOM is manually created for each message (lines 422-436)
- On page reload: `loadLocal()` restores from localStorage → `renderMsg()` for each

**SandboxTab.js:**
```javascript
{messages.map((msg) => (
  <div key={msg.id} className={...}>
    {/* Render message bubble */}
  </div>
))}
```

**React re-renders chat UI whenever `messages` state updates.**

---

### Temporary Voice Transcript State

**Separate from main message store:**

**widget.js (lines 11-12):**
```javascript
var LAST_FINAL_TXT = '';    // Last submitted user text (for dedup)
var LAST_FINAL_TIME = 0;    // Timestamp of last submit

/* During recognition (lines 594-606) */
viUsr.textContent = txt;    // Live interim transcript (NOT in MSGS yet)
```

**SandboxTab.js (lines 56-57, 69-70):**
```javascript
const [liveText, setLiveText] = useState("");      // Interim STT transcript
const [botTxt, setBotTxt]     = useState("");      // AI streaming text in island

const lastFinalTxt  = useRef("");   // Last submitted text (dedup)
const lastFinalTime = useRef(0);    // Timestamp
```

**Flow:**
1. **Interim results** → `liveText` (not in `messages`)
2. **Final result** → Submit → Add to `messages`
3. **Dedup check** → Compare with `lastFinalTxt` (1.5s window)

**Purpose:** Prevent displaying incomplete transcripts as permanent messages.

---

## 8️⃣ PERFORMANCE & TIMING

### All Hardcoded Timing Values

| Purpose | Value | Location | Notes |
|---------|-------|----------|-------|
| **Silence Detection** | N/A | Not implemented | Browser's `no-speech` timeout used instead |
| **Animation: Voice Island In** | 320ms | widget.js:118, SandboxTab.js:102 | Morph from FAB to pill |
| **Animation: Voice Island Out** | 280ms | widget.js:128, SandboxTab.js:116 | Morph from pill to FAB |
| **Auto-listen Delay (after island opens)** | 320ms | widget.js:668, SandboxTab.js:108 | Wait for animation complete |
| **Auto-listen Delay (after TTS ends)** | 650ms | widget.js:527 | Production only, not sandbox |
| **TTS Restart Delay (production loop)** | 650ms | widget.js:527 | Between AI speech and mic restart |
| **Interrupt Watcher Start Delay** | 400ms | widget.js:533 | After TTS begins speaking |
| **Interrupt Watcher Restart Delay** | 200ms | widget.js:560 | If still speaking, restart watcher |
| **Interrupt → Listen Delay** | 200ms | widget.js:553 | After interrupt with no text |
| **Orb Tap → Listen Delay (after cancel)** | 300ms | SandboxTab.js:342 | After stopping AI speech |
| **Deduplication Window** | 1500ms | widget.js:452, SandboxTab.js:165 | Ignore same text within 1.5s |
| **Chat Close Delay (before voice)** | 300ms | widget.js:676 | If chat was open |
| **Chat Close Delay (normal)** | 90ms | widget.js:676 | If chat was closed |
| **FAB Restore Delay** | 340ms | widget.js:687 | After island close animation |
| **FAB Style Clear Delay** | 310ms | widget.js:700 | Final cleanup |
| **Chat Reopen Delay** | 50ms | widget.js:696 | After FAB restore |
| **Animation: Wave Bar (listening)** | 450ms | CSS | Bar height oscillation |
| **Animation: Wave Bar (processing)** | 550ms | CSS | Bar height oscillation |
| **Animation: Wave Bar (speaking)** | 650ms | CSS | Bar height oscillation |
| **Animation: Orb Pulse** | 2000ms | CSS | Orb glow pulse in idle |
| **Animation: Typing Dots** | 600ms | CSS | Chat "typing..." indicator |
| **Animation: Message Fade Up** | 200ms | CSS | New message entrance |
| **Animation: Chat Panel In** | 300ms | CSS | Chat panel open |
| **Animation: Chat Panel Out** | 280ms | CSS | Chat panel close |
| **Wave Bar Stagger (listening)** | 0, 60, 120, 180, 120, 60, 0 (ms) | widget.js:205 | 7 bars |
| **Wave Bar Stagger (speaking)** | 0, 150, 300, 420, 300, 150, 0 (ms) | widget.js:206 | 7 bars |

---

### Critical Timing Dependencies

**Race Condition Fixes:**
1. **Manual `.stop()` on `isFinal`** (lines 604, 277) - Prevents 800ms browser timeout race
2. **`onend` state guard** (lines 616-619, 293-296) - Only reset to IDLE if still LISTENING
3. **Animation fallback timeout** (lines 663, 687) - Ensures state transition even if `animationend` doesn't fire

**Performance Considerations:**
- **localStorage save throttling**: Not implemented (saves on every message)
- **Message array limit**: 50 messages (widget.js only)
- **Streaming chunk size**: Not configurable (browser's SSE chunk size)

---

### Optimization Opportunities

1. **Debounce `saveLocal()`** - Currently saves on every message
2. **Lazy load chat history** - Render only visible messages (virtualization)
3. **Cancel in-flight API requests** - When user closes voice/chat mid-stream
4. **Connection pooling** - Reuse SSE connections if supported
5. **Web Audio API integration** - Real-time amplitude for wave animation

---

## SUMMARY

### Current Implementation Strengths
✅ Clean state machine (4 states: idle/listening/processing/speaking)  
✅ Unified message store (voice + chat)  
✅ Production/sandbox environment detection  
✅ Deduplication prevents double-sends  
✅ Manual `.stop()` avoids race conditions  
✅ Smooth CSS animations with fallback timeouts  

### Known Limitations
⚠️ Wave animation not synced to real audio  
⚠️ No sentence chunking for TTS (single 600-char utterance)  
⚠️ FAB color resets due to `style.cssText` overwrite  
⚠️ No localStorage throttling (saves every message)  
⚠️ Background interrupt watcher only in production  
⚠️ No API request cancellation on early exit  

### Next Steps for Refinement
1. Integrate Web Audio API for real-time amplitude-driven waves
2. Implement sentence-based TTS chunking for better interruption UX
3. Fix FAB color persistence bug
4. Add API request cancellation (AbortController)
5. Throttle localStorage saves (debounce)
6. Add visual feedback for mic permission errors

---

**END OF REPORT**
