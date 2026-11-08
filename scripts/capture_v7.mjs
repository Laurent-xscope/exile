import { chromium } from "playwright";
import fs from "fs";

const SCRATCH_DIR = "/Users/blessed/.gemini/antigravity/brain/4c9cbcaf-e3e7-4a55-90fa-c8522eec4979/scratch";

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

async function main() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

  // ---------------------------------------------------------
  // 1. Credits Modal: Click Exile logo in header to open credits modal
  // ---------------------------------------------------------
  console.log("1. Navigating to http://localhost:3000 to capture credits modal...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click Exile logo
  const logoTrigger = page.locator('div[title="Klik untuk melihat kredit tim"]');
  await logoTrigger.waitFor({ state: "visible" });
  await logoTrigger.click();

  // Wait for dialog
  const dialog = page.locator('div[role="dialog"][aria-label="Kredit tim kontributor"]');
  await dialog.waitFor({ state: "visible" });

  // Verify credits content: @dear.sidd, @wstra__, @ekaprtama_
  const modalText = await dialog.innerText();
  console.log("Credits dialog text contains team members!");
  if (
    modalText.includes("@dear.sidd") &&
    modalText.includes("@wstra__") &&
    modalText.includes("@ekaprtama_")
  ) {
    console.log("✓ All 3 Instagram team members verified!");
  } else {
    throw new Error("Missing team members in credits modal text: " + modalText);
  }

  await page.waitForTimeout(500);
  console.log("Capturing v7-credits-modal.png...");
  await page.screenshot({
    path: `${SCRATCH_DIR}/v7-credits-modal.png`,
    fullPage: false,
  });

  // Close modal via Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  // ---------------------------------------------------------
  // 2. Homepage Hero Light Mode
  // ---------------------------------------------------------
  console.log("2. Capturing v7-hero-calm-light.png...");
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: `${SCRATCH_DIR}/v7-hero-calm-light.png`,
    fullPage: false,
  });

  // ---------------------------------------------------------
  // 3. Homepage Hero Dark Mode
  // ---------------------------------------------------------
  console.log("3. Capturing v7-hero-calm-dark.png...");
  await page.evaluate(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: `${SCRATCH_DIR}/v7-hero-calm-dark.png`,
    fullPage: false,
  });

  // ---------------------------------------------------------
  // 4. Buat Ruang Kuis Calm (/buat-ruang-kuis)
  // ---------------------------------------------------------
  console.log("4. Creating room via API directly to obtain code and hostToken...");
  const createRes = await page.request.post("http://localhost:3000/api/rooms/create", {
    data: {
      hostName: "Pengajar exile",
      settings: {
        timePerQuestionSec: 20,
        streakBonus: true,
        shuffleQuestions: false,
      },
    },
  });
  const roomData = await createRes.json();
  console.log("Created room:", roomData.roomCode);

  // Navigate to root to ensure origin context before setting storage
  await page.goto("http://localhost:3000", { waitUntil: "commit" });
  await page.evaluate(({ roomCode, hostToken }) => {
    localStorage.setItem(`exile_host_token:${roomCode}`, hostToken);
    sessionStorage.setItem(`exile_host_token:${roomCode}`, hostToken);
    sessionStorage.setItem(`exile_tab_role:${roomCode}`, "host");
  }, { roomCode: roomData.roomCode, hostToken: roomData.hostToken });

  console.log(`Navigating directly to /buat-ruang-kuis/${roomData.roomCode}...`);
  await page.goto(`http://localhost:3000/buat-ruang-kuis/${roomData.roomCode}`, {
    waitUntil: "networkidle",
  });

  // Wait for difficulty buttons to be visible
  console.log("Waiting for difficulty selector...");
  const mudahButton = page.getByRole("button", { name: /Mudah/ }).first();
  await mudahButton.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1000);

  console.log("Capturing v7-buat-ruang-kuis-calm.png...");
  await page.screenshot({
    path: `${SCRATCH_DIR}/v7-buat-ruang-kuis-calm.png`,
    fullPage: false,
  });

  // ---------------------------------------------------------
  // 5. Play Page PIN xxxxxx (/play)
  // ---------------------------------------------------------
  console.log("5. Navigating to http://localhost:3000/play...");
  await page.goto("http://localhost:3000/play", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check pin input placeholder
  const pinInput = page.locator('input[inputmode="numeric"]');
  await pinInput.waitFor({ state: "visible" });
  const placeholder = await pinInput.getAttribute("placeholder");
  console.log(`PIN input placeholder is: "${placeholder}"`);
  if (placeholder !== "xxxxxx") {
    throw new Error(`Expected PIN placeholder "xxxxxx", got "${placeholder}"`);
  }
  console.log("✓ PIN input placeholder is verified as xxxxxx!");

  console.log("Capturing v7-play-pin-xxxxxx.png...");
  await page.screenshot({
    path: `${SCRATCH_DIR}/v7-play-pin-xxxxxx.png`,
    fullPage: false,
  });

  await browser.close();
  console.log("All 5 v7 screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
