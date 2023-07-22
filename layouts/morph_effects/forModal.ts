import {
  max,
  getDim,
  rand,
  squareOut,
  Pos,
  Char,
  set,
  TransitionSpec,
} from "./lib";

function stepChar(ca: Char, cb: Char) {
  if (rand() > 0.5) {
    // maybe wait a bit
    return ca;
  }

  // transitioning towards modal background blur
  if (cb === "=") {
    if (ca !== "±" && ca !== "~" && ca !== "-" && cb === "=") {
      return "±";
    }
    if (ca === "±" && cb === "=") {
      return "~";
    }
    if (ca === "~" && cb === "=") {
      return "-";
    }
  }

  return cb;
}

function step(ima: string[], imb: string[], dim: Pos) {
  let done = true;

  for (let y = 0; y < dim.y; y++) {
    for (let x = 0; x < dim.x; x++) {
      const a = ima[y][x];
      const b = imb[y][x];

      if (a !== b) {
        ima = set(ima, { x, y }, stepChar(a, b));
        done = false;
      }
    }
  }

  return [done, ima] as const;
}

export function forModal(ima: string[], imb: string[]): TransitionSpec {
  const dim = max(getDim(ima), getDim(imb));

  ima = squareOut(ima, dim);
  imb = squareOut(imb, dim);

  const frames = [ima];

  let done = false;
  while (!done) {
    [done, ima] = step(ima, imb, dim);
    if (!done) {
      frames.push(ima);
    }
  }

  return {
    frames,
    duration: 200,
  };
}
