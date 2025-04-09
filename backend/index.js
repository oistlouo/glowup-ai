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

Each category must include:
- "emotionalHook": a short emoji + fun summary (e.g., “T-zone’s going wild 🛢️”)
- "product": specific product brand recommendation (e.g., "The Ordinary Niacinamide 10%")
- "reason": why this product is a good fit, mentioning key ingredients and their effect

Use valid semantic HTML only: <h2>, <ul>, <li>, <strong>, etc.

🔹 At the very top of the report, insert a warm personalized greeting:
“Hey [Name], here’s what your skin is telling us today — and how we’ll glow it up ✨”

🔹 For each skin category:
- Start with a friendly one-liner summary using emoji (e.g., “Sebum is feeling a bit wild today 🛢️”)
- Then give:
  <li><strong>Score:</strong> x/5</li>
  <li><strong>Analysis:</strong> ...</li>
  <li><strong>Recommended Product:</strong> Include real product brand examples (e.g., The Ordinary, La Roche-Posay, Cosrx)</li>

🔹 Group the results:
- Highlight Top 3 best-scoring areas → “Your Glow Zones 💖”
- Highlight Top 3 lowest-scoring areas → “Needs Love 💔”

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


<h2>✨ Final Summary</h2>
<ul>
  <li><strong>Total Score:</strong> .../45</li>
  <li><strong>Skin Type Summary:</strong> ...</li>
  <li><strong>Top 3 Concerns:</strong> ...</li>
  <li><strong>AM Routine:</strong>
  <ul>
    <li><strong>Step 1 – Cleanser:</strong> Use a low-pH hydrating gel cleanser to gently remove overnight oil without stripping moisture.</li>
    <li><strong>Step 2 – Toner:</strong> Apply a balancing toner with witch hazel to prep your skin and control T-zone oil.</li>
    <li><strong>Step 3 – Serum:</strong> Use Vitamin C (10–15%) serum to brighten and protect against UV damage.</li>
    <li><strong>Step 4 – Moisturizer:</strong> Choose a lightweight gel-cream with hyaluronic acid for hydration lock.</li>
    <li><strong>Step 5 – Sunscreen:</strong> Always finish with SPF 50+ PA+++ sunscreen before heading out.</li>
  </ul>
  <p><strong>Lifestyle Tip:</strong> Try to drink a full glass of water within 10 minutes of waking up, and avoid coffee before applying sunscreen.</p>
</li>

  <li><strong>PM Routine:</strong>
  <ul>
    <li><strong>Step 1 – Cleanser:</strong> Double cleanse: Start with a cleansing balm to remove sunscreen and makeup, then a mild foaming cleanser.</li>
    <li><strong>Step 2 – Exfoliator (2–3x/week):</strong> Use a gentle BHA toner if your texture feels rough or congested.</li>
    <li><strong>Step 3 – Serum:</strong> Apply a niacinamide or retinol-based serum depending on your sensitivity level.</li>
    <li><strong>Step 4 – Moisturizer:</strong> Rich cream with ceramides to restore skin barrier overnight.</li>
    <li><strong>Step 5 – Spot Treatment (if needed):</strong> Use salicylic acid gel on acne-prone areas.</li>
  </ul>
  <p><strong>Lifestyle Tip:</strong> Try to finish your routine 30 minutes before sleep to avoid pillow transfer, and keep your room humidified.</p>
</li>

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
    });

    const rawResult = completion.choices?.[0]?.message?.content || '';
    const fullResult = rawResult
      .replace(/^```html\n?/gm, '')
      .replace(/```$/gm, '')
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
