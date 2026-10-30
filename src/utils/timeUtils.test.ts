/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHEDULE,
  isValidSchedule,
  getScheduleErrors,
  getCurrentPhase,
  getCountdown,
  getSlotCountdown,
  getElapsedWorkMinutes,
  getNextWorkDay,
  migrate,
  formatCountdown,
  formatDuration,
  formatWorkDays,
  minutesToShortTime,
  minutesToTime,
} from "./timeUtils.ts";

// 2026-01-05 is a Monday, 2026-01-09 a Friday, 2026-01-10 a Saturday
const at = (h: number, m: number, s = 0, day = 5) => new Date(2026, 0, day, h, m, s);

test("isValidSchedule", () => {
  assert.ok(isValidSchedule(DEFAULT_SCHEDULE));
  assert.ok(!isValidSchedule(null));
  assert.ok(!isValidSchedule({ start: "09:00" }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, start: "25:00" }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, lunchMinutes: 0 }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, workDays: [] }));
  assert.ok(!isValidSchedule({ ...DEFAULT_SCHEDULE, workDays: [7] }));
});

test("getScheduleErrors: message under the field at fault", () => {
  assert.deepEqual(getScheduleErrors(DEFAULT_SCHEDULE), {});
  assert.deepEqual(getScheduleErrors({ ...DEFAULT_SCHEDULE, start: "14:00" }), { start: "Deve venire prima della pausa (13:00)" });
  assert.deepEqual(getScheduleErrors({ ...DEFAULT_SCHEDULE, end: "13:30" }), { end: "Deve venire dopo il rientro (14:00)" });
  assert.deepEqual(getScheduleErrors({ ...DEFAULT_SCHEDULE, lunchMinutes: NaN }), { lunchMinutes: "Inserisci una durata maggiore di 0" });
  assert.deepEqual(getScheduleErrors({ ...DEFAULT_SCHEDULE, workDays: [] }), { workDays: "Scegli almeno un giorno" });
  assert.deepEqual(getScheduleErrors({ ...DEFAULT_SCHEDULE, end: "" }), { end: "Inserisci un orario" });
});

test("migrate: old saved formats become working days", () => {
  const v2 = { start: "08:30", lunchStart: "12:30", lunchMinutes: 45, end: "17:00", restDays: [0, 6] };
  assert.deepEqual(migrate(v2), { start: "08:30", lunchStart: "12:30", lunchMinutes: 45, end: "17:00", workDays: [1, 2, 3, 4, 5] });
  assert.deepEqual((migrate({ ...v2, restDays: [0, 3] }) as { workDays: number[] }).workDays, [1, 2, 4, 5, 6]);
  const v1 = { morning: { start: "09:00", end: "13:00" }, afternoon: { start: "14:00", end: "18:00" } };
  assert.deepEqual(migrate(v1), DEFAULT_SCHEDULE);
  assert.equal(migrate(DEFAULT_SCHEDULE), DEFAULT_SCHEDULE);
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

test("getCountdown: to start before work, to lunch in the morning, to end from lunch on", () => {
  assert.deepEqual(getCountdown(at(8, 0), DEFAULT_SCHEDULE), { to: "start", seconds: 3600 });
  assert.deepEqual(getCountdown(at(12, 59, 30), DEFAULT_SCHEDULE), { to: "lunch", seconds: 30 });
  assert.deepEqual(getCountdown(at(13, 0), DEFAULT_SCHEDULE), { to: "end", seconds: 5 * 3600 });
  assert.deepEqual(getCountdown(at(17, 0, 1), DEFAULT_SCHEDULE), { to: "end", seconds: 3599 });
  assert.equal(getCountdown(at(18, 0), DEFAULT_SCHEDULE), null);
  assert.equal(getCountdown(at(10, 0, 0, 10), DEFAULT_SCHEDULE), null);
});

test("getSlotCountdown: time left in the current slot", () => {
  assert.deepEqual(getSlotCountdown(at(8, 30), DEFAULT_SCHEDULE), { phase: "before-work", seconds: 1800 });
  assert.deepEqual(getSlotCountdown(at(12, 59, 30), DEFAULT_SCHEDULE), { phase: "morning", seconds: 30 });
  assert.deepEqual(getSlotCountdown(at(13, 40), DEFAULT_SCHEDULE), { phase: "lunch-break", seconds: 1200 });
  assert.deepEqual(getSlotCountdown(at(17, 0, 1), DEFAULT_SCHEDULE), { phase: "afternoon", seconds: 3599 });
  assert.equal(getSlotCountdown(at(18, 0), DEFAULT_SCHEDULE), null);
  assert.equal(getSlotCountdown(at(10, 0, 0, 10), DEFAULT_SCHEDULE), null);
});

test("getNextWorkDay", () => {
  assert.equal(getNextWorkDay(at(10, 0, 0, 10), DEFAULT_SCHEDULE), "lunedì"); // Saturday
  assert.equal(getNextWorkDay(at(10, 0, 0, 11), DEFAULT_SCHEDULE), "domani"); // Sunday
});

test("formatting", () => {
  assert.equal(formatCountdown(3599), "0:59:59");
  assert.equal(formatCountdown(5 * 3600 + 61), "5:01:01");
  assert.equal(minutesToTime(570), "09:30");
  assert.equal(minutesToShortTime(540), "09");
  assert.equal(minutesToShortTime(570), "09:30");
  assert.equal(formatDuration(240), "4 h");
  assert.equal(formatDuration(210), "3 h 30 min");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatWorkDays([1, 2, 3, 4, 5]), "lun–ven · 5 giorni");
  assert.equal(formatWorkDays([5, 1, 3]), "lun, mer, ven · 3 giorni");
  assert.equal(formatWorkDays([1, 2, 4, 5, 6]), "lun, mar, gio–sab · 5 giorni");
  assert.equal(formatWorkDays([2]), "mar · 1 giorno");
});
