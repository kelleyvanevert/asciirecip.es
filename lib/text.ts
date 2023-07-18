export type Caret = {
  r: number;
  c: number;
};

export type Selection = {
  start: Caret;
  end: Caret;
};

export function selectionTopLeft(selection: Selection): Caret {
  const { top, left } = getSelectionBounds(selection);
  return {
    r: top,
    c: left,
  };
}

export function getSelectionBounds(selection: Selection) {
  const left = Math.min(selection.start.c, selection.end.c);
  const top = Math.min(selection.start.r, selection.end.r);

  // haha, wow, this assymetry seems to be a logical thing :P
  const width = Math.abs(selection.start.c - selection.end.c);
  const height = Math.abs(selection.start.r - selection.end.r) + 1;

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
