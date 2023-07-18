import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { sandstorm, dissolve, asciiMorph } from "./morph_effects";
import { Page } from "../lib/recipes";
import { onEvent } from "../lib/onEvent";

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

export function MorphingLayout({ page }: Props) {
  const ref = useRef<HTMLPreElement>(null);

  const [transitioning, setTransitioning] = useState<{ content: string }>();
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
    ([prevContent]) => {
      let timely = true;

      setCaret(undefined);

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
    [content, setCaret, setTransitioning]
  );

  const lines = content.split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  const maxCol = longest - 1;
  const maxRow = lines.length - 1;

  const repositionCaret = (e: { clientX: number; clientY: number }) => {
    const rect = ref.current.getBoundingClientRect();
    const c = Math.min(
      maxCol,
      Math.max(0, Math.round((e.clientX - rect.x - pad) / CW))
    );
    const r = Math.min(
      maxRow,
      Math.max(0, Math.floor((e.clientY - rect.y - pad) / CH))
    );
    setCaret({ c, r });
  };

  const updateCaret = (update: (caret: Caret) => Caret) => {
    setCaret((caret) => {
      if (!caret) return caret;
      const { c, r } = update(caret);
      return {
        c: Math.max(0, Math.min(maxCol, c)),
        r: Math.max(0, Math.min(maxRow, r)),
      };
    });
  };

  useEffect(() => {
    return onEvent(window, "keydown", (e) => {
      switch (e.key) {
        case "ArrowRight": {
          updateCaret((c) => {
            return { c: c.c + 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowUp": {
          updateCaret((c) => {
            return { c: c.c, r: c.r - 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowLeft": {
          updateCaret((c) => {
            return { c: c.c - 1, r: c.r };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowDown": {
          updateCaret((c) => {
            return { c: c.c, r: c.r + 1 };
          });
          e.preventDefault();
          e.stopPropagation();
          break;
        }
      }
    });
  }, []);

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
          userSelect: "text",
          padding: pad,
          flexGrow: 1,
          position: "relative",
          lineHeight: `${CH}px`,
          cursor: "text",
        }}
        onMouseDown={repositionCaret}
        onMouseUp={repositionCaret}
      >
        {caret && (
          <div
            style={{
              userSelect: "none",
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

        {transitioning
          ? transitioning.content
          : lines.map((line, i) => {
              line = line.padEnd(longest, " ");
              return (
                <div key={i} style={{ height: CH }}>
                  {tokenizeLine(line, page.links).map((token, i) => {
                    if (token.type === "text") {
                      return <span key={i}>{token.text}</span>;
                    } else {
                      const outgoing = !token.to.startsWith("/");

                      return (
                        <Link
                          key={i}
                          className={`link ${outgoing ? `outgoing` : ``}`}
                          href={token.to}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {token.text}
                        </Link>
                      );
                    }
                  })}
                </div>
              );
            })}
      </pre>
    </main>
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
