export default function MaintenancePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Domain For Sale - App Ideas Finder</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #fff;
          }
          .container {
            text-align: center;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            font-weight: 700;
          }
          h2 {
            font-size: 1.5rem;
            margin-bottom: 30px;
            opacity: 0.9;
            font-weight: 400;
          }
          .message {
            font-size: 1.1rem;
            line-height: 1.8;
            margin-bottom: 40px;
            opacity: 0.95;
          }
          .contact {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
          }
          .contact p {
            margin-bottom: 10px;
          }
          a {
            color: #fff;
            text-decoration: underline;
          }
          a:hover {
            opacity: 0.8;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>🚀 App Ideas Finder</h1>
          <h2>This Domain Is For Sale</h2>
          <div className="message">
            <p>This website is no longer active.</p>
            <p>The domain <strong>appideasfinder.com</strong> is available for purchase.</p>
          </div>
          <div className="contact">
            <p><strong>Interested in purchasing this domain?</strong></p>
            <p>Please contact us to discuss.</p>
            <p style={{ marginTop: '20px', fontSize: '0.9rem', opacity: 0.8 }}>
              <a href="mailto:contact@appideasfinder.com">contact@appideasfinder.com</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
