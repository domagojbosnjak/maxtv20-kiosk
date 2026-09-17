// ===== LOCATION SETUP =====
var DEVICE_LOCATION = localStorage.getItem('maxtv20_location') || '';

function saveSetupLocation() {
  var loc = document.getElementById('setup-custom').value.trim().toUpperCase();
  if (!loc) { alert('Upišite naziv lokacije.'); return; }
  hideKeyboard();
  localStorage.setItem('maxtv20_location', loc);
  DEVICE_LOCATION = loc;
  document.getElementById('screen-setup').style.display = 'none';
  document.getElementById('screen-welcome').classList.add('active');
  document.getElementById('screen-welcome').style.display = 'flex';
}

(function() {
  if (!DEVICE_LOCATION) {
    document.getElementById('screen-welcome').classList.remove('active');
    document.getElementById('screen-welcome').style.display = 'none';
    var setup = document.getElementById('screen-setup');
    setup.style.display = 'flex';
    setup.classList.add('active');
  }
})();

// ===== STATE =====
let regName = '';
let regPhone = '';
let answerQ1 = '';
let answerQ2 = '';
let activeInput = null;
let shiftActive = false;
let keyboardMode = 'alpha';

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  const screen = document.getElementById(screenId);
  screen.style.display = 'flex';
  void screen.offsetWidth;
  screen.classList.add('active');

  const logo = document.getElementById('t-logo');
  if (screenId === 'screen-welcome') {
    if (logo) logo.classList.add('t-logo-hidden');
  } else {
    if (logo) logo.classList.remove('t-logo-hidden');
  }
}

function showWelcome() {
  clearAutoReturn();
  hideKeyboard();
  showScreen('screen-welcome');
}

function showRegistrationScreen() {
  showScreen('screen-registration');
  startInactivityTimer();
}

function showRulesScreen() {
  showScreen('screen-rules');
  startInactivityTimer();
}

// ===== KEYBOARD =====
const KEYS_ALPHA = [
  ['Q','W','E','R','T','Z','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['shift','Y','X','C','V','B','N','M','backspace'],
  ['123','@','space','.','done']
];

const KEYS_NUM = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['+','-','_','/',':','(',')','!','?','backspace'],
  ['ABC','@','space','.','done']
];

const DIACRITICS = {
  'C': ['Č', 'Ć'], 'c': ['č', 'ć'],
  'S': ['Š'], 's': ['š'],
  'Z': ['Ž'], 'z': ['ž'],
  'D': ['Đ'], 'd': ['đ']
};

let longPressTimer = null;
let longPressActive = false;

function showDiacriticPopup(btn, variants) {
  longPressActive = true;
  closeDiacriticPopup();
  const popup = document.createElement('div');
  popup.className = 'kb-diacritic-popup';
  popup.id = 'diacritic-popup';
  variants.forEach(ch => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'kb-diacritic-option';
    opt.textContent = ch;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      typeKey(ch);
      closeDiacriticPopup();
      longPressActive = false;
    };
    opt.addEventListener('touchstart', handler);
    opt.addEventListener('mousedown', handler);
    popup.appendChild(opt);
  });
  btn.style.position = 'relative';
  btn.appendChild(popup);
}

function closeDiacriticPopup() {
  const existing = document.getElementById('diacritic-popup');
  if (existing) existing.remove();
}

function buildKeyboard(mode) {
  keyboardMode = mode;
  const keys = mode === 'alpha' ? KEYS_ALPHA : KEYS_NUM;
  // On the name field, show the keyboard already "shifted" at the start of
  // every word (like a phone keyboard's auto-cap) - so it's visually clear
  // BEFORE typing that this letter will land as a capital, matching what
  // autoCapitalizeWords() then enforces on the value.
  const wordStartAutoCap = mode === 'alpha' && activeInput && activeInput.id === 'reg-name' && isWordStart(activeInput);
  const effectiveShift = shiftActive || wordStartAutoCap;
  keys.forEach((row, i) => {
    const rowEl = document.getElementById(`kb-row-${i + 1}`);
    rowEl.innerHTML = '';
    row.forEach(key => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (key === 'space') {
        btn.className = 'kb-key kb-key-space';
        btn.textContent = 'RAZMAK';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); typeKey(' '); });
      } else if (key === 'backspace') {
        btn.className = 'kb-key kb-key-backspace';
        btn.innerHTML = '&#9003;';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); typeKey('backspace'); });
      } else if (key === 'done') {
        btn.className = 'kb-key kb-key-done';
        btn.textContent = 'OK';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); advanceToNextField(); });
      } else if (key === 'shift') {
        btn.className = 'kb-key kb-key-shift' + (effectiveShift ? ' active' : '');
        btn.innerHTML = '&#8679;';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleShift(); });
      } else if (key === '123') {
        btn.className = 'kb-key kb-key-action';
        btn.textContent = '123';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); buildKeyboard('num'); });
      } else if (key === 'ABC') {
        btn.className = 'kb-key kb-key-action';
        btn.textContent = 'ABC';
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); buildKeyboard('alpha'); });
      } else {
        btn.className = 'kb-key';
        const displayKey = effectiveShift ? key.toUpperCase() : key.toLowerCase();
        btn.textContent = keyboardMode === 'num' ? key : displayKey;
        const charForKey = keyboardMode === 'num' ? key : displayKey;
        const hasDiacritics = DIACRITICS[charForKey];
        const startPress = (e) => {
          e.preventDefault();
          longPressActive = false;
          if (hasDiacritics) {
            longPressTimer = setTimeout(() => { showDiacriticPopup(btn, hasDiacritics); }, 400);
          }
        };
        const endPress = (e) => {
          e.preventDefault();
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
          if (!longPressActive) { typeKey(charForKey); }
          longPressActive = false;
        };
        btn.addEventListener('touchstart', startPress);
        btn.addEventListener('touchend', endPress);
        btn.addEventListener('touchcancel', () => {
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
          longPressActive = false;
        });
      }
      const isRegularKey = !['space','backspace','done','shift','123','ABC'].includes(key);
      if (isRegularKey) {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const ck = keyboardMode === 'num' ? key : (effectiveShift ? key.toUpperCase() : key.toLowerCase());
          const hasDiac = DIACRITICS[ck];
          longPressActive = false;
          if (hasDiac) { longPressTimer = setTimeout(() => { showDiacriticPopup(btn, hasDiac); }, 400); }
        });
        btn.addEventListener('mouseup', (e) => {
          e.preventDefault();
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
          if (!longPressActive) {
            const ck = keyboardMode === 'num' ? key : (effectiveShift ? key.toUpperCase() : key.toLowerCase());
            typeKey(ck);
          }
          longPressActive = false;
        });
      } else if (!btn._touchBound) {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          btn.dispatchEvent(new Event('touchstart'));
        });
      }
      rowEl.appendChild(btn);
    });
  });
  const row4 = document.getElementById('kb-row-4');
  row4.style.display = mode === 'num' ? 'none' : '';
}

document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.kb-diacritic-popup') && !e.target.closest('.kb-key')) {
    closeDiacriticPopup();
    longPressActive = false;
  }
});
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.kb-diacritic-popup') && !e.target.closest('.kb-key')) {
    closeDiacriticPopup();
    longPressActive = false;
  }
});

// Explicit "key registered" visual feedback (in addition to CSS :active) -
// decoupled from the per-key typing handlers above so it's guaranteed to
// show regardless of preventDefault()/touch quirks on any given key.
function releasePressedKeys() {
  document.querySelectorAll('.kb-key.kb-pressed').forEach(function(k) { k.classList.remove('kb-pressed'); });
}
document.addEventListener('touchstart', function(e) {
  var key = e.target.closest('.kb-key');
  if (key) key.classList.add('kb-pressed');
});
document.addEventListener('mousedown', function(e) {
  var key = e.target.closest('.kb-key');
  if (key) key.classList.add('kb-pressed');
});
document.addEventListener('touchend', releasePressedKeys);
document.addEventListener('touchcancel', releasePressedKeys);
document.addEventListener('mouseup', releasePressedKeys);

function toggleShift() {
  shiftActive = !shiftActive;
  buildKeyboard('alpha');
}

// Auto-capitalize the first letter of each word (e.g. "Pero Perić Peričić")
// as the name is typed - only rewrites case, never length, so a cursor
// position captured before calling this stays valid afterwards.
function autoCapitalizeWords(value) {
  return value.replace(/(^|\s)(\p{L})/gu, function(m, before, letter) { return before + letter.toUpperCase(); });
}

// True when the cursor sits at the very start of the field, or right after
// a space - i.e. the next letter typed will be word-initial.
function isWordStart(input) {
  var pos = input.value.length;
  try { pos = input.selectionStart != null ? input.selectionStart : pos; } catch(ex) {}
  if (pos === 0) return true;
  return /\s/.test(input.value.charAt(pos - 1));
}

function typeKey(key) {
  if (!activeInput) return;
  const input = activeInput;
  var len = input.value.length;
  var start = len, end = len;
  try { start = input.selectionStart || len; end = input.selectionEnd || len; } catch(ex) {}
  var finalPos = start;
  if (key === 'backspace') {
    if (start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(end);
      finalPos = start - 1;
    }
  } else {
    if (input.maxLength && input.value.length >= input.maxLength) return;
    input.value = input.value.slice(0, start) + key + input.value.slice(end);
    finalPos = start + 1;
  }
  if (input.id === 'reg-name') {
    input.value = autoCapitalizeWords(input.value);
  }
  try { input.setSelectionRange(finalPos, finalPos); } catch(ex) {}
  var shiftWasConsumed = shiftActive && key !== 'backspace';
  if (shiftWasConsumed) { shiftActive = false; }
  // Rebuild whenever a one-shot shift was just used (existing behaviour),
  // AND on every keystroke in reg-name so the keyboard's "next letter will
  // be capital" look (see buildKeyboard's wordStartAutoCap) stays in sync
  // with the cursor as the user crosses word boundaries.
  if (keyboardMode === 'alpha' && (shiftWasConsumed || input.id === 'reg-name')) {
    buildKeyboard('alpha');
  }
  input.dispatchEvent(new Event('input'));
}

function showKeyboard(inputEl) {
  activeInput = inputEl;
  const kb = document.getElementById('keyboard');
  kb.classList.add('visible');
  if (inputEl.type === 'tel') { buildKeyboard('num'); }
  else { buildKeyboard('alpha'); }
}

function advanceToNextField() {
  if (!activeInput) { hideKeyboard(); return; }
  if (activeInput.id === 'setup-custom') {
    hideKeyboard();
    return;
  }
  const fields = ['reg-name', 'reg-phone'];
  const currentIdx = fields.indexOf(activeInput.id);
  if (currentIdx >= 0 && currentIdx < fields.length - 1) {
    showKeyboard(document.getElementById(fields[currentIdx + 1]));
  } else {
    hideKeyboard();
  }
}

function hideKeyboard() {
  activeInput = null;
  document.getElementById('keyboard').classList.remove('visible');
  shiftActive = false;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reg-input, .setup-input').forEach(input => {
    input.addEventListener('click', (e) => { e.preventDefault(); showKeyboard(input); });
    input.addEventListener('focus', (e) => { e.preventDefault(); });
  });
});

// ===== REGISTRATION =====
function toggleGdpr() {
  var c = document.getElementById('gdpr-check');
  c.classList.toggle('checked');
  updateRegNextState();
}

function updateRegNextState() {
  var checked = document.getElementById('gdpr-check').classList.contains('checked');
  var name = document.getElementById('reg-name').value.trim();
  var phone = document.getElementById('reg-phone').value.trim();
  document.getElementById('btn-reg-next').disabled = !(checked && name && phone);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reg-name').addEventListener('input', updateRegNextState);
  document.getElementById('reg-phone').addEventListener('input', updateRegNextState);
});

function submitRegistration() {
  regName = document.getElementById('reg-name').value.trim();
  regPhone = document.getElementById('reg-phone').value.trim();
  if (!regName || !regPhone) return;
  hideKeyboard();
  showScreen('screen-q1');
  startInactivityTimer();
}

// ===== SURVEY (question 1 & 2) =====
function selectOption(question, rowEl) {
  const container = rowEl.parentElement;
  container.querySelectorAll('.option-row').forEach(r => r.classList.remove('selected'));
  rowEl.classList.add('selected');
  const value = rowEl.getAttribute('data-value');
  if (question === 'q1') {
    answerQ1 = value;
    document.getElementById('btn-q1-next').disabled = false;
  } else if (question === 'q2') {
    answerQ2 = value;
    document.getElementById('btn-q2-next').disabled = false;
  }
  startInactivityTimer();
}

function goToQuestion2() {
  if (!answerQ1) return;
  showScreen('screen-q2');
  startInactivityTimer();
}

async function finishSurvey() {
  if (!answerQ2) return;
  showScreen('screen-thankyou');
  clearInactivityTimer();
  startThankyouAnim();
  await saveEntry(regName, regPhone, answerQ1, answerQ2);
  startAutoReturn();
}

// ===== THANK YOU SCREEN: REPEAT THE SAME "FLY IN" AS THE WELCOME HL =====
// Its own dedicated timer (not the welcome screen's 6s tick, whose timing
// relative to this screen's 8s window isn't guaranteed to land clearly) so
// it reliably plays "flies in, briefly resets, flies in again" more than
// once while this screen is shown - same fly-in-settle animation/replay()
// as the welcome heading, just on its own schedule.
let thankyouAnimTimer = null;

function startThankyouAnim() {
  clearThankyouAnim();
  var title = document.querySelector('.thankyou-title');
  if (!title) return;
  thankyouAnimTimer = setInterval(() => replay(title), 3000);
}

function clearThankyouAnim() {
  if (thankyouAnimTimer) { clearInterval(thankyouAnimTimer); thankyouAnimTimer = null; }
}

// ===== RESET =====
let autoReturnTimer = null;

function goToStart() {
  clearAutoReturn();
  clearInactivityTimer();
  clearThankyouAnim();
  regName = '';
  regPhone = '';
  answerQ1 = '';
  answerQ2 = '';
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-phone').value = '';
  var gc = document.getElementById('gdpr-check');
  if (gc) { gc.classList.remove('checked'); }
  var brn = document.getElementById('btn-reg-next');
  if (brn) { brn.disabled = true; }
  document.querySelectorAll('.option-row').forEach(r => r.classList.remove('selected'));
  var bq1 = document.getElementById('btn-q1-next');
  if (bq1) { bq1.disabled = true; }
  var bq2 = document.getElementById('btn-q2-next');
  if (bq2) { bq2.disabled = true; }
  showWelcome();
}

function startAutoReturn() {
  clearAutoReturn();
  autoReturnTimer = setTimeout(() => { goToStart(); }, 8000);
}

function clearAutoReturn() {
  if (autoReturnTimer) { clearTimeout(autoReturnTimer); autoReturnTimer = null; }
}

// ===== INACTIVITY TIMER (30s) =====
let inactivityTimer = null;
var inactivityScreens = ['screen-registration', 'screen-rules', 'screen-q1', 'screen-q2'];

function startInactivityTimer() {
  clearInactivityTimer();
  var activeScreen = document.querySelector('.screen.active');
  if (activeScreen && inactivityScreens.includes(activeScreen.id)) {
    inactivityTimer = setTimeout(() => { goToStart(); }, 30000);
  }
}

function clearInactivityTimer() {
  if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
}

document.addEventListener('touchstart', function() { startInactivityTimer(); });
document.addEventListener('click', function() { startInactivityTimer(); });

// ===== TRIPLE TAP EXIT (top-right corner) =====
let tapTimes = [];
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('.keyboard, .reg-input, .option-row, button')) return;
  const touch = e.touches[0];
  var w = window.innerWidth || document.documentElement.clientWidth;
  if (touch.clientX > w - 150 && touch.clientY < 150) {
    const now = Date.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t < 1500);
    if (tapTimes.length >= 3) {
      tapTimes = [];
      var overlay = document.getElementById('exit-overlay');
      if (overlay) { overlay.style.display = 'flex'; }
    }
  }
});

// ===== LOCK: block back navigation, context menu =====
window.addEventListener('popstate', function() { history.pushState(null, '', location.href); });
history.pushState(null, '', location.href);
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

buildKeyboard('alpha');

// Restarts an element's CSS-declared "magnetic" animation from 0% by
// briefly overriding it with an inline "none" (higher specificity than the
// class-based rule), forcing a reflow, then clearing the override so the
// original rule re-applies fresh. Shared by the welcome-screen tick below
// and the thank-you screen's repeat timer.
function replay(el) {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

// ===== WELCOME SCREEN: ONE COORDINATED ANTI-BURN-IN CYCLE =====
// Everything runs off the SAME single clock (every ANTI_BURN_IN_TICK_MS),
// but per Telekom's "Magnetic Motion" brand spec (Push/Pull - "one element
// starts the motion, the others follow at intervals"; NOT "all elements
// experience motion at the same time"), the moments are staggered rather
// than firing in the same instant: TV first, buttons a beat later, then
// heading (subtitle follows the heading via its own built-in CSS delay).
(function() {
  const ANTI_BURN_IN_TICK_MS = 6000;

  const slides = document.querySelectorAll('.tv-slide');
  const buttonRow = document.querySelector('.welcome-buttons');
  const btn1 = document.getElementById('btn-swap-1');
  const btn2 = document.getElementById('btn-swap-2');
  const heading = document.querySelector('.welcome-heading');
  const subtitle = document.querySelector('.welcome-subtitle');

  let currentSlide = 0;
  let swapped = false;

  function tick() {
    if (slides.length >= 2) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }
    setTimeout(function() {
      if (buttonRow && btn1 && btn2) {
        swapped = !swapped;
        if (swapped) {
          const gap = parseFloat(getComputedStyle(buttonRow).gap) || 0;
          btn1.style.transform = 'translateX(' + (btn2.offsetWidth + gap) + 'px)';
          btn2.style.transform = 'translateX(-' + (btn1.offsetWidth + gap) + 'px)';
        } else {
          btn1.style.transform = '';
          btn2.style.transform = '';
        }
      }
    }, 180);
    setTimeout(function() {
      replay(heading);
      replay(subtitle);
    }, 360);
  }

  if (slides.length >= 2 || (buttonRow && btn1 && btn2) || heading || subtitle) {
    setInterval(tick, ANTI_BURN_IN_TICK_MS);
  }
})();
