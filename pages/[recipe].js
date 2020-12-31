import { getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getServerSideProps({ res, params: { recipe: slug } }) {
  const node = await getRecipe(slug);

  if (!node) {
    res.statusCode = 404;
    // res.end();
  }

  return {
    props: {
      node,
    },
  };
}

export default MorphingLayout;
