import { getRecipe } from "../../lib/recipes";
import { MorphingLayout } from "../../layouts/MorphingLayout";

export async function getStaticProps() {
  return {
    props: {
      node: {
        ...(await getRecipe("_editor")),
        editor: true,
      },
    },
  };
}

export default MorphingLayout;
