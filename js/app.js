import { initFirebase, getDb } from './firebase-init.js';
import { ref, set, onValue, push, onChildAdded, onDisconnect, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// --- Configuration & State ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const STATE = {
  db: null,
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  userName: '',
  userAvatar: '📖',
  roomCode: null,
  isHost: false,
  syncEnabled: true,
  currentDocType: null,
  pageNum: 1,
  totalPages: 0,
  pdfDoc: null,
  epubBook: null,
  epubRendition: null,
  loadedDocName: null
};

// --- DOM Elements ---
const el = (id) => document.getElementById(id);
const DOM = {
  screens: { lobby: el('lobby'), room: el('room') },
  lobby: {
    avatarDisplay: el('avatarDisplay'), avatarOptions: el('avatarOptions'),
    usernameInput: el('usernameInput'), roomCodeInput: el('roomCodeInput'),
    btnCreateRoom: el('btnCreateRoom'), btnJoinRoom: el('btnJoinRoom'),
    btnToggleConfig: el('btnToggleConfig'), configForm: el('configForm'),
    btnSaveConfig: el('btnSaveConfig'), fbApiKey: el('fbApiKey'),
    fbProjectId: el('fbProjectId'), fbDbUrl: el('fbDbUrl'),
    fbStorageBucket: el('fbStorageBucket'),
    modalCreate: el('modalCreateRoom'), btnConfirmCreate: el('btnConfirmCreate'),
    btnCancelCreate: el('btnCancelCreate'), roomNameInput: el('roomNameInput')
  },
  room: {
    nameDisplay: el('roomNameDisplay'), codeDisplay: el('roomCodeDisplay'),
    btnBack: el('btnBackToLobby'), btnToggleSidebar: el('btnToggleSidebar'),
    syncToggle: el('syncToggle'), syncLabel: el('syncLabel'),
    membersBar: el('membersBar'), membersList: el('membersList'),
    hostControls: el('hostControls'), syncSwitch: el('syncSwitch')
  },
  viewer: {
    empty: el('viewerEmpty'), area: el('viewerArea'),
    btnUpload: el('btnUploadFile'), fileInput: el('fileInput'),
    pageInd: el('pageIndicator'), currPage: el('currentPageDisplay'), totalPages: el('totalPagesDisplay'),
    progressFill: el('progressFill'), progressLabel: el('progressLabel'),
    pdf: { wrap: el('pdfViewer'), canvas: el('pdfCanvas'), prev: el('btnPrevPage'), next: el('btnNextPage') },
    epub: { wrap: el('epubViewer'), container: el('epubContainer'), prev: el('epubBtnPrev'), next: el('epubBtnNext') }
  },
  chat: {
    messages: el('chatMessages'), input: el('chatInput'), btnSend: el('btnSend')
  },
  toast: el('toastContainer')
};

// --- Initialization ---
function init() {
  loadFirebaseConfig();
  setupEventListeners();
}

function loadFirebaseConfig() {
  const savedConfig = localStorage.getItem('fbConfig');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    const firebaseRes = initFirebase(config);
    if (firebaseRes) STATE.db = firebaseRes.db;

    if (DOM.lobby.fbApiKey) DOM.lobby.fbApiKey.value = config.apiKey || '';
    if (DOM.lobby.fbProjectId) DOM.lobby.fbProjectId.value = config.projectId || '';
    if (DOM.lobby.fbDbUrl) DOM.lobby.fbDbUrl.value = config.databaseURL || '';
    if (DOM.lobby.fbStorageBucket) DOM.lobby.fbStorageBucket.value = config.storageBucket || ''; 
  }
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  DOM.toast.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- Event Listeners ---
function setupEventListeners() {
  DOM.lobby.avatarOptions.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      STATE.userAvatar = e.target.dataset.emoji;
      DOM.lobby.avatarDisplay.textContent = STATE.userAvatar;
    }
  });

  DOM.lobby.btnToggleConfig.addEventListener('click', () => DOM.lobby.configForm.classList.toggle('hidden'));
  DOM.lobby.btnSaveConfig.addEventListener('click', () => {
    const config = {
      apiKey: DOM.lobby.fbApiKey.value.trim(),
      projectId: DOM.lobby.fbProjectId.value.trim(),
      databaseURL: DOM.lobby.fbDbUrl.value.trim(),
      storageBucket: DOM.lobby.fbStorageBucket.value.trim() 
    };
    localStorage.setItem('fbConfig', JSON.stringify(config));
    
    const firebaseRes = initFirebase(config);
    if (firebaseRes) {
      STATE.db = firebaseRes.db; 
      showToast('تم حفظ الإعدادات', 'success');
    } else {
      showToast('خطأ في الإعدادات', 'error');
    }
  });

  DOM.lobby.btnCreateRoom.addEventListener('click', () => DOM.lobby.modalCreate.classList.remove('hidden'));
  DOM.lobby.btnCancelCreate.addEventListener('click', () => DOM.lobby.modalCreate.classList.add('hidden'));
  DOM.lobby.btnConfirmCreate.addEventListener('click', createRoom);
  DOM.lobby.btnJoinRoom.addEventListener('click', () => {
    const code = DOM.lobby.roomCodeInput.value.trim().toUpperCase();
    if (code.length === 6) joinRoom(code);
    else showToast('كود الغرفة غير صحيح', 'error');
  });

  DOM.room.btnBack.addEventListener('click', leaveRoom);
  DOM.room.btnToggleSidebar.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      e.target.classList.add('active');
      document.querySelector(`.tab-content[data-tab="${e.target.dataset.tab}"]`).classList.remove('hidden');
    });
  });

  DOM.viewer.btnUpload.addEventListener('click', () => DOM.viewer.fileInput.click());
  DOM.viewer.fileInput.addEventListener('change', handleFileUpload);
  setupUrlLoader();

  setupNavigation(DOM.viewer.pdf.prev, DOM.viewer.pdf.next);
  setupNavigation(DOM.viewer.epub.prev, DOM.viewer.epub.next);

  DOM.chat.btnSend.addEventListener('click', sendChatMessage);
  DOM.chat.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  setupAnnotationTools();
}

function setupNavigation(prevBtn, nextBtn) {
  prevBtn.addEventListener('click', () => changePage(1)); 
  nextBtn.addEventListener('click', () => changePage(-1)); 
}

// 🌐 THE NEW SMART URL PARSER
function setupUrlLoader() {
  const btnLoadUrl = document.getElementById('btnLoadUrl');
  const urlInput = document.getElementById('docUrlInput');
  if(!btnLoadUrl || !urlInput) return;
  
  btnLoadUrl.addEventListener('click', async () => {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;
    
    let finalUrl = rawUrl;

    // 1. Detect Google Drive links and convert to direct downloads
    const gDriveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = rawUrl.match(gDriveRegex);

    if (match) {
      const fileId = match[1];
      // Google Drive direct download URL
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      // Wrap in AllOrigins Proxy (Allows raw binary files)
      finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    } else {
      // Wrap standard URLs in AllOrigins Proxy
      finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
    }

    const type = rawUrl.toLowerCase().includes('.epub') ? 'epub' : 'pdf';
    const docName = "كتاب عبر الرابط"; 
    STATE.loadedDocName = docName;

    try {
      showToast("جاري تحميل الكتاب...", "info"); // "Loading book..."
      await loadDocumentFromUrl(finalUrl, type);

      if (STATE.isHost) {
        set(ref(STATE.db, `rooms/${STATE.roomCode}/doc`), {
          name: docName, type: type, isLocal: false, url: finalUrl
        });
      }
    } catch (err) {
      console.error(err);
      showToast("فشل التحميل. تأكد من أن الرابط مباشر وملفه أقل من ٢٥ ميجابايت.", "error");
    }
  });
}

// --- Room Logic (Firebase Sync) ---
async function createRoom() {
  if (!STATE.db) return showToast('يرجى إعداد Firebase أولاً', 'error');
  STATE.userName = DOM.lobby.usernameInput.value.trim() || 'قارئ';
  
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  const roomName = DOM.lobby.roomNameInput.value.trim() || 'غرفة جديدة';
  
  STATE.roomCode = code;
  STATE.isHost = true;

  await set(ref(STATE.db, `rooms/${code}`), {
    meta: { name: roomName, host: STATE.userId, sync: true },
    progress: { page: 1, total: 0 }
  });

  DOM.lobby.modalCreate.classList.add('hidden');
  enterRoomScreen(roomName, code);
}

function joinRoom(code) {
  if (!STATE.db) return showToast('يرجى إعداد Firebase أولاً', 'error');
  STATE.userName = DOM.lobby.usernameInput.value.trim() || 'قارئ';
  
  onValue(ref(STATE.db, `rooms/${code}/meta`), (snap) => {
    if (snap.exists() && !STATE.roomCode) {
      STATE.roomCode = code;
      enterRoomScreen(snap.val().name, code);
    } else if (!snap.exists() && !STATE.roomCode) {
      showToast('الغرفة غير موجودة', 'error');
    }
  }, { onlyOnce: true });
}

function enterRoomScreen(name, code) {
  DOM.screens.lobby.classList.remove('active');
  DOM.screens.lobby.classList.add('hidden');
  DOM.screens.room.classList.remove('hidden');
  DOM.screens.room.classList.add('active');

  DOM.room.nameDisplay.textContent = name;
  DOM.room.codeDisplay.textContent = code;
  
  if (STATE.isHost) DOM.room.hostControls.classList.remove('hidden');

  setupPresence();
  listenToRoomSync();
  listenToChat();
  listenToDocChanges();
}

function leaveRoom() {
  if (STATE.roomCode && STATE.db) {
    remove(ref(STATE.db, `rooms/${STATE.roomCode}/members/${STATE.userId}`));
  }
  window.location.reload(); 
}

function setupPresence() {
  const memberRef = ref(STATE.db, `rooms/${STATE.roomCode}/members/${STATE.userId}`);
  set(memberRef, { name: STATE.userName, avatar: STATE.userAvatar, page: 1 });
  onDisconnect(memberRef).remove();

  onValue(ref(STATE.db, `rooms/${STATE.roomCode}/members`), (snap) => {
    DOM.room.membersList.innerHTML = '';
    DOM.room.membersBar.innerHTML = '';
    if (!snap.exists()) return;
    
    snap.forEach(child => {
      const m = child.val();
      DOM.room.membersList.innerHTML += `
        <div class="member-item">
          <div class="member-avatar">${m.avatar}</div>
          <div class="member-info"><div class="member-name">${m.name}</div></div>
        </div>`;
      DOM.room.membersBar.innerHTML += `<div class="member-avatar-sm" title="${m.name}">${m.avatar}</div>`;
    });
  });
}

function listenToRoomSync() {
  onValue(ref(STATE.db, `rooms/${STATE.roomCode}/progress/page`), (snap) => {
    if (snap.exists()) {
      const syncedPage = snap.val();
      if (STATE.syncEnabled && !STATE.isHost && syncedPage !== STATE.pageNum) {
        STATE.pageNum = syncedPage;
        renderCurrentPage();
      }
    }
  });
}

function listenToDocChanges() {
  onValue(ref(STATE.db, `rooms/${STATE.roomCode}/doc`), (snap) => {
    if (!snap.exists()) return;
    const doc = snap.val();

    if (!STATE.isHost && STATE.loadedDocName !== doc.name) {
      if (!doc.isLocal && doc.url) {
        showToast(`جاري تحميل كتاب المضيف...`, 'info');
        loadDocumentFromUrl(doc.url, doc.type);
        STATE.loadedDocName = doc.name;
      } else {
        DOM.viewer.empty.classList.remove('hidden');
        DOM.viewer.empty.querySelector('h3').textContent = `المضيف يقرأ: ${doc.name}`;
        DOM.viewer.empty.querySelector('p').textContent = 'الرجاء رفع نسختك من هذا الملف للمتابعة معه';
      }
    }
  });
}

// --- Document Rendering (Local Files ONLY) ---
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  STATE.loadedDocName = file.name;
  await loadDocumentFromUrl(URL.createObjectURL(file), file.type === 'application/pdf' ? 'pdf' : 'epub');

  if (STATE.isHost) {
    // Tell Firebase the name of the file so guests know what to upload
    set(ref(STATE.db, `rooms/${STATE.roomCode}/doc`), {
      name: file.name,
      type: STATE.currentDocType,
      isLocal: true, 
      url: null
    });
  }
}

async function loadDocumentFromUrl(url, type) {
  DOM.viewer.empty.classList.add('hidden');
  DOM.viewer.pageInd.classList.add('visible');
  
  const toolbar = document.getElementById('annotationToolbar');
  if(toolbar) toolbar.classList.remove('hidden'); 

  if (type === 'pdf') {
    STATE.currentDocType = 'pdf';
    DOM.viewer.pdf.wrap.classList.remove('hidden');
    const loadingTask = pdfjsLib.getDocument(url);
    STATE.pdfDoc = await loadingTask.promise;
    STATE.totalPages = STATE.pdfDoc.numPages;
  } 
  else {
    STATE.currentDocType = 'epub';
    DOM.viewer.epub.wrap.classList.remove('hidden');
    STATE.epubBook = ePub(url);
    STATE.epubRendition = STATE.epubBook.renderTo(DOM.viewer.epub.container, { width: "100%", height: "100%" });
    await STATE.epubBook.ready;
    STATE.epubRendition.display();
    STATE.totalPages = '?';
  }
  STATE.pageNum = 1;
  renderCurrentPage();
}

async function renderCurrentPage() {
  DOM.viewer.currPage.textContent = STATE.pageNum;
  DOM.viewer.totalPages.textContent = STATE.totalPages;
  
  if (STATE.totalPages !== '?') {
    const pct = Math.round((STATE.pageNum / STATE.totalPages) * 100);
    DOM.viewer.progressFill.style.width = `${pct}%`;
    DOM.viewer.progressLabel.textContent = `${pct}٪`;
  }

  if (STATE.currentDocType === 'pdf' && STATE.pdfDoc) {
    const page = await STATE.pdfDoc.getPage(STATE.pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = DOM.viewer.pdf.canvas;
    const ctx = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const drawCanvas = document.getElementById('drawCanvas');
    if (drawCanvas) {
      drawCanvas.width = canvas.width;
      drawCanvas.height = canvas.height;
      subscribeToPageAnnotations(STATE.pageNum);
    }
  } 
}

function changePage(delta) {
  if (STATE.currentDocType === 'pdf') {
    if (STATE.pageNum + delta >= 1 && STATE.pageNum + delta <= STATE.totalPages) {
      STATE.pageNum += delta;
      renderCurrentPage();
      updateProgressHost();
    }
  } else if (STATE.currentDocType === 'epub') {
    delta > 0 ? STATE.epubRendition.next() : STATE.epubRendition.prev();
  }
}

function updateProgressHost() {
  update(ref(STATE.db, `rooms/${STATE.roomCode}/members/${STATE.userId}`), { page: STATE.pageNum });
  if (STATE.isHost) {
    update(ref(STATE.db, `rooms/${STATE.roomCode}/progress`), { page: STATE.pageNum, total: STATE.totalPages });
  }
}

// --- Chat Engine ---
function sendChatMessage() {
  const text = DOM.chat.input.value.trim();
  if (!text || !STATE.roomCode) return;

  push(ref(STATE.db, `rooms/${STATE.roomCode}/chat`), {
    name: STATE.userName,
    avatar: STATE.userAvatar,
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  DOM.chat.input.value = '';
}

function listenToChat() {
  onChildAdded(ref(STATE.db, `rooms/${STATE.roomCode}/chat`), (snap) => {
    const msg = snap.val();
    DOM.chat.messages.innerHTML += `
      <div class="chat-msg">
        <div class="chat-msg-avatar">${msg.avatar}</div>
        <div class="chat-msg-body">
          <div class="chat-msg-meta">
            <span class="chat-msg-name">${msg.name}</span>
            <span class="chat-msg-time">${msg.time}</span>
          </div>
          <div class="chat-msg-text">${msg.text}</div>
        </div>
      </div>`;
    DOM.chat.messages.scrollTop = DOM.chat.messages.scrollHeight;
  });
}

// --- Drawing Engine ---
let activeTool = 'select';
let activeColor = '#f6c90e';
let isDrawing = false;
let currentStroke = [];
let activeDrawListener = null;

function setupAnnotationTools() {
  const toolbar = document.getElementById('annotationToolbar');
  const drawLayer = document.getElementById('drawingLayer');
  const drawCanvas = document.getElementById('drawCanvas');
  const clearBtn = document.getElementById('btnClearDraw');

  if(!toolbar || !drawCanvas) return;

  toolbar.addEventListener('click', (e) => {
    const toolBtn = e.target.closest('.tool-btn');
    const colorDot = e.target.closest('.color-dot');

    if (toolBtn) {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      toolBtn.classList.add('active');
      activeTool = toolBtn.dataset.tool;
      drawLayer.classList.toggle('hidden', activeTool !== 'draw');
    }

    if (colorDot) {
      document.querySelectorAll('.color-dot').forEach(c => c.classList.remove('active'));
      colorDot.classList.add('active');
      activeColor = colorDot.dataset.color;
    }
  });

  drawCanvas.addEventListener('mousedown', (e) => {
    if (activeTool !== 'draw') return;
    isDrawing = true;
    const rect = drawCanvas.getBoundingClientRect();
    currentStroke = [{ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }];
  });

  drawCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = drawCanvas.getBoundingClientRect();
    currentStroke.push({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    drawStrokesToCanvas([{ points: currentStroke, color: activeColor }]); 
  });

  drawCanvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.length > 1 && STATE.roomCode) {
      push(ref(STATE.db, `rooms/${STATE.roomCode}/annotations/p${STATE.pageNum}/draw`), {
        color: activeColor,
        points: currentStroke
      });
    }
    currentStroke = [];
  });

  clearBtn.addEventListener('click', () => {
    if(STATE.roomCode) remove(ref(STATE.db, `rooms/${STATE.roomCode}/annotations/p${STATE.pageNum}/draw`));
  });
}

function drawStrokesToCanvas(strokes) {
  const canvas = document.getElementById('drawCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  
  strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    stroke.points.forEach((pt, i) => {
      const realX = pt.x * canvas.width;
      const realY = pt.y * canvas.height;
      i === 0 ? ctx.moveTo(realX, realY) : ctx.lineTo(realX, realY);
    });
    ctx.stroke();
  });
}

function subscribeToPageAnnotations(pageNumber) {
  const canvas = document.getElementById('drawCanvas');
  if(!canvas || !STATE.db || !STATE.roomCode) return;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (activeDrawListener) activeDrawListener(); 

  const pageRef = ref(STATE.db, `rooms/${STATE.roomCode}/annotations/p${pageNumber}/draw`);
  const listener = onValue(pageRef, (snap) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!snap.exists()) return;

    const allStrokes = [];
    snap.forEach(child => { allStrokes.push(child.val()) });
    drawStrokesToCanvas(allStrokes);
  });

  activeDrawListener = () => onValue(pageRef, null); 
}

// Boot up
window.onload = init;
