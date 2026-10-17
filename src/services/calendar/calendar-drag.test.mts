import assert from "node:assert/strict";
import test from "node:test";
import { calendarKeyboardTarget, calendarPointerTarget } from "@/app/calendar/_components/scheduling/grid/calendar-drag-target.ts";
import { calendarGridPoint } from "@/utils/calendar/calendar-pointer.ts";
import { calendarItem, CALENDAR_HEIGHT, HOUR_HEIGHT } from "@/utils/calendar/calendar.ts";
import { droppedTimeRange } from "@/utils/calendar/day-schedule.ts";
import { previewCalendarItems } from "@/utils/calendar/calendar-preview.ts";
import { graphCalendarItems } from "@/utils/calendar/events/graph-calendar.ts";
import { saveNativeEvent } from "@/services/event/native/native-event-service.ts";
import { moveCalendarItem } from "./core/calendar-schedule-service.ts";
import { createSeedGraph } from "@/data/seed-graph.ts";
import type { TaskNode } from "@/types/graph/graph.ts";

const days = ["2026-10-17", "2026-10-18"];
const task: TaskNode = { id: "task", type: "task", properties: { name: "Task" } };
const item = calendarItem(task, days[0], days[0], "09:00", "10:00", days[0])!;
const bounds = { left: 80, top: -700, width: 840, height: CALENDAR_HEIGHT };
const point = (minute: number, column = 0, rect = bounds) => ({
  clientX: rect.left + rect.width / days.length * (column + 0.5),
  clientY: rect.top + minute / 1440 * rect.height,
});

test("block moves preserve the grab offset and share quarter-hour placement with tray drops", () => {
  const active = { item, mode: "move" as const, originMinutes: 9 * 60 + 15 };
  const target = calendarPointerTarget(active, point(9 * 60 + 30, 1), days, bounds);
  assert.equal(target.date, days[1]);
  assert.equal(target.time, "09:15");
  assert.deepEqual(droppedTimeRange((9 * 60 + 15) / 1440 * bounds.height, bounds.height, 60),
    ["09:15", "10:15"]);
  assert.equal(calendarKeyboardTarget("ArrowDown", item, days)?.time, "09:15");
  assert.equal(calendarKeyboardTarget("ArrowUp", item, days)?.time, "08:45");
  const offGrid = { ...item, startTime: "09:10" };
  assert.equal(calendarKeyboardTarget("ArrowDown", offGrid, days)?.time, "09:25");
  assert.equal(calendarPointerTarget({ ...active, item: offGrid },
    point(9 * 60 + 30), days, bounds).time, "09:25");
});

test("drag coordinates include scrolling and use measured grid height for moves and resizing", () => {
  const active = { item, mode: "end" as const, originMinutes: 10 * 60 };
  const scrolled = { ...bounds, top: bounds.top - HOUR_HEIGHT / 4 };
  const target = calendarPointerTarget(active, point(10 * 60), days, scrolled);
  assert.equal(target.amount, 15);
  const scaled = { ...bounds, height: CALENDAR_HEIGHT / 2 };
  assert.equal(calendarPointerTarget(active, point(10 * 60 + 15, 0, scaled), days, scaled).amount, 15);
  assert.equal(calendarGridPoint(point(9 * 60 + 15), bounds, 2).minutes, 9 * 60 + 15);
});

test("multi-day previews replace all segments of the dragged event without changing the graph", () => {
  const id = crypto.randomUUID();
  const graph = saveNativeEvent(createSeedGraph(days[0]), id, {
    name: "Overnight", description: "Keep notes", location: "Office", timeZone: "Europe/Vienna",
    startDate: days[0], endDate: days[1], startTime: "22:00", endTime: "02:00",
  }, true);
  const event = graph.nodes.find((node) => node.id === id);
  assert.ok(event?.type === "event");
  const items = graphCalendarItems(graph, [event], days);
  const preview = moveCalendarItem(graph, items[0], days[0], "23:00");
  const displayed = previewCalendarItems(items, { graph: preview, item: items[0], days });
  assert.deepEqual(displayed.map(({ startTime, endTime }) => [startTime, endTime]),
    [["23:00", "00:00"], ["00:00", "03:00"]]);
  assert.equal(event.properties.startTime, "22:00");
});
