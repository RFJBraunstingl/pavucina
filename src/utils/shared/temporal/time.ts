import { addDays, daysBetween } from "./date.ts";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MINUTES_PER_DAY = 1_440;

export function isTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function timeToMinutes(value: string) {
  if (!isTime(value)) throw new Error(`Invalid time: ${value}`);
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const minutes = ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function addDateTime(date: string, time: string, amount: number) {
  const total = timeToMinutes(time) + amount;
  return {
    date: addDays(date, Math.floor(total / MINUTES_PER_DAY)),
    time: minutesToTime(total),
  };
}

export function minutesBetweenDateTimes(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
) {
  return (
    daysBetween(startDate, endDate) * MINUTES_PER_DAY +
    timeToMinutes(endTime) -
    timeToMinutes(startTime)
  );
}
