import { getMorphedFrame } from "./getMorphedFrame";
import { info } from "./info";
import { squareOut } from "./squareOut";

export function prepareFrames(
  a,
  b,
  dim = {
    w: Math.max(info(a).w, info(b).w),
    h: Math.max(info(a).h, info(b).h),
  },
  pos = "cc"
) {
  let i = 0;

  let [sa, ca] = squareOut(a, dim, pos);
  let [sb, cb] = squareOut(b, dim, pos);

  const deconstructionFrames = [sa];
  while ((sa = getMorphedFrame(sa, ca, dim, pos))) {
    deconstructionFrames.push(sa);

    if (i++ > 200) throw new Error("loop");
  }

  const constructionFrames = [sb];
  while ((sb = getMorphedFrame(sb, cb, dim, pos))) {
    constructionFrames.unshift(sb);

    if (i++ > 200) throw new Error("loop");
  }

  return deconstructionFrames.slice(0, -1).concat(constructionFrames.slice(1));
}
