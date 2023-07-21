import { Directus } from "@directus/sdk";

type Recipe = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

type RecipeLink = {
  id: string;
  title: string;
  url: string;
};

type MyCollections = {
  recipes: Recipe;
  recipe_links: RecipeLink;
};

export const directus = new Directus<MyCollections>("https://data.klve.nl", {
  auth: {
    mode: "json",
    staticToken: "TAt2t8UhFwNyqMbH4DcM2IPC4hP5sI86",
    autoRefresh: false,
  },
});
