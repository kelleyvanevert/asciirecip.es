import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export function getRecipe(slug) {
  return new Promise((resolve) => {
    fs.readFile(path.join(contentDir, slug), "utf8", (err, filecontents) => {
      if (err) {
        resolve(null);
      } else {
        const { data, content } = matter(filecontents);
        const node = {
          id: slug,
          data: JSON.parse(JSON.stringify(data)),
          content: ("\n" + content.trim() + "\n")
            .split("\n")
            .map((line) => "  " + line + "  ")
            .join("\n"),
        };
        resolve(node);
      }
    });
  });
}
