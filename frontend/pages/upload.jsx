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
          }
          input, h1, h2, p, label {
            color: #fff !important;
          }
        }
      `}</style>

      {/* ✅ Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '10px' }}>GlowUp.AI</h1>
        <p style={{ fontSize: '18px', fontWeight: '500' }}>AI가 당신의 피부 상태를 진단합니다</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>Developed with top Korean dermatologists & trusted by over 100,000 users</p>
      </div>

      {/* ✅ Before & After */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="https://via.placeholder.com/120x120?text=Before" alt="Before" style={{ borderRadius: '12px' }} />
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Before</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src="https://via.placeholder.com/120x120?text=After" alt="After" style={{ borderRadius: '12px' }} />
          <p style={{ fontSize: '13px', marginTop: '6px' }}>After 3 months</p>
        </div>
      </div>

      {/* ✅ Testimonial */}
      <div style={{ background: '#f8f8f8', padding: '20px', borderRadius: '10px', fontSize: '14px', marginBottom: '30px' }}>
        "처음 진단 받고 3개월 루틴을 지켰더니 피부결이 눈에 띄게 좋아졌어요!" — <strong>Jane (NY)</strong>
      </div>

      {/* ✅ Trust Logos */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '50px' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/OpenAI_Logo.svg" alt="OpenAI" style={{ height: '30px' }} />
        <img src="https://via.placeholder.com/100x30?text=K-Derm" alt="K-Derm" />
        <img src="https://via.placeholder.com/100x30?text=100K+Trusted" alt="Trust" />
      </div>

      {/* ✅ Upload Form */}
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
        </>
      )}
    </div>
  );
}
