// upload.jsx
import React, { useState, useEffect } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fullHtml, setFullHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // 이미지 변경 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 업로드 및 백엔드 호출
  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setFullHtml('');
  
    const formData = new FormData();
    formData.append('image', image);
  
    try {
      // 백엔드 URL을 환경변수로 설정
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error details:', errorText);
        throw new Error('Server responded with error');
      }
  
      const data = await response.json();
      if (!data.fullHtml) {
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
  

  return (
    <div>
      <h1>Upload your selfie for analysis</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Analyzing...' : 'Start Analysis'}
      </button>

      {/* 이미지 미리보기 */}
      {previewUrl && <img src={previewUrl} alt="Preview" />}

      {/* 분석 결과 */}
      {fullHtml && <div dangerouslySetInnerHTML={{ __html: fullHtml }} />}
    </div>
  );
}
