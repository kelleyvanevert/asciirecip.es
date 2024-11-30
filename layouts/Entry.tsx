import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { Data, Page } from "../lib/recipes";
import { useParams } from "next/navigation";
import { MorphingLayout } from "./MorphingLayout";

export function Entry() {
  const [data, setData] = useState<Data>();
  const params = useParams();

  const refetch = useCallback(async () => {
    const body = await fetch("/api/data").then((r) => r.json());

    if (body?.result) {
      setData(body.result);
    }
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

  if (!page || !data || !window) {
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
