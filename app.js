// กำหนดค่า Project URL และ Anon Key ของ Supabase
const SUPABASE_URL = "https://aezpzkyxckziqjmgafok.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3X-SQNbG5ljRYyLiyFLHOQ_EyS1Snj7";

/**
 * =====================================================================
 * SECTION 1: ค่าคงที่และการตั้งค่า (Config & Constants)
 * =====================================================================
 */

const CARD_FONT_FAMILY = "Sarabun";
const WATERMARK_TEXT = "Kho Khwam Chak Chakkrawan · message-from-universe";

// ชุดอักขระเดี่ยวที่ต้องเกาะพยัญชนะต้น ห้ามแยกหรือขึ้นต้นแถวเดี่ยว (Single Source of Truth)
const THAI_FOLLOWING_CHARS = "\\u0E30-\\u0E3A\\u0E45\\u0E46\\u0E47-\\u0E4E\\u0E2F\\u0300-\\u036F";
// สระหน้าภาษาไทย (เ แ โ ใ ไ) ห้ามทิ้งท้ายแถวเดี่ยว
const THAI_LEADING_VOWELS = "\\u0E40-\\u0E44";

const FOLLOWING_CHARS_REGEX = new RegExp(`^[${THAI_FOLLOWING_CHARS}]$`);
const LEADING_VOWELS_REGEX = new RegExp(`^[${THAI_LEADING_VOWELS}]$`);

const hasValidConfig =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.endsWith(".supabase.co") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  SUPABASE_ANON_KEY.length > 20 &&
  SUPABASE_ANON_KEY !== "YOUR_ANON_KEY";

const client =
  hasValidConfig && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const STATE = {
  MODE_SELECT: "MODE_SELECT",
  ASKING: "ASKING",
  SHUFFLING: "SHUFFLING",
  CHOOSING: "CHOOSING",
  REVEALED: "REVEALED"
};

let currentState = STATE.MODE_SELECT;
let currentMode = "free"; // 'free' | 'question'
let userQuestion = "";    // จัดเก็บใน memory เท่านั้น (ไม่ลง storage)
let pickedMessages = [];
let activeCardIndex = -1;
let requestSequence = 0;
let previewSequence = 0;
let isDisclaimerAcknowledged = false;

// สถานะการ Export
let exportWidth = 1080;
let exportHeight = 1920;
let isCustomSizeValid = true;
let exportStatus = "idle"; // 'idle' | 'preparing' | 'ready' | 'error'
let isExportInProgress = false;
let currentExportBlob = null;
let currentExportFile = null;
let fallbackBlobUrl = null;
let customDebounceTimer = null;

/**
 * =====================================================================
 * SECTION 2: การอ้างอิงองค์ประกอบ DOM (DOM Elements)
 * =====================================================================
 */
const appContainer = document.querySelector(".app-container");
const modalDisclaimer = document.getElementById("modal-disclaimer");
const btnAckDisclaimer = document.getElementById("btn-ack-disclaimer");
const fallbackDisclaimer = document.getElementById("fallback-disclaimer");
const btnFallbackAck = document.getElementById("btn-fallback-ack");

const stageMode = document.getElementById("stage-mode");
const stageAsking = document.getElementById("stage-asking");
const stageCards = document.getElementById("stage-cards");

const btnModeFree = document.getElementById("btn-mode-free");
const btnModeQuestion = document.getElementById("btn-mode-question");

const inputQuestion = document.getElementById("input-question");
const btnClearQuestion = document.getElementById("btn-clear-question");
const charCounter = document.getElementById("char-counter");
const btnSubmitQuestion = document.getElementById("btn-submit-question");
const btnBackToMode = document.getElementById("btn-back-to-mode");

const displayUserQuestion = document.getElementById("display-user-question");
const textUserQuestion = document.getElementById("text-user-question");
const instructionText = document.getElementById("instruction-text");
const cardsGrid = document.getElementById("cards-grid");
const cardElements = document.querySelectorAll(".card");
const actionControls = document.getElementById("action-controls");
const errorBanner = document.getElementById("error-banner");

const btnPrimaryAction = document.getElementById("btn-primary-action");
const btnChangeMode = document.getElementById("btn-change-mode");
const btnOpenExport = document.getElementById("btn-open-export");

// Export Modal
const modalExport = document.getElementById("modal-export");
const modalExportError = document.getElementById("modal-export-error");
const modalExportWarning = document.getElementById("modal-export-warning");
const btnCloseExport = document.getElementById("btn-close-export");
const btnDoExport = document.getElementById("btn-do-export");
const btnDownloadExport = document.getElementById("btn-download-export");
const presetButtons = document.querySelectorAll(".btn-preset");
const inputCustomW = document.getElementById("export-custom-w");
const inputCustomH = document.getElementById("export-custom-h");
const customSizeError = document.getElementById("custom-size-error");
const groupIncludeQuestion = document.getElementById("group-include-question");
const checkIncludeQuestion = document.getElementById("check-include-question");
const exportPreviewCanvas = document.getElementById("export-preview-canvas");
const exportFallbackImg = document.getElementById("export-fallback-img");
const safariHint = document.getElementById("safari-hint");

/**
 * =====================================================================
 * SECTION 3: Helper Functions & State Synchronization
 * =====================================================================
 */
function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function clearError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function showModalError(message) {
  modalExportError.textContent = message;
  modalExportError.classList.remove("hidden");
}

function clearModalError() {
  modalExportError.textContent = "";
  modalExportError.classList.add("hidden");
}

function showModalWarning(message) {
  modalExportWarning.textContent = message;
  modalExportWarning.classList.remove("hidden");
}

function clearModalWarning() {
  modalExportWarning.textContent = "";
  modalExportWarning.classList.add("hidden");
}

/**
 * ล้างข้อมูลไฟล์ภาพเก่าและตัวจัดเก็บชั่วคราว พร้อมล้าง Canvas พรีวิวทันที
 */
function purgeExportArtifacts() {
  ++previewSequence; // Invalidate งานวาดเก่าทั้งหมดทันที
  currentExportBlob = null;
  currentExportFile = null;
  exportStatus = "idle";

  if (fallbackBlobUrl) {
    URL.revokeObjectURL(fallbackBlobUrl);
    fallbackBlobUrl = null;
  }
  if (exportFallbackImg) {
    exportFallbackImg.removeAttribute("src");
    exportFallbackImg.classList.add("hidden");
  }
  if (exportPreviewCanvas) {
    const pCtx = exportPreviewCanvas.getContext("2d");
    if (pCtx) {
      pCtx.clearRect(0, 0, exportPreviewCanvas.width, exportPreviewCanvas.height);
    }
    exportPreviewCanvas.classList.remove("hidden");
  }
  if (safariHint) {
    safariHint.classList.add("hidden");
  }

  clearModalError();
  syncExportUIState();
}

/**
 * ควบคุมสถานะปุ่ม Export/Share/Download ที่จุดเดียว (Single Source of Truth)
 */
function syncExportUIState() {
  if (isExportInProgress) {
    btnDoExport.disabled = true;
    btnDoExport.textContent = "กำลังดำเนินการ...";
    btnDownloadExport.disabled = true;
    return;
  }

  if (!isCustomSizeValid) {
    btnDoExport.disabled = true;
    btnDoExport.textContent = "ขนาดไม่ถูกต้อง";
    btnDownloadExport.disabled = true;
    return;
  }

  if (exportStatus === "error") {
    btnDoExport.disabled = true;
    btnDoExport.textContent = "สร้างภาพไม่สำเร็จ";
    btnDownloadExport.disabled = true;
    return;
  }

  if (exportStatus === "preparing" || !currentExportBlob) {
    btnDoExport.disabled = true;
    btnDoExport.textContent = "กำลังเตรียมภาพ...";
    btnDownloadExport.disabled = true;
    return;
  }

  // สถานะ 'ready': พร้อมแชร์หรือดาวน์โหลด
  btnDoExport.disabled = false;
  btnDoExport.textContent = "แชร์ภาพ";
  btnDownloadExport.disabled = false;
  btnDownloadExport.textContent = "ดาวน์โหลด";
}

function clearUserQuestion(incrementSeq = true) {
  userQuestion = "";
  inputQuestion.value = "";
  charCounter.textContent = "0/120";
  btnSubmitQuestion.disabled = true;
  btnClearQuestion.classList.add("hidden");
  if (incrementSeq) {
    ++requestSequence;
  }
}

function setState(newState) {
  currentState = newState;

  stageMode.classList.add("hidden");
  stageAsking.classList.add("hidden");
  stageCards.classList.add("hidden");
  actionControls.classList.add("hidden");

  switch (currentState) {
    case STATE.MODE_SELECT:
      stageMode.classList.remove("hidden");
      btnModeFree.focus();
      break;

    case STATE.ASKING:
      stageAsking.classList.remove("hidden");
      inputQuestion.focus();
      break;

    case STATE.SHUFFLING:
      stageCards.classList.remove("hidden");
      instructionText.textContent = "จักรวาลกำลังสับไพ่...";
      cardsGrid.classList.add("is-shuffling");
      cardsGrid.classList.remove("is-dealing");
      updateQuestionDisplay();
      break;

    case STATE.CHOOSING:
      stageCards.classList.remove("hidden");
      instructionText.textContent = "เลือกไพ่หนึ่งใบที่ดึงดูดใจคุณที่สุด";
      cardsGrid.classList.remove("is-shuffling", "is-dealing");
      updateQuestionDisplay();
      break;

    case STATE.REVEALED:
      stageCards.classList.remove("hidden");
      actionControls.classList.remove("hidden");
      instructionText.textContent = "ข้อความที่คุณได้รับ:";
      updateQuestionDisplay();
      updateActionControlsUI();
      instructionText.focus();
      break;
  }
}

function updateQuestionDisplay() {
  if (currentMode === "question" && userQuestion) {
    textUserQuestion.textContent = userQuestion; // textContent เสมอ
    displayUserQuestion.classList.remove("hidden");
  } else {
    textUserQuestion.textContent = "";
    displayUserQuestion.classList.add("hidden");
  }
}

function updateActionControlsUI() {
  if (currentMode === "question") {
    btnPrimaryAction.textContent = "ถามอีกครั้ง";
  } else {
    btnPrimaryAction.textContent = "สุ่มใหม่อีกครั้ง";
  }
}

function resetCardsUI() {
  cardElements.forEach((card) => {
    card.classList.remove("is-revealed", "is-dimmed");
    card.disabled = true;
    card.setAttribute("aria-label", `ไพ่ใบที่ ${Number(card.dataset.index) + 1}`);

    const categoryEl = card.querySelector(".card-category");
    const messageEl = card.querySelector(".card-message");
    if (categoryEl) categoryEl.textContent = "";
    if (messageEl) messageEl.textContent = "";
  });
  activeCardIndex = -1;
  pickedMessages = [];
  purgeExportArtifacts();
}

/**
 * =====================================================================
 * SECTION 4: Supabase RPC & Card Shuffling Flow
 * =====================================================================
 */
async function fetchMessages() {
  if (!client) {
    throw new Error("ยังไม่ได้กำหนดค่า Supabase URL หรือ Key ที่ถูกต้อง");
  }

  const { data, error } = await client.rpc("get_random_messages");

  if (error) {
    throw new Error("ไม่สามารถรับข้อความจากจักรวาลได้ กรุณาลองใหม่อีกครั้ง");
  }

  if (!Array.isArray(data) || data.length < 3) {
    throw new Error("มีข้อความพร้อมใช้งานไม่ครบ 3 รายการ");
  }

  return data;
}

async function startShuffleFlow() {
  if (currentState === STATE.SHUFFLING) return;

  const sequence = ++requestSequence;
  clearError();
  resetCardsUI();
  setState(STATE.SHUFFLING);

  try {
    const shuffleDuration = prefersReducedMotion.matches ? 0 : 1200;
    const dealDuration = prefersReducedMotion.matches ? 0 : 750;

    const minShuffleTimer = new Promise((resolve) => setTimeout(resolve, shuffleDuration));
    const [data] = await Promise.all([fetchMessages(), minShuffleTimer]);

    if (sequence !== requestSequence) return;

    pickedMessages = data;
    cardsGrid.classList.remove("is-shuffling");
    cardsGrid.classList.add("is-dealing");

    setTimeout(() => {
      if (sequence !== requestSequence) return;

      setState(STATE.CHOOSING);
      cardElements.forEach((card) => {
        card.disabled = false;
      });
      cardElements[0]?.focus();
    }, dealDuration);

  } catch (err) {
    if (sequence !== requestSequence) return;

    resetCardsUI();
    cardsGrid.classList.remove("is-shuffling", "is-dealing");

    const message =
      err instanceof Error && err.message
        ? err.message
        : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

    if (currentMode === "question") {
      setState(STATE.ASKING);
    } else {
      setState(STATE.MODE_SELECT);
    }
    showError(message);
  }
}

function handleCardSelect(event) {
  if (currentState !== STATE.CHOOSING) return;

  const card = event.currentTarget;
  const cardIndex = parseInt(card.dataset.index, 10);
  const selectedData = pickedMessages[cardIndex];

  if (!selectedData) return;

  activeCardIndex = cardIndex;
  const categoryEl = card.querySelector(".card-category");
  const messageEl = card.querySelector(".card-message");

  categoryEl.textContent = selectedData.category;
  messageEl.textContent = selectedData.message;

  cardElements.forEach((item) => {
    item.disabled = true;
    if (item === card) {
      item.classList.add("is-revealed");
      item.setAttribute("aria-label", "ไพ่ที่เลือกและเปิดแล้ว");
    } else {
      item.classList.add("is-dimmed");
    }
  });

  setState(STATE.REVEALED);
}

/**
 * =====================================================================
 * SECTION 5: Action Handlers (3 ปุ่มหลัก)
 * =====================================================================
 */
function handlePrimaryAction() {
  if (currentMode === "question") {
    ++requestSequence;
    resetCardsUI();
    setState(STATE.ASKING);
    inputQuestion.focus();
  } else {
    startShuffleFlow();
  }
}

function handleBackToModeSelect() {
  clearError();
  clearUserQuestion(true);
  resetCardsUI();
  setState(STATE.MODE_SELECT);
}

/**
 * =====================================================================
 * SECTION 6: Canvas Card Renderer (การสเกลตามสัดส่วน & ตัดคำไทยแม่นยำ)
 * =====================================================================
 */
function drawSparkle(ctx, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + radius);
  ctx.quadraticCurveTo(cx, cy, cx - radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fallbackRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}

/**
 * แยกสตริงออกเป็น Grapheme Clusters เพื่อไม่ให้อีโมจิหรือสระผสมฉีกขาด
 */
function getGraphemeClusters(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  const chars = Array.from(text);
  const clusters = [];
  for (const ch of chars) {
    if (clusters.length > 0 && FOLLOWING_CHARS_REGEX.test(ch)) {
      clusters[clusters.length - 1] += ch;
    } else {
      clusters.push(ch);
    }
  }
  return clusters;
}

/**
 * ตัดคำภาษาไทยตามหลักภาษาและรองรับคำยาวเกินความกว้าง
 */
function wrapThaiText(ctx, text, maxWidth) {
  if (!text) return [];

  let initialTokens = [];
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    for (const seg of segmenter.segment(text)) {
      initialTokens.push(seg.segment);
    }
  } else {
    const regex = new RegExp(
      `[-a-zA-Z0-9_.:/?#@&=+]+|\\s+|[\\u0E00-\\u0E7F][${THAI_FOLLOWING_CHARS}]*|[^\\s]`,
      "gu"
    );
    initialTokens = text.match(regex) || [text];
  }

  // แบ่งย่อยเฉพาะ Token ที่มีความกว้างเกิน maxWidth
  const tokens = [];
  for (const tok of initialTokens) {
    if (ctx.measureText(tok).width <= maxWidth) {
      tokens.push(tok);
    } else {
      const clusters = getGraphemeClusters(tok);
      let sub = "";
      for (let i = 0; i < clusters.length; i++) {
        sub += clusters[i];
        const next = clusters[i + 1];
        if (next && FOLLOWING_CHARS_REGEX.test(next)) {
          continue; // ห้ามตัดก่อนอักขระที่ต้องเกาะตัวหน้า
        }
        if (LEADING_VOWELS_REGEX.test(clusters[i])) {
          continue; // ห้ามทิ้งสระหน้าไว้เดี่ยว ๆ
        }
        tokens.push(sub);
        sub = "";
      }
      if (sub) tokens.push(sub);
    }
  }

  // รวม Token เข้าเป็นบรรทัดตามขนาดพิกเซลจริง
  const lines = [];
  let currentLine = "";

  for (const token of tokens) {
    const testLine = currentLine + token;
    if (ctx.measureText(testLine).width > maxWidth && currentLine !== "") {
      let lineToPush = currentLine.trim();

      const clusters = getGraphemeClusters(lineToPush);
      let carryOver = "";
      if (clusters.length > 0 && LEADING_VOWELS_REGEX.test(clusters[clusters.length - 1])) {
        carryOver = clusters.pop();
        lineToPush = clusters.join("").trim();
      }

      if (lineToPush.length > 0) {
        lines.push(lineToPush);
      }
      currentLine = carryOver ? carryOver + token.trimStart() : token.trimStart();
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}

/**
 * ตัดทอนข้อความพร้อมเติม … โดยไม่ลอกสระที่เกาะสมบูรณ์ทิ้ง
 */
function safeTruncateLine(ctx, lineStr, maxWidth) {
  const clusters = getGraphemeClusters(lineStr);

  while (clusters.length > 0 && ctx.measureText(clusters.join("") + "…").width > maxWidth) {
    clusters.pop();
  }
  while (clusters.length > 0 && LEADING_VOWELS_REGEX.test(clusters[clusters.length - 1])) {
    clusters.pop();
  }
  return clusters.join("").trim() + "…";
}

/**
 * ตรวจสอบความพร้อมของฟอนต์ Sarabun พร้อมตรวจเช็ก FontFace status โดยตรง
 */
async function ensureFontsLoaded() {
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${CARD_FONT_FAMILY}`, "ก"),
      document.fonts.load(`600 16px ${CARD_FONT_FAMILY}`, "ก")
    ]);

    // ตรวจสถานะ loaded จาก FontFaceSet จริง
    const fontFaces = Array.from(document.fonts).filter(
      (f) => f.family.replace(/['"]/g, "") === CARD_FONT_FAMILY
    );

    if (fontFaces.length > 0) {
      const isAnyLoaded = fontFaces.some((f) => f.status === "loaded");
      if (isAnyLoaded) return true;
    }

    // Fallback: ตรวจด้วย check()
    const check400 = document.fonts.check(`400 16px ${CARD_FONT_FAMILY}`, "ก");
    const check600 = document.fonts.check(`600 16px ${CARD_FONT_FAMILY}`, "ก");

    return Boolean(check400 || check600);
  } catch (err) {
    console.warn("ไม่สามารถโหลดฟอนต์ Sarabun ได้", err);
    return false;
  }
}

/**
 * เรนเดอร์การ์ดลง Preview Canvas และแปลงเป็น Blob (สเกลตามสัดส่วนภาพจริง)
 */
async function renderCardAndPrepareBlob() {
  if (activeCardIndex === -1 || !pickedMessages[activeCardIndex]) {
    purgeExportArtifacts();
    exportStatus = "error";
    showModalError("กรุณาเลือกไพ่ก่อนเปิดบันทึกภาพ");
    syncExportUIState();
    return;
  }

  // ป้องกันพื้นที่พิกเซลรวมเกิน 16 ล้านพิกเซล (ขีดจำกัดหน่วยความจำ Canvas ของ iOS Safari)
  if (exportWidth * exportHeight > 16000000) {
    purgeExportArtifacts();
    exportStatus = "error";
    showModalError(`ขนาดภาพรวม (${(exportWidth * exportHeight / 1000000).toFixed(1)} ล้านพิกเซล) เกินขีดจำกัด 16 ล้านพิกเซล`);
    syncExportUIState();
    return;
  }

  purgeExportArtifacts();
  const drawToken = ++previewSequence;

  exportStatus = "preparing";
  syncExportUIState();

  try {
    const ctx = exportPreviewCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("ไม่สามารถสร้าง Canvas Context ได้");
    }

    ctx.clearRect(0, 0, exportPreviewCanvas.width, exportPreviewCanvas.height);
    const fontsReady = await ensureFontsLoaded();

    if (drawToken !== previewSequence) return;

    if (!fontsReady) {
      showModalWarning("ไม่พบไฟล์ฟอนต์ Sarabun ระบบจะใช้ฟอนต์สำรองของระบบแทน");
    } else {
      clearModalWarning();
    }

    const width = exportWidth;
    const height = exportHeight;
    exportPreviewCanvas.width = width;
    exportPreviewCanvas.height = height;

    const cardData = pickedMessages[activeCardIndex];
    const showQ = currentMode === "question" && checkIncludeQuestion.checked && userQuestion;

    // 1. พื้นหลัง Cosmic Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0b0d17");
    bgGrad.addColorStop(0.5, "#15192b");
    bgGrad.addColorStop(1, "#07080e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. คำนวณ Safe Zone สำหรับ Story และพื้นที่การ์ดตามสัดส่วนภาพจริง
    const isTall = height / width >= 1.5;
    const safeTop = isTall ? height * 0.12 : height * 0.08;
    const safeBottom = isTall ? Math.max(250, height * 0.13) : height * 0.08;
    const contentHeight = height - safeTop - safeBottom;

    const isLandscape = width > height;
    const cardW = isLandscape ? width * 0.62 : width * 0.82;
    const cardH = contentHeight * 0.86;
    const cardX = (width - cardW) / 2;
    const cardY = safeTop + (contentHeight - cardH) / 2;

    const minDimension = Math.min(cardW, cardH);

    // 3. กรอบไพ่
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(20, Math.round(minDimension * 0.04));
    ctx.fillStyle = "#161b2e";
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = Math.max(2, Math.round(minDimension * 0.005));

    const radius = Math.round(minDimension * 0.04);
    fallbackRoundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. สัญลักษณ์ไพ่ ✦ วาดด้วย Path Sparkle
    ctx.fillStyle = "#d4af37";
    const sparkleRadius = Math.round(minDimension * 0.07);
    const sparkleY = cardY + cardH * 0.13;
    drawSparkle(ctx, width / 2, sparkleY, sparkleRadius);

    // 5. คำถามของผู้ใช้ (ปรับขยายขนาดให้อ่านชัดเจนระดับสตอรี่)
    let currentY = sparkleY + sparkleRadius + cardH * 0.045;
    if (showQ) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // ป้ายหัวข้อ "คำถามของคุณ" (ขยายเป็น ~34px)
      ctx.fillStyle = "#8e9bb0";
      const qLabelSize = Math.max(18, Math.round(minDimension * 0.038));
      ctx.font = `600 ${qLabelSize}px '${CARD_FONT_FAMILY}', sans-serif`;
      ctx.fillText("คำถามของคุณ", width / 2, currentY);
      currentY += qLabelSize * 1.6;

      // ตัวข้อความคำถาม (ขยายเป็น ~48px และใช้ SemiBold เพื่อให้อ่านง่าย)
      ctx.fillStyle = "#f0f3f8";
      const qTextSize = Math.max(22, Math.round(minDimension * 0.054));
      ctx.font = `600 ${qTextSize}px '${CARD_FONT_FAMILY}', sans-serif`;

      let qLines = wrapThaiText(ctx, `"${userQuestion}"`, cardW * 0.82);
      if (qLines.length > 3) {
        qLines = qLines.slice(0, 3);
        qLines[2] = safeTruncateLine(ctx, qLines[2], cardW * 0.82);
      }

      const qLineHeight = qTextSize * 1.5;
      for (const line of qLines) {
        ctx.fillText(line, width / 2, currentY);
        currentY += qLineHeight;
      }
      currentY += cardH * 0.035;
    }

    // 6. หมวดหมู่ข้อความ (ขยายเป็น ~38px)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#d4af37";
    const catSize = Math.max(18, Math.round(minDimension * 0.042));
    ctx.font = `600 ${catSize}px '${CARD_FONT_FAMILY}', sans-serif`;
    ctx.fillText(cardData.category.toUpperCase(), width / 2, currentY + 12);
    currentY += catSize + cardH * 0.045;

    // 7. ข้อความคำตอบ (ขยายเป็น ~58px)
    ctx.fillStyle = "#ffffff";
    let msgSize = Math.max(22, Math.round(minDimension * 0.065));
    ctx.font = `600 ${msgSize}px '${CARD_FONT_FAMILY}', sans-serif`;

    let msgLines = wrapThaiText(ctx, cardData.message, cardW * 0.82);
    let msgLineHeight = msgSize * 1.55;
    const availableBottomSpace = (cardY + cardH) - currentY - 32;

    const minAllowedFont = minDimension < 300 ? 14 : 18;
    while ((msgLines.length * msgLineHeight > availableBottomSpace) && msgSize > minAllowedFont) {
      msgSize -= 1;
      ctx.font = `600 ${msgSize}px '${CARD_FONT_FAMILY}', sans-serif`;
      msgLines = wrapThaiText(ctx, cardData.message, cardW * 0.82);
      msgLineHeight = msgSize * 1.55;
    }

    if (msgLines.length * msgLineHeight > availableBottomSpace) {
      const maxAllowedLines = Math.max(1, Math.floor(availableBottomSpace / msgLineHeight));
      msgLines = msgLines.slice(0, maxAllowedLines);
      msgLines[msgLines.length - 1] = safeTruncateLine(ctx, msgLines[msgLines.length - 1], cardW * 0.82);
    }

    for (const line of msgLines) {
      ctx.fillText(line, width / 2, currentY);
      currentY += msgLineHeight;
    }

    // 8. ลายน้ำ: วางกึ่งกลางระหว่างขอบล่างการ์ดกับขอบเขตอันตรายด้านล่าง
    const dangerZoneY = height - safeBottom;
    const cardBottom = cardY + cardH;
    let watermarkY = cardBottom + (dangerZoneY - cardBottom) / 2;
    if (watermarkY > dangerZoneY - 15) {
      watermarkY = dangerZoneY - 15;
    }

    ctx.fillStyle = "rgba(142, 155, 176, 0.75)";
    let wmSize = Math.max(12, Math.round(minDimension * 0.022));
    ctx.font = `400 ${wmSize}px '${CARD_FONT_FAMILY}', sans-serif`;
    while (ctx.measureText(WATERMARK_TEXT).width > width * 0.88 && wmSize > 10) {
      wmSize -= 1;
      ctx.font = `400 ${wmSize}px '${CARD_FONT_FAMILY}', sans-serif`;
    }
    ctx.fillText(WATERMARK_TEXT, width / 2, watermarkY);

    // แปลง Canvas เป็น Blob โดยตรง
    exportPreviewCanvas.toBlob((blob) => {
      if (drawToken !== previewSequence) return;
      if (!blob) {
        exportStatus = "error";
        showModalError("สร้างไฟล์ภาพไม่สำเร็จ แนะนำให้ลดขนาดภาพลง");
        syncExportUIState();
        return;
      }

      currentExportBlob = blob;
      currentExportFile = new File([blob], `cosmic-${Date.now()}.png`, { type: "image/png" });
      exportStatus = "ready";
      syncExportUIState();
    }, "image/png");

  } catch (err) {
    if (drawToken !== previewSequence) return;
    exportStatus = "error";
    showModalError("เกิดข้อผิดพลาดในการวาดภาพ แนะนำให้ลดขนาดภาพลง");
    syncExportUIState();
  }
}

function updatePreviewDebounced() {
  clearTimeout(customDebounceTimer);
  purgeExportArtifacts();
  customDebounceTimer = setTimeout(() => {
    renderCardAndPrepareBlob();
  }, 180);
}

/**
 * =====================================================================
 * SECTION 7: Export & Share Action Flow
 * =====================================================================
 */
async function handleShareFile() {
  if (!currentExportFile || !currentExportBlob) return;

  isExportInProgress = true;
  syncExportUIState();
  clearModalError();

  try {
    if (navigator.canShare && navigator.canShare({ files: [currentExportFile] })) {
      try {
        await navigator.share({
          files: [currentExportFile],
          title: "ข้อความจากจักรวาล"
        });
      } catch (shareErr) {
        if (shareErr instanceof Error && shareErr.name === "NotAllowedError") {
          if (!fallbackBlobUrl) {
            fallbackBlobUrl = URL.createObjectURL(currentExportBlob);
          }
          exportFallbackImg.src = fallbackBlobUrl;
          exportFallbackImg.classList.remove("hidden");
          exportPreviewCanvas.classList.add("hidden");
          safariHint.classList.remove("hidden");
        } else if (shareErr instanceof Error && shareErr.name !== "AbortError") {
          showModalError("การแชร์ล้มเหลว สามารถกดดาวน์โหลดแทนได้");
        }
      }
    } else {
      downloadBlob(currentExportBlob, currentExportFile.name);
    }
  } catch (err) {
    showModalError("ไม่สามารถดำเนินการได้ในขณะนี้");
  } finally {
    isExportInProgress = false;
    syncExportUIState();
  }
}

function handleDownloadFile() {
  if (!currentExportBlob || !currentExportFile) return;
  downloadBlob(currentExportBlob, currentExportFile.name);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * =====================================================================
 * SECTION 8: Event Listeners Binding (Single Setup)
 * =====================================================================
 */
function initDisclaimer() {
  if (typeof modalDisclaimer.showModal === "function") {
    modalDisclaimer.showModal();
    btnAckDisclaimer.focus();
  } else if (fallbackDisclaimer) {
    fallbackDisclaimer.classList.remove("hidden");
    if (appContainer) {
      appContainer.setAttribute("inert", "");
    }
  }
}

modalDisclaimer.addEventListener("cancel", (e) => {
  if (!isDisclaimerAcknowledged) e.preventDefault();
});

modalDisclaimer.addEventListener("close", () => {
  if (!isDisclaimerAcknowledged) {
    modalDisclaimer.showModal();
  }
});

btnAckDisclaimer.addEventListener("click", () => {
  isDisclaimerAcknowledged = true;
  modalDisclaimer.close();
  btnModeFree.focus();
});

if (btnFallbackAck) {
  btnFallbackAck.addEventListener("click", () => {
    fallbackDisclaimer.classList.add("hidden");
    if (appContainer) {
      appContainer.removeAttribute("inert");
    }
    btnModeFree.focus();
  });
}

// การเลือกโหมด
btnModeFree.addEventListener("click", () => {
  clearError();
  currentMode = "free";
  clearUserQuestion(true);
  startShuffleFlow();
});

btnModeQuestion.addEventListener("click", () => {
  clearError();
  currentMode = "question";
  setState(STATE.ASKING);
});

// การพิมพ์คำถามและ IME Guard บน Safari
inputQuestion.addEventListener("input", () => {
  const val = inputQuestion.value;
  charCounter.textContent = `${val.length}/120`;
  const hasText = val.trim().length > 0;
  btnSubmitQuestion.disabled = !hasText;

  if (val.length > 0) {
    btnClearQuestion.classList.remove("hidden");
  } else {
    btnClearQuestion.classList.add("hidden");
  }
});

inputQuestion.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (e.isComposing || e.keyCode === 229) return;

    e.preventDefault();
    if (inputQuestion.value.trim().length > 0 && !btnSubmitQuestion.disabled) {
      btnSubmitQuestion.click();
    }
  }
});

btnClearQuestion.addEventListener("click", () => {
  if (currentState === STATE.SHUFFLING) return;
  clearUserQuestion(true);
  inputQuestion.focus();
});

btnSubmitQuestion.addEventListener("click", () => {
  clearError();
  const val = inputQuestion.value.trim();
  if (!val) return;
  userQuestion = val.slice(0, 120);
  startShuffleFlow();
});

btnBackToMode.addEventListener("click", handleBackToModeSelect);

// การเปิดไพ่
cardElements.forEach((card) => {
  card.addEventListener("click", handleCardSelect);
});

// แถว 3 ปุ่มหลังเปิดผลลัพธ์
btnPrimaryAction.addEventListener("click", handlePrimaryAction);
btnChangeMode.addEventListener("click", handleBackToModeSelect);

// Export Modal
btnOpenExport.addEventListener("click", () => {
  safariHint.classList.add("hidden");
  clearModalError();
  clearModalWarning();
  purgeExportArtifacts();

  // รีเซ็ตสถานะขนาดและการส่งออกเสมอเมื่อเปิด Modal ใหม่
  isCustomSizeValid = true;
  isExportInProgress = false;
  customSizeError.classList.add("hidden");
  customSizeError.textContent = "";

  if (currentMode === "question" && userQuestion) {
    groupIncludeQuestion.classList.remove("hidden");
  } else {
    groupIncludeQuestion.classList.add("hidden");
  }

  modalExport.showModal();
  updatePreviewDebounced();
});

function releaseModalCanvasMemory() {
  clearTimeout(customDebounceTimer);
  purgeExportArtifacts();
  isExportInProgress = false;
  isCustomSizeValid = true;
  customSizeError.classList.add("hidden");
  customSizeError.textContent = "";

  // ปรับลดขนาดเหลือ 1x1 เพื่อคืนแรม GPU ทันทีบน Safari
  exportPreviewCanvas.width = 1;
  exportPreviewCanvas.height = 1;
}

btnCloseExport.addEventListener("click", () => {
  releaseModalCanvasMemory();
  modalExport.close();
});

modalExport.addEventListener("close", () => {
  releaseModalCanvasMemory();
});

btnDoExport.addEventListener("click", handleShareFile);
btnDownloadExport.addEventListener("click", handleDownloadFile);

// ตัวเลือกขนาดพรีเซ็ต
presetButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    presetButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    e.currentTarget.classList.add("active");
    e.currentTarget.setAttribute("aria-pressed", "true");

    customSizeError.classList.add("hidden");
    customSizeError.textContent = "";
    isCustomSizeValid = true;

    exportWidth = parseInt(e.currentTarget.dataset.w, 10);
    exportHeight = parseInt(e.currentTarget.dataset.h, 10);
    inputCustomW.value = exportWidth;
    inputCustomH.value = exportHeight;

    updatePreviewDebounced();
  });
});

function handleCustomDimensionInput() {
  presetButtons.forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });

  const rawW = inputCustomW.value.trim();
  const rawH = inputCustomH.value.trim();
  const w = Number(rawW);
  const h = Number(rawH);

  const isValidW = Number.isInteger(w) && w >= 300 && w <= 4096;
  const isValidH = Number.isInteger(h) && h >= 300 && h <= 4096;

  if (!isValidW || !isValidH) {
    clearTimeout(customDebounceTimer);
    customSizeError.textContent = "ความกว้างและความสูงต้องเป็นตัวเลขจำนวนเต็มระหว่าง 300 ถึง 4096 พิกเซล";
    customSizeError.classList.remove("hidden");
    isCustomSizeValid = false;
    purgeExportArtifacts();
    return;
  }

  const totalPixels = w * h;
  if (totalPixels > 16000000) {
    clearTimeout(customDebounceTimer);
    customSizeError.textContent = `พื้นที่รวม ${(totalPixels / 1000000).toFixed(1)} ล้านพิกเซล เกินขีดจำกัดความปลอดภัย 16 ล้านพิกเซล`;
    customSizeError.classList.remove("hidden");
    isCustomSizeValid = false;
    purgeExportArtifacts();
    return;
  }

  customSizeError.classList.add("hidden");
  customSizeError.textContent = "";
  isCustomSizeValid = true;
  exportWidth = w;
  exportHeight = h;
  updatePreviewDebounced();
}

inputCustomW.addEventListener("input", handleCustomDimensionInput);
inputCustomH.addEventListener("input", handleCustomDimensionInput);
checkIncludeQuestion.addEventListener("change", updatePreviewDebounced);

// เริ่มต้นระบบ
initDisclaimer();