// pages/result.jsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ResultPage() {
  const router = useRouter();
  const [html, setHtml] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fullHtml = sessionStorage.getItem('fullHtml');
      if (!fullHtml) {
        router.push('/upload');
      } else {
        setHtml(fullHtml);
      }

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: isDarkMode ? '#000' : '#fff',
        color: isDarkMode ? '#fff' : '#222',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '20px' }}>피부 분석 결과</h1>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        }}
      />
    </div>
  );
}
