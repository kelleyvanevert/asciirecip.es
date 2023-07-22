import { max, getDim, isEmpty, rand, squareOut, TransitionSpec } from "./lib";

function step(im: string[]) {
  return im.map((line) => {
    const newline = line
      .split("")
      .map((c) => {
        if (rand() > 0.2) return c;
        else if (c === " ") return " ";
        else if (c === ".") return " ";
        else if (c === "+") return ".";
        else if (c === "x") return "+";
        else if (c === "X") return "x";
        else return c.toLowerCase() === c ? "x" : "X";
      })
      .join("");
    if (line.length !== newline.length) console.log("repl", line, newline);
    return newline;
  });
}

export function dissolve(ima: string[], imb: string[]): TransitionSpec {
  const dim = max(getDim(ima), getDim(imb));

  ima = squareOut(ima, dim);
  imb = squareOut(imb, dim);

  const fadeOut = [ima];
  while (!isEmpty(ima)) {
    ima = step(ima);
    fadeOut.push(ima);
  }

  const fadeIn = [imb];
  while (!isEmpty(imb)) {
    imb = step(imb);
    fadeIn.push(imb);
  }

  return {
    frames: fadeOut.slice(0, -1).concat(fadeIn.reverse().slice(1)),
    duration: 500,
  };
}
