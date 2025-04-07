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

  const [top3Insights, setTop3Insights] = useState([]);
  const [amRoutinePreview, setAmRoutinePreview] = useState([]);

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

  const extractInsights = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const listItems = Array.from(doc.querySelectorAll('li')).map(li => li.textContent.trim());
    const insights = listItems.filter(item =>
      item.toLowerCase().includes('sebum') ||
      item.toLowerCase().includes('hydration') ||
      item.toLowerCase().includes('texture')
    ).slice(0, 3);
    return insights;
  };

  const extractAmRoutine = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const amDiv = Array.from(doc.querySelectorAll('div')).find(div =>
      div.textContent.toLowerCase().includes('am routine')
    );
    if (!amDiv) return [];
    const lines = amDiv.textContent.split('\n').map(line => line.trim()).filter(Boolean);
    return lines.slice(0, 2);
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setPreviewHtml('');
    setFullHtml('');

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
      if (!data.previewHtml || !data.fullHtml) {
        throw new Error('Incomplete result from server');
      }

      setPreviewHtml(data.previewHtml);
      setFullHtml(data.fullHtml);
      setImageUrl(data.imageUrl);
      setTop3Insights(extractInsights(data.previewHtml));
      setAmRoutinePreview(extractAmRoutine(data.previewHtml));
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
    <div style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', color: isDarkMode ? '#fff' : '#222' }}>
      {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', marginTop: '20px', borderRadius: '8px' }} />}

      {(!isPaid && !previewHtml) && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleUpload} disabled={loading} style={{ marginTop: '20px', padding: '12px 28px', fontSize: '16px', backgroundColor: '#444', color: '#fff' }}>
            {loading ? 'Analyzing...' : '✨ Start Analyze'}
          </button>
        </div>
      )}

      {!isPaid && previewHtml && (
        <>
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              🌟 Top 3 Skin Insights (Free Preview)
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'center', fontSize: '16px', lineHeight: '1.8' }}>
              {top3Insights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '40px' }}>
            <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              🔒 Locked Analysis Sections
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'center', color: '#888', fontSize: '15px', lineHeight: '1.6' }}>
              <li>🔒 Pores</li>
              <li>🔒 Redness</li>
              <li>🔒 Wrinkles</li>
              <li>🔒 Pigmentation</li>
              <li>🔒 Skin Tone</li>
              <li>🔒 Sensitivity</li>
              <li>🔒 Total Score</li>
              <li>🔒 Skin Type Summary</li>
              <li>🔒 Personalized AM/PM Routine</li>
            </ul>
          </div>

          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: isDarkMode ? '#fff' : '#222' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>💧 AM Routine (Preview)</h4>
            {amRoutinePreview.map((line, idx) => (
              <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
            ))}
            <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#999', marginTop: '6px' }}>→ Unlock full 5-step routine with instructions</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <div className="paypal-info" style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>
              Start your skin transformation now for just <span style={{ color: '#cc0044' }}>$3.99</span> 💎<br />
              Your personal skin consultant — no clinic visit needed.
            </div>
            <div id="paypal-container-XW5X3YNYP26TN" />
          </div>
        </>
      )}

      {isPaid && (
        <div style={{ marginTop: '30px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: '#000' }} dangerouslySetInnerHTML={{ __html: fullHtml }} />
      )}

      <p style={{ marginTop: '40px', fontSize: '13px', color: '#666', textAlign: 'center' }}>
        Need help? Contact us at <strong>admate@atladmate.com</strong><br />
        <strong>Refund Policy:</strong> All purchases are final and non-refundable due to the nature of digital AI analysis.
      </p>
    </div>
  );
}


