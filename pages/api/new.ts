import type { NextApiRequest, NextApiResponse } from "next";
import { createPage } from "../../lib/recipes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Must use POST to save" });
  }

  if (typeof req.body?.title === "string") {
    const title = req.body.title as string;
    const slug = title
      .toLocaleLowerCase()
      .replace(/[ -]/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");

    const page = await createPage(slug, title);

    res.status(200).json({
      ok: true,
      result: page,
    });
  } else {
    res.status(400).json({ error: "Invalid body" });
  }
}
