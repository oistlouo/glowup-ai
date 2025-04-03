const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
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

// ⭐️ AM/PM 루틴 박스화 함수 개선 (줄바꿈/공백 대응)
const applyRoutineBox = (html) => {
  return html
    .replace(/<li>\s*<strong>AM Routine:<\/strong>\s*([\s\S]*?)<\/li>/, (_, content) => {
      return `<li><strong>AM Routine:</strong><div style="background:#e3f2fd; border-radius:8px; padding:12px; margin-top:6px;">${content.trim()}</div></li>`;
    })
    .replace(/<li>\s*<strong>PM Routine:<\/strong>\s*([\s\S]*?)<\/li>/, (_, content) => {
      return `<li><strong>PM Routine:</strong><div style="background:#fce4ec; border-radius:8px; padding:12px; margin-top:6px;">${content.trim()}</div></li>`;
    });
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

Please analyze the uploaded selfie and write a complete skin analysis report in valid HTML only.
Use semantic HTML elements such as <h2>, <ul>, <li>, <strong>, etc.

Do NOT include any markdown, code blocks, or \`\`\`html formatting. Only return raw HTML.

⚠️ Always return all 9 fixed categories in the exact order below, even if the data is minimal.
⚠️ Always include a Score (1~5), and clearly explain why the recommended ingredient helps that condition.
⚠️ For each ingredient, specify: the name, why it is effective, how it helps the skin, and what product type it belongs to (e.g., toner, cream, cleanser).

<h1>🌿 Comprehensive Skin Report</h1>

<h2>🔹 1. Sebum (T-zone vs cheeks)</h2>
<ul>
  <li><strong>Score:</strong> .../5</li>
  <li><strong>Condition:</strong> ...</li>
  <li><strong>Medical Meaning:</strong> ...</li>
  <li><strong>Improvement Strategy:</strong> ...</li>
  <li><strong>Recommended Ingredient:</strong> Niacinamide – Reduces sebum production and improves skin clarity – Lightweight serum</li>
</ul>

(repeat similar structure for all 9 categories)

<h2>✨ Final Summary</h2>
<ul>
  <li><strong>Total Score:</strong> .../45</li>
  <li><strong>Skin Type Summary:</strong> ...</li>
  <li><strong>Top 3 Concerns:</strong> ...</li>
  <li><strong>AM Routine:</strong> ...</li>
  <li><strong>PM Routine:</strong> ...</li>
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

    // ⭐️ 별점 및 루틴 박스화 후처리 적용
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

app.post('/generate-pdf', async (req, res) => {
  try {
    const { imageUrl, analysis, topConcerns, name, birthdate, date } = req.body;

    const templatePath = path.join(__dirname, 'templates', 'report.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    html = html
      .replace('{{imageUrl}}', imageUrl)
      .replace('{{analysis}}', analysis)
      .replace('{{topConcerns}}', topConcerns || '')
      .replace('{{name}}', name || '')
      .replace('{{birthdate}}', birthdate || '')
      .replace('{{date}}', date || '');

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="glowup_report.pdf"',
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ PDF 생성 에러:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// 여기서 환경변수로 동적 포트를 처리하도록 수정
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
