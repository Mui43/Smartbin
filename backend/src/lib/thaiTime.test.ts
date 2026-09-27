import { test } from "node:test";
import assert from "node:assert/strict";
import { thaiDateFilter, thaiDateKey, thaiDayStart, thaiPeriod, thaiTimestamp } from "./thaiTime.js";

test("Thai midnight and end date include exactly the selected Thai calendar day", () => {
  const filter = thaiDateFilter("2026-09-27", "2026-09-27");
  assert.equal(filter.$gte?.toISOString(), "2026-09-26T17:00:00.000Z");
  assert.equal(filter.$lt?.toISOString(), "2026-09-27T17:00:00.000Z");
  assert.equal(thaiDateKey(new Date("2026-09-26T17:00:00Z")), "2026-09-27");
});

test("Invalid dates and reversed ranges are rejected", () => {
  assert.throws(() => thaiDayStart("2026-02-30"));
  assert.throws(() => thaiDayStart("27/09/2026"));
  assert.throws(() => thaiDateFilter("2026-09-28", "2026-09-27"));
});

test("Week and month boundaries use Thailand even when the UTC date differs", () => {
  const now = new Date("2026-09-27T18:00:00Z");
  assert.equal(thaiPeriod("week", undefined, now).start.toISOString(), "2026-09-27T17:00:00.000Z");
  const month = thaiPeriod("month", "2026-12", now);
  assert.equal(month.start.toISOString(), "2026-11-30T17:00:00.000Z");
  assert.equal(month.end.toISOString(), "2026-12-31T17:00:00.000Z");
  assert.equal(thaiTimestamp(now), "2026-09-28T01:00:00.000+07:00");
});
