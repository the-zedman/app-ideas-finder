'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function UnsubscribePreview() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('success')

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '20px' }}>Unsubscribe Page Preview</h1>
        
        {/* Status Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>Preview Status:</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)}
            style={{ 
              padding: '5px 10px', 
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="loading">Loading</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Preview Container */}
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: '#0a3a5f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center'
          }}>
            {/* Logo and App Name */}
            <div style={{ marginBottom: '30px' }}>
              <Image
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder"
                width={80}
                height={80}
                style={{ display: 'inline-block' }}
              />
              <h1 style={{ 
                color: '#1e3a5f', 
                fontSize: '24px', 
                fontWeight: 'bold',
                margin: '15px 0 0 0'
              }}>
                App Ideas Finder
              </h1>
            </div>

            {/* Status Message */}
            {status === 'loading' && (
              <div>
                <h2 style={{ color: '#1e3a5f', fontSize: '20px', marginBottom: '15px' }}>
                  Processing...
                </h2>
                <p style={{ color: '#666', fontSize: '16px' }}>
                  Please wait while we unsubscribe you from our waitlist.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
                <h2 style={{ color: '#1e3a5f', fontSize: '20px', marginBottom: '15px' }}>
                  Successfully Unsubscribed
                </h2>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
                  You have been successfully unsubscribed from our waitlist.
                </p>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
                  You won't receive any more emails from us.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✗</div>
                <h2 style={{ color: '#d9534f', fontSize: '20px', marginBottom: '15px' }}>
                  Unsubscribe Failed
                </h2>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
                  Failed to unsubscribe. Please try again or contact us.
                </p>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
                  If you continue to experience issues, please contact us at{' '}
                  <a href="mailto:info@appideasfinder.com" style={{ color: '#f78937' }}>
                    info@appideasfinder.com
                  </a>
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ 
              marginTop: '40px', 
              paddingTop: '20px', 
              borderTop: '1px solid #eee' 
            }}>
              <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>
                © 2025 App Ideas Finder. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

