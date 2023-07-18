export function onEvent<K extends keyof WindowEventMap>(
  window: Window,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): void;

export function onEvent(
  window: Window,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void;

export function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): void;

export function onEvent(
  el: HTMLElement,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void;

export function onEvent(
  thing: Window | HTMLElement,
  type: string,
  listener: any,
  options?: any
) {
  thing.addEventListener(type, listener, options);
  return () => {
    thing.removeEventListener(type, listener, options);
  };
}
