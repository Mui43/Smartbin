import test from "node:test";
import assert from "node:assert/strict";
import { shouldSendLineAlert } from "../src/alerts/shouldSendLineAlert.js";

const now = Date.parse("2026-09-29T08:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000);

test("new alerts send immediately and successful alerts do not repeat by default", () => {
  assert.equal(shouldSendLineAlert(null, 0, now), true);
  assert.equal(shouldSendLineAlert({ sentToLine: true, lineLastAttemptAt: minutesAgo(180) }, 0, now), false);
});

test("reminders wait for the configured interval", () => {
  assert.equal(shouldSendLineAlert({ sentToLine: true, lineLastAttemptAt: minutesAgo(59) }, 60, now), false);
  assert.equal(shouldSendLineAlert({ sentToLine: true, lineLastAttemptAt: minutesAgo(60) }, 60, now), true);
});

test("failed delivery retries after one minute even when reminders are disabled", () => {
  assert.equal(shouldSendLineAlert({ sentToLine: false, lineError: "failed", lineLastAttemptAt: minutesAgo(0.5) }, 0, now), false);
  assert.equal(shouldSendLineAlert({ sentToLine: false, lineError: "failed", lineLastAttemptAt: minutesAgo(1) }, 0, now), true);
  assert.equal(shouldSendLineAlert({ sentToLine: true, lineError: "failed", lineLastAttemptAt: minutesAgo(1) }, 60, now), true);
});
