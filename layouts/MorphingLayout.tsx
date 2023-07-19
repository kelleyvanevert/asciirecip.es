import {
  Fragment,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";
import Link from "next/link";

import { sandstorm, dissolve, asciiMorph } from "./morph_effects";
import { Page } from "../lib/recipes";
import { callEach, onEvent } from "../lib/onEvent";
import {
  Caret,
  Selection,
  pasteAt,
  setCharAt,
  selectionTopLeft,
  getSelectionBounds,
  clearSelection,
  drawBoxCharAt,
  normalizeSelection,
} from "../lib/text";
import { useKeyPressed } from "../lib/useKeyPressed";

const effects = [sandstorm, dissolve, asciiMorph];

const CH = 22;
const CW = 11.077;

const pad = CH;

type Props = {
  page: Page;
};

export function MorphingLayout(props: Props) {
  const ref = useRef<HTMLPreElement>(null);

  const [state, setState] = useState<{
    page: Page;
    selection?: Selection;
  }>({
    page: props.page,
  });
  const { page, selection } = state;

  const [transitioning, setTransitioning] = useState<{ content: string }>();
  const isSelecting = useRef(false);
  const isDrawingBoxes = useRef(false);

  const altPressed = useKeyPressed("Alt");
  const shiftPressed = useKeyPressed("Shift");

  const setSelection = useCallback(
    (action: SetStateAction<Selection | undefined>) => {
      setState((state) => {
        if (typeof action === "function") {
          return {
            ...state,
            selection: action(state.selection),
          };
        } else {
          return {
            ...state,
            selection: action,
          };
        }
      });
    },
    [setState]
  );

  const makeEdit = useCallback(
    (edit: (content: string) => string) => {
      setState((state) => {
        return {
          ...state,
          page: {
            ...state.page,
            content: edit(state.page.content),
          },
        };
      });
    },
    [setState]
  );

  const content = page.content;

  useEffectPrev(
    ([prevPage]: [Page]) => {
      let timely = true;

      if (prevPage && prevPage.slug !== props.page.slug) {
        setSelection(undefined);

        const randomEffect =
          effects[Math.floor(Math.random() * effects.length)];

        const frames = randomEffect(
          prevPage.content.split("\n"),
          props.page.content.split("\n")
        );

        const ms = 500 / frames.length;

        function tick() {
          if (!timely) return;

          if (frames.length === 0) {
            setTransitioning(undefined);
            setState({ page: props.page });
          } else {
            const frame = frames.shift();
            setTransitioning({ content: frame.join("\n") });
            setTimeout(tick, ms);
          }
        }

        tick();
      }

      return () => {
        timely = false;
      };
    },
    [props.page, setSelection, setTransitioning]
  );

  const lines = useMemo(() => content.split("\n"), [content]);
  const longest = Math.max(...lines.map((line) => line.length));
  const maxCol = longest - 1;
  const maxRow = lines.length - 1;

  const getCaretPos = (e: { clientX: number; clientY: number }): Caret => {
    const rect = ref.current!.getBoundingClientRect();
    const c = Math.max(0, Math.round((e.clientX - rect.x - pad) / CW));
    const r = Math.max(0, Math.floor((e.clientY - rect.y - pad) / CH));
    return { c, r };
  };

  const moveCaret = useCallback(
    (selectMode: boolean, update: (caret: Caret) => Caret) => {
      setSelection((selection) => {
        if (!selection) {
          return;
        }

        return normalizeSelection({
          anchor: !selectMode ? undefined : selection.anchor ?? selection.caret,
          caret: update(selection.caret),
        });
      });
    },
    [setSelection, maxCol, maxRow]
  );

  const doClearSelection = useCallback(
    (selection: Selection) => {
      setSelection({ caret: selectionTopLeft(selection) });
      makeEdit((content) => {
        return clearSelection(content.split("\n"), selection).join("\n");
      });
    },
    [setSelection, makeEdit]
  );

  useEffect(() => {
    return onEvent(window, "keydown", (e) => {
      switch (e.key) {
        case "ArrowRight": {
          moveCaret(e.shiftKey, (c) => {
            return { c: c.c + 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowUp": {
          moveCaret(e.shiftKey, (c) => {
            return { c: c.c, r: c.r - 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowLeft": {
          moveCaret(e.shiftKey, (c) => {
            return { c: c.c - 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowDown": {
          moveCaret(e.shiftKey, (c) => {
            return { c: c.c, r: c.r + 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "Backspace": {
          if (!selection) return;

          if (selection.anchor) {
            doClearSelection(selection);
            e.preventDefault();
            e.stopPropagation();
          } else {
            const back = {
              c: Math.max(0, selection.caret.c - 1),
              r: selection.caret.r,
            };
            setSelection({ caret: back });
            makeEdit((content) => {
              return setCharAt(content.split("\n"), back, " ").join("\n");
            });
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }
        // default: {
        //   console.log(e.key);
        // }
      }
    });
  }, [selection, moveCaret, selection, setSelection, doClearSelection]);

  useEffect(() => {
    return onEvent(window, "keypress", (e) => {
      if (selection) {
        const writeAt = selectionTopLeft(selection);
        makeEdit((content) => {
          return setCharAt(content.split("\n"), writeAt, e.key).join("\n");
        });
        setSelection({
          caret: { c: writeAt.c + 1, r: writeAt.r },
        });
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }, [makeEdit, selection, setSelection]);

  const selectionBounds = useMemo(() => {
    if (selection?.anchor) {
      return getSelectionBounds(selection);
    }
  }, [selection]);

  useEffect(() => {
    const copyText = (e: ClipboardEvent) => {
      if (!selection) {
        return;
      }

      const { top, left, height, width } = getSelectionBounds(selection);
      const textToCopy = lines
        .slice(top, top + height)
        .map((line) => line.padEnd(left + width, " ").slice(left, left + width))
        .join("\n");

      e.clipboardData!.setData("text/plain", textToCopy);
      e.preventDefault();
      return;
    };

    return callEach([
      onEvent(window, "copy", (e) => {
        copyText(e);
      }),
      onEvent(window, "cut", (e) => {
        copyText(e);
        if (selection) {
          doClearSelection(selection);
        }
      }),
    ]);
  }, [selection, lines]);

  useEffect(() => {
    return onEvent(window, "paste", (e) => {
      if (selection) {
        const pasteLines = e.clipboardData!.getData("text/plain").split("\n");
        const tl = selectionTopLeft(selection);
        makeEdit((content) => {
          return pasteAt(content.split("\n"), tl, pasteLines).join("\n");
        });
        setSelection({
          caret: {
            r: tl.r + pasteLines.length - 1,
            c: tl.c + pasteLines.slice(-1)[0].length,
          },
        });
        e.preventDefault();
      }
    });
  }, [makeEdit, selection, setSelection]);

  const drawBoxChar = useCallback(
    (caret: Caret, clear: boolean) => {
      makeEdit((content) => {
        return drawBoxCharAt(content.split("\n"), caret, clear).join("\n");
      });
    },
    [makeEdit]
  );

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        userSelect: "none",
      }}
    >
      <Head>
        <title>{page.title}</title>
      </Head>

      <pre
        ref={ref}
        style={{
          userSelect: "none",
          padding: pad,
          flexGrow: 1,
          position: "relative",
          lineHeight: `${CH}px`,
          cursor: altPressed ? (shiftPressed ? "not-allowed" : "cell") : "text",
        }}
        onMouseDown={(e) => {
          const caret = getCaretPos(e);
          if (e.altKey) {
            isDrawingBoxes.current = true;
            setSelection(undefined);
            drawBoxChar(caret, e.shiftKey);
            e.stopPropagation();
          } else {
            setSelection({ caret });
            isSelecting.current = true;
            e.stopPropagation();
          }
        }}
        onMouseMove={(e) => {
          const caret = getCaretPos(e);
          if (isDrawingBoxes.current) {
            drawBoxChar(caret, e.shiftKey);
            e.stopPropagation();
          } else if (isSelecting.current) {
            setSelection((selection) => {
              if (!selection) return;

              return normalizeSelection({
                anchor: selection.anchor ?? selection.caret,
                caret,
              });
            });
            e.stopPropagation();
          }
        }}
        onMouseUp={(e) => {
          if (isDrawingBoxes.current) {
            isDrawingBoxes.current = false;
            e.stopPropagation();
          } else if (isSelecting.current) {
            isSelecting.current = false;
            const caret = getCaretPos(e);
            setSelection((selection) => {
              if (!selection) return;

              return normalizeSelection({
                anchor: selection.anchor ?? selection.caret,
                caret,
              });
            });
            e.stopPropagation();
          }
        }}
      >
        {selection && (
          <div
            style={{
              userSelect: "none",
              pointerEvents: "none",
              position: "absolute",
              zIndex: 30,
              height: CH,
              width: 2,
              background: "#333",
              top: selection.caret.r * CH + pad,
              left: selection.caret.c * CW + pad,
            }}
          />
        )}

        {selectionBounds && (
          <div
            style={{
              userSelect: "none",
              pointerEvents: "none",
              position: "absolute",
              zIndex: 30,
              height: CH * selectionBounds.height,
              width: CW * selectionBounds.width + 2,
              background: "#6a585822",
              top: selectionBounds.top * CH + pad,
              left: selectionBounds.left * CW + pad,
            }}
          />
        )}

        {transitioning ? (
          transitioning.content
        ) : (
          <Fragment key={page.slug}>
            {lines.map((line, i) => {
              return (
                <div key={i} style={{ height: CH }}>
                  {tokenizeLine(line, page.links).map((token, i) => {
                    if (token.type === "text") {
                      return <span key={i}>{token.text}</span>;
                    } else {
                      const outgoing = !token.to.startsWith("/");

                      return <LinkEl key={i} to={token.to} text={token.text} />;
                    }
                  })}
                </div>
              );
            })}
          </Fragment>
        )}
      </pre>
    </main>
  );
}

function LinkEl({ to = "", text = "" }) {
  const isClicking = useRef(false);

  return (
    <Link
      className="link"
      href={to}
      onMouseDown={(e) => {
        isClicking.current = true;
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        if (isClicking.current) {
          // selection can end here, in which case the propagation is alright, but don't propagate a click-event mouse-up
          e.stopPropagation();
        }
        isClicking.current = false;
      }}
    >
      {text}
    </Link>
  );
}

type Token =
  | { type: "text"; text: string }
  | { type: "link"; text: string; to: string };

function tokenizeLine(line: string, links: Record<string, string>): Token[] {
  if (line.length === 0) {
    return [];
  }

  const found = Object.entries(links)
    .map(([text, to]) => {
      const i = line.indexOf(text);
      return i >= 0 && ([i, text, to] as const);
    })
    .filter((b): b is [number, string, string] => !!b)
    .sort((a, b) => a[0] - b[0]);

  if (found[0]) {
    const tokens: Token[] = [];
    const [i, text, to] = found[0];
    if (i > 0) {
      tokens.push({ type: "text", text: line.slice(0, i) });
    }
    tokens.push({ type: "link", text, to });
    return [...tokens, ...tokenizeLine(line.slice(i + text.length), links)];
  }

  return [{ type: "text", text: line }];
}

function useEffectPrev(effect: any, deps: any) {
  const prevDeps = useRef([]);
  useEffect(() => {
    const cleanup = effect(prevDeps.current);
    prevDeps.current = deps;
    return cleanup;
  }, deps);
}

function range(startIncl: number, endExcl: number) {
  return Array(endExcl - startIncl)
    .fill(null)
    .map((_, i) => {
      return startIncl + i;
    });
}
