export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #f5f5f5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #333;
        }
        .container {
          text-align: center;
          max-width: 600px;
          background-color: #ffffff;
          border-radius: 8px;
          padding: 60px 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0e0e0;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 20px;
          font-weight: 600;
          color: #1a1a1a;
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 30px;
          font-weight: 400;
          color: #666;
        }
        .message {
          font-size: 1.1rem;
          line-height: 1.8;
          margin-bottom: 40px;
          color: #444;
        }
        .contact {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          margin-top: 30px;
          border: 1px solid #e0e0e0;
        }
        .contact p {
          margin-bottom: 10px;
        }
        .contact p:last-child {
          margin-bottom: 0;
        }
        a {
          color: #2563eb;
          text-decoration: none;
          border-bottom: 1px solid #2563eb;
        }
        a:hover {
          opacity: 0.8;
        }
      `}} />
      <div className="container">
        <h1>App Ideas Finder</h1>
        <h2>This Domain Is For Sale</h2>
        <div className="message">
          <p>This website is no longer active.</p>
          <p>The domain <strong>appideasfinder.com</strong> is available for purchase.</p>
        </div>
        <div className="contact">
          <p style={{fontWeight: 600, color: '#333', marginBottom: '10px'}}>
            Interested in purchasing this domain?
          </p>
          <p style={{marginBottom: '15px', color: '#666'}}>
            Please contact us to discuss.
          </p>
          <p style={{marginTop: '20px', fontSize: '1rem'}}>
            <a href="mailto:contact@appideasfinder.com">contact@appideasfinder.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
