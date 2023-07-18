import {
  Fragment,
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

  const [page, setPage] = useState(props.page);

  const [transitioning, setTransitioning] = useState<{ content: string }>();
  const isSelecting = useRef(false);
  const isDrawingBoxes = useRef(false);
  const [selection, setSelection] = useState<Selection>();
  const [caret, setCaret] = useState<Caret>();

  const altPressed = useKeyPressed("Alt");
  const shiftPressed = useKeyPressed("Shift");

  const makeEdit = useCallback(
    (edit: (content: string) => string) => {
      setPage((page) => {
        return {
          ...page,
          content: edit(page.content),
        };
      });
    },
    [setPage]
  );

  const content = page.content;

  useEffectPrev(
    ([prevPage]: [Page]) => {
      let timely = true;

      if (prevPage && prevPage.slug !== props.page.slug) {
        setCaret(undefined);
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
            setPage(props.page);
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
    [props.page, setPage, setCaret, setSelection, setTransitioning]
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
    (update: (caret: Caret) => Caret) => {
      setSelection(undefined);
      setCaret((caret) => {
        if (!caret) {
          return;
        }

        const { c, r } = update(caret);
        return {
          c: Math.max(0, c),
          r: Math.max(0, r),
        };
      });
    },
    [setSelection, setCaret, maxCol, maxRow]
  );

  const doClearSelection = useCallback(
    (selection: Selection) => {
      setCaret(selectionTopLeft(selection));
      setSelection(undefined);
      makeEdit((content) => {
        return clearSelection(content.split("\n"), selection).join("\n");
      });
    },
    [setCaret, setSelection, makeEdit]
  );

  useEffect(() => {
    return onEvent(window, "keydown", (e) => {
      switch (e.key) {
        case "ArrowRight": {
          moveCaret((c) => {
            return { c: c.c + 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowUp": {
          moveCaret((c) => {
            return { c: c.c, r: c.r - 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowLeft": {
          moveCaret((c) => {
            return { c: c.c - 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowDown": {
          moveCaret((c) => {
            return { c: c.c, r: c.r + 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "Backspace": {
          if (selection) {
            doClearSelection(selection);
            e.preventDefault();
            e.stopPropagation();
          } else if (caret) {
            const back = { c: Math.max(0, caret.c - 1), r: caret.r };
            setCaret(back);
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
  }, [caret, moveCaret, selection, setCaret, setSelection, doClearSelection]);

  useEffect(() => {
    return onEvent(window, "keypress", (e) => {
      const writeAt = selection ? selectionTopLeft(selection) : caret;
      if (writeAt) {
        makeEdit((content) => {
          return setCharAt(content.split("\n"), writeAt, e.key).join("\n");
        });
        moveCaret((c) => {
          return { c: writeAt.c + 1, r: writeAt.r };
        });
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }, [makeEdit, caret, selection]);

  const selectionBounds = useMemo(() => {
    if (selection) {
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
      if (caret) {
        const pasteLines = e.clipboardData!.getData("text/plain").split("\n");
        makeEdit((content) => {
          return pasteAt(content.split("\n"), caret, pasteLines).join("\n");
        });
        setSelection(undefined);
        setCaret({
          r: caret.r + pasteLines.length - 1,
          c: caret.c + pasteLines.slice(-1)[0].length,
        });
        e.preventDefault();
      }
    });
  }, [makeEdit, caret, setCaret, setSelection]);

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
            setCaret(undefined);
            drawBoxChar(caret, e.shiftKey);
            e.stopPropagation();
          } else {
            setSelection({ start: caret, end: caret });
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
            setSelection((curr) => {
              if (!curr) return;

              return {
                start: curr.start,
                end: caret,
              };
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
            setCaret(caret);
            setSelection((curr) => {
              if (!curr) return;

              return {
                start: curr.start,
                end: caret,
              };
            });
            e.stopPropagation();
          }
        }}
      >
        {caret && (
          <div
            style={{
              userSelect: "none",
              pointerEvents: "none",
              position: "absolute",
              zIndex: 30,
              height: CH,
              width: 2,
              background: "#333",
              top: caret.r * CH + pad,
              left: caret.c * CW + pad,
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
              width: CW * selectionBounds.width,
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
