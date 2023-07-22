export type TransitionSpec = {
  frames: string[][];
  duration: number;
};

export type Pos = {
  x: number;
  y: number;
};

export type Char = string;

export function set(im: string[], { x, y }: Pos, c: Char) {
  if (y < 0 || y >= im.length) return im;

  im = im.slice();
  const line = im[y].split("");
  if (x < 0 || x >= line.length) return im;

  line[x] = c;
  im[y] = line.join("");
  return im;
}

export function get(im: string[], { x, y }: Pos) {
  if (y < 0 || y >= im.length) return " ";
  if (x < 0 || x >= im[y].length) return " ";
  return im[y][x];
}

export function round(d: number): number;
export function round(d: Pos): Pos;
export function round(d: any) {
  if (typeof d === "undefined") {
    throw new Error(`round(undefined)`);
  } else if (typeof d === "number") {
    return Math.round(d);
  } else {
    return { x: round(d.x), y: round(d.y) };
  }
}

export function rand(): number;
export function rand<T>(arr: T[]): T;
export function rand(str: string): Char;
export function rand(arg?: any) {
  if (arg === undefined) {
    return Math.random();
  } else if (Array.isArray(arg)) {
    return arg[Math.floor(Math.random() * arg.length)];
  } else if (typeof arg === "string") {
    return rand(arg.split(""));
  } else {
    throw new Error("Can't rand() this data");
  }
}

export function squareOut(im: string[], dim: Pos = getDim(im)) {
  return im
    .concat(Array(Math.max(0, dim.y - im.length)).fill(""))
    .map((line) => line.padEnd(dim.x));
}

export function isEmpty(im: string[]) {
  return im.every((line) => line.trim() === "");
}

export function max(...args: number[]): number;
export function max(...args: Pos[]): Pos;
export function max(...args: any[]) {
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

export function getDim(im: string[]): Pos {
  let x = Math.max(...im.map((line) => line.length));
  let y = im.length;
  return { x, y };
}

export function distance(a: Pos, b: Pos) {
  return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
}

export function min(b: Pos, a: Pos) {
  return { x: b.x - a.x, y: b.y - a.y };
}

export function length(p: Pos) {
  return distance({ x: 0, y: 0 }, p);
}

export function normalize(p: Pos) {
  const len = length(p);
  return { x: p.x / len, y: p.y / len };
}

export function interpolate(a: number, b: number, p: number): number;
export function interpolate(a: Pos, b: Pos, p: number): Pos;
export function interpolate(a: any, b: any, p: number) {
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

export function bezier(a: Pos, c1: Pos, c2: Pos, b: Pos, p: number) {
  const i1 = interpolate(a, c1, p);
  const i2 = interpolate(c2, b, p);
  return interpolate(i1, i2, p);
}

export function add(a: Pos, b: number): Pos;
export function add(a: Pos, b: Pos): Pos;
export function add(a: any, b: any) {
  if (typeof b === "number") {
    b = { x: b, y: b };
  }
  return { x: a.x + b.x, y: a.y + b.y };
}

export function mul(a: Pos, b: number): Pos;
export function mul(a: Pos, b: Pos): Pos;
export function mul(a: any, b: any) {
  if (typeof b === "number") {
    b = { x: b, y: b };
  }
  return { x: a.x * b.x, y: a.y * b.y };
}

export function normal(p: Pos) {
  return normalize({ x: p.y, y: p.x });
}

export function shuffle<T>(arr: T[]): T[] {
  arr = arr.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function rescale<T>(arr: T[], len: number): T[] {
  const factor = len / arr.length;
  const rescaled = Array(len)
    .fill(null)
    .map((_, i) => {
      let j = Math.round(i / factor);
      j = Math.max(0, Math.min(arr.length - 1, j));
      return arr[j];
    });

  // I forgot what this is for...
  // @ts-ignore
  rescaled._data = arr._data;

  return rescaled;
}

export function pixels(im: string[]) {
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

export function replaceAt(string: string, index: number, character: Char) {
  return (
    string.substr(0, index) +
    character +
    string.substr(index + character.length)
  );
}

export function padAround(lines: string[]) {
  if (lines.length === 0) {
    return lines;
  }

  return lines.map((line) => " " + line + " ");
}

export function blur(lines: string[]) {
  return lines.map((line) => line.replace(/[^ ]/g, "="));
}
