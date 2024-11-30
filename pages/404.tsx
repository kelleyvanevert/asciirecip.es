import { GetStaticProps } from "next";
import { getData } from "../lib/recipes";
import { MorphingLayout } from "../layouts/MorphingLayout";

export const getStaticProps: GetStaticProps = async () => {
  const data = await getData();

  const page = data.pages.find((p) => p.slug === "_404");

  return {
    props: {
      page,
      data,
    },
  };
};

export default MorphingLayout;
