import type { NextApiRequest, NextApiResponse } from "next";
import { getData } from "../../lib/recipes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== "GET") {
    return res.status(400).json({ error: "Must use GET" });
  }

  res.status(200).json({ result: await getData() });
}
