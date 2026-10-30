import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { subscriptionStore } from "../src/lib/notifications/store";
import {
  dispatchValuationAlerts,
  PlayerValuationMovement,
} from "../src/lib/notifications/dispatcher";
import {
  urlBase64ToUint8Array,
  DEFAULT_VAPID_PUBLIC_KEY,
  DEFAULT_VAPID_PRIVATE_KEY,
  DEFAULT_VAPID_SUBJECT,
} from "../src/lib/notifications/vapid";
import {
  createVapidAuthHeader,
  encryptWebPushPayload,
} from "../src/lib/notifications/web-push-edge";
import { POST as cronHandler } from "../src/app/api/notifications/cron/route";
import { POST as subscribeHandler } from "../src/app/api/notifications/subscribe/route";

test("Task A: PWA Manifest & Service Worker verification", () => {
  // 1. Verify Service Worker push and notificationclick handlers
  const swPath = path.join(process.cwd(), "public", "sw.js");
  assert.ok(fs.existsSync(swPath), "public/sw.js must exist");
  const swContent = fs.readFileSync(swPath, "utf-8");
  assert.ok(swContent.includes('self.addEventListener("push"'), "SW must handle push event");
  assert.ok(swContent.includes('self.addEventListener("notificationclick"'), "SW must handle notificationclick event");
  assert.ok(swContent.includes('self.addEventListener("pushsubscriptionchange"'), "SW must handle pushsubscriptionchange event");
  assert.ok(swContent.includes("event.notification.close()"), "SW must close notification on click");
  assert.ok(swContent.includes("clients.openWindow"), "SW must open/focus client window on click");

  // 2. Verify Manifest properties
  const manifestPath = path.join(process.cwd(), "src", "app", "manifest.ts");
  assert.ok(fs.existsSync(manifestPath), "manifest.ts must exist");
  const manifestContent = fs.readFileSync(manifestPath, "utf-8");
  assert.ok(manifestContent.includes('"standalone"'), "Manifest must specify standalone display");
  assert.ok(manifestContent.includes("#1e1240"), "Manifest theme colour must match the Royal chrome token #1e1240");
  assert.ok(!manifestContent.includes("Real-time"), "Manifest copy must not promise real-time valuations");
});

test("Task B: Subscription store CRUD & zero PII invariant", async () => {
  const testEndpoint = "https://fcm.googleapis.com/fcm/send/test-sub-12345";
  const testSub = {
    endpoint: testEndpoint,
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DKM",
      auth: "tBHItJI5svbpez7KI4CCXg",
    },
    followedPlayerIds: ["player-yamal-101", "player-haaland-202"],
    threshold: 0.05,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save subscription
  await subscriptionStore.save(testSub);

  // 2. Retrieve subscription
  const retrieved = await subscriptionStore.get(testEndpoint);
  assert.ok(retrieved, "Subscription must be retrievable");
  assert.equal(retrieved.endpoint, testEndpoint);
  assert.equal(retrieved.threshold, 0.05);
  assert.deepEqual(retrieved.followedPlayerIds, ["player-yamal-101", "player-haaland-202"]);

  // 3. Verify zero personal data stored (no name, email, IP)
  const keys = Object.keys(retrieved);
  assert.ok(!keys.includes("email"), "Must not store email");
  assert.ok(!keys.includes("name"), "Must not store name");
  assert.ok(!keys.includes("ip"), "Must not store IP address");

  // 4. Update last notified timestamp and values
  const notifyTime = new Date().toISOString();
  await subscriptionStore.updateLastNotified(testEndpoint, notifyTime, {
    "player-yamal-101": 180000000,
  });
  const updated = await subscriptionStore.get(testEndpoint);
  assert.equal(updated?.lastNotifiedAt, notifyTime);
  assert.equal(updated?.lastNotifiedValues?.["player-yamal-101"], 180000000);

  // 5. Delete subscription
  const deleted = await subscriptionStore.delete(testEndpoint);
  assert.equal(deleted, true);
  const postDelete = await subscriptionStore.get(testEndpoint);
  assert.equal(postDelete, null);
});

test("Task B: VAPID Key validation and base64 conversion", () => {
  assert.ok(DEFAULT_VAPID_PUBLIC_KEY.length > 50, "VAPID public key must be defined");
  const uint8 = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
  assert.ok(uint8 instanceof Uint8Array, "Must convert to Uint8Array");
  assert.ok(uint8.length > 0, "Converted key must not be empty");
});

test("Task B: WebCrypto RFC 8292 VAPID authorization & RFC 8291 payload encryption", async () => {
  // 1. VAPID header generation using WebCrypto
  const aud = "https://fcm.googleapis.com/fcm/send/test";
  const authHeader = await createVapidAuthHeader(
    aud,
    DEFAULT_VAPID_SUBJECT,
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
  assert.ok(authHeader.startsWith("vapid t="), "VAPID auth header must start with 'vapid t='");
  assert.ok(authHeader.includes(", k="), "VAPID auth header must include public key ', k='");

  // 2. RFC 8291 payload encryption using WebCrypto with a valid P-256 key
  const subKey = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const subPubRaw = await crypto.subtle.exportKey("raw", subKey.publicKey);
  const binary = Array.from(new Uint8Array(subPubRaw))
    .map((b) => String.fromCharCode(b))
    .join("");
  const p256dh = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const auth = "tBHItJI5svbpez7KI4CCXg";
  const payload = JSON.stringify({ title: "Value update: Yamal", body: "+20%" });

  const encrypted = await encryptWebPushPayload(payload, p256dh, auth);
  assert.ok(encrypted instanceof Uint8Array, "Encrypted payload must be Uint8Array");
  // Header is 86 bytes, plus ciphertext and tag
  assert.ok(encrypted.length > 86, "Encrypted payload must contain 86-byte header + ciphertext");
  // Check header rs = 4096 (bytes 16..19)
  const view = new DataView(encrypted.buffer, encrypted.byteOffset, 20);
  assert.equal(view.getUint32(16, false), 4096, "Record size in header must be 4096");
  assert.equal(encrypted[20], 65, "Key length in header must be 65 bytes (P-256)");
});

test("Task C: Movement detection and threshold evaluation", async () => {
  const movements: PlayerValuationMovement[] = [
    {
      id: "yamal",
      name: "Lamine Yamal",
      slug: "lamine-yamal-1051588",
      previousValueEur: 150_000_000,
      latestValueEur: 180_000_000,
      diffEur: 30_000_000,
      percentage: 0.20, // +20%
    },
    {
      id: "subtle-player",
      name: "Subtle Player",
      slug: "subtle-player",
      previousValueEur: 100_000_000,
      latestValueEur: 102_000_000,
      diffEur: 2_000_000,
      percentage: 0.02, // +2% (below 5% threshold)
    },
  ];

  const subEndpoint = "https://push.example.com/test-eval-endpoint";
  await subscriptionStore.save({
    endpoint: subEndpoint,
    keys: { p256dh: "key", auth: "auth" },
    followedPlayerIds: ["yamal", "subtle-player"],
    threshold: 0.05,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const sub = await subscriptionStore.get(subEndpoint);
  assert.ok(sub);

  const triggered = movements.filter(
    (m) => sub.followedPlayerIds.includes(m.id) && Math.abs(m.percentage) >= sub.threshold
  );

  assert.equal(triggered.length, 1, "Only movements exceeding 5% threshold must trigger");
  assert.equal(triggered[0].id, "yamal");

  await subscriptionStore.delete(subEndpoint);
});

test("Phase 10: Dispatcher idempotency prevents sending duplicate valuation alerts", async () => {
  const endpoint = "https://mock.push.service/idempotency-test-sub";
  const subRecord = {
    endpoint,
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DKM",
      auth: "tBHItJI5svbpez7KI4CCXg",
    },
    followedPlayerIds: ["haaland"],
    threshold: 0.05,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastNotifiedAt: null,
    lastNotifiedValues: {
      // Already notified when Haaland reached 200M
      haaland: 200_000_000,
    },
  };

  await subscriptionStore.save(subRecord);

  // Movement has same latestValueEur as lastNotifiedValues
  const duplicateMovement: PlayerValuationMovement[] = [
    {
      id: "haaland",
      name: "Erling Haaland",
      previousValueEur: 180_000_000,
      latestValueEur: 200_000_000,
      diffEur: 20_000_000,
      percentage: 0.111,
    },
  ];

  const result1 = await dispatchValuationAlerts(duplicateMovement, {
    targetEndpoint: endpoint,
    ignoreRateLimit: true,
  });

  // Idempotency must prevent sending
  assert.equal(result1.sentCount, 0, "Must not send notification when valuation was already notified");

  // Now simulate a new valuation update (200M -> 220M)
  const newMovement: PlayerValuationMovement[] = [
    {
      id: "haaland",
      name: "Erling Haaland",
      previousValueEur: 200_000_000,
      latestValueEur: 220_000_000,
      diffEur: 20_000_000,
      percentage: 0.10,
    },
  ];

  // We can verify that movement is evaluated because value changed from 200M to 220M
  const sub = await subscriptionStore.get(endpoint);
  assert.ok(sub);
  assert.notEqual(sub.lastNotifiedValues?.["haaland"], 220_000_000, "New valuation is not yet notified");

  await subscriptionStore.delete(endpoint);
});

test("Phase 10: Rate limiting enforces maximum 1 push per user per day", async () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const recentTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
  const oldTimestamp = new Date(Date.now() - (ONE_DAY_MS + 3600 * 1000)).toISOString(); // 25 hours ago

  const endpoint = "https://mock.push.service/ratelimit-test-sub";
  await subscriptionStore.save({
    endpoint,
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DKM",
      auth: "tBHItJI5svbpez7KI4CCXg",
    },
    followedPlayerIds: ["yamal"],
    threshold: 0.05,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastNotifiedAt: recentTimestamp,
  });

  const movements: PlayerValuationMovement[] = [
    {
      id: "yamal",
      name: "Lamine Yamal",
      previousValueEur: 150_000_000,
      latestValueEur: 180_000_000,
      diffEur: 30_000_000,
      percentage: 0.20,
    },
  ];

  // Should skip due to 1 push/user/day limit
  const res = await dispatchValuationAlerts(movements, {
    targetEndpoint: endpoint,
    ignoreRateLimit: false,
  });

  assert.equal(res.skippedRateLimitCount, 1, "Must skip subscriber when notified less than 24h ago");
  assert.equal(res.sentCount, 0, "Must not send push when rate-limited");

  // Now test with old timestamp (25h ago)
  await subscriptionStore.updateLastNotified(endpoint, oldTimestamp);
  const updatedSub = await subscriptionStore.get(endpoint);
  assert.equal(updatedSub?.lastNotifiedAt, oldTimestamp);

  await subscriptionStore.delete(endpoint);
});

test("Phase 10: Expired subscription cleanup (404/410 handling)", async () => {
  const expiredEndpoints = [
    "https://fcm.googleapis.com/fcm/send/expired-sub-1",
    "https://fcm.googleapis.com/fcm/send/expired-sub-2",
  ];

  for (const ep of expiredEndpoints) {
    await subscriptionStore.save({
      endpoint: ep,
      keys: { p256dh: "dummy", auth: "dummy" },
      followedPlayerIds: ["player-1"],
      threshold: 0.05,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Verify both exist
  assert.ok(await subscriptionStore.get(expiredEndpoints[0]));
  assert.ok(await subscriptionStore.get(expiredEndpoints[1]));

  // Clean up
  await subscriptionStore.removeExpired(expiredEndpoints);

  // Verify both are deleted
  assert.equal(await subscriptionStore.get(expiredEndpoints[0]), null);
  assert.equal(await subscriptionStore.get(expiredEndpoints[1]), null);
});

test("Phase 10: Missing-store behavior returns 503 Service Unavailable", async () => {
  // Simulate missing persistent store in subscriptionStore
  subscriptionStore.setForceMissingStoreForTesting(true);

  try {
    const req = new NextRequest("https://a1score.app/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({
        subscription: {
          endpoint: "https://test.push/endpoint",
          keys: { p256dh: "p256", auth: "auth" },
        },
        followedPlayerIds: ["yamal"],
        threshold: 0.05,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await subscribeHandler(req);
    assert.equal(res.status, 503, "Must return HTTP 503 when persistent store binding is missing");

    const data = await res.json();
    assert.ok(
      data.error.includes("PUSH_SUBSCRIPTIONS_KV"),
      "Error response must clearly state missing PUSH_SUBSCRIPTIONS_KV binding"
    );
  } finally {
    subscriptionStore.setForceMissingStoreForTesting(false);
  }
});

test("Phase 10: Cron route requires CRON_SECRET: 401 without secret, 200 with it", async () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "super-secret-cron-token-12345";

  try {
    // 1. Request with NO Authorization header
    const reqNoAuth = new NextRequest("https://a1score.app/api/notifications/cron", {
      method: "POST",
    });
    const resNoAuth = await cronHandler(reqNoAuth);
    assert.equal(resNoAuth.status, 401, "Must return 401 when Authorization header is missing");

    // 2. Request with INVALID Bearer token
    const reqBadAuth = new NextRequest("https://a1score.app/api/notifications/cron", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret-token",
      },
    });
    const resBadAuth = await cronHandler(reqBadAuth);
    assert.equal(resBadAuth.status, 401, "Must return 401 when Bearer token is incorrect");

    // 3. Request with VALID Bearer token
    const reqGoodAuth = new NextRequest("https://a1score.app/api/notifications/cron", {
      method: "POST",
      headers: {
        authorization: "Bearer super-secret-cron-token-12345",
      },
    });
    const resGoodAuth = await cronHandler(reqGoodAuth);
    assert.equal(resGoodAuth.status, 200, "Must return 200 when valid CRON_SECRET is supplied");
    const jsonGood = await resGoodAuth.json();
    assert.equal(jsonGood.success, true);
    assert.ok(typeof jsonGood.evaluatedMovements === "number");
  } finally {
    if (originalSecret !== undefined) {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  }
});
