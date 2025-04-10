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
You are a professional Korean dermatologist and K-beauty skincare AI.

You MUST return a full HTML report. Do NOT return plain text or skip any section.

Each skin category section MUST include:
- <li><strong>Score:</strong> x/5</li>
- <li><strong>Analysis:</strong> ...</li>
- <li><strong>Recommended Product:</strong> ...</li>
- <li><strong>Emotional Hook:</strong> short emoji + fun message</li>
- <li><strong>Reason:</strong> explain why the product fits, mentioning ingredients and effects</li>

Use semantic HTML and style with this wrapper:
<div class="card" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:24px;box-shadow:0 2px 5px rgba(0,0,0,0.06); color:#222;">

🔹 At the very top of the report, insert a warm greeting:
Hey [Name], here’s what your skin is telling us today — and how we’ll glow it up ✨

Then add:
<h1>🌿 Comprehensive Skin Report</h1>

Include all of the following 9 skin categories, in this exact order:

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

—

🔹 At the end, include this Final Summary section in this format:

<div class="card" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:24px;box-shadow:0 2px 5px rgba(0,0,0,0.06); color:#222;">
  <h2>✨ Final Summary</h2>
  <ul>
    <li><strong>Total Score:</strong> .../45</li>
    <li><strong>Skin Type Summary:</strong> ...</li>
    <li><strong>Top 3 Concerns:</strong> ...</li>

    <li><strong>AM Routine:</strong>
      <div class="routine-box" style="background:#e3f2fd; border-radius:8px; padding:12px; margin-top:6px; color:#000;">
        <ul>
          <li><strong>Step 1 – Cleanser:</strong> ...</li>
          <li><strong>Step 2 – Toner:</strong> ...</li>
          <li><strong>Step 3 – Serum:</strong> ...</li>
          <li><strong>Step 4 – Moisturizer:</strong> ...</li>
          <li><strong>Step 5 – Sunscreen:</strong> ...</li>
        </ul>
        <p><strong>Lifestyle Tip:</strong> ...</p>
      </div>
    </li>

    <li><strong>PM Routine:</strong>
      <div class="routine-box" style="background:#fce4ec; border-radius:8px; padding:12px; margin-top:6px; color:#000;">
        <ul>
          <li><strong>Step 1 – Cleanser:</strong> ...</li>
          <li><strong>Step 2 – Exfoliator:</strong> ...</li>
          <li><strong>Step 3 – Serum:</strong> ...</li>
          <li><strong>Step 4 – Moisturizer:</strong> ...</li>
          <li><strong>Step 5 – Spot Treatment:</strong> ...</li>
        </ul>
        <p><strong>Lifestyle Tip:</strong> ...</p>
      </div>
    </li>
  </ul>
</div>

—

🔹 Add this Final Encouragement block (emotional ending):

<div class="card" style="background:#f9f9f9;border-left:4px solid #4caf50;padding:16px;margin-top:32px;border-radius:8px; color:#222;">
  <p><strong>💖 Final Note:</strong> Thank you for trusting GlowUp.AI with your skincare journey. Your skin is beautifully unique — and every step you take matters. With the right care, consistency, and support, your glow is unstoppable. Let’s keep going, together 🌱</p>
</div>

—

📌 Then return the JSON block for preview UI (NO markdown):

[
  {
    "category": "Sebum",
    "status": "...",
    "solution": "...",
    "emotionalHook": "...",
    "product": "...",
    "reason": "..."
  },
  {
    "category": "Hydration",
    ...
  },
  {
    "category": "Texture",
    ...
  }
]

DO NOT include \`\`\`json or any markdown formatting. Just HTML + valid JSON.
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
  max_tokens: 4096, // ✅ 또는 6000~7000 정도까지도 가능
  stream: false,
});


    const rawResult = completion.choices?.[0]?.message?.content || '';
    const fullResult = rawResult
     .replace(/```(json|html)?[\s\S]*?```/g, '') // 코드 블럭 완전히 제거
     .replace(/\[\s*{[\s\S]*?}\s*]/g, '') // JSON 배열 덩어리도 제거
     .trim();


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
    
    // 개선: Final Summary 포함되게 일부 더 살림
    const previewSplit = processedResult.split('<h2>🔹 4.');
    const summaryIndex = processedResult.indexOf('<h2>✨ Final Summary</h2>');
    const previewHtml = summaryIndex !== -1
      ? processedResult.slice(0, summaryIndex + 3000) // 충분히 길게 포함
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
