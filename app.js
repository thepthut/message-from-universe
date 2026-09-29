// กำหนดค่า Project URL และ Anon Key ของ Supabase
const SUPABASE_URL = "https://aezpzkyxckziqjmgafok.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3X-SQNbG5ljRYyLiyFLHOQ_EyS1Snj7";

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

// จุดที่ 2 & 3: ตัวตรวจจับ Reduced Motion และตัวแปรนับลำดับรอบเพื่อตัด Race Condition
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let requestSequence = 0;

const STATE = {
  IDLE: "IDLE",
  SHUFFLING: "SHUFFLING",
  CHOOSING: "CHOOSING",
  REVEALED: "REVEALED"
};

let currentState = STATE.IDLE;
let pickedMessages = [];
let activeCardElement = null;

const stageLanding = document.getElementById("stage-landing");
const stageCards = document.getElementById("stage-cards");
const cardsGrid = document.getElementById("cards-grid");
const actionControls = document.getElementById("action-controls");
const errorBanner = document.getElementById("error-banner");
const instructionText = document.getElementById("instruction-text");

const btnStart = document.getElementById("btn-start");
const btnReset = document.getElementById("btn-reset");
const btnCopy = document.getElementById("btn-copy");
const cardElements = document.querySelectorAll(".card");

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function clearError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function setState(newState) {
  currentState = newState;

  stageLanding.classList.add("hidden");
  stageCards.classList.add("hidden");
  actionControls.classList.add("hidden");

  switch (currentState) {
    case STATE.IDLE:
      stageLanding.classList.remove("hidden");
      break;

    case STATE.SHUFFLING:
      stageCards.classList.remove("hidden");
      instructionText.textContent = "จักรวาลกำลังสับไพ่...";
      cardsGrid.classList.add("is-shuffling");
      cardsGrid.classList.remove("is-dealing");
      break;

    case STATE.CHOOSING:
      stageCards.classList.remove("hidden");
      instructionText.textContent = "เลือกไพ่หนึ่งใบที่ดึงดูดใจคุณที่สุด";
      cardsGrid.classList.remove("is-shuffling", "is-dealing");
      break;

    case STATE.REVEALED:
      stageCards.classList.remove("hidden");
      actionControls.classList.remove("hidden");
      instructionText.textContent = "ข้อความที่คุณได้รับ:";
      break;
  }
}

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

function resetCardsUI() {
  cardElements.forEach((card) => {
    card.classList.remove("is-revealed", "is-dimmed");
    card.disabled = true;
    card.setAttribute(
      "aria-label",
      `ไพ่ใบที่ ${Number(card.dataset.index) + 1}`
    );

    const categoryEl = card.querySelector(".card-category");
    const messageEl = card.querySelector(".card-message");
    if (categoryEl) categoryEl.textContent = "";
    if (messageEl) messageEl.textContent = "";
  });

  activeCardElement = null;
}

async function handleStart() {
  if (currentState === STATE.SHUFFLING) return;

  // เพิ่ม Sequence Counter เพื่อตรวจสอบความถูกต้องของรอบ
  const sequence = ++requestSequence;

  clearError();
  pickedMessages = [];
  activeCardElement = null;
  btnCopy.disabled = false;
  btnCopy.textContent = "คัดลอกข้อความ";

  resetCardsUI();
  setState(STATE.SHUFFLING);

  try {
    // จุดที่ 2: ปรับ Duration ตาม Reduced Motion (ลดเวลาเป็น 0 เมื่อผู้ใช้เปิดการตั้งค่านี้)
    const shuffleDuration = prefersReducedMotion.matches ? 0 : 1200;
    const dealDuration = prefersReducedMotion.matches ? 0 : 750;

    const minShuffleTimer = new Promise((resolve) => {
      setTimeout(resolve, shuffleDuration);
    });

    const [data] = await Promise.all([
      fetchMessages(),
      minShuffleTimer
    ]);

    // จุดที่ 3: เช็กว่าคำขอยังเป็นรอบล่าสุดหรือไม่
    if (sequence !== requestSequence) return;

    pickedMessages = data;
    cardsGrid.classList.remove("is-shuffling");
    cardsGrid.classList.add("is-dealing");

    setTimeout(() => {
      // ตรวจสอบ sequence ซ้ำก่อนปรับ state เพื่อป้องกัน callback ข้ามรอบ
      if (sequence !== requestSequence) return;

      setState(STATE.CHOOSING);
      cardElements.forEach((card) => {
        card.disabled = false;
      });
      cardElements[0]?.focus();
    }, dealDuration);

  } catch (err) {
    if (sequence !== requestSequence) return;

    pickedMessages = [];
    cardsGrid.classList.remove("is-shuffling", "is-dealing");

    const message =
      err instanceof Error && err.message
        ? err.message
        : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

    showError(message);
    setState(STATE.IDLE);
    btnStart.focus();
  }
}

function handleCardSelect(event) {
  if (currentState !== STATE.CHOOSING) return;

  const card = event.currentTarget;
  const cardIndex = parseInt(card.dataset.index, 10);
  const selectedData = pickedMessages[cardIndex];

  if (!selectedData) return;

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

  activeCardElement = card;
  setState(STATE.REVEALED);
  instructionText.focus();
}

async function handleCopy() {
  if (!activeCardElement) return;

  const messageText = activeCardElement
    .querySelector(".card-message")
    .textContent
    .trim();

  if (!messageText) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(messageText);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = messageText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      if (!copied) throw new Error("Fallback copy failed");
    }

    const originalText = btnCopy.textContent;
    btnCopy.textContent = "คัดลอกเรียบร้อย";
    btnCopy.disabled = true;

    setTimeout(() => {
      btnCopy.textContent = originalText;
      btnCopy.disabled = false;
    }, 2000);
  } catch {
    showError("ไม่สามารถคัดลอกข้อความได้ กรุณาเลือกและคัดลอกด้วยตนเอง");
  }
}

btnStart.addEventListener("click", handleStart);
btnReset.addEventListener("click", handleStart);
btnCopy.addEventListener("click", handleCopy);

cardElements.forEach((card) => {
  card.addEventListener("click", handleCardSelect);
});