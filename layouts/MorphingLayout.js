import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { prepareFrames } from "../lib/morph/prepareFrames";

export function MorphingLayout({ node = node404 }) {
  const [pieces, setPieces] = useState(() => formatContent(node));

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

const node404 = {
  data: {
    title: "Not found",
    links: [{ text: "« Home", to: "/" }],
  },
  content: `
  « Home


    ╭────────────────────────────╮  
    │                            │  
    │   Sorry, this page was     │  
    │                            │  
    │     :N O T    F O U N D:   │  
    │                            │  
    ╰────────────────────────────╯  
`,
};
