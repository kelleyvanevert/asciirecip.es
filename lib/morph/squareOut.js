import { info } from "./info";

export function squareOut(im, dim, pos) {
  const { w, h } = info(im);

  let cx = Math.floor(w / 2);
  let cy = Math.floor(h / 2);

  // Pad out right side of image to make it square
  im = im.map((line) => line.padEnd(w));

  const padx = Math.max(0, (dim.w - w) / 2);
  const pady = Math.max(0, (dim.h - h) / 2);

  // Pad horizontally
  if (pos === "center" || pos[1] === "c") {
    im = im.map((line) => line.padStart(dim.w - padx).padEnd(dim.w));
    cx += padx;
  } else if (pos[1] === "r") {
    im = im.map((line) => line.padStart(dim.w));
    cx += 2 * padx;
  } else {
    im = im.map((line) => line.padEnd(dim.w));
  }

  // Pad vertically
  if (pos === "center" || pos[0] === "c") {
    im = Array(Math.ceil(pady))
      .fill("".padEnd(dim.w))
      .concat(im)
      .concat(Array(Math.floor(pady)).fill("".padEnd(dim.w)));
    cy += pady;
  } else if (pos[0] === "b") {
    im = Array(pady * 2)
      .fill("".padEnd(dim.w))
      .concat(im);
    cy += 2 * pady;
  } else {
    im = im.concat(Array(pady * 2).fill("".padEnd(dim.w)));
  }

  return [im, { cx, cy }];
}
