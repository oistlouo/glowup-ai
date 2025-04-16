const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ⭐️ 별점 시각화 함수 추가
const applyScoreStars = (html) => {
  return html.replace(/<li><strong>Score:<\/strong> (\d)\/5<\/li>/g, (match, p1) => {
    const score = parseInt(p1);
    const stars = '⭐️'.repeat(score) + '☆'.repeat(5 - score);
    return `<li><strong>Score:</strong> ${score}/5 &nbsp; ${stars}</li>`;
  });
};

// ⭐️ AM/PM 루틴 박스 전체 <ul> 감싸도록 개선
const applyRoutineBox = (html) => {
  return html
    .replace(
      /<li>\s*<strong>AM Routine:<\/strong>\s*<ul>([\s\S]*?)<\/ul>\s*<\/li>/,
      (_, content) => {
        return `<li><strong>AM Routine:</strong><div style="background:#e3f2fd; border-radius:8px; padding:12px; margin-top:6px; color:#000;" class="routine-box"><ul>${content.trim()}</ul></div></li>`;
      }
    )
    .replace(
      /<li>\s*<strong>PM Routine:<\/strong>\s*<ul>([\s\S]*?)<\/ul>\s*<\/li>/,
      (_, content) => {
        return `<li><strong>PM Routine:</strong><div style="background:#fce4ec; border-radius:8px; padding:12px; margin-top:6px; color:#000;" class="routine-box"><ul>${content.trim()}</ul></div></li>`;
      }
    );
};

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded.' });

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'glowup-ai',
            use_filename: false,
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

    const uploaded = await streamUpload();
    const imageUrl = uploaded.secure_url;
    console.log("✅ Uploaded Image URL:", imageUrl);

    const prompt = `
당신은 한국의 피부과 전문의입니다. 사용자 얼굴 사진을 기반으로 아래 6가지 항목에 대해 전문적인 피부 진단 리포트를 HTML 형식으로 작성하세요. 말투는 신뢰감 있고 친절한 전문의 스타일이어야 합니다.

분석 항목:  
1. 유수분 밸런스  
2. 색소 침착  
3. 주름  
4. 홍조 및 혈관 상태  
5. 모공 & 피지 분비량  
6. 기미·간반 등 구별 어려운 증상

각 항목에는 아래 2가지만 포함하세요:  
- 진단 결과 (피부 상태에 대한 구체적인 설명)  
- 개선 전략 (전문의로서 현실적인 관리 조언)

HTML 형식 예시는 다음과 같습니다:  
<div class="card" style="background:#1e1e1e; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px">
  <p><strong>진단:</strong> ...</p>
  <p><strong>개선 전략:</strong> ...</p>
</div>

마지막에는 종합 요약 섹션을 작성하세요. 아래 내용을 포함하세요:  
- 피부 타입 요약  
- 주요 피부 고민 3가지  
- 향후 피부 개선 예측 및 관리 팁

HTML 형식은 다음과 같습니다:  
<div class="card" style="background:#2a2a2a; color:#fff; border-radius:12px; padding:24px; margin-top:30px; box-shadow:0 2px 4px rgba(255,255,255,0.05)">
  <h2>✨ 종합 요약</h2>
  ...
</div>

⚠️ 중요 규칙:  
- 반드시 위 6개 항목만 포함할 것  
- 항상 <strong>한글</strong>로 작성할 것  
- 반드시 HTML 형식으로만 출력할 것 (코드블럭, JSON 응답 금지)  

마지막에 반드시 "<h1>🩺 피부과 전문 진단 리포트</h1>"로 시작하고 "<h2>✨ 종합 요약</h2>"로 끝나야 합니다.
응답이 누락되면 안 되며, 짧게 작성해도 되니 무조건 전체 출력이 끝나야 합니다.


`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 3000, // 또는 4096까지 가능 (이 이상 넣으면 에러)
    });

    const rawResult = completion.choices?.[0]?.message?.content || '';

// 경고만 출력하고 중단하지 않음
if (!rawResult || rawResult.length < 100) {
  console.warn('❗ GPT 응답이 너무 짧거나 비어 있습니다.');
  return res.status(500).json({ error: 'GPT 응답이 누락되었거나 너무 짧습니다.' });
}

// 후처리는 최소한만 (불필요한 JSON 제거만)
const fullResult = rawResult
  .replace(/```(json|html)?[\s\S]*?```/g, '')
  .trim();


    const processedResult = fullResult;

    console.log('🧾 Final GPT Result Start ===>\n', processedResult);

    

    res.json({
      fullHtml: processedResult,
      imageUrl,
    });
    
  } catch (err) {
    console.error('❌ Server error:', err);
    if (err.response) {
      const text = await err.response.text?.();
      console.error('🔍 OpenAI API Error Response:', text);
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
