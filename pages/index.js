import { getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getStaticProps() {
  return {
    props: {
      page: await getRecipe("_index"),
    },
  };
}

export default MorphingLayout;
