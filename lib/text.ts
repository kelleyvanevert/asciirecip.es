export type Caret = {
  r: number;
  c: number;
};

export type Bounds = {
  rmin?: number;
  rmax?: number;
  cmin?: number;
  cmax?: number;
};

export type Selection = {
  anchor?: Caret;
  caret: Caret;
  selecting?: boolean;
  boxDrawingMode?: boolean;
};

export function editWithinBounds(
  { rmin, rmax, cmin, cmax }: Bounds,
  edit: (lines: string[]) => string[],
  orig: string[]
) {
  let edited = edit(orig);

  if (typeof rmin === "number") {
    edited = [...orig.slice(0, rmin), ...edited.slice(rmin)];
  }

  if (typeof rmax === "number") {
    edited = [...edited.slice(0, rmax + 1), ...orig.slice(rmax + 1)];
  }

  if (typeof cmin === "number") {
    edited = edited.map((editedLine, r) => {
      return orig[r].slice(0, cmin).padEnd(cmin, " ") + editedLine.slice(cmin);
    });
  }

  if (typeof cmax === "number") {
    edited = edited.map((editedLine, r) => {
      return editedLine.slice(0, cmax).padEnd(cmax, " ") + orig[r].slice(cmax);
    });
  }

  return edited;
}

export function inBounds({ c, r }: Caret, bounds: Bounds = {}) {
  return (
    c >= (bounds.cmin ?? -Infinity) &&
    c <= (bounds.cmax ?? Infinity) &&
    r >= (bounds.rmin ?? -Infinity) &&
    r <= (bounds.rmax ?? Infinity)
  );
}

export function constrainCaret(
  { c, r }: Caret,
  bounds: Bounds = { rmin: 0, cmin: 0 }
) {
  return {
    c: Math.min(bounds.cmax ?? Infinity, Math.max(bounds.cmin ?? -Infinity, c)),
    r: Math.min(bounds.rmax ?? Infinity, Math.max(bounds.rmin ?? -Infinity, r)),
  };
}

export function removeDuplicateSelections(
  selections: Selection[]
): Selection[] {
  const keys: Record<string, boolean> = {};

  return selections.filter((selection) => {
    const key = [
      selection.caret.r,
      selection.caret.c,
      selection.boxDrawingMode ? "B" : "|",
      selection.anchor ? "A" : "_",
      selection.selecting ? "S" : "_",
    ].join("_");

    if (keys[key]) {
      return false;
    } else {
      keys[key] = true;
      return true;
    }
  });
}

export function normalizeSelection(
  selection: Selection,
  bounds?: Bounds
): Selection {
  const caret = constrainCaret(selection.caret, bounds);
  let anchor = selection.anchor && constrainCaret(selection.anchor, bounds);
  if (anchor && anchor.c === caret.c && anchor.r === caret.r) {
    anchor = undefined;
  }

  return {
    anchor,
    caret,
    selecting: selection.selecting,
    boxDrawingMode: selection.boxDrawingMode || undefined,
  };
}

export function expandSelection(
  selection: Selection,
  dr: number,
  dc: number
): Selection {
  if (!selection.anchor) {
    console.warn("Cannot expand selection without anchor");
    return selection;
  }

  if (
    (dr === -1 && selection.anchor.r < selection.caret.r) ||
    (dr === 1 && selection.anchor.r >= selection.caret.r) ||
    (dc === -1 && selection.anchor.c < selection.caret.c) ||
    (dc === 1 && selection.anchor.c >= selection.caret.c)
  ) {
    // move the anchor if it is in the direction of the expansion
    return {
      ...selection,
      anchor: {
        r: selection.anchor.r + dr,
        c: selection.anchor.c + dc,
      },
    };
  } else {
    // otherwise, move the caret
    return {
      ...selection,
      caret: {
        r: selection.caret.r + dr,
        c: selection.caret.c + dc,
      },
    };
  }
}

export function selectionTopLeft(selection: Selection): Caret {
  const { top, left } = getSelectionBounds(selection);
  return {
    r: top,
    c: left,
  };
}

export function getSelectionBounds(selection: Selection) {
  const anchor = selection.anchor ?? selection.caret;

  const left = Math.min(anchor.c, selection.caret.c);
  const top = Math.min(anchor.r, selection.caret.r);

  // haha, wow, this assymetry seems to be a logical thing :P
  const width = Math.abs(anchor.c - selection.caret.c);
  const height = Math.abs(anchor.r - selection.caret.r) + 1;

  return {
    left,
    top,
    width,
    height,
  };
}

export function clearSelection(lines: string[], selection: Selection) {
  const { top, left, width, height } = getSelectionBounds(selection);
  const emptySquare = Array(height).fill("".padEnd(width, " "));
  return pasteAt(lines, { r: top, c: left }, emptySquare);
}

export function setCharAt(lines: string[], caret: Caret, ch: string) {
  return pasteAt(lines, caret, [ch[0]]);
}

export function getCharAt(
  lines: string[],
  caret: Caret,
  defaultValue?: string
) {
  return (lines[caret.r] ?? "")[caret.c] ?? defaultValue;
}

export function pasteAt(lines: string[], caret: Caret, paste: string[]) {
  // make sure enough target lines exist
  const rowMax = caret.r + paste.length;
  while (lines.length <= rowMax) {
    lines.push("");
  }

  return lines.map((line, r) => {
    if (r < caret.r) {
      return line;
    } else if (r >= caret.r + paste.length) {
      return line;
    } else {
      return (
        line.padEnd(caret.c, " ").slice(0, caret.c) +
        paste[r - caret.r] +
        line.slice(caret.c + paste[r - caret.r].length)
      );
    }
  });
}

export function drawBoxCharAt(lines: string[], caret: Caret, clear: boolean) {
  if (clear && isBoxChar(getCharAt(lines, caret))) {
    lines = setCharAt(lines, caret, " ");
  } else if (!clear) {
    lines = setCharAt(lines, caret, clear ? " " : box);
  }

  // connect or correct surrounding boxes
  for (const p of [...neighbors(caret), caret]) {
    const curr = getCharAt(lines, p, " ");
    if (isBoxChar(curr)) {
      const code = neighbors(p)
        .map((n) => {
          return isBoxChar(getCharAt(lines, n, " ")) ? "X" : "_";
        })
        .join("");

      const char = drawMap[code];

      lines = setCharAt(lines, p, char);
    }
  }

  return lines;
}

const box = "∙";
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
const drawMap: Record<string, string> = {
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

const neighbors = ({ r, c }: Caret): Array<Caret & { neighbor: number }> => {
  return [
    { r: r - 1, c: c, neighbor: 0 }, // t
    { r: r, c: c + 1, neighbor: 1 }, // r
    { r: r + 1, c: c, neighbor: 2 }, // b
    { r: r, c: c - 1, neighbor: 3 }, // l
  ];
};

const isBoxChar = (char: string) => {
  return boxChars.includes(char);
};
