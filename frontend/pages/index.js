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

  const displayedHtml = isPaid ? fullHtml : previewHtml;

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
      <p style={{ fontSize: '14px', color: '#777', textAlign: 'center', lineHeight: '1.6', marginTop: '10px', marginBottom: '30px' }}>
        For the most accurate results, please upload a selfie that meets the following:
        <br />1. Well-lit with light facing your face
        <br />2. Forehead fully visible (no bangs or hats)
        <br />3. Original photo (no filters or edits)
        <br />4. Full face clearly centered in frame
      </p>

      {/* User Info */}
      <div style={{ marginBottom: '24px' }}>
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px' }} />
        <label>Birthdate</label>
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px' }} />
        <label>Analysis Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px' }} />
      </div>

      {/* File Upload */}
      <div style={{ textAlign: 'center' }}>
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

      {/* ✅ Preview Title */}
      {previewHtml && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            🌟 AI가 분석한 당신의 핵심 피부 문제 3가지
          </h2>
        </div>
      )}

      {/* ✅ PayPal Button after preview only */}
      {!isPaid && previewHtml && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px' }}>
            🔓 전체 피부 분석을 확인하려면 결제가 필요합니다.
            <br />
            9가지 항목별 전문가 분석과 AM/PM 루틴을 포함한
            <br />
            <strong>맞춤형 스킨케어 리포트</strong>를 확인해보세요 – <strong>$3.99 USD</strong>
          </div>
          <div id="paypal-container-XW5X3YNYP26TN" />
        </div>
      )}

      {/* ✅ Full Report Title */}
      {isPaid && fullHtml && (
        <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '12px' }}>
          🔓 전체 리포트 – 전문가 피부 분석 + 홈케어 솔루션
        </h2>
      )}

      {displayedHtml && (
        <div className="result-card" style={{ marginTop: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px' }} dangerouslySetInnerHTML={{ __html: displayedHtml }} />
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
