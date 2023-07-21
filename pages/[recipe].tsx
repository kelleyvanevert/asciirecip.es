import { Page, getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps<{ page: Page }> = async ({
  params,
}) => {
  const page = await getRecipe(String(params?.recipe));

  if (!page) {
    return {
      notFound: true,
      props: {},
    };
  }

  return {
    props: {
      page,
    },
  };
};

export default MorphingLayout;
