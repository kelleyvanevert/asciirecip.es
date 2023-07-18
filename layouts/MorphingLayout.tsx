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

const effects = [sandstorm, dissolve, asciiMorph];

const CH = 22;
const CW = 11.077;

const pad = CH;

type Props = {
  page: Page;
};

type Caret = {
  r: number;
  c: number;
};

type Selection = {
  start: Caret;
  end: Caret;
};

type SelectionPart = {
  r: number;
  c: [number, number];
};

export function MorphingLayout({ page }: Props) {
  const ref = useRef<HTMLPreElement>(null);

  const [transitioning, setTransitioning] = useState<{ content: string }>();
  const isMouseDown = useRef(false);
  const [selection, setSelection] = useState<Selection>();
  const [caret, setCaret] = useState<Caret>();

  const [editStore, setEditStore] = useState<
    Record<
      string,
      {
        content: string;
      }
    >
  >({});

  const content = editStore[page.slug]?.content ?? page.content;

  useEffectPrev(
    ([prevContent]: [string]) => {
      let timely = true;

      setCaret(undefined);
      setSelection(undefined);

      if (prevContent) {
        const randomEffect =
          effects[Math.floor(Math.random() * effects.length)];

        const frames = randomEffect(
          prevContent.split("\n"),
          content.split("\n")
        );

        const ms = 500 / frames.length;

        function tick() {
          if (!timely) return;

          if (frames.length === 0) {
            setTransitioning(undefined);
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
    [content, setCaret, setSelection, setTransitioning]
  );

  const lines = content.split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  const maxCol = longest - 1;
  const maxRow = lines.length - 1;

  const getCaretPos = (e: { clientX: number; clientY: number }): Caret => {
    const rect = ref.current.getBoundingClientRect();
    const c = Math.min(
      maxCol,
      Math.max(0, Math.round((e.clientX - rect.x - pad) / CW))
    );
    const r = Math.min(
      maxRow,
      Math.max(0, Math.floor((e.clientY - rect.y - pad) / CH))
    );
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
          c: Math.max(0, Math.min(maxCol, c)),
          r: Math.max(0, Math.min(maxRow, r)),
        };
      });
    },
    [setSelection, setCaret, maxCol, maxRow]
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
      }
    });
  }, [moveCaret]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      console.log("copied", e.clipboardData);
      e.clipboardData.setData("text/plain", "sdf");
      e.preventDefault();
    };

    return callEach([
      onEvent(window, "copy", handler),
      onEvent(window, "copy", handler),
    ]);
  }, [selection]);

  const selectionParts = useMemo((): undefined | SelectionPart[] => {
    if (!selection) {
      return;
    }

    if (selection.start.r < selection.end.r) {
      return range(selection.start.r, selection.end.r + 1).map((r) => {
        return {
          r,
          c:
            r === selection.start.r
              ? [selection.start.c, maxCol + 1]
              : r < selection.end.r
              ? [0, maxCol + 1]
              : [0, selection.end.c],
        };
      });
    } else if (selection.start.r === selection.end.r) {
      return [
        {
          r: selection.start.r,
          c: [
            Math.min(selection.start.c, selection.end.c),
            Math.max(selection.start.c, selection.end.c),
          ],
        },
      ];
    } else if (selection.end.r < selection.start.r) {
      return range(selection.end.r, selection.start.r + 1).map((r) => {
        return {
          r,
          c:
            r === selection.end.r
              ? [selection.end.c, maxCol + 1]
              : r < selection.start.r
              ? [0, maxCol + 1]
              : [0, selection.start.c],
        };
      });
    } else {
      throw new Error("range calculation error");
    }
  }, [selection]);

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
          setSelection({ start: caret, end: caret });
          isMouseDown.current = true;
        }}
        onMouseMove={(e) => {
          if (!isMouseDown.current) return;

          setSelection((curr) => {
            if (!curr) return;

            return {
              start: curr.start,
              end: getCaretPos(e),
            };
          });
        }}
        onMouseUp={(e) => {
          isMouseDown.current = false;
          const caret = getCaretPos(e);
          setCaret(caret);
          setSelection((curr) => {
            if (!curr) return;

            return {
              start: curr.start,
              end: caret,
            };
          });
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

        {selectionParts && (
          <Fragment>
            {selectionParts.map((part, i) => {
              return (
                <div
                  key={i}
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    zIndex: 30,
                    height: CH,
                    width: CW * (part.c[1] - part.c[0]),
                    background: "#6a585822",
                    top: part.r * CH + pad,
                    left: part.c[0] * CW + pad,
                  }}
                />
              );
            })}
          </Fragment>
        )}

        {transitioning ? (
          transitioning.content
        ) : (
          <Fragment key={page.slug}>
            {lines.map((line, i) => {
              line = line.padEnd(longest, " ");
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
  const isMouseDown = useRef(false);

  return (
    <Link
      className="link"
      href={to}
      onMouseDown={(e) => {
        isMouseDown.current = true;
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        if (isMouseDown.current) {
          // selection can end here, in which case the propagation is alright, but don't propagate a click-event mouse-up
          e.stopPropagation();
        }
        isMouseDown.current = false;
      }}
    >
      {text}
    </Link>
  );
}

function tokenizeLine(line, links) {
  if (line.length === 0) {
    return [];
  }

  const found = Object.entries(links)
    .map(([text, to]) => {
      const i = line.indexOf(text);
      return i >= 0 && [i, text, to];
    })
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);

  if (found[0]) {
    const tokens = [];
    const [i, text, to] = found[0];
    if (i > 0) {
      tokens.push({ type: "text", text: line.slice(0, i) });
    }
    tokens.push({ type: "link", text, to });
    return [...tokens, ...tokenizeLine(line.slice(i + text.length), links)];
  }

  return [{ type: "text", text: line }];
}

function useEffectPrev(effect, deps) {
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
