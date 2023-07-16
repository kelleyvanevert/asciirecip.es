import { useCallback, useEffect, useRef, useState } from "react";
import { saveEditorState } from "./MorphingLayout";

export function RecipeEditor({ recipeContent }) {
  const textareaRef = useRef();
  const drawboxRef = useRef();
  const measureRef = useRef();

  const [value, _setValue] = useState(recipeContent);
  const [isDrawing, setDrawing] = useState();

  const saveAndSetValue = useCallback((value) => {
    saveEditorState();
    _setValue(value);
  });

  const getCharSize = () => {
    if (measureRef.current) {
      const { width, height } = measureRef.current.getBoundingClientRect();

      return {
        cw: width / 50,
        ch: height / 10,
      };
    }
  };

  useEffect(() => {
    const cleanup = [];

    cleanup.push(
      onEvent(window, "keydown", (e) => {
        if (
          (e.key === "z" || e.key === "c" || e.key === "v") &&
          (e.ctrlKey || e.metaKey)
        ) {
          // noop
        } else if (e.key === "Backspace") {
          const c = getCaret();
          if (typeof c.start === "number") {
            const len = c.end - c.start + 1;
            e.stopPropagation();
            e.preventDefault();
            _setValue((text) => {
              return (
                text.slice(0, c.start - 1) +
                Array(len).fill(" ").join("") +
                text.slice(c.end)
              );
            });
            setTimeout(() => {
              setCaret({ start: c.start - 1, end: c.start - 1 });
            }, 0);
          }
        } else if (e.key && e.key.length === 1) {
          const c = getCaret();
          if (typeof c.start === "number" && c.start === c.end) {
            e.stopPropagation();
            e.preventDefault();
            _setValue((text) => {
              return text.slice(0, c.start) + e.key + text.slice(c.start + 1);
            });
            setTimeout(() => {
              setCaret({ start: c.start + 1, end: c.end + 1 });
            }, 0);
          }
        } else if (e.key === "Control" || e.key === "Meta") {
          setDrawing({
            caret: getCaret(),
          });
        }
      })
    );

    cleanup.push(
      onEvent(window, "keyup", (e) => {
        if (e.key === "Control" || e.key === "Meta") {
          setDrawing((isDrawing) => {
            if (isDrawing) {
              setCaret(isDrawing.caret);
            }

            return undefined;
          });
        }
      })
    );

    const getPos = (e) => {
      const rect = drawboxRef.current.getBoundingClientRect();
      const { cw, ch } = getCharSize();
      const c = Math.floor((e.clientX - rect.x) / cw);
      const r = Math.floor((e.clientY - rect.y) / ch);
      return [r, c];
    };

    const drawChar = (e) => {
      const [r, c] = getPos(e);
      _setValue((value) => {
        return drawBoxCharAt(value, r, c, e.shiftKey);
      });
    };

    if (!isDrawing) {
      cleanup.push(
        onEvent(textareaRef.current, "mousedown", (e) => {
          const [r, c] = getPos(e);
          _setValue((value) => {
            const text = setCharAt(value, r, c, getCharAt(value, r, c, " "));
            return text;
          });
        })
      );
    } else if (isDrawing) {
      cleanup.push(
        onEvent(drawboxRef.current, "mousedown", (e) => {
          isDrawing.down = true;
          drawChar(e);
          e.stopPropagation();
        })
      );

      cleanup.push(
        onEvent(drawboxRef.current, "mousemove", (e) => {
          if (isDrawing.down) {
            drawChar(e);
            e.stopPropagation();
          }
        })
      );

      cleanup.push(
        onEvent(drawboxRef.current, "mouseup", (e) => {
          isDrawing.down = false;
          e.stopPropagation();
        })
      );
    }

    return cleanupAll(cleanup);
  }, [setDrawing, isDrawing]);

  const getCaret = () => {
    const elem = textareaRef.current;
    if (!elem) return;

    if ("selectionStart" in elem) {
      return { start: elem.selectionStart, end: elem.selectionEnd };
    }

    if ("selection" in document) {
      var val = elem.value.replace(/\r\n/g, "\n");

      var range = document.selection.createRange().duplicate();
      range.moveEnd("character", val.length);
      var start = range.text == "" ? val.length : val.lastIndexOf(range.text);

      range = document.selection.createRange().duplicate();
      range.moveStart("character", -val.length);
      var end = range.text.length;
      return { start: start, end: end };
    }

    return { start: undefined, end: undefined };
  };

  const setCaret = ({ start, end }) => {
    const elem = textareaRef.current;
    if (!elem) return;

    let val = elem.value;

    if (start < 0) start = 0;
    if (typeof end == "undefined") end = start;
    if (end > val.length) end = val.length;
    if (end < start) end = start;
    if (start > end) start = end;

    elem.focus();

    if ("selectionStart" in elem) {
      elem.selectionStart = start;
      elem.selectionEnd = end;
    }

    if ("selection" in document) {
      val = val.replace(/\r\n/g, "\n");
      const range = elem.createTextRange();
      range.collapse(true);
      range.moveStart("character", start);
      range.moveEnd("character", end - start);
      range.select();
    } else {
      start = undefined;
      end = undefined;
    }

    return { start: start, end: end };
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        <textarea
          id="editor_content"
          className={!isDrawing ? "active" : ""}
          ref={textareaRef}
          value={value}
          onChange={(e) => saveAndSetValue(e.target.value)}
        />

        <pre
          ref={drawboxRef}
          id="drawbox"
          className={isDrawing ? "active" : ""}
        />
      </div>

      <div
        ref={measureRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          background: "black",
          display: "inline-block",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
        <br />
        01234567890123456789012345678901234567890123456789
      </div>
    </>
  );
}

function onEvent(thing, name, handler) {
  thing.addEventListener(name, handler);
  return () => {
    thing.removeEventListener(name, handler);
  };
}

function cleanupAll(fns) {
  return () => {
    for (const fn of fns) {
      fn();
    }
  };
}

const getCaretForPos = (text, [r0, c0]) => {
  let offset = 0;
  const lines = text.split("\n");
  for (let r = 0; r < lines.length; r++) {
    if (r < r0) {
      offset += lines[r].length + 1;
    } else {
      offset += c0;
      return offset;
    }
  }
};

const getCharAt = (value, r, c, default_value) => {
  const lines = value.split("\n");
  if (r < 0 || c < 0) return;
  if (r >= lines.length) return default_value;
  const l = lines[r];
  if (c >= l.length) return default_value;
  return l[c];
};

const setCharAt = (value, r, c, v) => {
  const lines = value.split("\n");
  if (r < 0 || c < 0) return;
  while (r >= lines.length) lines.push("");
  let l = lines[r];
  if (c > l.length) l += Array(c - l.length + 1).join(" ");
  l = l.substring(0, c) + v + l.substring(c + 1);
  lines[r] = l;
  return lines.join("\n");
};

const drawBoxCharAt = (text, r, c, erase) => {
  text = setCharAt(text, r, c, erase ? " " : box);

  for (const p of [...neighbors([r, c]), [r, c]]) {
    const [r, c] = p;
    const curr = getCharAt(text, r, c, " ");
    if (isBoxChar(curr)) {
      const char =
        drawMap[
          neighbors([r, c])
            .map(([r, c, trbl]) => {
              // return isConnected(getCharAt(text, r, c, " "), trbl) ? "X" : "_";
              return isBoxChar(getCharAt(text, r, c, " ")) ? "X" : "_";
            })
            .join("")
        ];

      text = setCharAt(text, r, c, char);
    }
  }

  // return setCharAt(text, r, c, char);
  return text;
};

const box = "∘";
const tl = "╭";
const tr = "╮";
const bl = "╰";
const br = "╯";
const h = "─";
const v = "│";
const vr = "├";
const vl = "┤";
const hb = "┬";
const ht = "┴";
const c = "┼";
const b = "╵";
const t = "╷";
const r = "╴";
const l = "╶";
const boxChars = [box, tl, tr, bl, br, h, v, vr, vl, hb, ht, c, b, r, t, l];

// // map of symbol -> [trbl]-connected?
// const connected = {
//   [box]: "XXXX",
//   [tl]: "_XX_",
//   [tr]: "__XX",
//   [bl]: "XX__",
//   [br]: "X__X",
//   [h]: "_X_X",
//   [v]: "X_X_",
//   [vr]: "XXX_",
//   [vl]: "X_XX",
//   [hb]: "_XXX",
//   [ht]: "XX_X",
//   [c]: "XXXX",
//   [b]: "__X_",
//   [r]: "_X__",
//   [t]: "X___",
//   [l]: "___X",
// };

// const isConnected = (char, trbl) => {
//   return connected[char] && connected[char][trbl] === "X";
// };

// map of [trbl]-connected? -> symbol
const drawMap = {
  ____: box,
  ___X: r,
  __X_: t,
  __XX: tr,
  _X__: l,
  _X_X: h,
  _XX_: tl,
  _XXX: hb,
  X___: b,
  X__X: br,
  X_X_: v,
  X_XX: vl,
  XX__: bl,
  XX_X: ht,
  XXX_: vr,
  XXXX: c,
};

const neighbors = ([r, c]) => {
  return [
    [r - 1, c, 0], // t
    [r, c + 1, 1], // r
    [r + 1, c, 2], // b
    [r, c - 1, 3], // l
  ];
};

const isBoxChar = (char) => {
  return boxChars.includes(char);
};
