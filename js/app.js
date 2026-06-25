
import { initFirebase, getDb } from './firebase-init.js';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const S = {
  user:         null,
  room:         null,
  doc:          null,
  currentPage:  1,
  totalPages:   1,
  syncMode:     true,
  isHost:       false,
  activeTool:   'select',
  activeColor:  '#f6c90e',
  members:      {},
  annotations:  {},
  bookmarks:    [],
  pdfDoc:       null,
  epubBook:     null,
  epubRendition:null,
  mangaImages:  [],
  dbListeners:  [],
  sharedDocUrl: null,
  pendingSticky:null,
  _text:        '',
};

// ═══════════════════════════════════════════════════════════
// FIREBASE
// ═══════════════════════════════════════════════════════════
let fbRef, fbSet, fbUpdate, fbOnValue, fbPush, fbRemove, fbOff, fbOnDisconnect;
let fbMod = null;
let firebaseReady = false;

async function setupFirebase() {
  if (firebaseReady) return true;
  const ok = await initFirebase();
  if (!ok) return false;
  const db = getDb();
  fbMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
  fbRef        = (path) => fbMod.ref(db, path);
  fbSet        = fbMod.set;
  fbUpdate     = fbMod.update;
  fbOnValue    = fbMod.onValue;
  fbPush       = fbMod.push;
  fbRemove     = fbMod.remove;
  fbOff        = fbMod.off;
  fbOnDisconnect = fbMod.onDisconnect;
  firebaseReady = true;
  return true;
}

function dbSet(path, val)    { if (firebaseReady) return fbSet(fbRef(path), val); }
function dbUpdate(path, val) { if (firebaseReady) return fbUpdate(fbRef(path), val); }
function dbPush(path, val)   { if (firebaseReady) return fbPush(fbRef(path), val); }
function dbRemove(path)      { if (firebaseReady) return fbRemove(fbRef(path)); }

function dbListen(path, cb) {
  if (!firebaseReady) return;
  const r = fbRef(path);
  const unsub = fbOnValue(r, snap => cb(snap.val()));
  S.dbListeners.push({ r, unsub });
  return unsub;
}

function dbUnlistenAll() {
  S.dbListeners.forEach(({ r }) => { try { fbOff && fbOff(r); } catch(e){} });
  S.dbListeners = [];
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
function genCode() { return Math.random().toString(36).substring(2,8).toUpperCase(); }
function genId()   { return Date.now().toString(36) + Math.random().toString(36).substring(2,6); }

function toast(msg, type='info', dur=3500) {
  const c = $('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

function setScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const sc = $(name);
  sc.classList.remove('hidden');
  sc.classList.add('active');
}

function toAr(n) { return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); }
function nowTime() { return new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}); }

// Convert Google Drive / Dropbox / OneDrive share links to direct download URLs
function toDirectUrl(url) {
  // Google Drive: /file/d/{id}/view  OR  ?id={id}
  let m = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

  m = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

  // Dropbox: www.dropbox.com/s/... → dl=1
  if (url.includes('dropbox.com')) {
    return url.replace('www.dropbox.com','dl.dropboxusercontent.com')
              .replace(/[?&]dl=0/,'')
              .replace(/\?$/,'');
  }

  // OneDrive share link → direct
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    const b64 = btoa(url).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`;
  }

  // Internet Archive  /details/  →  /download/
  if (url.includes('archive.org/details/')) {
    return url.replace('/details/', '/download/');
  }

  return url; // already direct
}

// ═══════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════
function initLobby() {
  // avatar picker
  $('avatarOptions').querySelectorAll('span').forEach(sp => {
    sp.addEventListener('click', () => {
      $('avatarOptions').querySelectorAll('span').forEach(s => s.classList.remove('selected'));
      sp.classList.add('selected');
      $('avatarDisplay').textContent = sp.dataset.emoji;
    });
  });
  $('avatarOptions').querySelector('span').classList.add('selected');

  // أزرار إنشاء والانضمام للغرفة
  $('btnCreateRoom').addEventListener('click', () => {
    if (!$('usernameInput').value.trim()) { toast('أدخل اسمك أولاً','error'); return; }
    show($('modalCreateRoom'));
  });
  
  $('btnCancelCreate').addEventListener('click', () => hide($('modalCreateRoom')));
  $('modalCreateRoom').querySelector('.modal-backdrop').addEventListener('click', () => hide($('modalCreateRoom')));
  $('btnConfirmCreate').addEventListener('click', createRoom);
  
  $('btnJoinRoom').addEventListener('click', joinRoom);
  $('roomCodeInput').addEventListener('keydown', e => { if(e.key==='Enter') joinRoom(); });
}

function buildUser() {
  if (S.user) return;
  S.user = {
    id:    genId(),
    name:  $('usernameInput').value.trim() || 'قارئ',
    emoji: $('avatarDisplay').textContent || '📖',
  };
}

async function createRoom() {
  buildUser();
  const name    = $('roomNameInput').value.trim() || 'غرفة قراءة';
  const pass    = $('roomPassInput').value.trim();
  const readDir = document.querySelector('input[name="readDir"]:checked').value;
  const code    = genCode();

  S.isHost   = true;
  S.syncMode = true;
  S.room = { id: genId(), name, code, hostId: S.user.id, readDir, syncMode: true, pass: pass||null, created: Date.now() };

  await setupFirebase();

  if (firebaseReady) {
    await dbSet('rooms/' + S.room.id, {
      ...S.room,
      members: { [S.user.id]: { name: S.user.name, emoji: S.user.emoji, page: 1, joinedAt: Date.now(), online: true } }
    });
    await dbSet('codes/' + code, S.room.id);
  }

  hide($('modalCreateRoom'));
  enterRoom();
}

async function joinRoom() {
  const code = $('roomCodeInput').value.trim().toUpperCase();
  if (!code || code.length < 4) { toast('أدخل كود الغرفة','error'); return; }
  buildUser();

  await setupFirebase();

  if (!firebaseReady) {
    S.room = { id:'offline', name:'وضع عدم الاتصال', code, hostId:S.user.id, readDir:'rtl', syncMode:false };
    S.isHost = true;
    enterRoom();
    toast('وضع بدون Firebase — التزامن معطل','info');
    return;
  }

  try {
    // Fast lookup via code index
    const codeSnap = await fbMod.get(fbRef('codes/' + code));
    let roomId, roomData;

    if (codeSnap.exists()) {
      roomId = codeSnap.val();
      const roomSnap = await fbMod.get(fbRef('rooms/' + roomId));
      if (!roomSnap.exists()) { toast('الغرفة غير موجودة','error'); return; }
      roomData = roomSnap.val();
    } else {
      // Fallback scan
      const allSnap = await fbMod.get(fbRef('rooms'));
      if (!allSnap.exists()) { toast('لم يُعثر على الغرفة','error'); return; }
      const match = Object.entries(allSnap.val()).find(([,r]) => r && r.code === code);
      if (!match) { toast('لم يُعثر على الغرفة','error'); return; }
      [roomId, roomData] = match;
      dbSet('codes/' + code, roomId);
    }

    if (roomData.pass && roomData.pass !== prompt('كلمة المرور:')) {
      toast('كلمة مرور خاطئة','error'); return;
    }

    S.room   = { ...roomData, id: roomId };
    S.isHost = roomData.hostId === S.user.id;

    await dbUpdate('rooms/' + roomId + '/members/' + S.user.id, {
      name: S.user.name, emoji: S.user.emoji, page: 1, joinedAt: Date.now(), online: true
    });

    enterRoom();
  } catch(e) {
    console.error('joinRoom:', e);
    if (e.message?.includes('Permission')) {
      toast('خطأ في صلاحيات Firebase','error');
      showFirebaseRulesHelp();
    } else {
      toast('خطأ: ' + e.message, 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════
// ROOM ENTRY
// ═══════════════════════════════════════════════════════════
function enterRoom() {
  setScreen('room');

  $('roomNameDisplay').textContent = S.room.name;
  $('roomCodeDisplay').textContent = S.room.code;
  $('roomCodeDisplay').onclick = () => {
    navigator.clipboard?.writeText(S.room.code);
    toast('تم نسخ الكود: ' + S.room.code,'info');
  };

  $('sidebar').classList.remove('collapsed');
  updateSyncUI();

  // 1. زر تغيير المزامنة العلوي (متاح للجميع)
  $('syncToggle').addEventListener('click', () => {
    S.syncMode = !S.syncMode;
    dbUpdate('rooms/' + S.room.id, { syncMode: S.syncMode });
    updateSyncUI();
  });

  // 2. زر المزامنة الفورية Sync Now (متاح للجميع)
  $('btnSyncNow')?.addEventListener('click', () => {
    dbSet('rooms/' + S.room.id + '/hostPage', S.currentPage);
    dbSet('rooms/' + S.room.id + '/syncPing', Date.now());
    toast('تمت مزامنة الجميع على صفحة ' + toAr(S.currentPage),'success');
  });

  // 3. إظهار شريط تحكم المضيف للكل
  show($('hostControls'));
  const sw = $('syncSwitch');
  if (sw) {
    sw.className = 'toggle-switch' + (S.syncMode ? ' on' : '');
    sw.addEventListener('click', () => {
      S.syncMode = !S.syncMode;
      sw.className = 'toggle-switch' + (S.syncMode ? ' on' : '');
      dbUpdate('rooms/' + S.room.id, { syncMode: S.syncMode });
      updateSyncUI();
    });
  }

  setupRoomListeners();
  setupChat();
  setupSidebar();
  setupDocLoader();
  setupAnnotationTools();
  setupKeyboard();

  if (firebaseReady) {
    const presRef = fbRef('rooms/' + S.room.id + '/members/' + S.user.id + '/online');
    fbSet(presRef, true);
    fbOnDisconnect(presRef).set(false);
  }

  addSystemMsg(S.user.emoji + ' ' + S.user.name + ' انضم للغرفة');
}

function updateSyncUI() {
  const tog = $('syncToggle');
  const lbl = $('syncLabel');
  if (S.syncMode) {
    tog?.classList.add('active');
    if (lbl) lbl.textContent = 'مزامنة';
  } else {
    tog?.classList.remove('active');
    if (lbl) lbl.textContent = 'حر';
  }
}

// ═══════════════════════════════════════════════════════════
// REALTIME LISTENERS
// ═══════════════════════════════════════════════════════════
function setupRoomListeners() {
  if (!firebaseReady) return;

  // Members presence
  dbListen('rooms/' + S.room.id + '/members', (data) => {
    const prev = S.members;
    S.members = data || {};
    // Detect new joiners for system message
    Object.entries(S.members).forEach(([uid, m]) => {
      if (!prev[uid] && uid !== S.user.id && m?.name) {
        addSystemMsg(m.emoji + ' ' + m.name + ' انضم للغرفة');
      }
    });
    renderMembers();
    renderMemberPositions();
  });

  // Annotations
  dbListen('rooms/' + S.room.id + '/annotations', (data) => {
    S.annotations = data || {};
    renderAnnotationsList();
    if (S.doc) renderAnnotationsOnPage();
  });

  // Sync mode changes
  dbListen('rooms/' + S.room.id + '/syncMode', (val) => {
    if (val !== null) S.syncMode = val;
    updateSyncUI();
  });

  // Host page broadcasts (sync)
// بث الصفحات: أي واحد يقلب الصفحة، الباقين يتحركون معه
  dbListen('rooms/' + S.room.id + '/hostPage', (page) => {
    if (!page) return;
    if (S.syncMode && page !== S.currentPage) {
      goToPage(page, false);
    }
  });

  // المزامنة الفورية: الاستجابة لضغطة Sync Now من أي عضو
  dbListen('rooms/' + S.room.id + '/syncPing', (ts) => {
    if (!ts) return;
    fbMod.get(fbRef('rooms/' + S.room.id + '/hostPage')).then(snap => {
      const p = snap.val();
      if (p && p !== S.currentPage) goToPage(p, false);
    });
  });

  // استقبال الملفات: حذفنا شرط (if isHost return) ليظهر إشعار الملف للهوست أيضاً


  // ── CHAT via Firebase (real-time for all members) ─────────
  dbListen('rooms/' + S.room.id + '/chat', (data) => {
    if (!data) return;
    const msgs = Object.entries(data)
      .map(([id, m]) => ({ ...m, id }))
      .sort((a, b) => a.time - b.time);

    const container = $('chatMessages');
    container.innerHTML = '';
    msgs.forEach(msg => renderChatMsg(msg));
    container.scrollTop = container.scrollHeight;
  });

  // ── Shared document ───────────────────────────────────────
  dbListen('rooms/' + S.room.id + '/sharedDoc', (docInfo) => {
    if (!docInfo) return;
    if (S.sharedDocUrl === (docInfo.url || docInfo.name)) return;
    S.sharedDocUrl = docInfo.url || docInfo.name;
    showDocSharedBanner(docInfo);
  });

  // Bookmarks
  dbListen('rooms/' + S.room.id + '/bookmarks/' + S.user.id, (data) => {
    S.bookmarks = data ? Object.values(data) : [];
    renderBookmarks();
  });
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR & TABS
// ═══════════════════════════════════════════════════════════
function setupSidebar() {
  $('btnToggleSidebar').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('hidden', c.dataset.tab !== tab);
        c.classList.toggle('active', c.dataset.tab === tab);
      });
      btn.classList.add('active');
    });
  });

  $('btnBackToLobby').addEventListener('click', () => {
    if (confirm('هل تريد مغادرة الغرفة؟')) leaveRoom();
  });
}

function leaveRoom() {
  dbUnlistenAll();
  if (firebaseReady && S.room?.id) {
    dbSet('rooms/' + S.room.id + '/members/' + S.user.id + '/online', false);
  }
  S.room = null; S.doc = null; S.currentPage = 1;
  S.sharedDocUrl = null; S.user = null;
  resetViewers();
  setScreen('lobby');
}

function activateTab(name) {
  $('sidebar').classList.remove('collapsed');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('hidden', c.dataset.tab !== name);
    c.classList.toggle('active', c.dataset.tab === name);
  });
}

// ═══════════════════════════════════════════════════════════
// CHAT — now fully Firebase-backed (real-time for everyone)
// ═══════════════════════════════════════════════════════════
function setupChat() {
  const input = $('chatInput');

  $('btnSend').addEventListener('click', sendChat);
  input.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); } });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  $('btnPageRef').addEventListener('click', () => {
    input.value += '📄 صفحة ' + toAr(S.currentPage) + ' ';
    input.focus();
  });

  $('btnEmoji').addEventListener('click', e => { e.stopPropagation(); $('emojiPicker').classList.toggle('hidden'); });
  document.addEventListener('click', () => $('emojiPicker')?.classList.add('hidden'));
  $('emojiPicker').addEventListener('click', e => {
    const em = e.target.textContent.trim();
    if (em) { input.value += em; input.focus(); $('emojiPicker').classList.add('hidden'); }
  });
}

function sendChat() {
  const input = $('chatInput');
  const text  = input.value.trim();
  if (!text) return;

  const msg = {
    uid:   S.user.id,
    name:  S.user.name,
    emoji: S.user.emoji,
    text,
    time:  Date.now(),
    page:  S.currentPage,
  };

  if (firebaseReady && S.room?.id) {
    // Write to Firebase — the listener will render it for everyone
    dbPush('rooms/' + S.room.id + '/chat', msg);
  } else {
    // Offline fallback: render locally
    renderChatMsg({ ...msg, id: genId() });
  }

  input.value = '';
  input.style.height = 'auto';
}

function addSystemMsg(text) {
  const c = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg system';
  div.innerHTML = `<span class="chat-msg-text">${text}</span>`;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function renderChatMsg(msg) {
  const c = $('chatMessages');
  // avoid duplicates
  if (document.querySelector(`[data-msgid="${msg.id}"]`)) return;

  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.dataset.msgid = msg.id || '';

  const textHtml = (msg.text || '').replace(/(📄\s*صفحة\s*([\d٠-٩]+))/g, (_, full, num) => {
    const p = parseInt(String(num).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    return `<span class="page-ref" data-page="${isNaN(p)?1:p}">${full}</span>`;
  });

  div.innerHTML = `
    <div class="chat-msg-avatar">${msg.emoji||'📖'}</div>
    <div class="chat-msg-body">
      <div class="chat-msg-meta">
        <span class="chat-msg-name">${msg.name||''}</span>
        <span class="chat-msg-time">${nowTime()}</span>
      </div>
      <div class="chat-msg-text">${textHtml}</div>
    </div>`;

  div.querySelectorAll('.page-ref[data-page]').forEach(ref => {
    ref.addEventListener('click', () => navigateToPage(parseInt(ref.dataset.page)));
  });

  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════
function renderMembers() {
  const list = $('membersList'), bar = $('membersBar');
  list.innerHTML = ''; bar.innerHTML = '';

  Object.entries(S.members).forEach(([uid, m]) => {
    if (!m) return;
    const isMe   = uid === S.user?.id;
    const isHost = uid === S.room?.hostId;

    list.innerHTML += `
      <div class="member-item">
        <div class="member-avatar">${m.emoji||'📖'}</div>
        <div class="member-info">
          <div class="member-name">${m.name||'...'} ${isMe?'(أنت)':''}</div>
          <div class="member-status">صفحة ${toAr(m.page||1)}</div>
        </div>
        ${isHost ? '<span class="member-badge">مضيف</span>' : ''}
        <div class="member-online-dot" style="background:${m.online!==false?'var(--accent-green)':'var(--text-dim)'}"></div>
      </div>`;

    bar.innerHTML += `<div class="member-avatar-sm" title="${m.name||''}">${m.emoji||'📖'}</div>`;
  });
}

function renderMemberPositions() {
  const wrap = $('memberPositions');
  wrap.innerHTML = '';
  if (!S.totalPages) return;
  Object.entries(S.members).forEach(([, m]) => {
    if (!m?.page) return;
    const pct = ((m.page-1) / Math.max(S.totalPages-1,1)) * 100;
    wrap.innerHTML += `<div class="member-pos-dot" style="left:${Math.min(Math.max(pct,0),100)}%" title="${m.name||''}">${m.emoji||'●'}</div>`;
  });
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT LOADER
// ═══════════════════════════════════════════════════════════
function setupDocLoader() {
$('btnOpenDoc').addEventListener('click', () => {
    resetViewers();
    show($('viewerEmpty'));
    // السماح لأي عضو بتصفير المستند في الغرفة
    if (firebaseReady && S.room?.id) {
      dbRemove('rooms/' + S.room.id + '/sharedDoc');
      dbRemove('rooms/' + S.room.id + '/hostPage');
      S.sharedDocUrl = null;
    }
  });

  $('btnUploadFile').addEventListener('click', () => $('fileInput').click());

$('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    resetViewers();
    hide($('viewerEmpty'));
    
    // 1. تشغيل الملف للمضيف فوراً
    await loadFile(file);

    // 2. تحويل الملف لنص وإرساله في الداتابيز
    if (firebaseReady && S.room?.id) {
      // فحص الحجم (6.5 ميجا كحد أقصى)
      if (file.size > 6.5 * 1024 * 1024) {
        toast('تنبيه: الملف أكبر من 6.5 ميجا، قد لا يظهر لباقي الأعضاء', 'error', 4000);
      } else {
        toast('جاري تحويل الملف وبثّه للأعضاء...', 'info');
        const reader = new FileReader();
        reader.onload = () => {
          dbSet('rooms/' + S.room.id + '/sharedDoc', {
            type: 'base64',       // نوع جديد
            dataUrl: reader.result, // النص المشفر الطويل
            name: file.name,
            byName: S.user.name,
            time: Date.now(),
          });
          S.sharedDocUrl = file.name;
        };
        reader.readAsDataURL(file);
      }
    }
  });

  $('btnLoadUrl').addEventListener('click', () => {
    const raw = $('docUrlInput').value.trim();
    if (!raw) return;
    const url = toDirectUrl(raw);
    resetViewers();
    hide($('viewerEmpty'));
    loadFromUrl(url, raw);
    // Share with room
    if (firebaseReady && S.room?.id) {
      dbSet('rooms/' + S.room.id + '/sharedDoc', {
        type: 'url', url, originalUrl: raw,
        byName: S.user.name, time: Date.now(),
      });
      S.sharedDocUrl = url;
    }
  });

  // Enter key on URL input
  $('docUrlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('btnLoadUrl').click();
  });
}

// Banner for members when host shares a doc
function showDocSharedBanner(docInfo) {
  document.querySelector('.shared-doc-banner')?.remove();
  const banner = document.createElement('div');
  banner.className = 'shared-doc-banner';

  if (docInfo.type === 'base64') {
    // حالة الملف المشفّر الجاي من الداتابيز
    banner.innerHTML = `
      <span>📖 <strong>${docInfo.byName}</strong> يشارك ملف: <em>${docInfo.name}</em></span>
      <button class="btn-primary sm" id="btnAcceptBase64">عرض الآن</button>
      <button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(banner);

    document.getElementById('btnAcceptBase64').onclick = async () => {
      banner.remove();
      toast('جاري قراءة الملف في الذاكرة...', 'info');
      resetViewers();
      hide($('viewerEmpty'));
      
      // حيلة تحويل النص إلى Blob في ذاكرة المتصفح فقط دون تحميله للجهاز
      const res = await fetch(docInfo.dataUrl);
      const blob = await res.blob();
      const virtualFile = new File([blob], docInfo.name, { type: blob.type });
      
      await loadFile(virtualFile);
    };

  } else if (docInfo.type === 'url' && docInfo.url) {
    banner.innerHTML = `
      <span>📖 <strong>${docInfo.byName}</strong> شارك مستنداً — يُحمَّل تلقائياً</span>
      <button class="btn-primary sm" id="btnAcceptDoc">فتح</button>
      <button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(banner);
    document.getElementById('btnAcceptDoc').onclick = () => {
      banner.remove();
      resetViewers();
      loadFromUrl(docInfo.url, docInfo.originalUrl || docInfo.url);
    };
  } else {
    banner.innerHTML = `
      <span>📁 <strong>${docInfo.byName}</strong> فتح ملفاً: <em>${docInfo.name}</em></span>
      <button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(banner);
  }

  document.getElementById('btnDismissBanner').onclick = () => banner.remove();
}

function resetViewers() {
  hide($('pdfViewer'));
  hide($('epubViewer'));
  hide($('mangaViewer'));
  hide($('annotationToolbar'));
  $('pageIndicator').classList.remove('visible');
  if (S.pdfDoc)      { try { S.pdfDoc.destroy(); } catch(e){} }
  if (S.epubRendition) { try { S.epubRendition.destroy(); } catch(e){} }
  S.doc=null; S.pdfDoc=null; S.epubBook=null; S.epubRendition=null;
  S.mangaImages=[]; S.currentPage=1; S.totalPages=1;
}

async function loadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext==='pdf') await loadPdf(file);
  else if (ext==='epub') await loadEpub(file);
  else if (['cbz','zip'].includes(ext)) await loadCbz(file);
  else if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) await loadImages([file]);
  else if (ext==='txt') await loadText(file);
  else { toast('نوع الملف غير مدعوم','error'); show($('viewerEmpty')); }
}

async function loadFromUrl(url, originalUrl) {
  toast('جاري التحميل...','info');
  const lower = (originalUrl || url).toLowerCase();
  try {
    if (lower.includes('.epub')) await loadEpub(url);
    else if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(lower)) await loadImages([url]);
    else await loadPdf(url); // default: try PDF
  } catch(e) {
    toast('تعذّر تحميل الملف: ' + e.message, 'error');
    show($('viewerEmpty'));
  }
}

// ── PDF ──────────────────────────────────────────────────
async function loadPdf(source) {
  if (!window.pdfjsLib) { toast('PDF.js غير محمّل','error'); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  try {
    const loadingTask = typeof source === 'string'
      ? pdfjsLib.getDocument({ url: source, withCredentials: false, cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true })
      : pdfjsLib.getDocument({ data: await source.arrayBuffer() });

    S.pdfDoc     = await loadingTask.promise;
    S.totalPages = S.pdfDoc.numPages;
    S.doc        = { type:'pdf', name: typeof source==='string' ? source.split('/').pop() : source.name };

    show($('pdfViewer'));
    show($('annotationToolbar'));
    $('pageIndicator').classList.add('visible');

    setupPdfNav();
    await renderPdfPage(1);
    updateProgress();
    saveProgress();
    toast(`تم تحميل PDF — ${toAr(S.totalPages)} صفحة`,'success');
  } catch(e) {
    toast('فشل تحميل PDF: ' + e.message,'error');
    show($('viewerEmpty'));
  }
}

async function renderPdfPage(pageNum) {
  if (!S.pdfDoc) return;
  S.currentPage = Math.max(1, Math.min(pageNum, S.totalPages));
  const page = await S.pdfDoc.getPage(S.currentPage);
  const canvas = $('pdfCanvas'), ctx = canvas.getContext('2d');

  const vp = page.getViewport({ scale:1 });
  const cH = $('viewerArea').clientHeight - 40;
  const cW = $('viewerArea').clientWidth  - 120;
  const scale = Math.min(cH/vp.height, cW/vp.width, 2);
  const viewport = page.getViewport({ scale });

  canvas.height = viewport.height; canvas.width = viewport.width;
  $('drawCanvas').width  = viewport.width;
  $('drawCanvas').height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  $('currentPageDisplay').textContent = toAr(S.currentPage);
  $('totalPagesDisplay').textContent  = toAr(S.totalPages);
  renderAnnotationsOnPage();
}

function setupPdfNav() {
  $('btnPrevPage').onclick = () => navigatePage(S.room?.readDir==='rtl' ? 1 : -1);
  $('btnNextPage').onclick = () => navigatePage(S.room?.readDir==='rtl' ? -1 : 1);
}

// ── EPUB ─────────────────────────────────────────────────
async function loadEpub(source) {
  try {
    const book = typeof source === 'string' ? ePub(source) : ePub(await source.arrayBuffer());
    S.epubBook = book;
    S.doc = { type:'epub', name:'كتاب EPUB' };

    const container = $('epubContainer');
    container.innerHTML = '';
    const rendition = book.renderTo(container, { width:'100%', height:'100%', spread:'none' });
    S.epubRendition = rendition;

    await book.ready;
    S.totalPages  = book.spine?.items?.length || 100;
    S.currentPage = 1;
    await rendition.display();

    show($('epubViewer'));
    $('pageIndicator').classList.add('visible');

    $('epubBtnPrev').onclick = async () => {
      await rendition.prev();
      S.currentPage = Math.max(1, S.currentPage-1);
      afterPageChange();
    };
    $('epubBtnNext').onclick = async () => {
      await rendition.next();
      S.currentPage = Math.min(S.totalPages, S.currentPage+1);
      afterPageChange();
    };

    updateProgress(); saveProgress();
    toast('تم تحميل الكتاب ✓','success');
  } catch(e) {
    toast('فشل تحميل EPUB: ' + e.message,'error');
    show($('viewerEmpty'));
  }
}

// ── CBZ ──────────────────────────────────────────────────
async function loadCbz(file) {
  if (!window.JSZip) { toast('JSZip غير محمّل','error'); return; }
  try {
    const zip = await JSZip.loadAsync(file);
    const imgExts = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
    const files = Object.entries(zip.files)
      .filter(([n,f]) => !f.dir && imgExts.test(n))
      .sort(([a],[b]) => a.localeCompare(b,undefined,{numeric:true}));
    if (!files.length) { toast('لا توجد صور','error'); return; }
    const blobs = await Promise.all(files.map(([,f]) => f.async('blob').then(b => URL.createObjectURL(b))));
    S.mangaImages = blobs;
    S.doc = { type:'manga', name: file.name };
    await initMangaViewer();
    toast(`تم تحميل ${toAr(blobs.length)} صفحة ✓`,'success');
  } catch(e) {
    toast('فشل تحميل الأرشيف: ' + e.message,'error');
    show($('viewerEmpty'));
  }
}

async function loadImages(sources) {
  S.mangaImages = sources.map(s => typeof s==='string' ? s : URL.createObjectURL(s));
  S.doc = { type:'manga', name:'صور' };
  await initMangaViewer();
}

async function initMangaViewer() {
  S.totalPages=S.mangaImages.length; S.currentPage=1;
  show($('mangaViewer')); show($('annotationToolbar'));
  $('pageIndicator').classList.add('visible');
  buildMangaStrip();
  renderMangaPage(1);
  $('mangaBtnPrev').onclick = () => navigatePage(S.room?.readDir==='rtl' ? 1 : -1);
  $('mangaBtnNext').onclick = () => navigatePage(S.room?.readDir==='rtl' ? -1 : 1);
  updateProgress(); saveProgress();
}

function buildMangaStrip() {
  const strip = $('mangaStrip');
  strip.innerHTML = '';
  S.mangaImages.forEach((src,i) => {
    const img = document.createElement('img');
    img.src=src; img.className='manga-thumb'+(i===0?' active':''); img.alt=`صفحة ${i+1}`;
    img.addEventListener('click', () => navigateToPage(i+1));
    strip.appendChild(img);
  });
}

function renderMangaPage(pageNum) {
  S.currentPage = Math.max(1, Math.min(pageNum, S.totalPages));
  $('mangaPage').src = S.mangaImages[S.currentPage-1];
  $('currentPageDisplay').textContent = toAr(S.currentPage);
  $('totalPagesDisplay').textContent  = toAr(S.totalPages);
  document.querySelectorAll('.manga-thumb').forEach((th,i) => th.classList.toggle('active', i===S.currentPage-1));
  renderAnnotationsOnPage();
}

async function loadText(file) {
  const text = await file.text();
  S.doc={type:'text',name:file.name}; S._text=text;
  S.totalPages=Math.ceil(text.length/3000); S.currentPage=1;
  show($('pdfViewer'));
  $('pageIndicator').classList.add('visible');
  renderTextPage(1);
  $('btnPrevPage').onclick = () => navigatePage(-1);
  $('btnNextPage').onclick = () => navigatePage(1);
  updateProgress(); saveProgress();
  toast(`تم تحميل النص — ${toAr(S.totalPages)} صفحة`,'success');
}

function renderTextPage(pageNum) {
  S.currentPage=Math.max(1,Math.min(pageNum,S.totalPages));
  const canvas=$('pdfCanvas'), ctx=canvas.getContext('2d');
  const W=700, H=900;
  canvas.width=W; canvas.height=H;
  ctx.fillStyle='#1a1d26'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#e8e4d9'; ctx.font='18px "IBM Plex Sans Arabic",sans-serif';
  ctx.textAlign='right'; ctx.direction='rtl';
  const chunk = S._text.slice((S.currentPage-1)*3000, S.currentPage*3000);
  let line='', y=50;
  chunk.split(' ').forEach(word => {
    const test = line ? line+' '+word : word;
    if (ctx.measureText(test).width > W-80 && line) {
      ctx.fillText(line, W-40, y); line=word; y+=30;
    } else line=test;
  });
  if (line) ctx.fillText(line, W-40, y);
  $('currentPageDisplay').textContent=toAr(S.currentPage);
  $('totalPagesDisplay').textContent=toAr(S.totalPages);
}

// ═══════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════
function navigatePage(delta) { navigateToPage(S.currentPage + delta); }

async function navigateToPage(pageNum) {
  pageNum = Math.max(1, Math.min(pageNum, S.totalPages));
  if (pageNum === S.currentPage && S.doc) return;
  await goToPage(pageNum, true);
}

async function goToPage(pageNum, broadcast=true) {
  pageNum = Math.max(1, Math.min(pageNum, S.totalPages||9999));
  S.currentPage = pageNum;
  if (S.doc?.type==='pdf')   await renderPdfPage(pageNum);
  else if (S.doc?.type==='manga') renderMangaPage(pageNum);
  else if (S.doc?.type==='text')  renderTextPage(pageNum);
  updateProgress();
  afterPageChange(broadcast);
}

function afterPageChange(broadcast=true) {
  $('currentPageDisplay').textContent = toAr(S.currentPage);
  $('totalPagesDisplay').textContent  = toAr(S.totalPages);
  updateProgress(); saveProgress(); renderAnnotationsOnPage();

  if (!broadcast || !firebaseReady || !S.room?.id) return;

  dbUpdate('rooms/' + S.room.id + '/members/' + S.user.id, { page: S.currentPage });
  
  // كان سابقاً يشترط: (if S.isHost) .. الآن أي شخص يقلب الصفحة يرسلها للسيرفر
  if (S.syncMode) {
    dbSet('rooms/' + S.room.id + '/hostPage', S.currentPage);
  }
}

function updateProgress() {
  if (!S.totalPages) return;
  const pct = Math.round(((S.currentPage-1)/Math.max(S.totalPages-1,1))*100);
  $('progressFill').style.width = pct + '%';
  $('progressLabel').textContent = toAr(pct) + '٪';
  renderMemberPositions();
}

function saveProgress() {
  if (!S.room?.id || !S.user?.id || !firebaseReady) return;
  dbUpdate('rooms/' + S.room.id + '/members/' + S.user.id, { page: S.currentPage });
}

// ═══════════════════════════════════════════════════════════
// BOOKMARKS
// ═══════════════════════════════════════════════════════════
function addBookmark() {
  if (!S.doc) { toast('افتح مستنداً أولاً','error'); return; }
  const label = prompt('اسم العلامة:') ?? `صفحة ${S.currentPage}`;
  if (label === null) return;
  const bm = { id:genId(), page:S.currentPage, label:label||`صفحة ${S.currentPage}`, time:Date.now() };
  if (firebaseReady && S.room?.id) {
    dbPush('rooms/' + S.room.id + '/bookmarks/' + S.user.id, bm);
  } else {
    S.bookmarks.push(bm); renderBookmarks();
  }
  toast('تمت إضافة العلامة ✓','success');
}

function renderBookmarks() {
  const list = $('bookmarksList');
  if (!S.bookmarks.length) {
    list.innerHTML='<p style="color:var(--text-dim);font-size:0.8rem;padding:1rem;text-align:center">لا توجد علامات بعد</p>';
    return;
  }
  list.innerHTML = '';
  [...S.bookmarks].sort((a,b)=>a.page-b.page).forEach(bm => {
    const item=document.createElement('div'); item.className='bookmark-item';
    item.innerHTML=`<span class="bookmark-icon">🔖</span><span class="bookmark-label">${bm.label}</span><span class="bookmark-page">ص${toAr(bm.page)}</span><button class="bookmark-del" data-id="${bm.id}">✕</button>`;
    item.addEventListener('click', e => { if(!e.target.classList.contains('bookmark-del')) navigateToPage(bm.page); });
    item.querySelector('.bookmark-del').addEventListener('click', e => {
      e.stopPropagation();
      if (firebaseReady && S.room?.id) dbRemove('rooms/' + S.room.id + '/bookmarks/' + S.user.id + '/' + bm.id);
      else { S.bookmarks=S.bookmarks.filter(b=>b.id!==bm.id); renderBookmarks(); }
    });
    list.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════
// ANNOTATIONS
// ═══════════════════════════════════════════════════════════
function setupAnnotationTools() {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.activeTool = btn.dataset.tool;
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dl = $('drawingLayer');
      if (S.activeTool==='draw') { show(dl); initDrawing(); }
      else { hide(dl); clearDrawCanvas(); }
    });
  });

  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      S.activeColor = dot.dataset.color;
    });
  });

  $('btnClearDraw').addEventListener('click', () => {
    clearDrawCanvas();
    Object.entries(S.annotations).forEach(([id,ann]) => {
      if (ann.type==='drawing' && ann.page===S.currentPage) {
        if (firebaseReady && S.room?.id) dbRemove('rooms/'+S.room.id+'/annotations/'+id);
        else delete S.annotations[id];
      }
    });
    renderAnnotationsOnPage();
  });

  $('pdfCanvasWrap').addEventListener('mouseup',  onCanvasMouseUp);
  $('pdfCanvasWrap').addEventListener('click',    onCanvasClick);
  $('mangaPage').addEventListener('click',        onCanvasClick);

  $('btnSaveSticky').addEventListener('click', saveSticky);
  $('btnCancelSticky').addEventListener('click', () => hide($('stickyEditor')));
  $('btnAddBookmark').addEventListener('click', addBookmark);
}

function onCanvasMouseUp(e) {
  if (S.activeTool !== 'highlight') return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = sel.toString().trim();
  if (!text) return;
  const range = sel.getRangeAt(0);
  const canvas = $('pdfCanvas');
  const b = canvas.getBoundingClientRect();
  const rects = Array.from(range.getClientRects());
  saveAnnotation({
    id: genId(), type:'highlight', page:S.currentPage, color:S.activeColor, text,
    author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(),
    rects: rects.map(r => ({ x:(r.left-b.left)/b.width, y:(r.top-b.top)/b.height, w:r.width/b.width, h:r.height/b.height })),
  });
  sel.removeAllRanges();
}

function onCanvasClick(e) {
  if (S.activeTool !== 'note' && S.activeTool !== 'sticky') return;
  const t=e.currentTarget, b=t.getBoundingClientRect();
  const xPct=(e.clientX-b.left)/b.width, yPct=(e.clientY-b.top)/b.height;
  if (S.activeTool==='sticky') { S.pendingSticky={xPct,yPct}; show($('stickyEditor')); $('stickyText').focus(); return; }
  const text = prompt('أدخل نص الملاحظة:');
  if (!text) return;
  saveAnnotation({ id:genId(), type:'note', page:S.currentPage, xPct, yPct, text, color:S.activeColor, author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now() });
}

function saveSticky() {
  const text=$('stickyText').value.trim();
  if (!text || !S.pendingSticky) return;
  saveAnnotation({ id:genId(), type:'sticky', page:S.currentPage, ...S.pendingSticky, text, color:'#f6e58d', author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now() });
  $('stickyText').value=''; hide($('stickyEditor')); S.pendingSticky=null;
}

function saveAnnotation(ann) {
  if (firebaseReady && S.room?.id) {
    dbSet('rooms/'+S.room.id+'/annotations/'+ann.id, ann);
  } else {
    S.annotations[ann.id]=ann;
    renderAnnotationsOnPage();
    renderAnnotationsList();
  }
}

function renderAnnotationsOnPage() {
  const layer=$('annotationLayer'); if(!layer) return; layer.innerHTML='';
  const canvas=S.doc?.type==='pdf'?$('pdfCanvas'):$('mangaPage'); if(!canvas) return;

  Object.values(S.annotations).forEach(ann => {
    if (ann.page!==S.currentPage) return;
    if (ann.type==='highlight' && ann.rects) {
      ann.rects.forEach(r => {
        const el=document.createElement('div'); el.className='highlight-rect';
        el.style.cssText=`left:${r.x*100}%;top:${r.y*100}%;width:${r.w*100}%;height:${r.h*100}%;background:${ann.color}`;
        el.title=`${ann.emoji} ${ann.author}: ${ann.text}`; layer.appendChild(el);
      });
    }
    if (ann.type==='note') {
      const el=document.createElement('div'); el.className='annotation-note';
      el.style.cssText=`left:${ann.xPct*100}%;top:${ann.yPct*100}%;background:${ann.color}`;
      el.textContent=ann.emoji; el.title=`${ann.author}: ${ann.text}`;
      el.addEventListener('click', () => showAnnTooltip(ann,el)); layer.appendChild(el);
    }
    if (ann.type==='sticky') {
      const el=document.createElement('div'); el.className='sticky-note';
      el.style.cssText=`left:${ann.xPct*100}%;top:${ann.yPct*100}%`;
      el.innerHTML=`${ann.text}<div class="sticky-note-author">${ann.emoji} ${ann.author}</div>`;
      makeDraggable(el); layer.appendChild(el);
    }
    if (ann.type==='drawing' && ann.path) replayOneDraw(ann);
  });
}

function showAnnTooltip(ann, anchor) {
  document.querySelectorAll('.ann-tooltip').forEach(t=>t.remove());
  const tip=document.createElement('div'); tip.className='ann-tooltip';
  tip.innerHTML=`<strong>${ann.emoji} ${ann.author}</strong><br>${ann.text}`;
  const r=anchor.getBoundingClientRect();
  tip.style.cssText=`left:${r.right+8}px;top:${r.top}px`;
  document.body.appendChild(tip);
  setTimeout(() => document.addEventListener('click',()=>tip.remove(),{once:true}), 0);
}

function renderAnnotationsList() {
  const list=$('annotationsList'); list.innerHTML='';
  const anns=Object.values(S.annotations).sort((a,b)=>(a.page-b.page)||(a.time-b.time));
  if (!anns.length) { list.innerHTML='<p style="color:var(--text-dim);font-size:0.8rem;padding:1rem;text-align:center">لا توجد تعليقات بعد</p>'; return; }
  anns.forEach(ann => {
    const item=document.createElement('div'); item.className='annotation-item';
    const icon=ann.type==='highlight'?'🖊':ann.type==='note'?'📝':ann.type==='sticky'?'🟡':'✏️';
    item.innerHTML=`
      <div class="annotation-header">
        <div class="annotation-color-swatch" style="background:${ann.color}"></div>
        <span class="annotation-author">${ann.emoji} ${ann.author} ${icon}</span>
        <span class="annotation-page-ref">ص${toAr(ann.page)}</span>
      </div>
      <div class="annotation-text">${ann.text||'(رسم)'}</div>`;
    item.addEventListener('click', ()=>navigateToPage(ann.page));
    list.appendChild(item);
  });
}

// Drawing
function initDrawing() {
  const dc=$('drawCanvas'), ctx=dc.getContext('2d');
  let drawing=false, path=[];
  ctx.strokeStyle=S.activeColor; ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round';

  const start=(x,y) => { drawing=true; path=[{x,y}]; ctx.beginPath(); ctx.moveTo(x,y); };
  const move=(x,y)  => { if(!drawing) return; ctx.strokeStyle=S.activeColor; ctx.lineTo(x,y); ctx.stroke(); path.push({x,y}); };
  const end=()       => {
    if(!drawing) return; drawing=false; if(path.length<2) return;
    const w=dc.width, h=dc.height;
    saveAnnotation({ id:genId(), type:'drawing', page:S.currentPage,
      path:path.map(p=>({x:p.x/w,y:p.y/h})), color:S.activeColor,
      author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(), text:'(رسم)' });
  };

  dc.onmousedown=e=>start(e.offsetX,e.offsetY);
  dc.onmousemove=e=>move(e.offsetX,e.offsetY);
  dc.onmouseup=end;
  dc.ontouchstart=e=>{e.preventDefault();const t=e.touches[0],r=dc.getBoundingClientRect();start(t.clientX-r.left,t.clientY-r.top);};
  dc.ontouchmove=e=>{e.preventDefault();const t=e.touches[0],r=dc.getBoundingClientRect();move(t.clientX-r.left,t.clientY-r.top);};
  dc.ontouchend=end;
  replayAllDrawings();
}

function replayAllDrawings() {
  const dc=$('drawCanvas'), ctx=dc.getContext('2d');
  ctx.clearRect(0,0,dc.width,dc.height);
  Object.values(S.annotations).filter(a=>a.type==='drawing'&&a.page===S.currentPage).forEach(ann=>replayOneDraw(ann));
}

function replayOneDraw(ann) {
  if (!ann.path || ann.path.length<2) return;
  const dc=$('drawCanvas'), ctx=dc.getContext('2d');
  ctx.strokeStyle=ann.color; ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ann.path.forEach((pt,i)=>{ const x=pt.x*dc.width, y=pt.y*dc.height; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
}

function clearDrawCanvas() {
  const dc=$('drawCanvas'), ctx=dc.getContext('2d');
  ctx.clearRect(0,0,dc.width,dc.height);
}

function makeDraggable(el) {
  let ox,oy,sx,sy;
  el.addEventListener('mousedown',e=>{ e.stopPropagation(); sx=e.clientX;sy=e.clientY;ox=el.offsetLeft;oy=el.offsetTop;
    const mv=ev=>{el.style.left=(ox+ev.clientX-sx)+'px';el.style.top=(oy+ev.clientY-sy)+'px';};
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════════════
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const tag=document.activeElement.tagName;
    if (tag==='INPUT'||tag==='TEXTAREA') return;
    switch(e.key) {
      case 'ArrowRight': case 'ArrowUp':    navigatePage(S.room?.readDir==='rtl'?1:-1); break;
      case 'ArrowLeft':  case 'ArrowDown':  navigatePage(S.room?.readDir==='rtl'?-1:1); break;
      case 'c': case 'C': activateTab('chat'); $('chatInput').focus(); break;
      case 'b': case 'B': addBookmark(); break;
      case 'a': case 'A': activateTab('annotations'); break;
      case 'm': case 'M': activateTab('members'); break;
      case 'Escape': hide($('stickyEditor')); $('emojiPicker')?.classList.add('hidden'); break;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// FIREBASE RULES HELP
// ═══════════════════════════════════════════════════════════
function showFirebaseRulesHelp() {
  document.querySelector('.rules-help-modal')?.remove();
  const modal=document.createElement('div'); modal.className='rules-help-modal';
  modal.innerHTML=`
    <div class="rules-help-backdrop"></div>
    <div class="rules-help-box">
      <h2>⚠ خطأ في صلاحيات Firebase</h2>
      <p>افتح <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a> ← مشروعك ← <strong>Realtime Database</strong> ← <strong>Rules</strong> والصق:</p>
      <pre class="rules-code">{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}</pre>
      <p class="rules-note">⚡ للتطوير فقط — للإنتاج استخدم قواعد أكثر أماناً.</p>
      <div class="rules-actions">
        <button class="btn-primary" id="btnCopyRules">نسخ القواعد</button>
        <button class="btn-ghost" id="btnCloseRules">إغلاق</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('.rules-help-backdrop').onclick=()=>modal.remove();
  document.getElementById('btnCloseRules').onclick=()=>modal.remove();
  document.getElementById('btnCopyRules').onclick=()=>{
    navigator.clipboard?.writeText('{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}');
    toast('تم نسخ القواعد ✓','success');
  };
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
async function boot() {
  await setupFirebase();
  initLobby();

  // Mobile swipe
  let tx=0;
  $('viewerArea').addEventListener('touchstart', e=>{tx=e.touches[0].clientX;},{passive:true});
  $('viewerArea').addEventListener('touchend', e=>{
    const diff=tx-e.changedTouches[0].clientX;
    if(Math.abs(diff)<50) return;
    navigatePage(S.room?.readDir==='rtl' ? (diff>0?-1:1) : (diff>0?1:-1));
  },{passive:true});
}

boot();
