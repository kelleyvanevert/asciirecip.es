import { getAllLinks, getRecipe, getRecipeSlugs } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export async function getStaticProps({ params: { recipe: slug } }) {
  const page = await getRecipe(slug);
  const links = await getAllLinks();

  if (!page) {
    return {
      notFound: true,
      props: {},
    };
  }

  return {
    props: {
      page,
      links,
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
