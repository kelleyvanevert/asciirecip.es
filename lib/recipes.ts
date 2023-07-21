import fs from "node:fs/promises";
import path from "node:path";
import { directus } from "./directus";

export type Page = {
  slug: string;
  title: string;
  links: Record<string, string>;
  lines: string[];
};

export async function getRecipeSlugs() {
  const recipes = await directus.items("recipes").readByQuery({
    limit: 9999,
    fields: ["slug"],

    // // Apparently doesn't work, for some reason...
    // filter: {
    //   slug: {
    //     _nstarts_with: "_",
    //   },
    // },
  });

  if (!recipes.data) {
    throw new Error("Could not get recipes");
  }

  const slugs = recipes.data
    .filter((r) => !r.slug.startsWith("_"))
    .map((r) => r.slug);

  return slugs;
}

export async function getAllLinks() {
  const recipes = await directus.items("recipes").readByQuery({
    limit: 9999,
    fields: ["slug", "title"],
  });

  if (!recipes.data) {
    throw new Error("Could not get recipes");
  }

  const links = await directus.items("recipe_links").readByQuery({
    limit: 9999,
    fields: ["title", "url"],
  });

  if (!links.data) {
    throw new Error("Could not get links");
  }

  return {
    ...Object.fromEntries(
      recipes.data
        .filter((r) => r.slug !== "_404")
        .map((r) => {
          const link = r.slug === "_index" ? "/" : "/" + r.slug;

          return [r.title, link];
        })
    ),
    ...Object.fromEntries(
      links.data.map((r) => {
        return [r.title, r.url];
      })
    ),
  };
}

export async function getRecipe(slug: string): Promise<Page> {
  const r = await directus.items("recipes").readByQuery({
    filter: {
      slug: { _eq: slug },
    },
  });

  if (!r.data?.[0]) {
    throw new Error(`Could not find recipe or page with slug: ${slug}`);
  }

  const recipe = r.data[0];

  return {
    ...recipe,
    lines: recipe.content.replace(/^\n*/, "").split("\n"),
    links: {
      ...(await getAllLinks()),
      ["« Home"]: "/",
    },
  };
}
