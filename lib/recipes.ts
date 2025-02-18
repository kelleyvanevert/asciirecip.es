import { authentication, createDirectus, graphql } from "@directus/sdk";

type ModelAsciiPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

type ModelAsciiLink = {
  id: string;
  text: string;
  url: string;
};

type Schema = {
  ascii_links: ModelAsciiLink[];
  ascii_pages: ModelAsciiPage[];
};

export type Page = {
  id: string;
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

const client = createDirectus<Schema>("https://data.klve.nl")
  .with(authentication("json"))
  .with(graphql());

function contentToLines(slug: string, title: string, content: string) {
  return [
    slug.startsWith("_") ? "ASCII recipes" : `ASCII recipes / ${title}`,
    "",
    "",
    ...content.replace(/^\n*/, "").split("\n"),
  ];
}

export async function doLogin(password: string): Promise<{
  access_token: string;
}> {
  const res = await client.login("admin@asciirecip.es", password);
  if (!res.access_token) {
    throw new Error("Could not log in");
  }

  return {
    access_token: res.access_token,
  };
}

export async function createPage(slug: string, title: string): Promise<Page> {
  const result = await client.query<{ page: ModelAsciiPage }>(
    `
      mutation ($data: create_ascii_pages_input!) {
        page: create_ascii_pages_item(data: $data) {
          id
          slug
          title
          content
        }
      }
    `,
    {
      data: {
        slug,
        title,
        content: "",
      },
    }
  );

  const page = result.page;

  return {
    ...page,
    lines: contentToLines(page.slug, page.title, page.content),
  };
}

export async function updatePage(
  id: string,
  slug: string,
  title: string,
  content: string
): Promise<Page> {
  const result = await client.query<{ page: ModelAsciiPage }>(
    `
      mutation ($id: ID!, $data: update_ascii_pages_input!) {
        page: update_ascii_pages_item(id: $id, data: $data) {
          id
          slug
          title
          content
        }
      }
    `,
    {
      id,
      data: {
        slug,
        title,
        content,
      },
    }
  );

  const page = result.page;

  return {
    ...page,
    lines: contentToLines(page.slug, page.title, page.content),
  };
}

async function getPages() {
  const result = await client.query<{ ascii_pages: ModelAsciiPage[] }>(`
    query {
      ascii_pages {
        id
        slug
        title
        content
      }
    }
  `);

  return (
    result.ascii_pages
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
  const result = await client.query<{ ascii_links: ModelAsciiLink[] }>(`
    query {
      ascii_links {
        id
        text
        url
      }
    }
  `);

  return result.ascii_links;
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
