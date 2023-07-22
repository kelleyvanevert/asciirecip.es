import pkg from "../package.json";
import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { token } from "./config";
import { Page } from "./recipes";

const gh = {
  branch: process.env.NODE_ENV === "production" ? "main" : "test",
  owner: "kelleyvanevert",
  repo: "asciirecip.es",
};

console.log("GH", gh);

const octokit = new Octokit({
  auth: token,
  userAgent: `asciirecip.es/${pkg.version}`,
  baseUrl: "https://api.github.com",
});

type GithubFile = {
  name: string;
  sha: string;
  size: number;
  download_url: string;
};

export async function getPages() {
  const res = await octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: gh.owner,
      repo: gh.repo,
      ref: gh.branch,
      path: "content",
    })
    .catch((error) => {
      throw new Error(`Could not get pages: ${error.message}`, {
        cause: error,
      });
    });

  if (!Array.isArray(res.data)) {
    throw new Error(`Could not get pages (status: ${res.status})`);
  }

  return res.data.filter((file) => file.name.endsWith(".txt")) as GithubFile[];
}

export async function getPage(slug: string) {
  const res = await octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: gh.owner,
      repo: gh.repo,
      ref: gh.branch,
      path: "content/" + slug + ".txt",
    })
    .catch((error) => {
      if (error instanceof RequestError && error.status === 404) {
        return null;
      }

      throw new Error(`Could not get page: ${error.message}`, {
        cause: error,
      });
    });

  if (!res) {
    return null;
  }

  if (Array.isArray(res.data)) {
    throw new Error(`Could not get single page -- it's a dir?!`);
  }

  if (res.data.type !== "file") {
    throw new Error(`Could not get single page -- it's a: ${res.data.type}`);
  }

  return res.data as GithubFile;
}

export async function createOrUpdatePage(page: Page) {
  const curr = await getPage(page.slug);

  const content = `---\ntitle: ${JSON.stringify(
    page.title
  )}\n---\n\n${page.lines.join("\n")}`;

  const res = await octokit
    .request("PUT /repos/{owner}/{repo}/contents/{path}", {
      ...gh,
      path: "content/" + page.slug + ".txt",
      message: `Upsert ${page.slug}`,
      committer: {
        name: "Kelley van Evert",
        email: "hello@klve.nl",
      },
      content: Buffer.from(content).toString("base64"),
      sha: curr?.sha,
    })
    .catch((error) => {
      throw new Error(`Could not get pages: ${error.message}`, {
        cause: error,
      });
    });

  return res.data.content as GithubFile;
}

export async function deletePage(slug: string) {
  const page = await getPage(slug);
  if (!page) {
    return;
  }

  await octokit
    .request("DELETE /repos/{owner}/{repo}/contents/{path}", {
      ...gh,
      path: "content/" + slug + ".txt",
      message: `Delete ${slug}`,
      committer: {
        name: "Kelley van Evert",
        email: "hello@klve.nl",
      },
      sha: page.sha,
    })
    .catch((error) => {
      throw new Error(`Could not delete page: ${error.message}`, {
        cause: error,
      });
    });

  return true;
}
