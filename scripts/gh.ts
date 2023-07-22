import {
  createOrUpdatePage,
  deletePage,
  getPage,
  getPages,
} from "../lib/github";

(async () => {
  console.log(
    "get pages #1:",
    (await getPages()).map((p) => p.name).join(", ")
  );

  console.log("get page:", await getPage("new_reipe_3"));

  console.log(
    await createOrUpdatePage({
      slug: "new_recipe_3",
      title: "Some title",
      lines: ["Hello new rsdfecipe"],
    })
  );

  console.log(await deletePage("new_recipe_3"));

  console.log(
    await createOrUpdatePage({
      slug: "new_recipe_3",
      title: "Some title",
      lines: ["Hellgo new recipe", "new line"],
    })
  );

  console.log(
    await createOrUpdatePage({
      slug: "new_recipe_3",
      title: "Some title",
      lines: ["Hellgo new recipe", "next line", "", "bla"],
    })
  );

  console.log(
    "get pages #2:",
    (await getPages()).map((p) => p.name).join(", ")
  );
})();
