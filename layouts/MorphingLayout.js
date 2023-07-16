import { Fragment, useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { sandstorm, dissolve, asciiMorph } from "./morph_effects";
import { RecipeEditor } from "./RecipeEditor";

const effects = [sandstorm, dissolve, asciiMorph];

export function MorphingLayout(props) {
  const initialNodeId = useRef(props.node.id);
  const [node, setNode] = useState(props.node);

  // an extra rerender, only if on the editor page, so that client-side local content is added
  useEffect(() => {
    setNode(mergeLocalEditorStateIntoNodeContent(props.node));
  }, [props.node]);

  const [pieces, setPieces] = useState(() => formatContent(node, false));

  useEffectPrev(
    ([prevNode]) => {
      if (!prevNode) return;

      // (a bit of a hack, but:)
      // we want to hide the initial client-side content load
      if (node.editor && initialNodeId.current === node.id) {
        setPieces(formatContent(node, true));
        // ..but only the first time ;)
        delete initialNodeId.current;
        return;
      }

      let timely = true;

      const randomEffect = effects[Math.floor(Math.random() * effects.length)];

      const frames = randomEffect(
        prevNode.content.split("\n"),
        node.content.split("\n"),
        undefined,
        "tl"
      );

      const ms = 350 / frames.length;

      function tick() {
        if (!timely) return;

        if (frames.length === 0) {
          setPieces(formatContent(node, true));
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
      <Head>
        <title>{node.data.title}</title>
      </Head>

      <pre style={{ margin: 20, position: "relative" }}>
        {typeof pieces === "string"
          ? pieces
          : Array.isArray(pieces)
          ? pieces.map((piece, i) => <Fragment key={i}>{piece}</Fragment>)
          : null}
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

function formatContent(
  { content, data: { title, links = {} }, editor = false },
  isClientSide
) {
  let editorPieces;

  if (editor && isClientSide) {
    const [editorContent, recipeContent] = content.split(EDITOR_DIVIDER);
    content = editorContent + EDITOR_DIVIDER;
    editorPieces = [
      "\n\n",
      <RecipeEditor recipeContent={recipeContent.replace(/^\n*/, "")} />,
      <a id="export" style={{ display: "none" }}>
        Export
      </a>,
    ];
  }

  let pieces = [content];

  links["« Home"] = "/";

  const editorFns = {
    getRecipeContent() {
      return `---
title: "${title}"
---
${content
  .split("\n")
  .slice(6)
  .map((line) => line.trimEnd())
  .join("\n")
  .trimEnd()}`;
    },
    copy() {
      const c = editorFns.getRecipeContent();
      console.log("Copied:");
      console.log(c);
      navigator.clipboard.writeText(c);
    },
    export() {
      const fileName = "recipe.txt";
      const fileContent = editorFns.getRecipeContent();
      const recipeFile = new Blob([fileContent], { type: "text/plain" });

      window.URL = window.URL || window.webkitURL;
      const btn = document.getElementById("export");

      btn.setAttribute("href", window.URL.createObjectURL(recipeFile));
      btn.setAttribute("download", fileName);

      btn.click();
    },
    exit() {},
  };

  for (const [text, to] of Object.entries(links)) {
    const color = "black";
    let found;
    while (
      (found = pieces
        .map((piece, i) => {
          if (typeof piece !== "string") return;

          let j = piece.indexOf(text);
          if (j >= 0) {
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
        to.startsWith("@") ? (
          <a
            href="#"
            className="link"
            style={{ color }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editorFns[to.slice(1)]?.();
            }}
          >
            {text}
          </a>
        ) : (
          <Link className="link" href={to} passHref style={{ color }}>
            {text}
          </Link>
        ),
        piece.slice(j + text.length)
      );
    }
  }

  if (editorPieces) {
    pieces.push(...editorPieces);
  }

  return pieces;
}

const EDITOR_DIVIDER = "==== ⇩ edit below this line ⇩ ============";

function loadEditorState() {
  if (localStorage.asciiEditorState) {
    try {
      return JSON.parse(localStorage.asciiEditorState);
    } catch {}
  }

  return {
    title: "My yummy recipe",
    content: "This is an example recipe:\n\n   Bla bla bla",
  };
}

export function saveEditorState(data) {
  localStorage.asciiEditorState = JSON.stringify(data);
}

function mergeLocalEditorStateIntoNodeContent(node) {
  if (node.editor) {
    const [editorContent] = node.content.split(EDITOR_DIVIDER);
    const { title, content } = loadEditorState();

    return {
      ...node,
      content:
        editorContent.replace(/^Title: (.*)/m, "Title: " + title) +
        EDITOR_DIVIDER +
        "\n\n" +
        content,
    };
  }

  return node;
}
