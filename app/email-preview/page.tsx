export default function EmailPreview() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333', margin: 0, padding: 0, backgroundColor: '#ffffff' }}>
      <table width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ backgroundColor: '#ffffff' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '20px' }}>
              <table width="600" cellPadding={0} cellSpacing={0} border={0} style={{ maxWidth: '600px' }}>
                {/* Header with Logo and App Name */}
                <tr>
                  <td style={{ textAlign: 'center', padding: '20px 0', borderBottom: '3px solid #f78937' }}>
                    <img src="/App Ideas Finder - logo - 200x200.png" alt="App Ideas Finder Logo" width="80" height="80" style={{ display: 'block', margin: '0 auto 15px auto' }} />
                    <h1 style={{ color: '#0a3a5f', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>App Ideas Finder</h1>
                  </td>
                </tr>
                
                {/* Main Content */}
                <tr>
                  <td style={{ textAlign: 'center', padding: '30px 20px' }}>
                    <h2 style={{ color: '#0a3a5f', margin: '0 0 10px 0', fontSize: '28px' }}>Thanks for joining our waitlist!</h2>
                    <p style={{ color: '#f78937', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>You're confirmed for early access</p>
                  </td>
                </tr>
                
                {/* Info Box */}
                <tr>
                  <td style={{ backgroundColor: '#f8f9fa', padding: '20px', border: '1px solid #e9ecef' }}>
                    <h3 style={{ color: '#0a3a5f', margin: '0 0 15px 0', fontSize: '20px' }}>What happens next?</h3>
                    <ol style={{ color: '#666', margin: 0, paddingLeft: '25px', listStyleType: 'decimal', listStylePosition: 'outside' }}>
                      <li style={{ marginBottom: '8px', display: 'list-item' }}>We'll notify you as soon as early access opens</li>
                      <li style={{ marginBottom: '8px', display: 'list-item' }}>You'll be among the first to experience our AI-powered app idea generator</li>
                      <li style={{ marginBottom: 0, display: 'list-item' }}>Get exclusive access to features before public launch</li>
                    </ol>
                  </td>
                </tr>
                
                {/* Footer */}
                <tr>
                  <td style={{ textAlign: 'center', padding: '30px 20px' }}>
                    {/* Privacy Message */}
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                      <span style={{ color: '#888', fontSize: '11px' }}>🔒 We respect your privacy. No spam, ever.</span>
                    </div>
                    
                    {/* Unsubscribe Link */}
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <a href="/unsubscribe?email=test@example.com" style={{ color: '#999', fontSize: '10px', textDecoration: 'underline' }}>Unsubscribe</a>
                    </div>
                    
                    {/* Footer */}
                    <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                      <p style={{ color: '#999', fontSize: '12px', margin: '0 0 10px 0' }}>
                        App Ideas Finder Team
                      </p>
                      <p style={{ color: '#999', fontSize: '11px', margin: '0' }}>
                        © 2025 App Ideas Finder. All rights reserved.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
