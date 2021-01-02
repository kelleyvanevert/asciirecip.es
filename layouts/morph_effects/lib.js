export function set(im, { x, y }, c) {
  if (y < 0 || y >= im.length) return im;

  im = im.slice();
  const line = im[y].split("");
  if (x < 0 || x >= line.length) return im;

  line[x] = c;
  im[y] = line.join("");
  return im;
}

export function get(im, { x, y }) {
  if (y < 0 || y >= im.length) return " ";
  if (x < 0 || x >= im[y].length) return " ";
  return im[y][x];
}

export function round(d) {
  if (typeof d === "undefined") {
    throw new Error(`round(undefined)`);
  } else if (typeof d === "number") {
    return Math.round(d);
  } else {
    return { x: round(d.x), y: round(d.y) };
  }
}

export function rand(...args) {
  if (args.length === 0) {
    return Math.random();
  } else if (Array.isArray(args[0])) {
    return args[0][Math.floor(Math.random() * args[0].length)];
  } else if (typeof args[0] === "string") {
    return rand(args[0].split(""));
  } else {
    throw new Error("Can't rand() this data");
  }
}

export function squareOut(im, dim = getDim(im)) {
  return im
    .concat(Array(Math.max(0, dim.y - im.length)).fill(""))
    .map((line) => line.padEnd(dim.x));
}

export function isEmpty(im) {
  return im.every((line) => line.trim() === "");
}

export function max(...args) {
  if (typeof args[0] === "number") {
    return Math.max(...args);
  } else if (args[0].x) {
    return {
      x: Math.max(...args.map((i) => i.x)),
      y: Math.max(...args.map((i) => i.y)),
    };
  } else {
    throw new Error("Can't max() this type of data");
  }
}

export function getDim(im) {
  let x = Math.max(...im.map((line) => line.length));
  let y = im.length;
  return { x, y };
}

export function distance(a, b) {
  return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
}

export function min(b, a) {
  return { x: b.x - a.x, y: b.y - a.y };
}

export function length(p) {
  return distance({ x: 0, y: 0 }, p);
}

export function normalize(p) {
  const len = length(p);
  return { x: p.x / len, y: p.y / len };
}

export function interpolate(a, b, p) {
  if (typeof a === "number") {
    return a + p * (b - a);
  } else if (typeof a.x === "number") {
    return {
      x: interpolate(a.x, b.x, p),
      y: interpolate(a.y, b.y, p),
    };
  } else {
    throw new Error(`Can't interpolate() this data: ${JSON.stringify(a)}`);
  }
}

export function bezier(a, c1, c2, b, p) {
  const i1 = interpolate(a, c1, p);
  const i2 = interpolate(c2, b, p);
  return interpolate(i1, i2, p);
}

export function add(a, b) {
  if (typeof b === "number") {
    b = { x: b, y: b };
  }
  return { x: a.x + b.x, y: a.y + b.y };
}

export function mul(a, b) {
  if (typeof b === "number") {
    b = { x: b, y: b };
  }
  return { x: a.x * b.x, y: a.y * b.y };
}

export function normal(p) {
  return normalize({ x: p.y, y: p.x });
}

export function shuffle(arr) {
  arr = arr.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function rescale(arr, len) {
  const factor = len / arr.length;
  const rescaled = Array(len)
    .fill(null)
    .map((_, i) => {
      let j = Math.round(i / factor);
      j = Math.max(0, Math.min(arr.length - 1, j));
      return arr[j];
    });

  // const pad = len - arr.length;
  // const padstart = Math.floor(Math.random() * pad);
  // const padend = pad - padstart;
  // const rescaled = [
  //   ...Array(padstart).fill(arr[0]),
  //   ...arr,
  //   ...Array(padend).fill(arr.slice(-1)[0])
  // ];

  rescaled._data = arr._data;
  return rescaled;
}

export function pixels(im) {
  return im
    .map((line, y) => {
      return line.split("").map((c, x) => {
        if (c !== " ") {
          return { x, y, c };
        }
      });
    })
    .flat()
    .filter(Boolean);
}

export function replaceAt(string, index, character) {
  return (
    string.substr(0, index) +
    character +
    string.substr(index + character.length)
  );
}
