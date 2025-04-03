import React, { useState } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

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
    setResultText('');

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

  const handleDownloadPDF = async () => {
    if (!resultText || !imageUrl) return;

    const concernsMatch = resultText.match(/Top 3 Concerns:\s*<li><strong>(.*?)<\/strong><\/li>/);
    const fallbackMatch = resultText.match(/Top 3 Concerns:\s*(.*?)<\/li>/);
    const concernsRaw = concernsMatch ? concernsMatch[1] : fallbackMatch ? fallbackMatch[1] : '';
    const concernsArray = concernsRaw ? concernsRaw.split(/<br\/?\s*>|,|\n/).map(c => c.trim()).filter(Boolean) : [];

    const topConcernsHTML = concernsArray.length > 0 ? `
      <div style="margin-top: 40px;">
        <h2 style="text-align: center; font-size: 20px; font-weight: bold; color: #333; margin-bottom: 20px;">
          🌟 Top 3 Skin Concerns
        </h2>
        <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          ${concernsArray.map(concern => `
            <div style="
              background: linear-gradient(135deg, #ffe0e0, #e0f7ff);
              padding: 18px;
              border-radius: 14px;
              border: 1px solid #ffc0cb;
              min-width: 160px;
              text-align: center;
              font-weight: 700;
              color: #cc0044;
              font-size: 16px;
              box-shadow: 0 3px 6px rgba(0,0,0,0.08);
            ">
              ${concern.replace(/<.*?>/g, '')}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    try {
      const response = await fetch('http://localhost:5001/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          analysis: `<div>${resultText}</div>`,
          topConcerns: topConcernsHTML,
          name,
          birthdate,
          date
        }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'glowup_report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to generate PDF.');
    }
  };

  const concernsMatch = resultText.match(/Top 3 Concerns:\s*<li><strong>(.*?)<\/strong><\/li>/);
  const fallbackMatch = resultText.match(/Top 3 Concerns:\s*(.*?)<\/li>/);
  const concernsRaw = concernsMatch ? concernsMatch[1] : fallbackMatch ? fallbackMatch[1] : '';
  const concernsArray = concernsRaw ? concernsRaw.split(/<br\/?\s*>|,|\n/).map(c => c.trim()).filter(Boolean) : [];

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      {/* ✅ 다크모드 대응 스타일 추가 */}
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

      {/* 🔥 사용자 정보 입력 필드 */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            color: '#222'
          }}
        />
        <input
          type="date"
          placeholder="Birthdate"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            color: '#222'
          }}
        />
        <input
          type="date"
          placeholder="Analysis Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            color: '#222'
          }}
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

      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Analyzing...' : '✨ Start Analysis'}
        </button>
      </div>

      {resultText && (
        <>
          <div style={{ marginTop: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} dangerouslySetInnerHTML={{ __html: resultText }} />

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

          <div style={{ textAlign: 'center' }}>
            <button onClick={handleDownloadPDF} style={{ marginTop: '30px', padding: '12px 24px', fontSize: '16px', backgroundColor: '#009688', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              📄 Download PDF Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}
