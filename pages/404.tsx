import { GetServerSideProps } from "next";
import { Page, getRecipe } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export const getServerSideProps: GetServerSideProps<{
  page: Page;
}> = async () => {
  return {
    props: {
      page: await getRecipe("_404"),
    },
  };
};

export default MorphingLayout;
