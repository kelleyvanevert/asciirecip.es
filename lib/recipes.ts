import { createClient } from "@supabase/supabase-js";
import { Database } from "../gen/database.types";

export type Page = {
  slug: string;
  title: string;
  lines: string[];
};

const API_URL = "https://ahqgxzpljysdhflaiglp.supabase.co";
const API_KEY = process.env.SUPABASE_API_KEY;
if (!API_KEY) {
  throw new Error("Env var not set: SUPABASE_API_KEY");
}

const supabase = createClient<Database>(API_URL, API_KEY);

export async function getRecipes() {
  const { data, error } = await supabase
    .from("pages")
    .select()
    .not("slug", "ilike", "_%")
    .order("slug");

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch pages from database");
  }

  return data;
}

export async function getLinks() {
  const { data, error } = await supabase.from("links").select().order("id");

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch links from database");
  }

  return data;
}

export async function getRecipeSlugs() {
  const recipes = await getRecipes();

  return recipes.map((r) => r.slug);
}

export async function getAllLinks() {
  const recipes = await getRecipes();
  const links = await getLinks();

  const recipeLinks = Object.fromEntries(
    recipes.map((r) => [r.title, "/" + r.slug] as const)
  );

  const otherLinks = Object.fromEntries(
    links.map((r) => [r.text, r.url] as const)
  );

  return {
    ...recipeLinks,
    ...otherLinks,
  };
}

export async function getRecipe(slug: string): Promise<Page> {
  const { data, error } = await supabase
    .from("pages")
    .select()
    .eq("slug", slug);

  if (error) {
    throw error;
  } else if (!data || data.length === 0) {
    throw new Error(`Could not fetch page with slug [${slug}] from database`);
  }

  const recipe = data[0];

  return {
    slug: recipe.slug,
    title: recipe.title,
    lines: [
      slug.startsWith("_")
        ? "ASCII recipes"
        : `ASCII recipes / ${recipe.title}`,
      "",
      "",
      ...recipe.content.replace(/^\n*/, "").split("\n"),
    ],
  };
}
