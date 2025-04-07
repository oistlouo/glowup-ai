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

  const concernsMatch = resultText.match(/Top 3 Concerns:\s*<li><strong>(.*?)<\/strong><\/li>/);
  const fallbackMatch = resultText.match(/Top 3 Concerns:\s*(.*?)<\/li>/);
  const concernsRaw = concernsMatch ? concernsMatch[1] : fallbackMatch ? fallbackMatch[1] : '';
  const concernsArray = concernsRaw ? concernsRaw.split(/<br\/?\s*>|,|\n/).map(c => c.trim()).filter(Boolean) : [];

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
            color: #fff !important;
            background-color: #1e1e1e !important;
            border: 1px solid #444 !important;
          }
          input::placeholder {
            color: #ccc !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', textAlign: 'center', marginBottom: '12px' }}>How to Use</h2>
        <ol style={{ fontSize: '15px', lineHeight: '1.6' }}>
          <li>Upload a selfie</li>
          <li>Tap “Analyze”</li>
          <li>Instantly receive expert skin insights and a personalized routine to reveal your glow</li>
        </ol>
        <p style={{ fontSize: '13px', marginTop: '20px', color: '#777' }}>
          For the most accurate results, please upload a selfie that meets the following:<br />
          1. Well-lit with light facing your face<br />
          2. Forehead fully visible (no bangs or hats)<br />
          3. Original photo (no filters or edits)<br />
          4. Full face clearly centered in frame
        </p>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
        <label>Name</label>
        <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fafafa' }} />
        
        <label>Birthdate</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
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
              minWidth: '80px',
              flex: '1 1 30%',
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
              minWidth: '60px',
              flex: '1 1 30%',
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
              minWidth: '60px',
              flex: '1 1 30%',
              padding: '10px',
              backgroundColor: '#fafafa',
              border: '1px solid #ccc',
              borderRadius: '6px'
            }}
          />
        </div>

        <label>Analysis Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fafafa' }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label htmlFor="file-upload" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0066cc', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>
          📷 Select Your Selfie
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Analyzing...' : '✨ Start Free Preview'}
        </button>
      </div>

      {resultText && (
        <>
          {concernsArray.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>🌟 Top 3 Skin Concerns</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {concernsArray.map((concern, index) => (
                  <div key={index} style={{ background: 'linear-gradient(135deg, #ffe0e0, #e0f7ff)', padding: '18px', borderRadius: '14px', border: '1px solid #ffc0cb', minWidth: '160px', textAlign: 'center', fontWeight: '700', color: '#cc0044', fontSize: '16px', boxShadow: '0 3px 6px rgba(0,0,0,0.08)' }}>
                    {concern.replace(/<.*?>/g, '')}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} dangerouslySetInnerHTML={{ __html: resultText }} />

          {!isPaid && previewHtml && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px' }}>
                🔓 To unlock your full skin report, complete the payment.<br />
                Includes analysis of 9 key skin categories + AM/PM routines.<br />
                <strong>Only $3.99 USD</strong><br />
                <span style={{ fontSize: '13px', color: '#999', marginTop: '6px' }}>
                  After payment, you'll be able to start your analysis
                </span>
              </div>
              <div id="paypal-container-XW5X3YNYP26TN" />
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: '40px', fontSize: '13px', color: '#666', textAlign: 'center' }}>
        Need help? Contact us at <strong>admate@atladmate.com</strong><br />
        <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
      </p>
    </div>
  );
}


