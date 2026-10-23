import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const isBefore = process.argv.includes("--before");
const prefix = isBefore ? "before" : "after";

const BASE_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\fba22140-55e8-4e1f-a357-ac9736cfbef8\\phase3-screenshots";
const OUT_DIR = path.join(BASE_DIR, prefix);
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9888;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_debug_phase3_${Date.now()}`);
const APP_URL = "http://127.0.0.1:8080";

const PAGES = [
  { name: "home", path: "/" },
  { name: "matches", path: "/matches" },
  { name: "matches_detail", path: "/matches/5181851" },
  { name: "players", path: "/players" },
  { name: "player_detail", path: "/players/lamine-yamal-937958" },
  { name: "clubs", path: "/clubs" },
  { name: "leagues", path: "/leagues" },
];

const VIEWPORTS = [
  { name: "360px", width: 360, height: 780 },
  { name: "430px", width: 430, height: 932 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch {
      // Waiting for Chrome
    }
    await sleep(500);
  }
  throw new Error("Could not connect to Chrome debugging port");
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve: res, reject: rej } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) {
              rej(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              res(msg.result);
            }
          }
        } catch (e) {
          console.error("CDP parse error:", e);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function captureScreenshot(cdp, filePath) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  const buffer = Buffer.from(result.data, "base64");
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved screenshot: ${filePath}`);
}

async function main() {
  console.log(`Starting ${prefix.toUpperCase()} screenshot run for Phase 3...`);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    const wsUrl = await getDebuggerUrl();
    console.log("Connected to Chrome:", wsUrl);

    const cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    for (const vp of VIEWPORTS) {
      console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true,
      });

      for (const p of PAGES) {
        const fullUrl = `${APP_URL}${p.path}`;
        console.log(`Navigating to ${p.name}: ${fullUrl}`);
        await cdp.send("Page.navigate", { url: fullUrl });
        await sleep(1800);

        const filename = `${p.name}_${vp.name}_${prefix}.png`;
        const filePath = path.join(OUT_DIR, filename);
        await captureScreenshot(cdp, filePath);
      }
    }

    console.log(`\nCompleted ${prefix.toUpperCase()} screenshots successfully!`);
    cdp.close();
  } finally {
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error("Phase 3 screenshot run failed:", err);
  process.exit(1);
});
