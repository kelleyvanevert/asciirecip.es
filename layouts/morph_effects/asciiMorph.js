import { max, getDim, replaceAt, isEmpty, squareOut } from "./lib";

export function asciiMorph(ima, imb) {
  const dim = max(getDim(ima), getDim(imb));

  ima = squareOut(ima, dim);
  imb = squareOut(imb, dim);

  const morphOut = [ima];
  while (!isEmpty(ima)) {
    ima = getMorphedFrame(ima, dim);
    morphOut.push(ima);
  }

  const morphIn = [imb];
  while (!isEmpty(imb)) {
    imb = getMorphedFrame(imb, dim);
    morphIn.push(imb);
  }

  return morphOut.slice(0, -1).concat(morphIn.reverse().slice(1));
}

function getMorphedFrame(lines, dim) {
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const firstInLine = line.search(/[^ ]/);
    const lastInLine = line.search(/\S[ ]*$/);
    if (firstInLine >= 0 && lastInLine >= 0) {
      lines = crushLine(lines, i, firstInLine, lastInLine, dim);
    }
  }

  return lines;
}

function crushLine(lines, no, start, end, dim) {
  const cy = Math.floor(dim.y / 2);

  const crushDirection = no > cy ? -1 : 1;

  lines = lines.slice();

  lines[no] = replaceAt(lines[no], start, " ");
  lines[no] = replaceAt(lines[no], end, " ");

  if (end - 1 !== start + 1 && start !== end && start + 1 !== end) {
    lines[no + crushDirection] = replaceAt(
      lines[no + crushDirection],
      start + 1,
      "+*/\\".substr(Math.floor(Math.random() * "+*/\\".length), 1)
    );
    lines[no + crushDirection] = replaceAt(
      lines[no + crushDirection],
      end - 1,
      "+*/\\".substr(Math.floor(Math.random() * "+*/\\".length), 1)
    );
  } else if (
    (start === end || start + 1 === end) &&
    no + 1 !== cy &&
    no - 1 !== cy &&
    no !== cy
  ) {
    lines[no + crushDirection] = replaceAt(
      lines[no + crushDirection],
      start,
      "+*/\\".substr(Math.floor(Math.random() * "+*/\\".length), 1)
    );
    lines[no + crushDirection] = replaceAt(
      lines[no + crushDirection],
      end,
      "+*/\\".substr(Math.floor(Math.random() * "+*/\\".length), 1)
    );
  }

  return lines;
}
