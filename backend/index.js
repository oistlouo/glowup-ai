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
        return `<li><strong>AM Routine:</strong><div style="background:#3a3a3a; border-radius:8px; padding:12px; margin-top:6px; color:#fff;" class="routine-box"><ul>${content.trim()}</ul></div></li>`;
      }
    )
    .replace(
      /<li>\s*<strong>PM Routine:<\/strong>\s*<ul>([\s\S]*?)<\/ul>\s*<\/li>/,
      (_, content) => {
        return `<li><strong>PM Routine:</strong><div style="background:#3a3a3a; border-radius:8px; padding:12px; margin-top:6px; color:#fff;" class="routine-box"><ul>${content.trim()}</ul></div></li>`;
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

    const prompt = `You are a professional Korean dermatologist and K-beauty skincare AI.

You MUST return a full HTML report. Do NOT return plain text or skip any section.

Each category must include:
- "emotionalHook": a short emoji + fun summary (e.g., “T-zone’s going wild 🛢️”)
- "product": specific product brand recommendation (e.g., "The Ordinary Niacinamide 10%")
- "reason": why this product is a good fit, mentioning key ingredients and their effect

Use semantic HTML and style with this wrapper:
<div style="background:#f5f5f5; color:#222; padding:20px; border-radius:12px; text-align:center; font-size:18px; font-weight:600; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05)">

🔹 At the very top of the report, insert a warm personalized greeting:
“Hey [Name], here’s what your skin is telling us today — and how we’ll glow it up ✨”

Always return ALL of the following 9 categories in this exact order:

<h1>🌿 Comprehensive Skin Report</h1>

<h2>🔹 1. Sebum (T-zone vs cheeks)</h2>
<h2>🔹 2. Hydration Level</h2>
<h2>🔹 3. Texture</h2>
<h2>🔹 4. Pigmentation</h2>
<h2>🔹 5. Pore Visibility</h2>
<h2>🔹 6. Sensitivity</h2>
<h2>🔹 7. Wrinkles</h2>
<h2>🔹 8. Skin Tone</h2>
<h2>🔹 9. Acne</h2>

Each section must be wrapped in:
<div class="card" style="..."> ... </div>

<div class="card" style="...">
  <h2>✨ Final Summary</h2>
  <ul>
    <li><strong>Total Score:</strong> 32/45</li>
    <li><strong>Skin Type Summary:</strong> Combination skin with mild sensitivity and signs of early aging.</li>
    <li><strong>Top 3 Concerns:</strong> 
      <ul>
        <li>1. Wrinkles – Use RoC Retinol Night Cream 2x/week + daily hydration</li>
        <li>2. Pigmentation – Use Missha Essence daily AM/PM</li>
        <li>3. Texture – Gently exfoliate with COSRX BHA 2~3x/week</li>
      </ul>
    </li>
    <li><strong>AM Routine:</strong>
      <div class="routine-box" style="background:#e3f2fd; ...">
        <ul>
          <li><strong>Cleanser:</strong> Low pH Gel Cleanser</li>
          <li><strong>Toner:</strong> Klairs Supple Preparation Toner</li>
          <li><strong>Serum:</strong> Vitamin C Serum by Klairs</li>
          <li><strong>Moisturizer:</strong> Neutrogena Hydro Boost Gel</li>
          <li><strong>Sunscreen:</strong> Beauty of Joseon Rice SPF</li>
        </ul>
        <p><strong>Lifestyle Tip:</strong> Wake up with a glass of water. Protect your skin from morning sun exposure.</p>
      </div>
    </li>

    <li><strong>PM Routine:</strong>
      <div class="routine-box" style="background:#fce4ec; ...">
        <ul>
          <li><strong>Cleanser:</strong> Oil-based cleanser for makeup</li>
          <li><strong>Exfoliator:</strong> COSRX BHA (2~3x/week)</li>
          <li><strong>Serum:</strong> Retinol (every 2 days)</li>
          <li><strong>Moisturizer:</strong> Avene Skin Recovery Cream</li>
          <li><strong>Spot Treatment:</strong> Paula's Choice CLEAR</li>
        </ul>
        <p><strong>Lifestyle Tip:</strong> Avoid screen light 30 mins before sleep. Let your skin recover overnight.</p>
      </div>
    </li>
  </ul>
</div>


At the end, include the Final Summary and Final Note also wrapped in .card

Then, return a second JSON block using strict JSON syntax (double quotes only):
[
  {
    "category": "Sebum",
    "status": "...",
    "solution": "...",
    "emotionalHook": "...",
    "product": "...",
    "reason": "..."
  }, ...
]`;




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
  max_tokens: 4000, // ✅ 또는 6000~7000 정도까지도 가능
  stream: false,
});


    // 🧠 Step 1: GPT 응답 텍스트
const rawResult = completion.choices?.[0]?.message?.content || '';

// 🧠 Step 2: JSON previewInsights 먼저 파싱
let previewInsights = [];
const previewInsightsMatch = rawResult.match(/\[\s*{[\s\S]*?}\s*\]/);
if (previewInsightsMatch) {
  try {
    // 🔧 따옴표 및 JSON 구조 보정
    const validJson = previewInsightsMatch[0]
  .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')          // 키에 큰따옴표 추가
  .replace(/:\s*'(.*?)'/g, ': "$1"')                  // 값이 '텍스트' → "텍스트"
  .replace(/'/g, '"');                                // 그 외 모든 작은따옴표도 변환

    previewInsights = JSON.parse(validJson).map(item => ({
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

    const requiredCategories = ['Sebum', 'Hydration', 'Texture'];
const parsedCategoryNames = (validJson.match(/"category"\s*:\s*"([^"]+)"/g) || []).map(line =>
  line.match(/"category"\s*:\s*"([^"]+)"/)[1]
);

for (const category of requiredCategories) {
  if (!parsedCategoryNames.includes(category)) {
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

  } catch (err) {
    console.warn('⚠️ Failed to parse previewInsights:', err);
  }
}

// 🧠 Step 3: 이제 HTML만 추출
const fullResult = rawResult
  .replace(/```(json|html)?[\s\S]*?```/g, '') // 마크다운 블록 제거
  .replace(/^```html/, '')
  .replace(/JSON Output:/g, '')
  // ↓ JSON만 제거하되, 정확한 위치 기준으로 제거 (마지막 JSON만 제거)
  .replace(/\[\s*{[\s\S]*?}\s*\]\s*$/, '')
  .trim();


// ✅ 여기에 로그 추가!
console.log('🧾 fullResult (500자 미리보기):', fullResult.slice(0, 500));


  if (!fullResult || fullResult.length < 500) {
    console.warn('⚠️ GPT 응답이 비정상적으로 짧음. fullResult 길이:', fullResult.length);
    return res.status(400).json({ error: 'Incomplete result from GPT (missing HTML)' });
  }
  


    const withStars = applyScoreStars(fullResult);
    const processedResult = applyRoutineBox(withStars);
    
    // 개선: Final Summary 포함되게 일부 더 살림
    const previewSplit = processedResult.split('<h2>🔹 4.');
    const summaryIndex = processedResult.indexOf('<h2>✨ Final Summary</h2>');
    const previewHtml = summaryIndex !== -1
      ? processedResult.slice(0, summaryIndex + 8000) // 충분히 길게 포함
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
