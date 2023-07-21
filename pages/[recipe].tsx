import { Page, getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps<{ page: Page }> = async ({
  params,
}) => {
  try {
    const page = await getRecipe(String(params?.recipe));

    return {
      props: {
        page,
      },
    };
  } catch {
    return {
      notFound: true,
      props: {},
    };
  }
};

export default MorphingLayout;
