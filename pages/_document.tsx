import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const q = window.matchMedia("(prefers-color-scheme: dark)");
              window._initialDarkMode = q.matches;
              if (q.matches) {
                document.body.classList.add('dark')
              } else {
                document.body.classList.remove('dark')
              }
            `,
          }}
        ></script>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
