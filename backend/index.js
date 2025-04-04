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
Use valid semantic HTML only: <h2>, <ul>, <li>, <strong>, etc.

For each of the following 9 skin categories, always include:
<li><strong>Score:</strong> x/5</li>
<li><strong>Analysis:</strong> Write a detailed professional analysis first.</li>
<li><strong>Recommended Product:</strong> Product name or type first, then explain the ingredient it must contain, then explain why it's good and how it works on the skin.</li>

Always return ALL of the following 9 skin categories in this exact order:

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

<h2>✨ Final Summary</h2>
<ul>
  <li><strong>Total Score:</strong> .../45</li>
  <li><strong>Skin Type Summary:</strong> ...</li>
  <li><strong>Top 3 Concerns:</strong> ...</li>
  <li><strong>AM Routine:</strong>
    <ul>
      <li>Step 1</li>
      <li>Step 2</li>
      <li>Step 3</li>
    </ul>
  </li>
  <li><strong>PM Routine:</strong>
    <ul>
      <li>Step 1</li>
      <li>Step 2</li>
      <li>Step 3</li>
    </ul>
  </li>
  <li><strong>Improvement Timeline:</strong> ...</li>
  <li><strong>Closing Message:</strong> Write in a warm Korean tone. Include words like ‘피부’, ‘화이팅’</li>
</ul>
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

    const withStars = applyScoreStars(fullResult);
    const processedResult = applyRoutineBox(withStars);

    console.log("📦 Final GPT result:", processedResult);

    res.json({ result: processedResult, imageUrl });
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
