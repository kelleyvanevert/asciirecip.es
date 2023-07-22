import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export type Page = {
  slug: string;
  title: string;
  lines: string[];
};

export async function getRecipeSlugs() {
  const filenames = await fs.readdir(contentDir);

  return filenames
    .filter((filename) => !filename.endsWith("_"))
    .filter((filename) => filename.endsWith(".txt"))
    .map((filename) => filename.replace(".txt", ""));
}

export async function getAllLinks() {
  const slugs = await getRecipeSlugs();

  const recipeLinks = Object.fromEntries(
    await Promise.all(
      slugs.map(async (slug) => {
        const filecontents = await fs.readFile(
          path.join(contentDir, slug + ".txt"),
          "utf8"
        );
        const {
          data: { title },
        } = matter(filecontents);
        return [title as string, "/" + slug] as const;
      })
    )
  );

  const otherLinks = yaml.parse(
    await fs.readFile(path.join(contentDir, "_config.yaml"), "utf8")
  ).links;

  return {
    ...recipeLinks,
    ...otherLinks,
  };
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
    lines: [
      slug.startsWith("_") ? "ASCII recipes" : `ASCII recipes / ${title}`,
      "",
      "",
      ...content.replace(/^\n*/, "").split("\n"),
    ],
  };
}
