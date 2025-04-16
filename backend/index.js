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

// ✨ 한글화된 GPT 프롬프트 (index.js 내)
const prompt = `
당신은 전문 한국 피부과 전문의이자 K-뷰티 스킨케어 AI입니다.

⚠️ 중요: 반드시 HTML 리포트 전체와 JSON 프리뷰 블록을 **하나의 응답**으로 반환하세요.
리포트에는 9가지 피부 항목, 최종 요약, 아침/저녁 루틴이 포함되어야 합니다.

각 항목은 다음과 같은 레이블을 사용하여 일관성 있게 구성되어야 합니다:
<strong>점수</strong>, <strong>진단 결과</strong>, <strong>추천 솔루션</strong>, <strong>추천 제품</strong>, <strong>추천 이유</strong>

각 항목에 포함되어야 할 요소:
- "emotionalHook": 짧고 감성적인 요약 문구 (예: "T존이 기름졌어요 🛢️")
- "product": 실제 제품명 (예: "더 오디너리 나이아신아마이드 10%")
- "reason": 왜 이 제품이 효과적인지 설명. 성분, 작용 방식, 기대 효과 등 포함

✅ 최상단 인삿말 영역:
<div class="card" style="background:#1e1e1e; color:#fff; border-radius:12px; padding:24px; margin-bottom:24px; box-shadow:0 2px 4px rgba(255,255,255,0.05)">
  <p style="font-size:18px; font-weight:500">
    [Name]님의 피부 상태를 AI가 분석했어요. 지금부터 건강하고 빛나는 피부로 가는 길을 안내해드릴게요 ✨
  </p>
</div>

✅ 예측된 피부 나이:
<h2>📊 예측된 피부 나이</h2>
<p>[Name]님의 피부 사진을 분석한 결과, 현재 피부 상태는 약 **XX세** 수준입니다.</p>
<p>이 수치는 전체 피부 점수, 주름, 모공, 수분, 탄력 항목을 종합적으로 고려해 산출됩니다.</p>

✅ 각 항목 구조는 다음을 따르세요:
<div class="card" style="background:#1e1e1e; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px">
  <p><strong>점수:</strong> x/5</p>
  <p><strong>진단 결과:</strong> AI가 사진을 기반으로 분석한 결과</p>
  <p><strong>추천 솔루션:</strong> 필요한 스킨케어 액션</p>
  <p><strong>추천 제품:</strong> 제품 이름</p>
  <p><strong>추천 이유:</strong> 성분 기반 설명 및 기대 효과</p>
</div>

✅ 9가지 항목 순서:
<h1>🌿 종합 피부 분석 리포트</h1>
<h2>🔹 1. 피지 (T존과 볼)</h2>
<h2>🔹 2. 수분 상태</h2>
<h2>🔹 3. 피부결 (텍스처)</h2>
<h2>🔹 4. 색소침착</h2>
<h2>🔹 5. 모공 가시성</h2>
<h2>🔹 6. 민감도</h2>
<h2>🔹 7. 주름</h2>
<h2>🔹 8. 피부 톤</h2>
<h2>🔹 9. 여드름</h2>

📌 JSON 프리뷰는 반드시 다음 항목 3가지만 포함:
- 피지
- 수분
- 피부결

✅ 최종 요약에는 다음을 포함:
<h2>✨ 전체 요약</h2>
- 전체 피부 점수 (100점 만점)
- 피부 타입 요약 설명
- 주요 고민 3가지와 간단한 해결 전략
- 감성적이고 전문가 스타일의 응원 멘트
- 2~3주 후 예상되는 개선 효과 등

✅ 아침/저녁 루틴:
<h2>☀️ 아침 루틴</h2>
<h2>🌙 저녁 루틴</h2>
- 반드시 9개 항목에서 추천된 제품만 활용
- 동일 제품 반복 사용은 피하고 다양한 브랜드 조합 사용할 것
- 루틴 하단에 생활 팁 1줄 포함

⚠️ 제품 선택 시 주의사항:
- 루틴에 사용하는 모든 제품은 위의 9가지 항목에서 이미 추천된 제품 중에서만 선택하세요.
- 동일한 제품이나 브랜드가 반복되지 않도록 하세요. 단, 그 제품이 2개 이상 항목에 가장 적합한 경우는 예외입니다.
- 한국, 일본, 미국, 프랑스 등 다양한 글로벌 브랜드가 고루 사용되어야 신뢰도와 현실감을 높일 수 있습니다.
<p><strong>생활 팁:</strong> ...</p>

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
      !rawResult.includes('<h1>🌿 Comprehensive Skin Report</h1>') ||
      !rawResult.includes('Final Summary') ||
      !rawResult.includes('[')
    ) {
      console.error('⚠️ GPT 응답이 불완전합니다.');
      throw new Error('Incomplete result from GPT – HTML or JSON block is missing');
    }
    
    const fullResult = rawResult
    .replace(/```(json|html)?[\s\S]*?```/g, '')
    .replace(/^```html/, '')
    .replace(/JSON Output:/g, '')
    .replace(/\[\s*{[\s\S]*?}\s*\]\s*$/, '')
    .trim();

    if (!rawResult.includes('<h1>🌿 Comprehensive Skin Report</h1>') || !rawResult.includes('<h2>✨ Final Summary</h2>')) {
      console.error('⚠️ GPT 응답이 불완전합니다.');
      throw new Error('Incomplete result from GPT – HTML or JSON block is missing');
    }
    
    
      // ⭐️ 추가: previewInsights 추출
let previewInsights = [];
const previewInsightsMatch = rawResult.match(/\[\s*{[\s\S]*?}\s*\]/);
if (previewInsightsMatch) {
  try {
    previewInsights = JSON.parse(previewInsightsMatch[0]).map(item => ({
      
      category: item.category || '',
      status: item.status || '',
      solution: item.solution || '',
      emotionalHook: item.emotionalHook || '',
      product: item.product || '',
      reason: item.reason || '',
    }));

    const allowedCategories = ['Sebum', 'Hydration', 'Texture'];
    previewInsights = previewInsights.filter(item =>
      allowedCategories.includes(item.category)
    );

    // 🚨 previewInsights가 부족할 경우, 빈 항목으로 채우기
const requiredCategories = ['Sebum', 'Hydration', 'Texture'];
for (const category of requiredCategories) {
  if (!previewInsights.find(item => item.category === category)) {
    previewInsights.push({
      category,
      status: 'No data',
      solution: 'Analysis not available',
      emotionalHook: '📷 Try uploading a clearer image!',
      product: '-',
      reason: 'Insufficient data to generate result.',
    });
  }
}

    
  } catch (e) {
    console.warn("⚠️ previewInsights 파싱 실패:", e);
  }
}

    const withStars = applyScoreStars(fullResult);
    const processedResult = applyRoutineBox(withStars);

    console.log('🧾 Final GPT Result Start ===>\n', processedResult);

    
    // 개선: Final Summary 포함되게 일부 더 살림
    const previewSplit = processedResult.split('<h2>🔹 4.');
    const summaryIndex = processedResult.indexOf('<h2>✨ Final Summary</h2>');
    const previewHtml = summaryIndex !== -1
      ? processedResult.slice(0, summaryIndex + 1000) // 충분히 길게 포함
      : previewSplit[0];

      console.log('🎯 Preview Insights:', previewInsights);


    res.json({
      previewHtml,
      fullHtml: processedResult,
      imageUrl,
      previewInsights,
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
