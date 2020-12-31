import { replaceAt } from "./replaceAt";

export function crushLine(lines, no, start, end, c, dim, pos) {
  const cy = Math.floor(dim.h / 2);

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
