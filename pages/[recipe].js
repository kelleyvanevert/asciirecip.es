import { getRecipe, getRecipeSlugs } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getStaticProps({ params: { recipe: slug } }) {
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

export async function getStaticPaths() {
  const slugs = await getRecipeSlugs();
  const paths = slugs.map((slug) => "/" + slug);

  return {
    fallback: false,
    paths,
  };
}

export default MorphingLayout;
