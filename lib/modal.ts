import { blur } from "../layouts/morph_effects/lib";
import { Page } from "./recipes";
import { Caret, pasteAt } from "./text";

export type Modal = Page & {
  actions: Record<string, () => void>;
};

export function placeModal(
  page: Page,
  tl: Caret,
  lines: string[],
  actions: Record<string, () => void>
): Modal {
  return {
    ...page,
    links: {},
    actions,
    lines: pasteAt(blur(page.lines), tl, lines),
  };
}
