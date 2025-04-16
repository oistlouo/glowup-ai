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
당신은 한국의 피부과 전문의입니다. 지금부터 제공되는 얼굴 사진을 바탕으로, 전문적인 피부 진단 리포트를 HTML 형식으로 작성해야 합니다.

분석은 오직 아래의 6가지 항목으로만 제한합니다. 다른 항목은 절대 포함하지 마세요:

<h1>🩺 피부과 전문 진단 리포트</h1>

<h2>1. 유수분 밸런스</h2>
<h2>2. 색소 침착</h2>
<h2>3. 주름</h2>
<h2>4. 홍조와 혈관 상태</h2>
<h2>5. 모공 & 피지 분비량</h2>
<h2>6. 기미·간반 등 구별 어려운 증상</h2>

각 항목에 대해 아래 4가지 요소를 포함하세요:
- 진단 결과 (피부과 전문의처럼 구체적으로)
- 개선 전략 (실제로 환자에게 조언하듯 신뢰감 있게)
- 추천 제품 (브랜드 포함, 현실성 있는 제품)
- 추천 이유 (주요 성분, 작용 원리, 기대 효과 등)

각 항목은 다음과 같은 구조의 HTML 카드로 작성되어야 합니다:

<div class="card" style="background:#1e1e1e; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px">
  <p><strong>진단:</strong> ...</p>
  <p><strong>개선 전략:</strong> ...</p>
  <p><strong>추천 제품:</strong> [브랜드] 제품명</p>
  <p><strong>추천 이유:</strong> ...</p>
</div>

모든 항목을 다 작성한 후, 종합 분석 요약을 반드시 포함하세요:

<h2>✨ 종합 요약</h2>

- 피부 타입 한줄 요약 (예: 수분 부족형 지성 피부)
- 주요 피부 고민 3가지 (항목명과 간단한 이유)
- 추천 제품 3가지 (브랜드 포함, 각 제품 추천 이유도 포함)
- 마지막 문단: 피부 개선 예측 및 조언 (예: "3~4주 후 피부결이 부드러워지고, 색소가 옅어지는 변화를 경험할 수 있습니다.")

다음과 같은 형식으로 작성하세요:

<div class="card" style="background:#2a2a2a; color:#fff; border-radius:12px; padding:24px; margin-top:30px; box-shadow:0 2px 4px rgba(255,255,255,0.05)">
  <h2>✨ 종합 요약</h2>
  <p><strong>피부 타입:</strong> ...</p>
  <p><strong>주요 고민:</strong> 1) ... 2) ... 3) ...</p>
  <p><strong>추천 제품:</strong></p>
  <ul>
    <li>[브랜드] 제품명 – 추천 이유</li>
    <li>[브랜드] 제품명 – 추천 이유</li>
    <li>[브랜드] 제품명 – 추천 이유</li>
  </ul>
  <p><strong>개선 예상:</strong> ...</p>
</div>

⚠️ 중요 규칙:
- 반드시 6개 항목으로만 분석할 것
- 항상 <strong>한글</strong>로 작성할 것
- 반드시 HTML로 응답할 것 (코드블럭, JSON 사용 금지)
- 실제 존재하는 브랜드의 제품명을 사용할 것 (한국, 미국, 일본, 프랑스 등)
- 제품 또는 브랜드 중복은 꼭 필요할 경우만 허용하며, 되도록 피할 것
- 전문의의 말투처럼, 신뢰감 있고 정중하지만 친절한 어조로 작성할 것
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
      max_tokens: 4000, // 또는 4096까지 가능 (이 이상 넣으면 에러)
    });

    const rawResult = completion.choices?.[0]?.message?.content || '';
    if (
      !rawResult.includes('<h1>🩺 피부과 전문 진단 리포트</h1>') ||
      !rawResult.includes('<h2>✨ 종합 요약</h2>')
    ) {
      console.error('⚠️ GPT 응답이 불완전합니다.');
      throw new Error('Incomplete result from GPT – HTML or Summary block is missing');
    }
    

    
    const fullResult = rawResult
    .replace(/```(json|html)?[\s\S]*?```/g, '')
    .replace(/^```html/, '')
    .replace(/JSON Output:/g, '')
    .replace(/\[\s*{[\s\S]*?}\s*\]\s*$/, '')
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
