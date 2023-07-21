import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
  constrainCaret,
  removeDuplicateSelections,
  expandSelection,
} from "../lib/text";
import { useKeyPressed } from "../lib/useKeyPressed";
import { useDarkMode } from "../lib/useDarkMode";

const effects = [sandstorm, dissolve, asciiMorph];

const CH = 22;
const CW = 11.077;

const pad = CH;

type Props = {
  page: Page;
};

export function MorphingLayout(props: Props) {
  const isDarkMode = useDarkMode();
  const ref = useRef<HTMLPreElement>(null);

  const [state, setState] = useState<{
    page: Page;
    selections: Selection[];
  }>({
    page: props.page,
    selections: [],
  });
  const { page, selections } = state;

  const [transitioning, setTransitioning] = useState<{ content: string }>();
  const [isDrawingBoxes, setDrawingBoxes] = useState(false);

  const altPressed = useKeyPressed("Alt");
  const metaPressed = useKeyPressed("Meta");
  const shiftPressed = useKeyPressed("Shift");

  const setSelections = useCallback(
    (
      action:
        | ((
            selection: Selection,
            index: number
          ) => Selection[] | Selection | undefined)
        | Selection[]
    ) => {
      setState((state) => {
        if (typeof action === "function") {
          return {
            ...state,
            selections: removeDuplicateSelections(
              state.selections
                ?.flatMap(action)
                .filter((s): s is Selection => !!s)
                .map(normalizeSelection)
            ),
          };
        } else {
          return {
            ...state,
            selections: action,
          };
        }
      });
    },
    [setState]
  );

  const addSelection = useCallback(
    (selection: Selection) => {
      setState((state) => {
        return {
          ...state,
          selections: [...state.selections, selection],
        };
      });
    },
    [setState]
  );

  const makeEdit = useCallback(
    (edit: (lines: string[]) => string[]) => {
      setState((state) => {
        return {
          ...state,
          page: {
            ...state.page,
            lines: edit(state.page.lines),
          },
        };
      });
    },
    [setState]
  );

  useEffectPrev(
    ([prevPage]: [Page]) => {
      let timely = true;

      if (prevPage && prevPage.slug !== props.page.slug) {
        setSelections([]);

        const randomEffect =
          effects[Math.floor(Math.random() * effects.length)];

        const frames = randomEffect(prevPage.lines, props.page.lines);

        const ms = 500 / frames.length;

        function tick() {
          if (!timely) return;

          if (frames.length === 0) {
            setTransitioning(undefined);
            setState({ page: props.page, selections: [] });
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
    [props.page, setSelections, setTransitioning]
  );

  const lines = page.lines;
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
    (selectMode: boolean, dr: number, dc: number) => {
      setSelections((selection) => {
        if (isDrawingBoxes) {
          setDrawingBoxes(false);
          if (dc === -1) {
            // When exiting box drawing mode & moving to the left,
            //  don't actually move, because of how the
            //  "box drawing mode caret" looks/works
            return {
              ...selection,
              boxDrawingMode: false,
            };
          }
        }

        return normalizeSelection({
          anchor: !selectMode ? undefined : selection.anchor ?? selection.caret,
          caret: constrainCaret({
            r: selection.caret.r + dr,
            c: selection.caret.c + dc,
          }),
        });
      });
    },
    [setSelections, isDrawingBoxes, setDrawingBoxes]
  );

  const moveCaretAndDrawBoxChar = useCallback(
    (clear: boolean, dr: number, dc: number) => {
      setDrawingBoxes(true);
      setSelections((selection) => {
        const { caret, boxDrawingMode } = selection;

        const newCaret = {
          r: Math.max(0, caret.r + dr),

          // When entering box drawing mode & moving to the right,
          //  don't actually move, because of how the
          //  "box drawing mode caret" looks/works
          c: !boxDrawingMode && dc === 1 ? caret.c : Math.max(0, caret.c + dc),
        };

        makeEdit((lines) => {
          return drawBoxCharAt(lines, newCaret, false);
        });

        return {
          caret: newCaret,
          boxDrawingMode: true,
        };
      });
    },
    [setSelections, setDrawingBoxes, maxCol, maxRow]
  );

  const expandOrAddExtraCaret = useCallback(
    (dr: number, dc: number) => {
      // We don't have to worry about exiting box drawing mode horizontally,
      //  because this operation is only vertical anyway
      setDrawingBoxes(false);

      setSelections((selection) => {
        if (selection.anchor && selection.anchor.r !== selection.caret.r) {
          return expandSelection(selection, dr, dc);
        } else if (dr === 0) {
          return {
            boxDrawingMode: false,
            caret: constrainCaret({
              r: selection.caret.r + dr,
              c: selection.caret.c + dc,
            }),
          };
        } else {
          // add extra caret below or above
          return [
            {
              ...selection,
              boxDrawingMode: false,
            },
            {
              boxDrawingMode: false,
              caret: {
                c: selection.caret.c,
                r: selection.caret.r + dr,
              },
              anchor: selection.anchor
                ? {
                    c: selection.anchor.c,
                    r: selection.anchor.r + dr,
                  }
                : undefined,
            },
          ];
        }
      });
    },
    [setSelections, moveCaret, isDrawingBoxes, setDrawingBoxes, maxCol, maxRow]
  );

  const clearCurrentSelections = useCallback(() => {
    setSelections((selection) => {
      makeEdit((lines) => {
        return clearSelection(lines, selection);
      });
      return { caret: selectionTopLeft(selection) };
    });
  }, [setSelections, makeEdit]);

  useEffect(() => {
    return onEvent(window, "keydown", (e) => {
      switch (e.key) {
        case "ArrowUp": {
          if (e.altKey) {
            expandOrAddExtraCaret(-1, 0);
          } else if (e.metaKey) {
            moveCaretAndDrawBoxChar(e.shiftKey, -1, 0);
          } else {
            moveCaret(e.shiftKey, -1, 0);
          }
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowDown": {
          if (e.altKey) {
            expandOrAddExtraCaret(1, 0);
          } else if (e.metaKey) {
            moveCaretAndDrawBoxChar(e.shiftKey, 1, 0);
          } else {
            moveCaret(e.shiftKey, 1, 0);
          }
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowRight": {
          if (e.altKey) {
            expandOrAddExtraCaret(0, 1);
          } else if (e.metaKey) {
            moveCaretAndDrawBoxChar(e.shiftKey, 0, 1);
          } else {
            moveCaret(e.shiftKey, 0, 1);
          }
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowLeft": {
          if (e.altKey) {
            expandOrAddExtraCaret(0, -1);
          } else if (e.metaKey) {
            moveCaretAndDrawBoxChar(e.shiftKey, 0, -1);
          } else {
            moveCaret(e.shiftKey, 0, -1);
          }
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "Backspace": {
          setSelections((selection) => {
            if (selection.anchor) {
              makeEdit((lines) => {
                return clearSelection(lines, selection);
              });
              return { caret: selectionTopLeft(selection) };
            } else {
              const back = {
                c: Math.max(0, selection.caret.c - 1),
                r: selection.caret.r,
              };
              makeEdit((lines) => {
                return setCharAt(lines, back, " ");
              });

              return { caret: back };
            }
          });

          e.preventDefault();
          e.stopPropagation();
          break;
        }
        // default: {
        //   console.log(e.key);
        // }
      }
    });
  }, [moveCaret, setSelections, makeEdit, expandOrAddExtraCaret]);

  useEffect(() => {
    return onEvent(window, "keypress", (e) => {
      setSelections((selection) => {
        const writeAt = selectionTopLeft(selection);
        makeEdit((lines) => {
          return setCharAt(lines, writeAt, e.key);
        });
        return {
          caret: { c: writeAt.c + 1, r: writeAt.r },
        };
      });

      e.preventDefault();
      e.stopPropagation();
    });
  }, [makeEdit, setSelections]);

  useEffect(() => {
    const copyText = (e: ClipboardEvent) => {
      if (selections.length === 0) {
        return;
      }

      const transfer = e.clipboardData!;
      transfer.items.clear();

      const all: string[] = [];

      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];
        const { top, left, height, width } = getSelectionBounds(selection);
        const textToCopy = lines
          .slice(top, top + height)
          .map((line) =>
            line.padEnd(left + width, " ").slice(left, left + width)
          )
          .join("\n");

        all.push(textToCopy);
      }

      transfer.items.add(all.join("\n\n"), "text/plain");
      transfer.items.add(JSON.stringify(all), "text/ascii-selections");

      e.preventDefault();
    };

    return callEach([
      onEvent(window, "copy", (e) => {
        copyText(e);
      }),
      onEvent(window, "cut", (e) => {
        copyText(e);
        clearCurrentSelections();
      }),
    ]);
  }, [lines, selections, clearCurrentSelections]);

  useEffect(() => {
    return onEvent(window, "paste", async (e) => {
      if (selections.length === 0) {
        return;
      }

      const transfer = e.clipboardData!;

      let copiedTexts = await new Promise<string[]>((resolve) => {
        // first, try to find ascii set of selections, if possible
        for (const item of transfer.items) {
          if (item.type === "text/ascii-selections") {
            item.getAsString((s) => {
              resolve(JSON.parse(s));
            });
            return;
          }
        }

        // otherwise, just get a single string
        resolve([transfer.getData("text/plain")]);
      });

      if (copiedTexts.length !== selections.length) {
        copiedTexts = selections.map(() => copiedTexts.join("\n\n"));
      }

      setSelections((selection, i) => {
        const pasteLines = copiedTexts[i].split("\n");
        const tl = selectionTopLeft(selection);
        makeEdit((lines) => {
          return pasteAt(lines, tl, pasteLines);
        });
        return {
          caret: {
            r: tl.r + pasteLines.length - 1,
            c: tl.c + pasteLines.slice(-1)[0].length,
          },
        };
      });

      e.preventDefault();
    });
  }, [makeEdit, selections, setSelections]);

  const drawBoxChar = useCallback(
    (caret: Caret, clear: boolean) => {
      makeEdit((lines) => {
        return drawBoxCharAt(lines, caret, clear);
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
          cursor: "text",
        }}
        onMouseDown={(e) => {
          const caret = getCaretPos(e);
          if (e.altKey) {
            addSelection({ caret, selecting: true });
          } else {
            setSelections([{ caret, selecting: true }]);
          }
          e.stopPropagation();
        }}
        onMouseMove={(e) => {
          const caret = getCaretPos(e);
          setSelections((selection) => {
            if (!selection.selecting) {
              return selection;
            } else {
              return normalizeSelection({
                anchor: selection.anchor ?? selection.caret,
                caret,
                selecting: true,
              });
            }
          });
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          const caret = getCaretPos(e);
          setSelections((selection) => {
            if (!selection.selecting) {
              return selection;
            } else {
              return normalizeSelection({
                anchor: selection.anchor ?? selection.caret,
                caret,
                selecting: false,
              });
            }
          });
          e.stopPropagation();
        }}
      >
        {selections.map((selection, i) => {
          const bounds = getSelectionBounds(selection);

          return (
            <Fragment key={i}>
              <div
                style={{
                  userSelect: "none",
                  pointerEvents: "none",
                  position: "absolute",
                  zIndex: 30,
                  height: CH,
                  width: selection.boxDrawingMode ? CW : 2,
                  background: selection.boxDrawingMode
                    ? "var(--selection)"
                    : "var(--text)",
                  top: selection.caret.r * CH + pad,
                  left: selection.caret.c * CW + pad,
                }}
              />

              {bounds && !selection.boxDrawingMode && (
                <div
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    zIndex: 25,
                    height: CH * bounds.height,
                    width: CW * bounds.width + 2,
                    background: "var(--selection)",
                    top: bounds.top * CH + pad,
                    left: bounds.left * CW + pad,
                  }}
                />
              )}
            </Fragment>
          );
        })}

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
