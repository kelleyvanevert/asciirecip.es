import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { sandstorm, dissolve, asciiMorph, forModal } from "./morph_effects";
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
  Bounds,
  editWithinBounds,
} from "../lib/text";
import { useKeyPressed } from "../lib/useKeyPressed";
import { useDarkMode } from "../lib/useDarkMode";
import { blur, padAround } from "./morph_effects/lib";

const effects = [sandstorm, dissolve, asciiMorph];

const CH = 22;
const CW = 11.077;

const pad = CH;

type Props = {
  page: Page;
};

type Modal = Pick<Page, "lines" | "links"> & {
  allowEditing?: Bounds;
  startWithSelections?: Selection[];
};

function createSaveModal({
  currentPage,
  onClose,
}: {
  currentPage: Page;
  onClose: () => void;
}): Modal {
  const lines = padAround(
    `
╭──────────────────────────────────────╮
│ ░░░░░░░░░░ Save changes? ░░░░░░░░░░░ │
├──────────────────────────────────────┤
│                                      │
│ This will save all of your local     │
│  changes (also of other recipes).    │
│                                      │
│              Continue?               │
│                                      │
│        [SAVE]        [CANCEL]        │
╰──────────────────────────────────────╯`
      .trim()
      .split("\n")
  );

  return {
    lines: pasteAt(blur(currentPage.lines), { c: 13, r: 8 }, lines),
    links: {
      "[CANCEL]": onClose,
      "[SAVE]"() {
        // closeModal();
        console.log("TODO save");
      },
    },
  };
}

function addNewPageModal({
  currentPage,
  newPageTitle,
  onClose,
}: {
  currentPage: Page;
  newPageTitle: string;
  onClose: () => void;
}): Modal {
  const lines = pasteAt(
    padAround(
      `
╭──────────────────────────────────────╮
│ ░░░░░░░░░░░ Add new page ░░░░░░░░░░░ │
├──────────────────────────────────────┤
│                                      │
│ Add this new page?                   │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│          [ADD]       [CANCEL]        │
╰──────────────────────────────────────╯`
        .trim()
        .split("\n")
    ),
    { c: 5, r: 6 },
    [newPageTitle]
  );

  return {
    lines: pasteAt(blur(currentPage.lines), { c: 13, r: 8 }, lines),
    links: {
      ["[ADD]"]: onClose,
      ["[CANCEL]"]: onClose,
    },
    allowEditing: {
      cmin: 13 + 5,
      rmin: 8 + 6,
      cmax: 13 + 37,
      rmax: 8 + 6,
    },
    startWithSelections: [
      {
        caret: {
          r: 8 + 6,
          c: 13 + 5 + newPageTitle.length,
        },
      },
    ],
  };
}

function addLinkModal({
  currentPage,
  onClose,
}: {
  currentPage: Page;
  onClose: () => void;
}): Modal {
  const lines = padAround(
    `
╭──────────────────────────────────────────────────╮
│ ░░░░░░░░░░░░░░░░░░░ Add link ░░░░░░░░░░░░░░░░░░░ │
├──────────────────────────────────────────────────┤
│                                                  │
│ Where should this phrase link to?                │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│                [ADD]       [CANCEL]              │
╰──────────────────────────────────────────────────╯`
      .trim()
      .split("\n")
  );

  return {
    lines: pasteAt(blur(currentPage.lines), { c: 13, r: 8 }, lines),
    links: {
      ["[ADD]"]: onClose,
      ["[CANCEL]"]: onClose,
    },
    allowEditing: {
      cmin: 13 + 5,
      rmin: 8 + 6,
      cmax: 13 + 37 + 12,
      rmax: 8 + 6,
    },
    startWithSelections: [
      {
        caret: {
          r: 8 + 6,
          c: 13 + 5,
        },
      },
    ],
  };
}

export function MorphingLayout(props: Props) {
  useDarkMode();

  useEffect(() => {
    (window as any).debug = {
      disableTransitions: false,
    };
    console.log("See window.debug");
  }, []);

  const ref = useRef<HTMLPreElement>(null);

  const [state, setState] = useState<{
    page: Page;
    selections: Selection[];
    modal?: Modal;
    modalSelections: Selection[];
  }>({
    page: props.page,
    selections: [],
    modalSelections: [],
  });
  const { page, modal } = state;
  const selections = modal ? state.modalSelections : state.selections;
  const editBounds = modal?.allowEditing ?? { rmin: 3, cmin: 0 };

  const [transitioning, setTransitioning] = useState<{
    i: number;
    duration: number;
    frames: string[];
  }>();
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
        if (state.modal) {
          if (!state.modal.allowEditing) {
            return state;
          } else if (typeof action === "function") {
            return {
              ...state,
              modalSelections: removeDuplicateSelections(
                state.modalSelections
                  ?.flatMap(action)
                  .filter((s): s is Selection => !!s)
                  .map((s) => normalizeSelection(s, state.modal!.allowEditing))
              ),
            };
          } else {
            return {
              ...state,
              modalSelections: action,
            };
          }
        }

        if (typeof action === "function") {
          return {
            ...state,
            selections: removeDuplicateSelections(
              state.selections
                ?.flatMap(action)
                .filter((s): s is Selection => !!s)
                .map((s) => normalizeSelection(s, { rmin: 3 }))
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
        if (state.modal) {
          if (!state.modal.allowEditing) {
            return state;
          } else {
            // enforce?
            return {
              ...state,
              modal: {
                ...state.modal,
                lines: editWithinBounds(editBounds, edit, state.modal.lines),
              },
            };
          }
        }

        return {
          ...state,
          page: {
            ...state.page,
            lines: editWithinBounds(editBounds, edit, state.page.lines),
          },
        };
      });
    },
    [setState, editBounds]
  );

  useEffectPrev(
    ([prevPage]: [Page]) => {
      if (prevPage && prevPage.slug !== props.page.slug) {
        // const randomEffect = forModal;
        const randomEffect =
          effects[Math.floor(Math.random() * effects.length)];

        const { frames, duration } = randomEffect(
          prevPage.lines,
          props.page.lines
        );

        if (!(window as any).debug?.disableTransitions) {
          setTransitioning({
            i: 0,
            duration,
            frames: frames.map((frame) => frame.join("\n")),
          });
        }

        setState({ page: props.page, selections: [], modalSelections: [] });
      }
    },
    [props.page, setState, setTransitioning]
  );

  useEffect(() => {
    if (!transitioning) return;

    const ms = transitioning.duration / transitioning.frames.length;

    const t = setTimeout(() => {
      setTransitioning((tr) => {
        if (!tr) return;

        const i = tr.i + 1;
        if (i >= tr.frames.length) return;

        return { ...tr, i };
      });
    }, ms);

    return () => clearTimeout(t);
  }, [transitioning?.i]);

  const closeModal = useCallback(() => {
    setState((state) => {
      if (!state.modal) return state;

      const { frames, duration } = forModal(
        state.modal.lines,
        state.page.lines
      );

      if (!(window as any).debug?.disableTransitions) {
        setTransitioning({
          i: 0,
          duration,
          frames: frames.map((frame) => frame.join("\n")),
        });
      }

      return {
        ...state,
        modal: undefined,
      };
    });
  }, [setState, setTransitioning]);

  const openModal = useCallback(
    (modal: Modal) => {
      setState((state) => {
        if (state.modal) return state;

        const { frames, duration } = forModal(state.page.lines, modal.lines);

        if (!(window as any).debug?.disableTransitions) {
          setTransitioning({
            i: 0,
            duration,
            frames: frames.map((frame) => frame.join("\n")),
          });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });

        return {
          ...state,
          modal,
          modalSelections: modal.startWithSelections ?? [],
        };
      });
    },
    [setState, closeModal, setTransitioning]
  );

  const lines = modal?.lines ?? page.lines;
  const longest = Math.max(...lines.map((line) => line.length));
  const maxCol = longest - 1;
  const maxRow = lines.length - 1;
  const links = modal ? modal.links : page.links;

  const getCaretPos = (e: { clientX: number; clientY: number }): Caret => {
    const rect = ref.current!.getBoundingClientRect();
    return constrainCaret(
      {
        r: Math.floor((e.clientY - rect.y - pad) / CH),
        c: Math.round((e.clientX - rect.x - pad) / CW),
      },
      editBounds
    );
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
        case "s": {
          if (e.metaKey) {
            openModal(
              createSaveModal({ currentPage: page, onClose: closeModal })
            );
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }
        case "a": {
          if (e.metaKey) {
            if (selections.length === 1) {
              const { top, left, height, width } = getSelectionBounds(
                selections[0]
              );
              if (height === 1 && width > 0) {
                const newPageTitle = lines[top]
                  .slice(left, left + width)
                  .trim();

                if (newPageTitle.length > 0) {
                  openModal(
                    addNewPageModal({
                      currentPage: page,
                      newPageTitle,
                      onClose: closeModal,
                    })
                  );
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }
          }
          break;
        }
        case "l": {
          if (e.metaKey && e.shiftKey) {
            if (selections.length === 1) {
              const { height, width } = getSelectionBounds(selections[0]);
              if (height === 1 && width > 0) {
                openModal(
                  addLinkModal({
                    currentPage: page,
                    onClose: closeModal,
                  })
                );
              }
            }
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }
        case "Escape": {
          closeModal();
          e.preventDefault();
          e.stopPropagation();
        }
        // default: {
        //   console.log(e.key);
        // }
      }
    });
  }, [
    page,
    modal,
    moveCaret,
    selections,
    setSelections,
    makeEdit,
    openModal,
    closeModal,
    expandOrAddExtraCaret,
  ]);

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
  }, [makeEdit, setSelections, editBounds]);

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
          if (e.altKey && !modal) {
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
          transitioning.frames[transitioning.i]
        ) : (
          <Fragment key={page.slug}>
            {lines.map((line, i) => {
              return (
                <div key={i} style={{ height: CH }}>
                  {tokenizeLine(line, links).map((token, i) => {
                    if (token.type === "text") {
                      return <span key={i}>{token.text}</span>;
                    } else {
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

function LinkEl({ to, text }: { text: string; to: string | (() => void) }) {
  const isClicking = useRef(false);

  return (
    <Link
      className="link"
      href={typeof to === "string" ? to : ""}
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
      onClick={(e) => {
        if (typeof to === "function") {
          e.preventDefault();
          e.stopPropagation();
          to();
        }
      }}
    >
      {text}
    </Link>
  );
}

type Token =
  | { type: "text"; text: string }
  | { type: "link"; text: string; to: string | (() => void) };

function tokenizeLine(
  line: string,
  links: Record<string, string | (() => void)>
): Token[] {
  if (line.length === 0) {
    return [];
  }

  const foundLink = Object.entries(links)
    .map(([text, to]) => {
      const i = line.indexOf(text);
      return i >= 0 && ([i, text, to] as const);
    })
    .filter((b): b is [number, string, string] => !!b)
    .sort((a, b) => a[0] - b[0]);

  if (foundLink[0]) {
    const tokens: Token[] = [];
    const [i, text, to] = foundLink[0];
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
