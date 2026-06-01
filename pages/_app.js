import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>報價管理系統</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="跨平台報價管理系統" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, 'Segoe UI', sans-serif; font-size: 15px; color: #212529; }
        input, select, textarea, button { font-family: inherit; }
        a { color: inherit; }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
