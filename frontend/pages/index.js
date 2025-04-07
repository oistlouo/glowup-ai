import React, { useEffect, useState } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [fullHtml, setFullHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPaid, setIsPaid] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setPreviewHtml('');
    setFullHtml('');

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch('https://glowup-ai.onrender.com/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error details:', errorText);
        throw new Error('Server responded with error');
      }

      const data = await response.json();
      if (!data.previewHtml || !data.fullHtml) {
        throw new Error('Incomplete result from server');
      }

      setPreviewHtml(data.previewHtml);
      setFullHtml(data.fullHtml);
      setImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!previewHtml || isPaid) return;

    let alreadyRendered = false;

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=BAAwOk4pNQMtsvhlLL_t1mVXYJ8IVvo7hi01PUDAy1bAkBXud17i_QzZVXdmjSrBZntcYrxV2icLmu2Ndo&components=hosted-buttons&disable-funding=venmo&currency=USD";

    script.addEventListener("load", () => {
      if (window.paypal && !alreadyRendered && document.getElementById("paypal-container-XW5X3YNYP26TN")) {
        alreadyRendered = true;
        window.paypal.HostedButtons({
          hostedButtonId: "XW5X3YNYP26TN",
          onApprove: () => {
            setIsPaid(true);
          },
        }).render("#paypal-container-XW5X3YNYP26TN");
      }
    });

    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [previewHtml, isPaid]);

  const displayedHtml = isPaid ? fullHtml : previewHtml;

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      <style>{`
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #121212;
          }
          label, input, h1, h2, p, div {
            color: #fff !important;
          }
          input {
            background-color: #1e1e1e !important;
            border: 1px solid #444 !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '12px' }}>GlowUp.AI</h1>
        <p style={{ fontSize: '20px', marginBottom: '20px' }}>AI-powered selfie skin analysis, inspired by Korea’s professional dermatology tech.</p>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>How to Use</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
            1. Upload a selfie<br />
            2. Tap “Analyze”<br />
            3. Instantly receive expert skin insights and a personalized routine to reveal your glow
          </p>
        </div>
      </div>

      {/* Upload Instructions */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <p style={{ fontSize: '14px', color: '#777', lineHeight: '1.6', textAlign: 'center' }}>
          For the most accurate results, please upload a selfie that meets the following:<br />
          1. Well-lit with light facing your face<br />
          2. Forehead fully visible (no bangs or hats)<br />
          3. Original photo (no filters or edits)<br />
          4. Full face clearly centered in frame
        </p>
      </div>

      {/* User Info */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ccc', background: '#fafafa' }} />
        
        <label>Birthdate</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="YYYY"
            value={birthdate.slice(0, 4)}
            onChange={(e) => {
              const y = e.target.value.replace(/\D/g, '').slice(0, 4);
              setBirthdate((prev) => y + prev.slice(4));
            }}
            inputMode="numeric"
            maxLength={4}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#fafafa',
              border: '1px solid #ccc',
              borderRadius: '6px'
            }}
          />
          <input
            type="text"
            placeholder="MM"
            value={birthdate.slice(4, 6)}
            onChange={(e) => {
              const m = e.target.value.replace(/\D/g, '').slice(0, 2);
              setBirthdate((prev) => prev.slice(0, 4) + m + prev.slice(6));
            }}
            inputMode="numeric"
            maxLength={2}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#fafafa',
              border: '1px solid #ccc',
              borderRadius: '6px'
            }}
          />
          <input
            type="text"
            placeholder="DD"
            value={birthdate.slice(6, 8)}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 2);
              setBirthdate((prev) => prev.slice(0, 6) + d);
            }}
            inputMode="numeric"
            maxLength={2}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#fafafa',
              border: '1px solid #ccc',
              borderRadius: '6px'
            }}
          />
        </div>

        <label>Analysis Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', background: '#fafafa' }} />
      </div>

      {/* File Upload */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label htmlFor="file-upload" style={{ backgroundColor: '#0066cc', color: '#fff', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>
          📷 Select Your Selfie
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      {(!isPaid && !previewHtml) && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff' }}>
            {loading ? 'Analyzing...' : '✨ Start Free Preview'}
          </button>
        </div>
      )}

      {/* Top 3 Concerns */}
      {previewHtml && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            🌟 Top 3 Skin Concerns
          </h2>
        </div>
      )}

      {displayedHtml && (
        <div className="result-card" style={{ marginTop: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px' }} dangerouslySetInnerHTML={{ __html: displayedHtml }} />
      )}

      {!isPaid && previewHtml && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px' }}>
            🔓 To unlock your full skin report, complete the payment.<br />
            Includes analysis of 9 key skin categories + AM/PM routines.<br />
            <strong>Only $3.99 USD</strong>
          </div>
          <div id="paypal-container-XW5X3YNYP26TN" />
        </div>
      )}

      <p className="footer-email">
        Need help? Contact us at <a href="mailto:admate@atladmate.com">admate@atladmate.com</a>
      </p>
      <p className="footer-email">
        <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
      </p>
    </div>
  );
}
