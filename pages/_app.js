import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>報價管理系統</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="description" content="跨平台報價管理系統" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="報價系統" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          overscroll-behavior-y: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
          font-size: 15px;
          color: #212529;
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
        /* 輸入與多行文字仍可選取／編輯 */
        input,
        textarea {
          -webkit-user-select: text;
          user-select: text;
        }
        input,
        select,
        textarea,
        button {
          font-family: inherit;
        }
        a {
          color: inherit;
          text-decoration: none;
          -webkit-touch-callout: none;
        }
        button {
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.05s ease;
        }
        /* 觸控按壓回饋（像原生按鈕） */
        button:active,
        a:active {
          opacity: 0.55;
        }
        /* 慣性捲動 */
        body {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
