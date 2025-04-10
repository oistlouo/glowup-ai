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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [amPreview, setAmPreview] = useState([]);
  const [top3Insights, setTop3Insights] = useState([]);
  const [previewInsights, setPreviewInsights] = useState([]);
  const extractAmRoutine = (html) => {
    const match = html.match(/AM Routine.*?<ul>([\s\S]*?)<\/ul>/i);
    if (!match) return [];
    const steps = match[1].match(/<li>(.*?)<\/li>/g) || [];
    return steps.slice(0, 2).map(step => step.replace(/<[^>]+>/g, ''));
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

  const extractTop3Insights = (html) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    const items = Array.from(container.querySelectorAll('li'));
    const insights = [];
  
    for (let li of items) {
      const text = li.textContent.toLowerCase();
      if (text.includes('sebum') || text.includes('hydration') || text.includes('texture')) {
        insights.push(li.textContent);
      }
      if (insights.length >= 3) break;
    }
  
    return insights;
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
        throw new Error('Incomplete result from server – GPT output may have been cut off');
      }

      setPreviewInsights(data.previewInsights || []);
      console.log("🧪 previewInsights data:", data.previewInsights);

      setPreviewHtml(data.previewHtml);
      setFullHtml(data.fullHtml);
      setImageUrl(data.imageUrl);

      const extractedInsights = extractTop3Insights(data.previewHtml);
      setTop3Insights(extractedInsights);
      
      const amSteps = extractAmRoutine(data.previewHtml);
      setAmPreview(amSteps);
      
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
    <div style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
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
          input::placeholder,
          input::-webkit-input-placeholder,
          input::-moz-placeholder,
          input:-ms-input-placeholder,
          input:-moz-placeholder {
            color: #ccc !important;
            opacity: 1 !important;
          }
          .card, .result-card {
            background-color: #1e1e1e !important;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '12px' }}>GlowUp.AI</h1>
        Let AI decode your skin — and unlock your glow.
        
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>How to Use</h2>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          1. Upload a selfie<br />
          2. Tap “Analyze”<br />
          3. Instantly receive expert skin insights and a personalized routine to reveal your glow
        </p>
      </div>

      <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <p style={{ fontSize: '14px', color: isDarkMode ? '#ccc' : '#777', lineHeight: '1.6', textAlign: 'center' }}>
          For the most accurate results, please upload a selfie that meets the following:<br />
          1. Well-lit with light facing your face<br />
          2. Forehead fully visible (no bangs or hats)<br />
          3. Original photo (no filters or edits)<br />
          4. Full face clearly centered in frame
        </p>
      </div>

      <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <label style={{ color: isDarkMode ? '#fff' : '#222' }}>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ccc', background: '#fafafa' }} />
        <label style={{ color: isDarkMode ? '#fff' : '#222' }}>Birthdate</label>
        <div className="birthdate-group" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="YYYY" value={birthdate.slice(0, 4)} onChange={(e) => {
            const y = e.target.value.replace(/\D/g, '').slice(0, 4);
            setBirthdate((prev) => y + prev.slice(4));
          }} inputMode="numeric" maxLength={4} style={{ flex: 1, minWidth: '80px', padding: '10px', backgroundColor: '#fafafa', border: '1px solid #ccc', borderRadius: '6px' }} />
          <input type="text" placeholder="MM" value={birthdate.slice(4, 6)} onChange={(e) => {
            const m = e.target.value.replace(/\D/g, '').slice(0, 2);
            setBirthdate((prev) => prev.slice(0, 4) + m + prev.slice(6));
          }} inputMode="numeric" maxLength={2} style={{ flex: 1, minWidth: '60px', padding: '10px', backgroundColor: '#fafafa', border: '1px solid #ccc', borderRadius: '6px' }} />
          <input type="text" placeholder="DD" value={birthdate.slice(6, 8)} onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 2);
            setBirthdate((prev) => prev.slice(0, 6) + d);
          }} inputMode="numeric" maxLength={2} style={{ flex: 1, minWidth: '60px', padding: '10px', backgroundColor: '#fafafa', border: '1px solid #ccc', borderRadius: '6px' }} />
        </div>
        <label style={{ color: isDarkMode ? '#fff' : '#222' }}>Analysis Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', background: '#fafafa' }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label htmlFor="file-upload" style={{ backgroundColor: '#0066cc', color: '#fff', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>📷 Select Your Selfie</label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      

      {(!isPaid && !previewHtml) && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff' }}>
            {loading ? 'lyzing now — your results will shine in 5 minutes ✨' : '✨ Start Analyze'}
          </button>
        </div>
      )}

{!isPaid && previewHtml && (
  <>
    {/* 🔓 Free Preview: 실제 분석 결과 3개 */}
    <div style={{ marginTop: '40px' }}>
      
    <div style={{
  backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
  color: isDarkMode ? '#fff' : '#222',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  marginBottom: '30px'
}}>


</div>

      <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
        🌟 Top 3 Skin Insights (Free Preview)
      </h2>
      {previewInsights.length > 0 ? (
  <>
    <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
      ✨ Your Free Glow Breakdown – Top 3 Skin Insights
    </h2>

    {previewInsights.slice(0, 3).map((item, idx) => (
      <div key={idx} style={{ /* 카드 스타일 생략 */ }}>
        <h3 style={{ fontSize: '17px', marginBottom: '12px' }}>
          {idx + 1}. <strong>{item.category}</strong> – {item.emotionalHook}
        </h3>
        <p><strong>Diagnosis:</strong> {item.status}</p>
        <p><strong>Solution:</strong> {item.solution}</p>
        <p><strong>Recommended Product:</strong> {item.product}</p>
        <p><strong>Why It Works:</strong> {item.reason}</p>
      </div>
    ))}

    {previewInsights.length < 3 && (
      <p style={{ textAlign: 'center', fontSize: '14px', color: '#999', marginTop: '8px' }}>
        Only {previewInsights.length} insight{previewInsights.length === 1 ? '' : 's'} available for this photo.<br />
        For more detailed results, try uploading a clearer or brighter selfie.
      </p>
    )}
  </>
) : (
  <p style={{ textAlign: 'center', fontSize: '14px', color: '#999' }}>
    No insights could be generated. Try uploading a higher-quality selfie.
  </p>
)}


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


  
</div>

  <p style={{ fontSize: '13px', color: '#999', marginTop: '6px' }}>→ Unlock full 5-step routine with instructions</p>


    {/* 💸 결제 유도 */}
    <div style={{ textAlign: 'center', marginTop: '30px' }}>
      <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>
      Your Full Skin Report Awaits 👀  
      Unlock 9 in-depth AI insights + your personal AM/PM routine.  
      ✅ Dermatologist-grade breakdown  
      ✅ Personalized product recommendations  
      ✅ Visual pore + pigmentation analysis  
      </div>
      
      <div id="paypal-container-XW5X3YNYP26TN" />
    </div>
  </>
)}

{isPaid && (
  <>
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '20px',
      borderRadius: '12px',
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '20px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
    }}>
      Hey {name || 'there'}, here’s what your skin is telling us today – and how we’ll glow it up ✨
    </div>

    <div
  style={{
    marginTop: '30px',
    backgroundColor: isDarkMode ? '#000000' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#222222',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  }}
  dangerouslySetInnerHTML={{ __html: fullHtml }}
/>

  </>
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

