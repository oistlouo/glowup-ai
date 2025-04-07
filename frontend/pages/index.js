import React, { useState, useEffect } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [fullHtml, setFullHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(match);
    }
  }, []);

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
      const response = await fetch('http://localhost:5001/analyze', {
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

  const resultText = isPaid ? fullHtml : previewHtml;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '760px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      <style>{`
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #121212;
            color: #fff;
          }
          input, h1, h2, p, label, div {
            color: #fff !important;
          }
          input {
            background-color: #1e1e1e !important;
            border: 1px solid #444 !important;
            color: #fff !important;
          }
          input::placeholder {
            color: #ccc !important;
            opacity: 1 !important;
          }
          .card, .result-card {
            background-color: #1e1e1e !important;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label htmlFor="file-upload" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0066cc', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>
          📷 Select Your Selfie
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Analyzing...' : '✨ Start Analyze'}
        </button>
      </div>

      {previewHtml && !isPaid && (
        <>
          <h2 style={{ marginTop: '40px', fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>Your Free Preview</h2>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px', textAlign: 'center', fontSize: '16px', lineHeight: '1.8' }}>
            <li>✅ Sebum (T-zone vs Cheeks): Balanced</li>
            <li>❌ Hydration Level: Low</li>
            <li>🟡 Texture: Uneven</li>
          </ul>

          <h3 style={{ marginTop: '40px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>🔒 Locked Sections (Unlock Full Report)</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px', textAlign: 'center', color: '#888', fontSize: '15px' }}>
            <li>🔒 Pores</li>
            <li>🔒 Redness</li>
            <li>🔒 Wrinkles</li>
            <li>🔒 Pigmentation</li>
            <li>🔒 Skin Tone</li>
            <li>🔒 Sensitivity</li>
            <li>🔒 Total Core Score</li>
            <li>🔒 Skin Type Summary</li>
            <li>🔒 AM/PM Routine</li>
            <li>🔒 Personalized Timeline</li>
          </ul>

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>💧 AM Routine (Sample Preview)</h4>
            <p style={{ margin: '8px 0' }}>Cleanser: Gentle Gel Cleanser</p>
            <p style={{ margin: '8px 0' }}>Serum: Vitamin C Booster</p>
            <p style={{ fontSize: '14px', color: '#888' }}>→ Unlock full 5-step routine with usage guide</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px' }}>
              <strong>Start transforming your skin today — all for just $3.99.</strong><br />
              Your personal skin consultant, no clinic needed.
            </div>
            <div id="paypal-container-XW5X3YNYP26TN" />
          </div>
        </>
      )}

      {isPaid && (
        <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} dangerouslySetInnerHTML={{ __html: fullHtml }} />
      )}

      <p style={{ marginTop: '40px', fontSize: '13px', color: '#666', textAlign: 'center' }}>
        Need help? Contact us at <strong>admate@atladmate.com</strong><br />
        <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
      </p>
    </div>
  );
}


