/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHEDULE,
  isValidSchedule,
  getCurrentPhase,
  getCountdown,
  getElapsedWorkMinutes,
  formatCountdown,
  minutesToTime,
} from "./timeUtils.ts";

// 2026-01-05 is a Monday, 2026-01-10 a Saturday
const at = (h: number, m: number, s = 0, day = 5) => new Date(2026, 0, day, h, m, s);

test("isValidSchedule", () => {
  assert.ok(isValidSchedule(DEFAULT_SCHEDULE));
  assert.ok(isValidSchedule({ ...DEFAULT_SCHEDULE, lunchMinutes: 0, restDays: [] }));
  assert.ok(!isValidSchedule(null));
  assert.ok(!isValidSchedule({ start: "09:00" }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, start: "25:00" }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, start: "14:00" }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, lunchMinutes: 300 }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, lunchMinutes: NaN }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, restDays: [0, 1, 2, 3, 4, 5, 6] }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, restDays: [7] }));
});

test("getCurrentPhase", () => {
  assert.equal(getCurrentPhase(at(8, 30), DEFAULT_SCHEDULE), "before-work");
  assert.equal(getCurrentPhase(at(13, 30), DEFAULT_SCHEDULE), "lunch-break");
  assert.equal(getCurrentPhase(at(10, 0, 0, 10), DEFAULT_SCHEDULE), "day-off");
});

test("getElapsedWorkMinutes", () => {
  assert.equal(getElapsedWorkMinutes(at(8, 30), DEFAULT_SCHEDULE), 0);
  assert.equal(getElapsedWorkMinutes(at(10, 15), DEFAULT_SCHEDULE), 75);
  assert.equal(getElapsedWorkMinutes(at(13, 30), DEFAULT_SCHEDULE), 240);
  assert.equal(getElapsedWorkMinutes(at(15, 0), DEFAULT_SCHEDULE), 300);
  assert.equal(getElapsedWorkMinutes(at(19, 0), DEFAULT_SCHEDULE), 480);
  assert.equal(getElapsedWorkMinutes(at(15, 0, 0, 10), DEFAULT_SCHEDULE), 0);
});

test("getCountdown: to lunch in the morning, to end from lunch on", () => {
  assert.deepEqual(getCountdown(at(12, 59, 30), DEFAULT_SCHEDULE), { to: "lunch", seconds: 30 });
  assert.deepEqual(getCountdown(at(8, 0), DEFAULT_SCHEDULE), { to: "lunch", seconds: 5 * 3600 });
  assert.deepEqual(getCountdown(at(13, 0), DEFAULT_SCHEDULE), { to: "end", seconds: 5 * 3600 });
  assert.deepEqual(getCountdown(at(17, 0, 1), DEFAULT_SCHEDULE), { to: "end", seconds: 3599 });
  assert.equal(getCountdown(at(18, 0), DEFAULT_SCHEDULE), null);
  assert.equal(getCountdown(at(10, 0, 0, 10), DEFAULT_SCHEDULE), null);
});

test("formatting", () => {
  assert.equal(formatCountdown(3599), "0:59:59");
  assert.equal(formatCountdown(5 * 3600 + 61), "5:01:01");
  assert.equal(minutesToTime(570), "09:30");
});
