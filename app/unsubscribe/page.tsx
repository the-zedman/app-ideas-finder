'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Invalid unsubscribe link')
      return
    }

    // Call the unsubscribe API
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage('You have been successfully unsubscribed from our waitlist.')
        } else {
          setStatus('error')
          setMessage('Failed to unsubscribe. Please try again or contact us.')
        }
      })
      .catch(error => {
        console.error('Error:', error)
        setStatus('error')
        setMessage('An error occurred. Please try again.')
      })
  }, [searchParams])

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a3a5f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
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
              {message}
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
              {message}
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
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  )
}

