import { useEffect, useState } from "react";
import { callEach, onEvent } from "./onEvent";

export function useKeyPressed(key: string) {
  const [isPressed, setPressed] = useState(false);

  useEffect(() => {
    return callEach([
      onEvent(window, "keydown", (e) => {
        if (e.key === key) {
          setPressed(true);
        }
      }),
      onEvent(window, "keyup", (e) => {
        if (e.key === key) {
          setPressed(false);
        }
      }),
    ]);
  }, [key, setPressed]);

  return isPressed;
}
