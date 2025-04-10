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

⚠️ Very important: You MUST return a full HTML report + the JSON preview block in ONE reply. 
Do NOT skip or cut off any section — especially the Final Summary and JSON at the end.
The report MUST include all 9 skin categories, the Final Summary, and the full AM/PM routine.


Each category must include:
- "emotionalHook": a short emoji + fun summary (e.g., “T-zone’s going wild 🛢️”)
- "product": specific product brand recommendation (e.g., "The Ordinary Niacinamide 10%")
- "reason": Explain *why* this product is effective based on the user's specific skin issue. Include ingredients, mechanisms (e.g., exfoliates, hydrates, tightens pores), and what result it delivers (e.g., brighter skin, smoother texture).

Use valid semantic HTML only: <h2>, <ul>, <li>, <strong>, etc.

🔹 At the very top of the report, insert a warm personalized greeting:
“Hey [Name], here’s what your skin is telling us today — and how we’ll glow it up ✨”

🔹 For each skin category:
- Start with a friendly one-liner summary using emoji (e.g., “Sebum is feeling a bit wild today 🛢️”)
- Then give:
  <li><strong>Score:</strong> x/5</li>
  <li><strong>Analysis:</strong> Brief summary of current condition</li>
  <li><strong>Recommended Product:</strong> Include real product brand examples (e.g., The Ordinary, La Roche-Posay, Cosrx)</li>
  <li><strong>Why It Works:</strong> Explain *why* this product is a good match, including key ingredients and how they help this skin issue</li>

🔹 Group the results:
- Highlight Top 3 best-scoring areas → “Your Glow Zones 💖”
- Highlight Top 3 lowest-scoring areas → “Needs Love 💔”



Each section must be wrapped in:
<div class="card" style="background:#2a2a2a; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 2px 4px rgba(255,255,255,0.05)"> ... </div>

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

📌 After generating the full HTML above, return a second JSON block for preview UI:

Each preview item must include:
You MUST return exactly 3 preview items only — one for each of the following categories: Sebum, Hydration, and Texture.
- "category": name of the skin category
- "status": a short summary of the current skin condition
- "solution": recommended product strategy (summarized)
- "emotionalHook": a fun emoji-based summary (e.g., “T-zone’s going wild 🛢️”)
- "product": specific product recommendation (e.g., "The Ordinary Niacinamide 10%")
- "reason": explain why the product is a good fit (mention ingredients and effect)

[
  {
    "category": "Sebum",
    "status": "...",
    "solution": "...",
    "emotionalHook": "...",
    "product": "...",
    "reason": "..."
  },
  ...
]


At the end, return:

<h2>✨ Final Summary</h2>
- Provide a total skin score out of 100
- Give a personalized skin type summary based on the analysis (e.g., “Combination skin with mild sensitivity and early aging signs.”)
- List the Top 3 Concerns in priority order with short solution strategy per item
- Then add an emotional motivational message like a dermatologist would give
- Also mention what visible improvement can be expected and how long it usually takes if the suggested routine is followed (e.g., “In 2–3 weeks, you may notice smoother texture and less redness.”)

<h2>☀️ AM Routine</h2> and <h2>🌙 PM Routine</h2>
- Generate personalized 5-step AM/PM skincare routines based on the user’s skin issues
- Include real product brand names per step (e.g., COSRX, La Roche-Posay, Klairs)
- Include 1 friendly and professional <p><strong>Lifestyle Tip:</strong> ...</p> under each routine
- Make sure everything is wrapped inside a styled <div class="card" style="..."> element for each block


For both AM and PM routine sections, also include a personalized "Lifestyle Tip" based on the user's skin condition, concerns, or habits.

Make the tip empathetic, short, and dermatologist-style practical — like advice you'd give to a client. Use:
<p><strong>Lifestyle Tip:</strong> ...</p> format.


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
