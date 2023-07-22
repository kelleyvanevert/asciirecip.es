import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { Bounds } from "./text";

const contentDir = path.join(process.cwd(), "content");

export type Page = {
  slug: string;
  title: string;
  links: Record<string, string | (() => void)>;
  lines: string[];
};

export async function getRecipeSlugs() {
  const filenames = await fs.readdir(contentDir);

  return filenames
    .filter((filename) => !/^[._]/.test(filename))
    .map((filename) => filename.replace(".txt", ""));
}

export async function getRecipe(slug: string): Promise<Page> {
  const filename = slug + ".txt";

  const filecontents = await fs.readFile(
    path.join(contentDir, filename),
    "utf8"
  );

  const {
    data: { title, links = {} },
    content,
  } = matter(filecontents);

  return {
    slug,
    title,
    links: {
      ...links,
      ["« Home"]: "/",
      ["ASCII recipes"]: "/",
      ["⌂"]: "/",
      [title]: slug.startsWith("_") ? "/" : "/" + slug,
    },
    lines: [
      slug.startsWith("_") ? "ASCII recipes" : `ASCII recipes / ${title}`,
      "",
      "",
      ...content.replace(/^\n*/, "").split("\n"),
    ],
  };
}
