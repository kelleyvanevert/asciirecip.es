import type { NextApiRequest, NextApiResponse } from "next";
import { doLogin } from "../../lib/recipes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Must use POST to save" });
  }

  if (req.body?.password && typeof req.body.password === "string") {
    const { access_token } = await doLogin(req.body.password);

    res.status(200).json({
      ok: true,
      access_token,
    });
  } else {
    res.status(400).json({ error: "Invalid body" });
  }
}
