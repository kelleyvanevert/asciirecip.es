import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export function getRecipeSlugs() {
  return new Promise((resolve, reject) => {
    fs.readdir(contentDir, (err, filenames) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          filenames
            .filter((filename) => !/^[._]/.test(filename))
            .map((filename) => filename.replace(".txt", ""))
        );
      }
    });
  });
}

export function getRecipe(slug) {
  const filename = slug + ".txt";

  return new Promise((resolve) => {
    fs.readFile(
      path.join(contentDir, filename),
      "utf8",
      (err, filecontents) => {
        if (err) {
          resolve(null);
        } else {
          const { data, content } = matter(filecontents);
          const node = {
            id: slug,
            data: JSON.parse(JSON.stringify(data)),
            content: content.replace(/^\n*/, ""),
          };
          resolve(node);
        }
      }
    );
  });
}
