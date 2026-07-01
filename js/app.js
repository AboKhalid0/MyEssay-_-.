// app.js — مكتبة v5 — Professional Drawing System
import { initFirebase, getDb } from './firebase-init.js';
import { ref, set, update, onValue, push, remove, get, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
const S = {
  user: null, room: null, doc: null,
  currentPage: 1, totalPages: 1,
  syncMode: true, isHost: false,
  members: {}, annotations: {}, bookmarks: [],
  pdfDoc: null, epubBook: null, epubRendition: null, mangaImages: [],
  dbListeners: [], sharedDocUrl: null, pendingSticky: null, _text: '',
  // Drawing state
  tool: 'pen',
  color: '#f6c90e',
  size: 4,
  opacity: 1.0,
  drawHistory: [],   // undo stack of annotation id arrays per action
  redoStack: [],
  isDrawing: false,
  drawStart: null,   // {x,y} canvas coords
  drawPath: [],      // for pen/marker
  previewCtx: null,  // for shape preview while dragging
};

function activeOverlay() {
  if (!S.doc) return null;
  const t = S.doc.type;
  return {
    wrap:        t==='manga' ? document.getElementById('mangaCanvasWrap') : t==='epub' ? document.getElementById('epubCanvasWrap') : document.getElementById('pdfCanvasWrap'),
    annLayer:    t==='manga' ? document.getElementById('mangaAnnLayer')   : t==='epub' ? document.getElementById('epubAnnLayer')   : document.getElementById('annLayer'),
    drawCanvas:  t==='manga' ? document.getElementById('mangaDrawCanvas') : t==='epub' ? document.getElementById('epubDrawCanvas') : document.getElementById('drawCanvas'),
    overlayRoot: t==='manga' ? document.getElementById('mangaOverlayRoot'): t==='epub' ? document.getElementById('epubOverlayRoot'): document.getElementById('overlayRoot'),
  };
}

// ══════════════════════════════════════════════════════════
// FIREBASE
// ══════════════════════════════════════════════════════════
let db;
let firebaseReady = false;

async function setupFirebase() {
  if (firebaseReady) return true;
  const ok = await initFirebase();
  if (!ok) return false;
  db = getDb();
  firebaseReady = true;
  return true;
}

const fbRef    = p => ref(db, p);
const dbSet    = (p,v) => firebaseReady && set(fbRef(p), v);
const dbUpdate = (p,v) => firebaseReady && update(fbRef(p), v);
const dbPush   = (p,v) => firebaseReady && push(fbRef(p), v);
const dbRemove = p     => firebaseReady && remove(fbRef(p));

function dbListen(path, cb) {
  if (!firebaseReady) return;
  const r = fbRef(path);
  const unsub = onValue(r, snap => cb(snap.val()));
  S.dbListeners.push(unsub);
}

function dbUnlistenAll() {
  S.dbListeners.forEach(unsub => { try{ unsub() } catch(e){} });
  S.dbListeners = [];
}

// ══════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════
const $   = id => document.getElementById(id);
const genId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const genCode = () => Math.random().toString(36).slice(2,8).toUpperCase();
const toAr    = n  => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const nowTime = () => new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});

function toast(msg, type='info', dur=3200) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

function show(el){ el?.classList.remove('hidden') }
function hide(el){ el?.classList.add('hidden') }
function setScreen(name) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  $(name).classList.remove('hidden');
  $(name).classList.add('active');
}

function toDirectUrl(url) {
  let m = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  m = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  if (url.includes('dropbox.com'))
    return url.replace('www.dropbox.com','dl.dropboxusercontent.com').replace(/[?&]dl=0/,'');
  if (url.includes('archive.org/details/'))
    return url.replace('/details/','/download/');
  return url;
}

// ══════════════════════════════════════════════════════════
// LOBBY
// ══════════════════════════════════════════════════════════
function initLobby() {
  $('avatarOptions').querySelectorAll('span').forEach(sp => {
    sp.addEventListener('click', () => {
      $('avatarOptions').querySelectorAll('span').forEach(s=>s.classList.remove('selected'));
      sp.classList.add('selected');
      $('avatarDisplay').textContent = sp.dataset.emoji;
    });
  });
  $('avatarOptions').querySelector('span').classList.add('selected');
  
  $('btnCreateRoom').addEventListener('click', () => {
    if (!$('usernameInput').value.trim()){ toast('أدخل اسمك أولاً','error'); return; }
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
  S.user = { id:genId(), name:$('usernameInput').value.trim()||'قارئ', emoji:$('avatarDisplay').textContent||'📖' };
}

async function createRoom() {
  buildUser();
  const name    = $('roomNameInput').value.trim() || 'غرفة قراءة';
  const pass    = $('roomPassInput').value.trim();
  const readDir = document.querySelector('input[name="readDir"]:checked').value;
  const code    = genCode();
  
  S.isHost=true; S.syncMode=true;
  S.room = { id:genId(), name, code, hostId:S.user.id, readDir, syncMode:true, pass:pass||null, created:Date.now() };
  
  await setupFirebase();
  if (firebaseReady) {
    await dbSet('rooms/'+S.room.id, { ...S.room, members:{ [S.user.id]:{ name:S.user.name, emoji:S.user.emoji, page:1, joinedAt:Date.now(), online:true } } });
    await dbSet('codes/'+code, S.room.id);
  }
  hide($('modalCreateRoom')); enterRoom();
}

async function joinRoom() {
  const code = $('roomCodeInput').value.trim().toUpperCase();
  if (!code||code.length<4){ toast('أدخل كود الغرفة','error'); return; }
  buildUser();
  await setupFirebase();
  
  if (!firebaseReady) {
    S.room={ id:'offline',name:'وضع عدم الاتصال',code,hostId:S.user.id,readDir:'rtl',syncMode:false };
    S.isHost=true; enterRoom(); toast('وضع بدون Firebase','info'); return;
  }
  
  try {
    const codeSnap = await get(fbRef('codes/'+code));
    let roomId, roomData;
    
    if (codeSnap.exists()) {
      roomId = codeSnap.val();
      const rs = await get(fbRef('rooms/'+roomId));
      if (!rs.exists()){ toast('الغرفة غير موجودة','error'); return; }
      roomData = rs.val();
    } else {
      const all = await get(fbRef('rooms'));
      if (!all.exists()){ toast('لم يُعثر على الغرفة','error'); return; }
      const match = Object.entries(all.val()).find(([,r])=>r&&r.code===code);
      if (!match){ toast('لم يُعثر على الغرفة','error'); return; }
      [roomId, roomData] = match;
      dbSet('codes/'+code, roomId);
    }
    
    if (roomData.pass && roomData.pass !== prompt('كلمة المرور:')){ toast('كلمة مرور خاطئة','error'); return; }
    
    S.room   = { ...roomData, id:roomId };
    S.isHost = roomData.hostId === S.user.id;
    await dbUpdate('rooms/'+roomId+'/members/'+S.user.id, { name:S.user.name, emoji:S.user.emoji, page:1, joinedAt:Date.now(), online:true });
    enterRoom();
  } catch(e) {
    console.error('joinRoom:',e);
    if (e.message?.includes('Permission')){ toast('خطأ في صلاحيات Firebase','error'); showFirebaseRulesHelp(); }
    else toast('خطأ: '+e.message,'error');
  }
}

// ══════════════════════════════════════════════════════════
// ROOM
// ══════════════════════════════════════════════════════════
function enterRoom() {
  setScreen('room');
  $('roomNameDisplay').textContent = S.room.name;
  $('roomCodeDisplay').textContent = S.room.code;
  $('roomCodeDisplay').onclick = () => { navigator.clipboard?.writeText(S.room.code); toast('تم نسخ الكود ✓','info'); };
  $('sidebar').classList.remove('collapsed');
  
  updateSyncUI();
  
  $('syncToggle').addEventListener('click', () => {
    if (!S.isHost){ toast('فقط المضيف يغير المزامنة','info'); return; }
    S.syncMode = !S.syncMode;
    dbUpdate('rooms/'+S.room.id, { syncMode:S.syncMode });
    updateSyncUI();
  });
  
  $('btnSyncNow').addEventListener('click', () => {
    if (!S.isHost){ toast('فقط المضيف يبث مزامنة فورية','info'); return; }
    dbSet('rooms/'+S.room.id+'/hostPage', S.currentPage);
    dbSet('rooms/'+S.room.id+'/syncPing', Date.now());
    toast('تمت مزامنة الجميع على صفحة '+toAr(S.currentPage),'success');
  });
  
  if (S.isHost) {
    show($('hostControls'));
    const sw=$('syncSwitch'); sw.className='toggle-switch'+(S.syncMode?' on':'');
    sw.addEventListener('click', () => { S.syncMode=!S.syncMode; sw.className='toggle-switch'+(S.syncMode?' on':''); dbUpdate('rooms/'+S.room.id,{syncMode:S.syncMode}); updateSyncUI(); });
  }
  
  setupRoomListeners(); setupChat(); setupSidebar(); setupDocLoader();
  initDrawToolbar(); setupKeyboard();
  
  if (firebaseReady) {
    const pr = fbRef('rooms/'+S.room.id+'/members/'+S.user.id+'/online');
    set(pr, true); onDisconnect(pr).set(false);
  }
  
  addSystemMsg(S.user.emoji+' '+S.user.name+' انضم للغرفة');
}

function updateSyncUI() {
  const tog=$('syncToggle'); const lbl=$('syncLabel');
  if (S.syncMode){ tog?.classList.add('active'); if(lbl)lbl.textContent='مزامنة'; }
  else           { tog?.classList.remove('active'); if(lbl)lbl.textContent='حر'; }
}

// ══════════════════════════════════════════════════════════
// REALTIME LISTENERS
// ══════════════════════════════════════════════════════════
function setupRoomListeners() {
  if (!firebaseReady) return;
  
  dbListen('rooms/'+S.room.id+'/members', data => {
    const prev = S.members; S.members = data||{};
    Object.entries(S.members).forEach(([uid,m]) => {
      if (!prev[uid] && uid!==S.user.id && m?.name) addSystemMsg(m.emoji+' '+m.name+' انضم للغرفة');
    });
    renderMembers(); renderMemberPositions();
  });
  
  dbListen('rooms/'+S.room.id+'/annotations', data => {
    S.annotations = data||{};
    renderAnnotationsList();
    renderAnnotationsOnPage();
  });
  
  dbListen('rooms/'+S.room.id+'/syncMode', val => { if(val!==null)S.syncMode=val; updateSyncUI(); });
  
  dbListen('rooms/'+S.room.id+'/hostPage', page => {
    if (!page||S.isHost) return;
    if (S.syncMode && page!==S.currentPage) goToPage(page, false);
  });
  
  dbListen('rooms/'+S.room.id+'/syncPing', async ts => {
    if (!ts||S.isHost) return;
    const s = await get(fbRef('rooms/'+S.room.id+'/hostPage'));
    const p = s.val();
    if(p && p !== S.currentPage) goToPage(p, false);
  });
  
  dbListen('rooms/'+S.room.id+'/chat', data => {
    if (!data) return;
    const msgs = Object.entries(data).map(([id,m])=>({...m,id})).sort((a,b)=>a.time-b.time);
    const c=$('chatMessages'); c.innerHTML='';
    msgs.forEach(m=>renderChatMsg(m));
    c.scrollTop=c.scrollHeight;
  });
  
  dbListen('rooms/'+S.room.id+'/sharedDoc', docInfo => {
    if (!docInfo) return;
    if (S.sharedDocUrl===(docInfo.url||docInfo.name)) return;
    S.sharedDocUrl = docInfo.url||docInfo.name;
    if (!S.isHost) showDocSharedBanner(docInfo);
  });
  
  dbListen('rooms/'+S.room.id+'/bookmarks/'+S.user.id, data => {
    S.bookmarks = data ? Object.values(data) : [];
    renderBookmarks();
  });
}

// ══════════════════════════════════════════════════════════
// SIDEBAR & CHAT
// ══════════════════════════════════════════════════════════
function setupSidebar() {
  $('btnToggleSidebar').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t=btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>{ c.classList.toggle('hidden',c.dataset.tab!==t); c.classList.toggle('active',c.dataset.tab===t); });
      btn.classList.add('active');
    });
  });
  $('btnBackToLobby').addEventListener('click', () => { if(confirm('مغادرة الغرفة؟'))leaveRoom(); });
}

function leaveRoom() {
  dbUnlistenAll();
  if (firebaseReady&&S.room?.id) dbSet('rooms/'+S.room.id+'/members/'+S.user.id+'/online', false);
  S.room=null;S.doc=null;S.currentPage=1;S.sharedDocUrl=null;S.user=null;
  S.drawHistory=[];S.redoStack=[];
  resetViewers(); setScreen('lobby');
}

function setupChat() {
  const input=$('chatInput');
  $('btnSend').addEventListener('click', sendChat);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();} });
  input.addEventListener('input', ()=>{ input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,100)+'px'; });
  $('btnPageRef').addEventListener('click', ()=>{ input.value+='📄 صفحة '+toAr(S.currentPage)+' '; input.focus(); });
  $('btnEmoji').addEventListener('click', e=>{ e.stopPropagation(); $('emojiPicker').classList.toggle('hidden'); });
  document.addEventListener('click', ()=>$('emojiPicker')?.classList.add('hidden'));
  $('emojiPicker').addEventListener('click', e=>{ const em=e.target.textContent.trim(); if(em){input.value+=em;input.focus();$('emojiPicker').classList.add('hidden');} });
}

function sendChat() {
  const input=$('chatInput'); const text=input.value.trim(); if(!text) return;
  const msg={ uid:S.user.id, name:S.user.name, emoji:S.user.emoji, text, time:Date.now(), page:S.currentPage };
  if (firebaseReady&&S.room?.id) dbPush('rooms/'+S.room.id+'/chat', msg);
  else renderChatMsg({...msg,id:genId()});
  input.value=''; input.style.height='auto';
}

function addSystemMsg(text) {
  const c=$('chatMessages'); const d=document.createElement('div');
  d.className='chat-msg system'; d.innerHTML=`<span class="chat-msg-text">${text}</span>`;
  c.appendChild(d); c.scrollTop=c.scrollHeight;
}

function renderChatMsg(msg) {
  const c=$('chatMessages');
  if (msg.id&&document.querySelector(`[data-msgid="${msg.id}"]`)) return;
  const d=document.createElement('div'); d.className='chat-msg'; if(msg.id)d.dataset.msgid=msg.id;
  const textHtml=(msg.text||'').replace(/(📄\s*صفحة\s*([\d٠-٩]+))/g,(_,full,num)=>{
    const p=parseInt(String(num).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    return `<span class="page-ref" data-page="${isNaN(p)?1:p}">${full}</span>`;
  });
  d.innerHTML=`<div class="chat-msg-avatar">${msg.emoji||'📖'}</div><div class="chat-msg-body"><div class="chat-msg-meta"><span class="chat-msg-name">${msg.name||''}</span><span class="chat-msg-time">${nowTime()}</span></div><div class="chat-msg-text">${textHtml}</div></div>`;
  d.querySelectorAll('.page-ref[data-page]').forEach(r=>r.addEventListener('click',()=>navigateToPage(parseInt(r.dataset.page))));
  c.appendChild(d); c.scrollTop=c.scrollHeight;
}

// ══════════════════════════════════════════════════════════
// MEMBERS
// ══════════════════════════════════════════════════════════
function renderMembers() {
  const list=$('membersList'),bar=$('membersBar');
  list.innerHTML='';bar.innerHTML='';
  Object.entries(S.members).forEach(([uid,m])=>{
    if(!m)return;
    const isMe=uid===S.user?.id, isHost=uid===S.room?.hostId;
    list.innerHTML+=`<div class="member-item"><div class="member-avatar">${m.emoji||'📖'}</div><div class="member-info"><div class="member-name">${m.name||'...'} ${isMe?'(أنت)':''}</div><div class="member-status">صفحة ${toAr(m.page||1)}</div></div>${isHost?'<span class="member-badge">مضيف</span>':''}<div class="member-online-dot" style="background:${m.online!==false?'var(--green)':'var(--txt-d)'}"></div></div>`;
    bar.innerHTML+=`<div class="member-avatar-sm" title="${m.name||''}">${m.emoji||'📖'}</div>`;
  });
}

function renderMemberPositions() {
  const wrap=$('memberPositions'); wrap.innerHTML='';
  if (!S.totalPages) return;
  Object.entries(S.members).forEach(([,m])=>{
    if(!m?.page)return;
    const pct=((m.page-1)/Math.max(S.totalPages-1,1))*100;
    wrap.innerHTML+=`<div class="member-pos-dot" style="left:${Math.min(Math.max(pct,0),100)}%" title="${m.name||''}">${m.emoji||'●'}</div>`;
  });
}

// ══════════════════════════════════════════════════════════
// DOCUMENT LOADER
// ══════════════════════════════════════════════════════════
function setupDocLoader() {
  $('btnOpenDoc').addEventListener('click', ()=>{
    resetViewers(); show($('viewerEmpty'));
    if(S.isHost&&firebaseReady&&S.room?.id){ dbRemove('rooms/'+S.room.id+'/sharedDoc'); dbRemove('rooms/'+S.room.id+'/hostPage'); S.sharedDocUrl=null; }
  });
  
  $('btnUploadFile').addEventListener('click', ()=>$('fileInput').click());
  
  $('fileInput').addEventListener('change', async e => {
    const file = e.target.files[0]; 
    if(!file) return; 
    e.target.value = '';

    // 🔴 حماية قاعدة البيانات: نمنع الملفات التي تزيد عن 3 ميجابايت
    const MAX_SIZE = 10 * 1024 * 1024; // 3 MB
    if (file.size > MAX_SIZE) {
      toast('حجم الملف كبير جداً! الحد الأقصى للرفع المباشر هو 10 ميجابايت. للكتب الكبيرة استخدم الرابط.', 'error', 5000);
      return;
    }

    resetViewers(); hide($('viewerEmpty'));
    toast('جاري تحضير الملف...', 'info');

    // عرض الملف محلياً للشخص الذي رفعه
    await loadFile(file);

    // تحويل الملف إلى Base64 وإرساله للقاعدة اللحظية
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target.result;
      if(firebaseReady && S.room?.id){ 
        dbSet('rooms/'+S.room.id+'/sharedDoc', {
          type: 'base64', // نوع جديد للملفات المرفوعة
          name: file.name,
          data: base64Data, // الملف كنص
          byName: S.user.name,
          time: Date.now()
        }); 
        S.sharedDocUrl = file.name; 
        toast('تم رفع الملف ومشاركته للغرفة ✓', 'success');
      }
    };
    reader.readAsDataURL(file);
  });

  $('btnLoadUrl').addEventListener('click', ()=>{
    const raw=$('docUrlInput').value.trim(); if(!raw)return;
    const url=toDirectUrl(raw); resetViewers(); hide($('viewerEmpty'));
    loadFromUrl(url,raw);
    if(firebaseReady&&S.room?.id){ dbSet('rooms/'+S.room.id+'/sharedDoc',{type:'url',url,originalUrl:raw,byName:S.user.name,time:Date.now()}); S.sharedDocUrl=url; }
  });
  
  $('docUrlInput').addEventListener('keydown', e=>{ if(e.key==='Enter')$('btnLoadUrl').click(); });
}

function showDocSharedBanner(docInfo) {
  document.querySelector('.shared-doc-banner')?.remove();
  const b = document.createElement('div'); b.className = 'shared-doc-banner';
  
  if (docInfo.type === 'base64' && docInfo.data) {
    // 🟢 إضافة خيار "عرض الآن" للملفات المرفوعة مباشرة
    b.innerHTML = `<span>📁 <strong>${docInfo.byName}</strong> شارك ملفاً: <em>${docInfo.name}</em></span><button class="btn-primary sm" id="btnAcceptDoc">عرض الآن</button><button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(b);
    $('btnAcceptDoc').onclick = () => { 
      b.remove(); 
      resetViewers(); 
      loadFromBase64(docInfo.data, docInfo.name); 
    };
  } else if (docInfo.type === 'url' && docInfo.url) {
    // الروابط
    b.innerHTML = `<span>📖 <strong>${docInfo.byName}</strong> شارك مستنداً</span><button class="btn-primary sm" id="btnAcceptDoc">فتح</button><button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(b);
    $('btnAcceptDoc').onclick = () => { b.remove(); resetViewers(); loadFromUrl(docInfo.url, docInfo.originalUrl||docInfo.url); };
  } else {
    // وضع التوافق مع الكود القديم إذا وجد
    b.innerHTML = `<span>📁 <strong>${docInfo.byName}</strong> فتح: <em>${docInfo.name}</em></span><button class="btn-ghost sm" id="btnDismissBanner">✕</button>`;
    $('viewerArea').prepend(b);
  }
  
  $('btnDismissBanner').onclick = () => b.remove();
}

function resetViewers() {
  ['pdfViewer','epubViewer','mangaViewer'].forEach(id=>hide($(id)));
  $('pageIndicator').classList.remove('visible');
  try{S.pdfDoc?.destroy()}catch(e){}
  try{S.epubRendition?.destroy()}catch(e){}
  S.doc=null;S.pdfDoc=null;S.epubBook=null;S.epubRendition=null;
  S.mangaImages=[];S.currentPage=1;S.totalPages=1;
  S.drawHistory=[];S.redoStack=[];
}

async function loadFromBase64(base64Str, fileName) {
  toast('جاري تحميل الملف وبناءه...', 'info');
  try {
    // تحويل Base64 مرة أخرى إلى Blob (ملف حقيقي في الذاكرة)
    const res = await fetch(base64Str);
    const blob = await res.blob();
    
    // إنشاء رابط محلي وهمي للملف
    const url = URL.createObjectURL(blob);
    const ext = fileName.split('.').pop().toLowerCase();
    
    // توجيه الملف للقارئ المناسب بناءً على امتداده
    if (ext === 'pdf') {
      await loadPdf(url);
    } else if (ext === 'epub') {
      await loadEpub(await blob.arrayBuffer());
    } else if (['cbz', 'zip'].includes(ext)) {
      const fakeFile = new File([blob], fileName, { type: blob.type });
      await loadCbz(fakeFile);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      await loadImages([url]);
    } else if (ext === 'txt') {
      const fakeFile = new File([blob], fileName, { type: blob.type });
      await loadText(fakeFile);
    } else {
      toast('نوع الملف غير مدعوم', 'error'); show($('viewerEmpty'));
    }
  } catch (e) {
    console.error(e);
    toast('تعذّر بناء الملف المرفوع', 'error'); show($('viewerEmpty'));
  }
}

async function loadFile(file) {
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='pdf') await loadPdf(file);
  else if(ext==='epub') await loadEpub(file);
  else if(['cbz','zip'].includes(ext)) await loadCbz(file);
  else if(['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) await loadImages([file]);
  else if(ext==='txt') await loadText(file);
  else{ toast('نوع الملف غير مدعوم','error'); show($('viewerEmpty')); }
}

async function loadFromUrl(url, orig) {
  toast('جاري التحميل...','info');
  const lower=(orig||url).toLowerCase();
  try {
    if(lower.includes('.epub')) await loadEpub(url);
    else if(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(lower)) await loadImages([url]);
    else await loadPdf(url);
  } catch(e){ toast('تعذّر تحميل الملف: '+e.message,'error'); show($('viewerEmpty')); }
}

// ── PDF ─────────────────────────────────────────────────
async function loadPdf(source) {
  if(!window.pdfjsLib){toast('PDF.js غير محمّل','error');return;}
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  try {
    const task=typeof source==='string'
      ? pdfjsLib.getDocument({url:source,withCredentials:false,cMapUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',cMapPacked:true})
      : pdfjsLib.getDocument({data:await source.arrayBuffer()});
    S.pdfDoc=await task.promise; S.totalPages=S.pdfDoc.numPages;
    S.doc={type:'pdf',name:typeof source==='string'?source.split('/').pop():source.name};
    show($('pdfViewer')); $('pageIndicator').classList.add('visible');
    $('btnPrevPage').onclick=()=>navigatePage(S.room?.readDir==='rtl'?1:-1);
    $('btnNextPage').onclick=()=>navigatePage(S.room?.readDir==='rtl'?-1:1);
    await renderPdfPage(1); onDocLoaded();
    toast('PDF — '+toAr(S.totalPages)+' صفحة','success');
  } catch(e){ toast('فشل تحميل PDF: '+e.message,'error'); show($('viewerEmpty')); }
}

async function renderPdfPage(n) {
  if(!S.pdfDoc)return;
  S.currentPage=Math.max(1,Math.min(n,S.totalPages));
  const page=await S.pdfDoc.getPage(S.currentPage);
  const canvas=$('pdfCanvas'), ctx=canvas.getContext('2d');
  const vp=page.getViewport({scale:1});
  const aH=$('viewerArea').clientHeight-60, aW=$('viewerArea').clientWidth-120;
  const scale=Math.min(aH/vp.height, aW/vp.width, 2);
  const viewport=page.getViewport({scale});
  canvas.height=viewport.height; canvas.width=viewport.width;
  await page.render({canvasContext:ctx,viewport}).promise;
  syncOverlaySize();
  $('currentPageDisplay').textContent=toAr(S.currentPage);
  $('totalPagesDisplay').textContent=toAr(S.totalPages);
}

// ── EPUB ────────────────────────────────────────────────
async function loadEpub(source) {
  try {
    const book=typeof source==='string'?ePub(source):ePub(await source.arrayBuffer());
    S.epubBook=book; S.doc={type:'epub',name:'كتاب EPUB'};
    const container=$('epubContainer'); container.innerHTML='';
    const rend=book.renderTo(container,{width:'100%',height:'100%',spread:'none'});
    S.epubRendition=rend;
    await book.ready; S.totalPages=book.spine?.items?.length||100; S.currentPage=1;
    await rend.display();
    show($('epubViewer')); $('pageIndicator').classList.add('visible');
    $('epubBtnPrev').onclick=async()=>{ await rend.prev(); S.currentPage=Math.max(1,S.currentPage-1); afterPageChange(); };
    $('epubBtnNext').onclick=async()=>{ await rend.next(); S.currentPage=Math.min(S.totalPages,S.currentPage+1); afterPageChange(); };
    onDocLoaded(); toast('EPUB محمّل ✓','success');
  } catch(e){ toast('فشل تحميل EPUB: '+e.message,'error'); show($('viewerEmpty')); }
}

// ── CBZ / Images ────────────────────────────────────────
async function loadCbz(file) {
  if(!window.JSZip){toast('JSZip غير محمّل','error');return;}
  try {
    const zip=await JSZip.loadAsync(file);
    const files=Object.entries(zip.files).filter(([n,f])=>!f.dir&&/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(n)).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
    if(!files.length){toast('لا توجد صور','error');return;}
    S.mangaImages=await Promise.all(files.map(([,f])=>f.async('blob').then(b=>URL.createObjectURL(b))));
    S.doc={type:'manga',name:file.name}; await initMangaViewer();
    toast('CBZ — '+toAr(S.mangaImages.length)+' صفحة ✓','success');
  } catch(e){ toast('فشل تحميل CBZ: '+e.message,'error'); show($('viewerEmpty')); }
}

async function loadImages(sources) {
  S.mangaImages=sources.map(s=>typeof s==='string'?s:URL.createObjectURL(s));
  S.doc={type:'manga',name:'صور'}; await initMangaViewer();
}

async function initMangaViewer() {
  S.totalPages=S.mangaImages.length; S.currentPage=1;
  show($('mangaViewer')); $('pageIndicator').classList.add('visible');
  buildMangaStrip(); renderMangaPage(1);
  $('mangaBtnPrev').onclick=()=>navigatePage(S.room?.readDir==='rtl'?1:-1);
  $('mangaBtnNext').onclick=()=>navigatePage(S.room?.readDir==='rtl'?-1:1);
  onDocLoaded();
}

function buildMangaStrip() {
  const strip=$('mangaStrip'); strip.innerHTML='';
  S.mangaImages.forEach((src,i)=>{
    const img=document.createElement('img'); img.src=src; img.className='manga-thumb'+(i===0?' active':''); img.alt=`صفحة ${i+1}`;
    img.addEventListener('click',()=>navigateToPage(i+1)); strip.appendChild(img);
  });
}

function renderMangaPage(n) {
  S.currentPage=Math.max(1,Math.min(n,S.totalPages));
  const img=$('mangaPage'); img.src=S.mangaImages[S.currentPage-1];
  img.onload=()=>syncOverlaySize();
  $('currentPageDisplay').textContent=toAr(S.currentPage);
  $('totalPagesDisplay').textContent=toAr(S.totalPages);
  document.querySelectorAll('.manga-thumb').forEach((t,i)=>t.classList.toggle('active',i===S.currentPage-1));
}

async function loadText(file) {
  const text=await file.text();
  S.doc={type:'text',name:file.name}; S._text=text;
  S.totalPages=Math.ceil(text.length/3000); S.currentPage=1;
  show($('pdfViewer')); $('pageIndicator').classList.add('visible');
  renderTextPage(1);
  $('btnPrevPage').onclick=()=>navigatePage(-1);
  $('btnNextPage').onclick=()=>navigatePage(1);
  onDocLoaded(); toast('نص — '+toAr(S.totalPages)+' صفحة','success');
}

function renderTextPage(n) {
  S.currentPage=Math.max(1,Math.min(n,S.totalPages));
  const cv=$('pdfCanvas'),ctx=cv.getContext('2d'),W=700,H=900;
  cv.width=W;cv.height=H;
  ctx.fillStyle='#1a1d26';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#e8e4d9';ctx.font='18px "IBM Plex Sans Arabic",sans-serif';ctx.textAlign='right';ctx.direction='rtl';
  const chunk=S._text.slice((S.currentPage-1)*3000,S.currentPage*3000);
  let line='',y=50;
  chunk.split(' ').forEach(w=>{ const t=line?line+' '+w:w; if(ctx.measureText(t).width>W-80&&line){ctx.fillText(line,W-40,y);line=w;y+=30;}else line=t; });
  if(line)ctx.fillText(line,W-40,y);
  $('currentPageDisplay').textContent=toAr(S.currentPage);
  $('totalPagesDisplay').textContent=toAr(S.totalPages);
  syncOverlaySize();
}

function onDocLoaded() {
  show($('drawToolbar'));
  updateProgress(); saveProgress();
  renderAnnotationsOnPage();
  syncOverlaySize();
  setTimeout(syncOverlaySize, 300);
}

function syncOverlaySize() {
  const ov = activeOverlay();
  if (!ov) return;
  let contentEl;
  if (S.doc?.type==='manga')     contentEl=$('mangaPage');
  else if(S.doc?.type==='epub')  contentEl=$('epubContainer');
  else                           contentEl=$('pdfCanvas');
  
  if (!contentEl) return;
  const rect = contentEl.getBoundingClientRect();
  const wrapRect = ov.wrap.getBoundingClientRect();
  
  const or = ov.overlayRoot;
  or.style.width  = rect.width  + 'px';
  or.style.height = rect.height + 'px';
  or.style.top    = (rect.top - wrapRect.top)   + 'px';
  or.style.left   = (rect.left - wrapRect.left) + 'px';
  
  const dc = ov.drawCanvas;
  if (dc.width !== Math.round(rect.width) || dc.height !== Math.round(rect.height)) {
    dc.width  = Math.max(Math.round(rect.width), 1);
    dc.height = Math.max(Math.round(rect.height), 1);
    replayDrawings();
  }
}

// ══════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ══════════════════════════════════════════════════════════
function navigatePage(d){ navigateToPage(S.currentPage+d); }
async function navigateToPage(n){
  n=Math.max(1,Math.min(n,S.totalPages));
  if(n===S.currentPage&&S.doc)return;
  await goToPage(n,true);
}

async function goToPage(n,broadcast=true){
  n=Math.max(1,Math.min(n,S.totalPages||9999)); S.currentPage=n;
  if(S.doc?.type==='pdf')        await renderPdfPage(n);
  else if(S.doc?.type==='manga') renderMangaPage(n);
  else if(S.doc?.type==='text')  renderTextPage(n);
  updateProgress(); afterPageChange(broadcast);
}

function afterPageChange(broadcast=true){
  $('currentPageDisplay').textContent=toAr(S.currentPage);
  $('totalPagesDisplay').textContent=toAr(S.totalPages);
  updateProgress(); saveProgress(); renderAnnotationsOnPage(); syncOverlaySize();
  if(!broadcast||!firebaseReady||!S.room?.id)return;
  dbUpdate('rooms/'+S.room.id+'/members/'+S.user.id,{page:S.currentPage});
  if(S.isHost&&S.syncMode) dbSet('rooms/'+S.room.id+'/hostPage',S.currentPage);
}

function updateProgress(){
  if(!S.totalPages)return;
  const pct=Math.round(((S.currentPage-1)/Math.max(S.totalPages-1,1))*100);
  $('progressFill').style.width=pct+'%';
  $('progressLabel').textContent=toAr(pct)+'٪';
  renderMemberPositions();
}

function saveProgress(){
  if(!S.room?.id||!S.user?.id||!firebaseReady)return;
  dbUpdate('rooms/'+S.room.id+'/members/'+S.user.id,{page:S.currentPage});
}

// ══════════════════════════════════════════════════════════
// BOOKMARKS
// ══════════════════════════════════════════════════════════
function addBookmark(){
  if(!S.doc){toast('افتح مستنداً أولاً','error');return;}
  const label=prompt('اسم العلامة:')||`صفحة ${S.currentPage}`;
  if(label===null)return;
  const bm={id:genId(),page:S.currentPage,label,time:Date.now()};
  if(firebaseReady&&S.room?.id) dbPush('rooms/'+S.room.id+'/bookmarks/'+S.user.id,bm);
  else{S.bookmarks.push(bm);renderBookmarks();}
  toast('علامة مضافة ✓','success');
}

function renderBookmarks(){
  const list=$('bookmarksList');
  if(!S.bookmarks.length){list.innerHTML='<p style="color:var(--txt-d);font-size:.8rem;padding:1rem;text-align:center">لا توجد علامات</p>';return;}
  list.innerHTML='';
  [...S.bookmarks].sort((a,b)=>a.page-b.page).forEach(bm=>{
    const item=document.createElement('div');item.className='bookmark-item';
    item.innerHTML=`<span>🔖</span><span class="bookmark-label">${bm.label}</span><span class="bookmark-page">ص${toAr(bm.page)}</span><button class="bookmark-del" data-id="${bm.id}">✕</button>`;
    item.addEventListener('click',e=>{if(!e.target.classList.contains('bookmark-del'))navigateToPage(bm.page);});
    item.querySelector('.bookmark-del').addEventListener('click',e=>{e.stopPropagation();if(firebaseReady&&S.room?.id)dbRemove('rooms/'+S.room.id+'/bookmarks/'+S.user.id+'/'+bm.id);else{S.bookmarks=S.bookmarks.filter(b=>b.id!==bm.id);renderBookmarks();}});
    list.appendChild(item);
  });
}

// ══════════════════════════════════════════════════════════
// DRAWING SYSTEM
// ══════════════════════════════════════════════════════════
function initDrawToolbar() {
  show($('drawToolbar'));
  document.querySelectorAll('.dtb-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.tool = btn.dataset.tool;
      document.querySelectorAll('.dtb-btn[data-tool]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updateDrawCursor();
    });
  });
  
  document.querySelectorAll('.dtb-color').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.dtb-color').forEach(d=>d.classList.remove('active'));
      dot.classList.add('active');
      S.color = dot.dataset.color;
    });
  });
  $('customColorPicker').addEventListener('input', e => {
    S.color = e.target.value;
    document.querySelectorAll('.dtb-color').forEach(d=>d.classList.remove('active'));
  });
  
  $('dtbSize').addEventListener('input', e => { S.size=+e.target.value; $('dtbSizeVal').textContent=e.target.value; });
  $('dtbOpacity').addEventListener('input', e => { S.opacity=+e.target.value/100; $('dtbOpacityVal').textContent=e.target.value+'%'; });
  
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  $('btnClearPage').addEventListener('click', () => {
    if (!confirm('مسح كل الرسومات في هذه الصفحة؟')) return;
    const ids = Object.entries(S.annotations).filter(([,a])=>a.page===S.currentPage&&a.type!=='bookmark').map(([id])=>id);
    ids.forEach(id => { dbRemove('rooms/'+S.room.id+'/annotations/'+id); delete S.annotations[id]; });
    const ov=activeOverlay(); if(ov){const ctx=ov.drawCanvas.getContext('2d');ctx.clearRect(0,0,ov.drawCanvas.width,ov.drawCanvas.height);}
    renderAnnotationsOnPage();
    toast('تم مسح الصفحة','info');
  });
  
  $('btnConfirmText').addEventListener('click', confirmTextAnnotation);
  $('btnCancelText').addEventListener('click', ()=>{ hide($('textInputPopup')); S.pendingSticky=null; });
  $('btnSaveSticky').addEventListener('click', saveSticky);
  $('btnCancelSticky').addEventListener('click', ()=>{ hide($('stickyEditor')); S.pendingSticky=null; });
  
  ['drawCanvas','epubDrawCanvas','mangaDrawCanvas'].forEach(cid => {
    const cv=$(cid); if(!cv)return;
    cv.addEventListener('mousedown',  e=>onDrawStart(e,cv));
    cv.addEventListener('mousemove',  e=>onDrawMove(e,cv));
    cv.addEventListener('mouseup',    e=>onDrawEnd(e,cv));
    cv.addEventListener('mouseleave', e=>{ if(S.isDrawing)onDrawEnd(e,cv); });
    cv.addEventListener('touchstart', e=>onTouchStart(e,cv),{passive:false});
    cv.addEventListener('touchmove',  e=>onTouchMove(e,cv),{passive:false});
    cv.addEventListener('touchend',   e=>onTouchEnd(e,cv),{passive:false});
  });
  updateDrawCursor();
}

function updateDrawCursor() {
  const ov=activeOverlay(); if(!ov)return;
  const dc=ov.drawCanvas;
  const cursors={pen:'crosshair',marker:'crosshair',line:'crosshair',arrow:'crosshair',rect:'crosshair',circle:'crosshair',highlight:'crosshair',text:'text',sticky:'cell',eraser:'cell',select:'default'};
  dc.style.cursor = cursors[S.tool]||'crosshair';
  ov.overlayRoot.classList.toggle('drawing-mode', S.tool!=='select');
}

function canvasXY(e, cv) {
  const r = cv.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { 
    x: (clientX-r.left)/r.width, 
    y: (clientY-r.top)/r.height,           
    px: clientX-r.left, 
    py: clientY-r.top 
  };
}

function onTouchStart(e,cv){e.preventDefault();onDrawStart(e,cv);}
function onTouchMove(e,cv){e.preventDefault();onDrawMove(e,cv);}
function onTouchEnd(e,cv){e.preventDefault();onDrawEnd(e,cv);}

function onDrawStart(e, cv) {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const {x, y, px, py} = canvasXY(e, cv);
  
  if (S.tool==='text') {
    S.pendingSticky={xPct:x,yPct:y};
    positionPopup($('textInputPopup'), clientX, clientY);
    show($('textInputPopup'));
    $('textInputArea').focus();
    return;
  }
  if (S.tool==='sticky') {
    S.pendingSticky={xPct:x,yPct:y};
    positionPopup($('stickyEditor'), clientX, clientY);
    show($('stickyEditor'));
    $('stickyText').focus();
    return;
  }
  if (S.tool==='select') return;
  
  S.isDrawing=true;
  S.drawStart={x,y,px,py};
  S.drawPath=[{x,y}];
  const ctx=cv.getContext('2d');
  ctx.save();
  applyCtxStyle(ctx);
  if (S.tool==='pen'||S.tool==='marker') {
    ctx.beginPath(); ctx.moveTo(px,py);
  }
}

function onDrawMove(e, cv) {
  if (!S.isDrawing||S.tool==='select'||S.tool==='text'||S.tool==='sticky') return;
  const {x,y,px,py}=canvasXY(e,cv);
  const ctx=cv.getContext('2d');
  S.drawPath.push({x,y});
  
  if (S.tool==='pen'||S.tool==='marker') {
    applyCtxStyle(ctx);
    ctx.lineTo(px,py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px,py);
  } else if (S.tool==='eraser') {
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(px,py,S.size*2,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation='source-over';
  } else {
    redrawCanvas(cv);
    drawShape(ctx, S.tool, S.drawStart.px, S.drawStart.py, px, py);
  }
}

function onDrawEnd(e, cv) {
  if (!S.isDrawing) return;
  S.isDrawing=false;
  const {x,y,px,py}=canvasXY(e,cv);
  
  if (S.tool==='eraser') {
    const ann={
      id:genId(), type:'eraser', page:S.currentPage,
      path:S.drawPath, size:S.size*2,
      author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(), text:'',
    };
    saveAnnotation(ann);
    return;
  }
  if (S.tool==='pen'||S.tool==='marker') {
    if (S.drawPath.length<2) return;
    const ann={
      id:genId(), type:'stroke', subtype: S.tool,
      page:S.currentPage, path:S.drawPath,
      color:S.color, size:S.size, opacity:S.opacity, marker:S.tool==='marker',
      author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(), text:'رسم',
    };
    saveAnnotation(ann);
  } else if(['line','arrow','rect','circle','highlight'].includes(S.tool)) {
    const ann={
      id:genId(), type:'shape', subtype:S.tool,
      page:S.currentPage,
      x1:S.drawStart.x, y1:S.drawStart.y, x2:x, y2:y,
      color:S.color, size:S.size, opacity:S.opacity,
      author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(), text:S.tool,
    };
    saveAnnotation(ann);
  }
}

function applyCtxStyle(ctx) {
  ctx.globalAlpha = S.opacity;
  ctx.strokeStyle = S.color;
  ctx.fillStyle   = S.color;
  ctx.lineWidth   = S.size;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.globalCompositeOperation='source-over';
}

function drawShape(ctx, tool, x1,y1,x2,y2, opacity=S.opacity, color=S.color, size=S.size) {
  ctx.save();
  ctx.globalAlpha=opacity; ctx.strokeStyle=color; ctx.fillStyle=color;
  ctx.lineWidth=size; ctx.lineCap='round'; ctx.lineJoin='round';
  switch(tool){
    case 'line':
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); break;
    case 'arrow': {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      const angle=Math.atan2(y2-y1,x2-x1), headLen=Math.max(12,size*3);
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-headLen*Math.cos(angle-Math.PI/6), y2-headLen*Math.sin(angle-Math.PI/6));
      ctx.lineTo(x2-headLen*Math.cos(angle+Math.PI/6), y2-headLen*Math.sin(angle+Math.PI/6));
      ctx.closePath(); ctx.fill(); break;
    }
    case 'rect':
      ctx.beginPath(); ctx.roundRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1),3);
      ctx.stroke(); break;
    case 'circle': {
      const rx=Math.abs(x2-x1)/2, ry=Math.abs(y2-y1)/2;
      ctx.beginPath(); ctx.ellipse(x1+(x2-x1)/2,y1+(y2-y1)/2,rx,ry,0,0,Math.PI*2); ctx.stroke(); break;
    }
    case 'highlight':
      ctx.globalAlpha=0.35*opacity; ctx.globalCompositeOperation='multiply';
      ctx.fillRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1)); break;
  }
  ctx.restore();
}

function redrawCanvas(cv) {
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  Object.values(S.annotations)
    .filter(a=>a.page===S.currentPage)
    .sort((a,b)=>a.time-b.time)
    .forEach(ann=>replayAnnotation(ctx,cv,ann));
}

function replayAnnotation(ctx, cv, ann) {
  if (ann.type==='stroke') {
    if(!ann.path||ann.path.length<2)return;
    ctx.save();
    ctx.globalAlpha=ann.opacity??1; ctx.strokeStyle=ann.color; ctx.lineWidth=ann.size;
    ctx.lineCap='round'; ctx.lineJoin='round';
    if(ann.marker){ctx.globalAlpha=(ann.opacity??1)*0.5;}
    ctx.globalCompositeOperation='source-over';
    ctx.beginPath();
    ann.path.forEach((pt,i)=>{ const x=pt.x*cv.width,y=pt.y*cv.height; if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y); });
    ctx.stroke(); ctx.restore();
  } else if (ann.type==='shape') {
    drawShape(ctx, ann.subtype, ann.x1*cv.width, ann.y1*cv.height, ann.x2*cv.width, ann.y2*cv.height, ann.opacity??1, ann.color, ann.size);
  } else if (ann.type==='eraser') {
    if(!ann.path)return;
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    ann.path.forEach(pt=>{ ctx.beginPath(); ctx.arc(pt.x*cv.width,pt.y*cv.height,ann.size||10,0,Math.PI*2); ctx.fill(); });
    ctx.restore();
  }
}

function replayDrawings() {
  const ov=activeOverlay(); if(!ov)return;
  redrawCanvas(ov.drawCanvas);
}

function saveAnnotation(ann) {
  S.drawHistory.push(ann.id);
  S.redoStack=[];
  S.annotations[ann.id]=ann;
  if(firebaseReady&&S.room?.id) {
    dbSet('rooms/'+S.room.id+'/annotations/'+ann.id, ann);
  } else {
    renderAnnotationsOnPage();
    renderAnnotationsList();
  }
}

function undo() {
  if(!S.drawHistory.length){toast('لا يوجد شيء للتراجع عنه','info');return;}
  const id=S.drawHistory.pop();
  S.redoStack.push(S.annotations[id]);
  delete S.annotations[id];
  if(firebaseReady&&S.room?.id) dbRemove('rooms/'+S.room.id+'/annotations/'+id);
  renderAnnotationsOnPage(); renderAnnotationsList();
}

function redo() {
  if(!S.redoStack.length){toast('لا يوجد شيء للإعادة','info');return;}
  const ann=S.redoStack.pop();
  S.drawHistory.push(ann.id);
  saveAnnotation(ann);
}

function confirmTextAnnotation() {
  const text=$('textInputArea').value.trim(); if(!text||!S.pendingSticky)return;
  saveAnnotation({
    id:genId(), type:'textbox', page:S.currentPage,
    xPct:S.pendingSticky.xPct, yPct:S.pendingSticky.yPct,
    text, color:S.color, size:S.size+10,
    author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(),
  });
  $('textInputArea').value=''; hide($('textInputPopup')); S.pendingSticky=null;
}

function saveSticky() {
  const text=$('stickyText').value.trim(); if(!text||!S.pendingSticky)return;
  saveAnnotation({
    id:genId(), type:'sticky', page:S.currentPage,
    xPct:S.pendingSticky.xPct, yPct:S.pendingSticky.yPct,
    text, author:S.user.name, emoji:S.user.emoji, uid:S.user.id, time:Date.now(), color:'#f6e58d',
  });
  $('stickyText').value=''; hide($('stickyEditor')); S.pendingSticky=null;
}

function renderAnnotationsOnPage() {
  const ov=activeOverlay(); if(!ov)return;
  redrawCanvas(ov.drawCanvas);
  ov.annLayer.innerHTML='';
  
  Object.values(S.annotations)
    .filter(a=>a.page===S.currentPage)
    .sort((a,b)=>a.time-b.time)
    .forEach(ann=>{
      if(ann.type==='sticky'){
        const el=document.createElement('div'); el.className='sticky-note';
        el.style.cssText=`left:${ann.xPct*100}%;top:${ann.yPct*100}%`;
        const del=`<button class="sticky-del" data-id="${ann.id}">✕</button>`;
        el.innerHTML=`${del}${ann.text}<div class="sticky-author">${ann.emoji} ${ann.author}</div>`;
        el.querySelector('.sticky-del').addEventListener('click',e=>{ e.stopPropagation(); deleteAnnotation(ann.id); });
        makeDraggable(el, ann);
        ov.annLayer.appendChild(el);
      } else if(ann.type==='textbox'){
        const el=document.createElement('div'); el.className='ann-text-box';
        el.style.cssText=`left:${ann.xPct*100}%;top:${ann.yPct*100}%;color:${ann.color};font-size:${ann.size||14}px`;
        el.textContent=ann.text;
        makeDraggable(el, ann);
        ov.annLayer.appendChild(el);
      }
    });
}

function deleteAnnotation(id) {
  delete S.annotations[id];
  if(firebaseReady&&S.room?.id) dbRemove('rooms/'+S.room.id+'/annotations/'+id);
  renderAnnotationsOnPage(); renderAnnotationsList();
}

function renderAnnotationsList() {
  const list=$('annotationsList'); list.innerHTML='';
  const anns=Object.values(S.annotations).sort((a,b)=>(a.page-b.page)||(a.time-b.time));
  if(!anns.length){list.innerHTML='<p style="color:var(--txt-d);font-size:.8rem;padding:1rem;text-align:center">لا توجد تعليقات</p>';return;}
  anns.forEach(ann=>{
    const icon={stroke:'✏️',shape:'⬛',textbox:'T',sticky:'📝',eraser:'🧹',highlight:'🖊'}[ann.type]||'●';
    const item=document.createElement('div'); item.className='annotation-item';
    item.innerHTML=`<div class="annotation-header"><div class="annotation-color-swatch" style="background:${ann.color||'#888'}"></div><span class="annotation-author">${ann.emoji||''} ${ann.author||''} ${icon}</span><span class="annotation-page-ref">ص${toAr(ann.page)}</span></div><div class="annotation-text">${ann.text||''}</div>`;
    item.addEventListener('click',()=>navigateToPage(ann.page));
    list.appendChild(item);
  });
}

function makeDraggable(el, ann) {
  el.addEventListener('mousedown', e=>{
    if(e.target.classList.contains('sticky-del'))return;
    e.stopPropagation(); const sx=e.clientX,sy=e.clientY,ox=el.offsetLeft,oy=el.offsetTop;
    const mv=ev=>{ el.style.left=(ox+ev.clientX-sx)+'px'; el.style.top=(oy+ev.clientY-sy)+'px'; };
    const up=()=>{
      document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
      const ov=activeOverlay(); if(!ov)return;
      const r=ov.overlayRoot.getBoundingClientRect();
      const newX=el.offsetLeft/r.width, newY=el.offsetTop/r.height;
      if(ann&&firebaseReady&&S.room?.id) dbUpdate('rooms/'+S.room.id+'/annotations/'+ann.id,{xPct:newX,yPct:newY});
    };
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
}

function positionPopup(el, cx, cy) {
  el.style.position='fixed';
  const margin=16;
  el.style.left=Math.min(cx, window.innerWidth-260-margin)+'px';
  el.style.top=Math.min(cy, window.innerHeight-200-margin)+'px';
}

// ══════════════════════════════════════════════════════════
// KEYBOARD
// ══════════════════════════════════════════════════════════
function setupKeyboard() {
  document.addEventListener('keydown', e=>{
    const tag=document.activeElement.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA')return;
    if(e.ctrlKey||e.metaKey){
      if(e.key==='z'){e.preventDefault();undo();}
      else if(e.key==='y'||e.key==='Z'){e.preventDefault();redo();}
      return;
    }
    switch(e.key){
      case 'ArrowRight':case 'ArrowUp':    navigatePage(S.room?.readDir==='rtl'?1:-1);break;
      case 'ArrowLeft': case 'ArrowDown':  navigatePage(S.room?.readDir==='rtl'?-1:1);break;
      case 'p':case 'P': clickTool('pen');break;
      case 'm':case 'M': clickTool('marker');break;
      case 'l':case 'L': clickTool('line');break;
      case 'r':case 'R': clickTool('rect');break;
      case 'o':case 'O': clickTool('circle');break;
      case 'h':case 'H': clickTool('highlight');break;
      case 't':case 'T': clickTool('text');break;
      case 's':case 'S': clickTool('sticky');break;
      case 'e':case 'E': clickTool('eraser');break;
      case 'v':case 'V': clickTool('select');break;
      case 'c':case 'C': activateTab('chat');$('chatInput').focus();break;
      case 'b':case 'B': addBookmark();break;
      case 'a':case 'A': activateTab('annotations');break;
      case 'Escape': hide($('textInputPopup'));hide($('stickyEditor'));$('emojiPicker')?.classList.add('hidden');break;
    }
  });
}

function clickTool(tool) {
  const btn=document.querySelector(`.dtb-btn[data-tool="${tool}"]`);
  if(btn) btn.click();
}

function activateTab(name){
  $('sidebar').classList.remove('collapsed');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-content').forEach(c=>{ c.classList.toggle('hidden',c.dataset.tab!==name); c.classList.toggle('active',c.dataset.tab===name); });
}

function showFirebaseRulesHelp() {
  document.querySelector('.rules-help-modal')?.remove();
  const m=document.createElement('div'); m.className='rules-help-modal';
  m.innerHTML=`<div class="rules-help-backdrop"></div><div class="rules-help-box"><h2>⚠ خطأ في صلاحيات Firebase</h2><p>افتح <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a> ← مشروعك ← <strong>Realtime Database</strong> ← <strong>Rules</strong> والصق:</p><pre class="rules-code">{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}</pre><p class="rules-note">⚡ للتطوير فقط.</p><div class="rules-actions"><button class="btn-primary" id="btnCopyRules">نسخ</button><button class="btn-ghost" id="btnCloseRules">إغلاق</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('.rules-help-backdrop').onclick=()=>m.remove();
  $('btnCloseRules').onclick=()=>m.remove();
  $('btnCopyRules').onclick=()=>{ navigator.clipboard?.writeText('{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}'); toast('تم نسخ القواعد ✓','success'); };
}

// ══════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════
async function boot() {
  await setupFirebase();
  initLobby();
  
  window.addEventListener('resize', ()=>{ syncOverlaySize(); });
  
  let tx=0;
  $('viewerArea').addEventListener('touchstart', e=>{tx=e.touches[0].clientX;},{passive:true});
  $('viewerArea').addEventListener('touchend', e=>{
    const diff=tx-e.changedTouches[0].clientX;
    if(Math.abs(diff)<60)return;
    if(S.tool!=='select')return;
    navigatePage(S.room?.readDir==='rtl'?(diff>0?-1:1):(diff>0?1:-1));
  },{passive:true});
}

boot();
