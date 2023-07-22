import "dotenv-flow/config";

export const token = process.env.GH_TOKEN;
if (!token) {
  throw new Error("GH_TOKEN not provided");
}

export const password = process.env.PASSWORD;
if (!password) {
  throw new Error("PASSWORD not provided");
}
