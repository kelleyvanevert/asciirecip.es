import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { Data, getData, Page } from "../lib/recipes";
import { useParams } from "next/navigation";
import { MorphingLayout } from "./MorphingLayout";

export function Entry() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<Data>();
  const params = useParams();

  const refetch = useCallback(async () => {
    setData(await getData());
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  const [page, setPage] = useState<Page>();

  useEffect(() => {
    if (!data) return;

    const slug = typeof params?.recipe === "string" ? params.recipe : "_index";
    const page = data.pages.find((p) => p.slug === slug);

    if (page) {
      setPage(page);
    } else {
      setPage(data.pages.find((p) => p.slug === "_404"));
    }
  }, [data, params?.recipe]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!page || !data || !globalThis.localStorage || !isClient) {
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          userSelect: "none",
        }}
      >
        <Head>
          <title>ASCII recipes (loading...)</title>
        </Head>

        <pre>Loading...</pre>
      </main>
    );
  } else {
    return (
      <MorphingLayout key="same" data={data} page={page} refetch={refetch} />
    );
  }
}
