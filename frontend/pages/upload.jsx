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
  const [amPreview, setAmPreview] = useState([]);
  const [pmPreview, setPmPreview] = useState([]);
  const [previewInsights, setPreviewInsights] = useState([]);

  const extractAmRoutine = (html) => {
    const match = html.match(/AM Routine.*?<ul>([\s\S]*?)<\/ul>/i);
    if (!match) return [];
    const steps = match[1].match(/<li>(.*?)<\/li>/g) || [];
    return steps.slice(0, 2).map(step => step.replace(/<[^>]+>/g, ''));
  };

  const extractRoutineSteps = (html, type) => {
    const regex = new RegExp(`${type}\\s*Routine.*?<ul>([\\s\\S]*?)</ul>`, 'i');
    const match = html.match(regex);
    if (!match) return [];
    const steps = match[1].match(/<li>(.*?)<\/li>/g) || [];
    return steps.map(step => step.replace(/<[^>]+>/g, '').trim());
  };

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

      setPreviewInsights(data.previewInsights || []);
      const amSteps = extractRoutineSteps(data.fullHtml, 'AM');    // ✅ 추가
      const pmSteps = extractRoutineSteps(data.fullHtml, 'PM');    // ✅ 추가

      setAmPreview(amSteps.slice(0, 2));                           // ✅ 수정
      setPmPreview(pmSteps.slice(0, 2));                           // ✅ 추가

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
      {/* 상단 입력 섹션은 이미 적용된 상태 */}

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label htmlFor="file-upload" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0066cc', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>
          📷 Select Your Selfie
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      {!isPaid && previewHtml && (
  <div style={{ textAlign: 'center', marginTop: '12px' }}>
    <button
      onClick={() => setIsPaid(true)}
      style={{
        backgroundColor: '#e53935',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        border: 'none'
      }}
    >
      🧪 Show Full Report (Dev Only)
    </button>
  </div>
)}


      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Analyzing...' : '✨ Start Analyze'}
        </button>
      </div>

      {resultText && (
        <>
          {/* 🔓 Free Preview: 실제 분석 결과 3개 */}
          <div style={{ marginTop: '40px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>
  ✨ Your Free Glow Breakdown – 3 Personalized Skin Insights
</h2>

<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
{previewInsights.length === 0 && (
  <p style={{ textAlign: 'center', color: '#888' }}>
    No skin insights available. Please try again with a clearer photo.
  </p>
)}

{previewInsights.length > 0 && previewInsights.map((item, idx) => (
  <div
    key={idx}
    style={{
      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
      color: isDarkMode ? '#f5f5f5' : '#222',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: isDarkMode
        ? '0 2px 6px rgba(255, 255, 255, 0.05)'
        : '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
    }}
  >
    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
      🔹 {item.category} <span style={{ fontWeight: '400' }}>– {item.emotionalHook}</span>
    </h3>
    <p style={{ marginBottom: '8px' }}>
      <strong>Diagnosis:</strong> {item.status}
    </p>
    <p style={{ marginBottom: '8px' }}>
      <strong>Solution:</strong> {item.solution}
    </p>
    <p style={{ marginBottom: '8px' }}>
      <strong>Recommended Product:</strong> {item.product}
    </p>
    <p style={{ marginBottom: '0px' }}>
      <strong>Why It Works:</strong> {item.reason}
    </p>
  </div>
))}

</div>

          </div>

          {/* 🔒 Locked Items */}
          <div style={{ marginTop: '40px' }}>
  <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
    🔒 Locked Analysis Sections
  </h3>
  <ul style={{ listStyle: 'none', padding: 0, textAlign: 'center', color: '#888', fontSize: '15px', lineHeight: '1.6' }}>
    <li>🔒 Pores - Analyze pore visibility, size & congestion level</li>
    <li>🔒 Redness - Detect inflammation, sensitivity & irritation zones</li>
    <li>🔒 Wrinkles - Detect fine lines & early aging signs</li>
    <li>🔒 Pigmentation - Identify dark spots, freckles & sun damage</li>
    <li>🔒 Skin Tone - AI color correction + hyperpigmentation mapping</li>
    <li>🔒 Sensitivity - Assess reactivity to heat, touch, and skincare</li>
    <li>🔒 Total Score - Overall skin health score (0–45)</li>
    <li>🔒 Skin Type Summary - Identify your skin type & characteristics</li>
    <li>🔒 Personalized AM/PM Routine - Product-specific, time-based regimen</li>
  </ul>
  <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
    → Unlock for a dermatologist-style full report
  </p>
</div>


          {/* 💸 결제 유도 문구 + 버튼 */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            🔍 Understand your skin better than ever before.<br />
            🔓 Unlock 9 expert-level insights to reveal your personalized skincare routine.<br />
            💎 Just $3.99 — Get your complete skin blueprint today.
            </div>
            
            <div id="paypal-container-XW5X3YNYP26TN" />
          </div>
        </>
      )}

{isPaid && (
  <>
    <div
      style={{
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '20px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      }}
    >
      Hey {name || 'there'}, here’s what your skin is telling us today — and how we’ll glow it up ✨
    </div>

    <div
      style={{
        marginTop: '30px',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      dangerouslySetInnerHTML={{ __html: fullHtml }}
    />
  </>
)}


      <p style={{ marginTop: '40px', fontSize: '13px', color: '#666', textAlign: 'center' }}>
        Need help? Contact us at <strong>admate@atladmate.com</strong><br />
        <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
      </p>
    </div>
  );
}


