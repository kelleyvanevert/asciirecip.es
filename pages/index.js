import { getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getServerSideProps() {
  return {
    props: {
      node: await getRecipe("_index"),
    },
  };
}

export default MorphingLayout;
