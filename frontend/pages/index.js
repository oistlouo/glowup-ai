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
      // 변경된 부분: Render로 배포된 백엔드 URL로 수정
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

  const handleDownloadPDF = async () => {
    if (!resultText || !imageUrl) return;

    try {
      // 변경된 부분: Render로 배포된 백엔드 URL로 수정
      const response = await fetch('https://glowup-ai.onrender.com/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          analysis: `<div>${resultText}</div>`
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
