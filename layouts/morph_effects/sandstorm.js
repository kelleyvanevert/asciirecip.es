import {
  distance,
  shuffle,
  pixels,
  min,
  max,
  getDim,
  round,
  set,
  normal,
  add,
  mul,
  rand,
  bezier,
  rescale,
  squareOut,
} from "./lib";

function easeInOutCubic(t) {
  return t < 0.5
    ? Math.pow(t * 2, 3) / 2
    : (1 - Math.pow(1 - (t * 2 - 1), 3)) / 2 + 0.5;
}

function computePath(a, b) {
  const d = distance(a, b);
  const delta = min(b, a);
  const n = normal(delta);
  const c1 = add(add(a, mul(delta, 1 / 3)), mul(n, (rand() - 0.5) * 1 * d));
  const c2 = add(add(a, mul(delta, 2 / 3)), mul(n, (rand() - 0.5) * 1 * d));

  const path = [];
  for (let i = 0; i < d; i++) {
    const step = bezier(a, c1, c2, b, easeInOutCubic(i / d));
    // step.dir = getDir(delta);
    path.push(step);
  }

  return path;
}

export function sandstorm(ima, imb) {
  const dim = max(getDim(ima), getDim(imb));

  const pxa = shuffle(pixels(ima));
  const pxb = shuffle(pixels(imb));

  const conns = [
    ...pxa.map((a, i) => {
      const b = pxb[i % pxb.length];
      return { a, b };
    }),
    ...pxb.slice(pxa.length).map((b, j) => {
      const a = pxa.reverse()[j % pxa.length];
      return { a, b };
    }),
  ];

  let paths = conns
    .map((conn) => {
      const path = computePath(conn.a, conn.b);
      path._data = { ca: conn.a.c, cb: conn.b.c, swapAt: rand() };
      return path;
    })
    .filter((p) => p.length > 0);

  const len = Math.max(...paths.map((p) => p.length));
  paths = paths.map((p) => rescale(p, len));

  const emptyFrame = squareOut([], dim);

  return {
    frames: [
      squareOut(ima, dim),
      ...Array(len)
        .fill(null)
        .map((_, i) => {
          let frame = emptyFrame;
          for (const path of paths) {
            const p = round(path[i]);
            // const dirChar = combineDirChars(get(frame, p), dirChars[path[i].dir]);
            frame = set(
              frame,
              p,
              i / len >= path._data.swapAt ? path._data.cb : path._data.ca
            );
          }
          return frame;
        }),
      squareOut(imb, dim),
    ],
    duration: 500,
  };
}
