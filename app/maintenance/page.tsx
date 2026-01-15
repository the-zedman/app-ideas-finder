export default function MaintenancePage() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#333',
      margin: 0
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '60px 40px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '20px',
          fontWeight: 600,
          color: '#1a1a1a'
        }}>App Ideas Finder</h1>
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '30px',
          fontWeight: 400,
          color: '#666'
        }}>This Domain Is For Sale</h2>
        <div style={{
          fontSize: '1.1rem',
          lineHeight: 1.8,
          marginBottom: '40px',
          color: '#444'
        }}>
          <p>This website is no longer active.</p>
          <p>The domain <strong>appideasfinder.com</strong> is available for purchase.</p>
        </div>
        <div style={{
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          padding: '30px',
          marginTop: '30px',
          border: '1px solid #e0e0e0'
        }}>
          <p style={{ marginBottom: '10px', fontWeight: 600, color: '#333' }}>
            Interested in purchasing this domain?
          </p>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Please contact us to discuss.
          </p>
          <p style={{ marginTop: '20px', fontSize: '1rem' }}>
            <a href="mailto:contact@appideasfinder.com" style={{
              color: '#2563eb',
              textDecoration: 'none',
              borderBottom: '1px solid #2563eb'
            }}>
              contact@appideasfinder.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
