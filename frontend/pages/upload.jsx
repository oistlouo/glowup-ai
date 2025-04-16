import React, { useState, useEffect } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [amPreview, setAmPreview] = useState([]);
  const [pmPreview, setPmPreview] = useState([]);

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
        throw new Error('Incomplete result from server – GPT output may have been cut off');
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




      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? '🧬 Analyzing now — your results will shine in 5 minutes ✨' : '✨ Start Analyze'}
        </button>
      </div>


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


      <p style={{ marginTop: '40px', fontSize: '13px', color: '#666', textAlign: 'center' }}>
        문의사항은 이메일로 <strong>admate@atladmate.com</strong><br />
      </p>
    </div>
  );
}


