// ✅ GlowUp.AI — 무료 분석 구조, 결제 제거, 분석 즉시 결과 출력
import React, { useEffect, useState } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [fullHtml, setFullHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    formData.append('name', name);
    formData.append('age', age);

    try {
      const response = await fetch('https://glowup-ai.onrender.com/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 오류:', errorText);
        throw new Error('서버 응답 오류');
      }

      const data = await response.json();
      if (!data.previewHtml || !data.fullHtml) {
        throw new Error('서버 응답 누락 — GPT 결과 부족');
      }

      setPreviewInsights(data.previewInsights || []);
      setPreviewHtml(data.previewHtml);
      setFullHtml(data.fullHtml);
      setImageUrl(data.imageUrl);

      const extractedInsights = extractTop3Insights(data.previewHtml);
      setTop3Insights(extractedInsights);

      const amSteps = extractAmRoutine(data.previewHtml);
      setAmPreview(amSteps);
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      <h1 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '800' }}>GlowUp.AI 피부 상태 분석기</h1>

      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label htmlFor="file-upload" style={{ backgroundColor: '#0066cc', color: '#fff', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>
          📷 셀카 업로드하기
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ fontWeight: 'bold' }}>나이</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="예: 25"
          style={{ width: '100%', padding: '10px', marginTop: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
        />
      </div>

      {previewUrl && <img src={previewUrl} alt="업로드된 이미지 미리보기" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      <div style={{ textAlign: 'center' }}>
        <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff' }}>
          {loading ? '🔍 피부 분석 중...' : '✨ 지금 바로 분석하기'}
        </button>
      </div>

      {fullHtml && (
        <div
          style={{
            marginTop: '40px',
            backgroundColor: isDarkMode ? '#000' : '#fff',
            color: isDarkMode ? '#fff' : '#222',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
          dangerouslySetInnerHTML={{ __html: fullHtml }}
        />
      )}
    </div>
  );
}
