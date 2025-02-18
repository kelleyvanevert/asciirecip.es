import type { NextApiRequest, NextApiResponse } from "next";
import { updatePage } from "../../lib/recipes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Must use POST to save" });
  }

  if (
    req.body?.page &&
    typeof req.body.page === "object" &&
    typeof req.body.page.id === "string" &&
    typeof req.body.page.slug === "string" &&
    typeof req.body.page.title === "string" &&
    typeof req.body.page.content === "string"
  ) {
    const page = await updatePage(
      req.body.page.id,
      req.body.page.slug,
      req.body.page.title,
      req.body.page.content
    );

    res.status(200).json({
      ok: true,
      result: page,
    });
  } else {
    res.status(400).json({ error: "Invalid body" });
  }
}
