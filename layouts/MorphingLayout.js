import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { prepareFrames } from "../lib/morph/prepareFrames";

export function MorphingLayout({ node }) {
  if (!node) {
    return <main>404</main>;
  }

  const [pieces, setPieces] = useState(formatContent(node));

  useEffectPrev(
    ([prevNode]) => {
      if (!prevNode) return;

      let timely = true;

      const frames = prepareFrames(
        prevNode.content.split("\n"),
        node.content.split("\n"),
        undefined,
        "tl"
      );

      const ms = 350 / frames.length;

      function tick() {
        if (!timely) return;

        if (frames.length === 0) {
          setPieces(formatContent(node));
        } else {
          const frame = frames.shift();
          setPieces(frame.join("\n"));
          // ref.current && (ref.current.innerHTML = frame.join("\n"));
          setTimeout(tick, ms);
        }
      }

      tick();

      return () => (timely = false);
    },
    [node]
  );

  return (
    <main>
      <style jsx global>{`
        @font-face {
          font-family: "DejaVu Sans Mono";
          src: local("DejaVu Sans Mono"),
            url("/DejaVuSansMono.ttf") format("truetype");
          font-weight: normal;
        }
        @font-face {
          font-family: "DejaVu Sans Mono";
          src: local("DejaVu Sans Mono Bold"),
            url("/DejaVuSansMono-Bold.ttf") format("truetype");
          font-weight: bold;
        }
        html,
        body,
        pre {
          margin: 0;
          padding: 0;
          font-family: "DejaVu Sans Mono";
          font-size: 14px;
          line-height: 128%;
          color: #333;
        }
        a {
          font-weight: bold;
          text-decoration: none;
          color: var(--color);
          margin: -2px;
          padding: 2px;
        }
      `}</style>
      <pre>
        <Head>
          <title>{node.data.title}</title>
        </Head>
        {pieces}
      </pre>
    </main>
  );
}

function useEffectPrev(effect, deps) {
  const prevDeps = useRef([]);
  useEffect(() => {
    const cleanup = effect(prevDeps.current);
    prevDeps.current = deps;
    return cleanup;
  }, deps);
}

function formatContent({ content, data: { links = [] } }) {
  let pieces = [content];

  for (const { text, to /*color = "black"*/ } of links) {
    const color = "black";
    let found;
    while (
      (found = pieces
        .map((piece, i) => {
          if (typeof piece !== "string") return;

          let j = piece.indexOf(text);
          if (j >= 0) {
            // console.log("promising", i, j, piece);
            return [i, j];
          }
        })
        .filter(Boolean)[0])
    ) {
      const [i, j] = found;
      const piece = pieces[i];
      pieces.splice(
        i,
        1,
        piece.slice(0, j),
        <Link href={to} passHref>
          <a style={{ color }}>{text}</a>
        </Link>,
        piece.slice(j + text.length)
      );
    }
  }
  return pieces;
}
