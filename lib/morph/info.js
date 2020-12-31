export function info(im) {
  let w = Math.max(...im.map((line) => line.length));
  let h = im.length;
  return { w, h };
}
