import { createClient } from "@supabase/supabase-js";
import { Database } from "../gen/database.types";

export type Page = {
  slug: string;
  title: string;
  lines: string[];
};

export type Link = {
  text: string;
  url: string;
};

export type Data = {
  pages: Page[];
  links: Link[];
};

const API_URL = "https://xnyjvnwxkycelywcqqbg.supabase.co";
const API_KEY = process.env.SUPABASE_API_KEY;
if (!API_KEY) {
  throw new Error("Env var not set: SUPABASE_API_KEY");
}

const supabase = createClient<Database>(API_URL, API_KEY);

function contentToLines(slug: string, title: string, content: string) {
  return [
    slug.startsWith("_") ? "ASCII recipes" : `ASCII recipes / ${title}`,
    "",
    "",
    ...content.replace(/^\n*/, "").split("\n"),
  ];
}

export async function createPage(slug: string, title: string): Promise<Page> {
  const { data, error } = await supabase
    .from("pages")
    .insert({
      slug,
      title,
      content: "",
    })
    .select();

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch pages from database");
  }

  const page = data[0];

  return {
    ...page,
    lines: contentToLines(page.slug, page.title, page.content),
  };
}

export async function upsertPage(
  slug: string,
  title: string,
  content: string
): Promise<Page> {
  const { data, error } = await supabase
    .from("pages")
    .upsert(
      {
        slug,
        title,
        content,
      },
      {
        onConflict: "slug",
      }
    )
    .select();

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch pages from database");
  }

  const page = data[0];

  return {
    ...page,
    lines: contentToLines(page.slug, page.title, page.content),
  };
}

async function getPages() {
  const { data, error } = await supabase.from("pages").select().order("slug");

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch pages from database");
  }

  return (
    data
      // .filter((r) => !r.slug.startsWith("_"))
      .map((r) => {
        return {
          ...r,
          lines: contentToLines(r.slug, r.title, r.content),
        };
      })
  );
}

async function getLinks() {
  const { data, error } = await supabase.from("links").select().order("text");

  if (error) {
    throw error;
  } else if (!data) {
    throw new Error("Could not fetch links from database");
  }

  return data;
}

export async function getData(): Promise<Data> {
  const pages: Page[] = await getPages();
  const otherLinks = await getLinks();

  const recipeLinks = pages
    .filter((p) => !p.slug.startsWith("_"))
    .map((r) => {
      return {
        text: r.title,
        url: "/" + r.slug,
      };
    });

  const links: Link[] = [...recipeLinks, ...otherLinks];

  return {
    pages,
    links,
  };
}
