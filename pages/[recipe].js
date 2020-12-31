import { getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getServerSideProps({ res, params: { recipe: slug } }) {
  const node = await getRecipe(slug);

  if (!node) {
    return {
      notFound: true,
      props: {},
    };
  }

  return {
    props: {
      node,
    },
  };
}

export default MorphingLayout;
