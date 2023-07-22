import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Must use POST to save" });
  }

  console.log(req.body);

  res.status(200).json({ result: "ok" });
}
