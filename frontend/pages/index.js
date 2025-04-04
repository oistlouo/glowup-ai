import React, { useEffect, useState } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultText, setResultText] = useState('');
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
    setResultText('');

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
      if (!data.result || data.result.trim() === '') {
        throw new Error('No result returned from server');
      }

      setResultText(data.result);
      setImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const concernsMatch = resultText.match(/Top 3 Concerns:\s*<li><strong>(.*?)<\/strong><\/li>/);
  const fallbackMatch = resultText.match(/Top 3 Concerns:\s*(.*?)<\/li>/);
  const concernsRaw = concernsMatch ? concernsMatch[1] : fallbackMatch ? fallbackMatch[1] : '';
  const concernsArray = concernsRaw ? concernsRaw.split(/<br\/?\s*>|,|\n/).map(c => c.trim()).filter(Boolean) : [];

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=BAAwOk4pNQMtsvhlLL_t1mVXYJ8IVvo7hi01PUDAy1bAkBXud17i_QzZVXdmjSrBZntcYrxV2icLmu2Ndo&components=hosted-buttons&disable-funding=venmo&currency=USD";
    script.addEventListener("load", () => {
      if (window.paypal) {
        window.paypal.HostedButtons({
          hostedButtonId: "XW5X3YNYP26TN",
          onApprove: () => {
            setIsPaid(true);
          },
        }).render("#paypal-container-XW5X3YNYP26TN");
      }
    });
    document.body.appendChild(script);
  }, []);

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      <style>{`
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #121212;
          }
          input {
            background-color: #1e1e1e;
            color: #fff !important;
            border: 1px solid #444;
          }
          h1, p, label {
            color: #fff !important;
          }
          .result-card {
            background-color: #1e1e1e !important;
            color: #fff !important;
          }
          .result-card div[style*="background:#e3f2fd"] {
            background-color: #2a4f73 !important;
            color: #fff !important;
          }
          .result-card div[style*="background:#fce4ec"] {
            background-color: #743a54 !important;
            color: #fff !important;
          }
          .paypal-info {
            color: #fff !important;
          }
          .footer-email {
            color: #aaa !important;
          }
        }
        .paypal-info {
          color: #000;
          font-size: 14px;
          text-align: center;
          margin-bottom: 12px;
        }
        .footer-email {
          font-size: 13px;
          text-align: center;
          margin-top: 40px;
          color: #666;
        }
        .result-card div[style*="background:#e3f2fd"],
        .result-card div[style*="background:#fce4ec"] {
          color: #000 !important;
        }
        .result-card .routine-box {
          padding-left: 18px;
          line-height: 1.6;
        }
        .result-card .routine-box li {
          margin-bottom: 6px;
        }
        .ingredient-label {
          font-weight: bold;
          display: inline-block;
          padding: 2px 6px;
          background: #e0f7fa;
          border-radius: 6px;
          margin: 4px 0;
        }
      `}</style>

      <h1 style={{ fontSize: '36px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>
        GlowUp.AI
      </h1>
      <p style={{ textAlign: 'center', fontSize: '16px', color: '#000', marginBottom: '12px' }}>
        Discover your skin's hidden story with GlowUp.AI ✨
      </p>
      <p style={{ textAlign: 'center', fontSize: '14px', color: '#000', marginBottom: '30px' }}>
        Powered by Korean dermatology and AI-driven beauty insight
      </p>

      <p style={{ fontSize: '14px', color: '#777', textAlign: 'center', lineHeight: '1.6', marginTop: '10px', marginBottom: '30px' }}>
        For the most accurate results, please upload a selfie that meets the following:
        <br />
        1. Well-lit with light facing your face
        <br />
        2. Forehead fully visible (no bangs or hats)
        <br />
        3. Original photo (no filters or edits)
        <br />
        4. Full face clearly centered in frame
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Name</label>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', color: '#222' }}
        />
        <label htmlFor="birthdate" style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
          Birthdate
        </label>
        <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', color: '#222' }}
        />
        <label htmlFor="date" style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
          Analysis Date
        </label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', color: '#222' }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <label htmlFor="file-upload" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0066cc',
          color: '#fff',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}>
          📷 Select Your Selfie
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />
      )}

      {!isPaid && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className="paypal-info">
            After payment, you'll be able to start your analysis
            <br />
            <strong>$3.99 USD</strong>
          </div>
          <div id="paypal-container-XW5X3YNYP26TN" />
        </div>
      )}

      {isPaid && !resultText && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {loading ? 'Analyzing...' : '✨ Start Analysis'}
          </button>
        </div>
      )}

      {resultText && (
        <>
          <div className="result-card" style={{ marginTop: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            dangerouslySetInnerHTML={{ __html: resultText }} />
          {concernsArray.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
                🌟 Top 3 Skin Concerns
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {concernsArray.map((concern, index) => (
                  <div key={index} style={{ background: 'linear-gradient(135deg, #ffe0e0, #e0f7ff)', padding: '18px', borderRadius: '14px', border: '1px solid #ffc0cb', minWidth: '160px', textAlign: 'center', fontWeight: '700', color: '#cc0044', fontSize: '16px', boxShadow: '0 3px 6px rgba(0,0,0,0.08)' }}>
                    {concern.replace(/<.*?>/g, '')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="footer-email">
        Need help? Contact us at <a href="mailto:admate@atladmate.com" style={{ color: '#0066cc' }}>admate@atladmate.com</a>
      </p>
      <p className="footer-email">
  <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
</p>

    </div>
  );
}
