import { setTimeout as delay } from "node:timers/promises";
import { waitFor } from "./chrome-smoke-client.mjs";

export function calendarInteractions(browser) {
  const evaluate = (expression) => browser.evaluate(expression);
  const wait = (expression) => waitFor(() => evaluate(expression), expression);
  const click = async (selector) => {
    const position = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await mouse(position, true);
  };
  const field = (name, value) => evaluate(`document.querySelector('.event-dialog [name="${name}"]').value = ${JSON.stringify(value)}`);
  const key = async (key, code) => {
    await browser.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key,
      windowsVirtualKeyCode: code, text: key === "Enter" ? "\r" : "" });
    await browser.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
  };

  async function point(minute) {
    await evaluate(`(() => {
      const scroll = document.querySelector('.calendar-scroll');
      const body = document.querySelector('.calendar-days');
      scroll.scrollIntoView({ block: 'start' });
      scroll.scrollTop = Math.max(0, ${minute} / 1440 * body.offsetHeight - 100);
    })()`);
    await delay(150);
    return evaluate(`(() => {
      const body = document.querySelector('.calendar-days');
      const rect = body.getBoundingClientRect();
      const count = body.querySelectorAll('.calendar-day').length;
      const header = document.querySelector('.calendar-days-header');
      const index = [...header.children].indexOf(header.querySelector('.today')) - 1;
      return { x: rect.left + (index + 0.5) * rect.width / count, y: rect.top + ${minute} / 1440 * rect.height };
    })()`);
  }

  async function mouse(position, press = false) {
    await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...position });
    if (press) {
      await browser.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...position });
      await browser.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...position });
    }
  }

  async function touch(position, scroll = false) {
    await browser.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [position] });
    if (scroll) {
      for (let distance = 10; distance <= 70; distance += 10) {
        await browser.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...position, y: position.y - distance }] });
        await delay(20);
      }
    }
    await browser.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await delay(200);
  }

  const selectEvent = (name) => evaluate(`(() => {
    const button = [...document.querySelectorAll('.external-calendar-event button')]
      .find(button => button.querySelector('strong')?.textContent === ${JSON.stringify(name)});
    button.click();
  })()`);

  return { evaluate, wait, click, field, key, point, mouse, touch, selectEvent };
}
