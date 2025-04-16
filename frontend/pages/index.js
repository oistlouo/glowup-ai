export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function UploadPage() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
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
      let html = data.fullHtml || '';

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fullHtml', html);
        sessionStorage.setItem('imageUrl', data.imageUrl || '');
        setTimeout(() => {
          router.push('/result');
        }, 300);
      }
    } catch (error) {
      console.error('분석 실패:', error);
      alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '720px', margin: '0 auto', fontFamily: 'sans-serif', color: '#222' }}>
      <h1 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '800' }}>GlowUp.AI 피부 분석기</h1>

      <p style={{ marginTop: '20px', fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
        📸 <strong>분석 정확도를 높이기 위해 다음을 지켜주세요:</strong><br />
        - 이마부터 턱까지 얼굴 전체가 나오게 찍기<br />
        - 밝은 자연광 혹은 조명 아래에서 촬영 (그림자 X)<br />
        - 카메라를 정면으로 보고, 필터나 화장 없이 쌩얼로 촬영
      </p>

      <div style={{ marginTop: '24px' }}>
        <label style={{ fontWeight: 'bold' }}>닉네임</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 민수"
          style={{ width: '100%', padding: '10px', marginTop: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
        />
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

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <label htmlFor="file-upload" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0066cc', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>
          📷 셀카 업로드
        </label>
        <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="미리보기" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />
      )}

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            marginTop: '20px',
            padding: '12px 28px',
            fontSize: '16px',
            backgroundColor: '#444',
            color: '#fff',
            borderRadius: '6px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <span className="loading-text">
              🧬 지금 분석 중입니다. 최대 3분 정도 소요돼요...
            </span>
          ) : (
            '✨ 분석 시작'
          )}

          <style jsx>{`
            .loading-text {
              display: inline-block;
              animation: pulse 1.4s ease-in-out infinite;
            }

            @keyframes pulse {
              0% {
                opacity: 1;
                transform: translateY(0px);
              }
              50% {
                opacity: 0.6;
                transform: translateY(-2px);
              }
              100% {
                opacity: 1;
                transform: translateY(0px);
              }
            }
          `}</style>
        </button>
      </div>
    </div>
  );
}
