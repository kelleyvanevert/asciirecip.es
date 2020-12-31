import { crushLine } from "./crushLine";

// Crushes the frame data by 1 unit.
export function getMorphedFrame(lines, c, dim, pos) {
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const firstInLine = line.search(/[^ ]/);
    const lastInLine = line.search(/\S[ ]*$/);
    if (firstInLine >= 0 && lastInLine >= 0) {
      lines = crushLine(lines, i, firstInLine, lastInLine, c, dim, pos);
      found = true;
    }
  }

  if (found) {
    return lines;
  } else {
    return false;
  }
}
