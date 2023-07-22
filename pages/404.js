import { getAllLinks, getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getStaticProps() {
  return {
    props: {
      page: await getRecipe("_404"),
      links: await getAllLinks(),
    },
  };
}

export default MorphingLayout;
