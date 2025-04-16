import React, { useEffect, useState } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fullHtml, setFullHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
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


      setFullHtml(data.fullHtml);
      setImageUrl(data.imageUrl);


    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const displayedHtml = fullHtml;

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

      

      <div style={{ textAlign: 'center' }}>
  <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff' }}>
    {loading ? '🧬 Analyzing now — your results will shine in 5 minutes ✨' : '✨ Start Analyze'}
  </button>
</div>

{fullHtml && (
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

