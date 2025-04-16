const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: ['https://glowup-ai.vercel.app'],
}));

app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded.' });

    const streamUpload = () => new Promise((resolve, reject) => {
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

    const promptPath = path.join(__dirname, 'templates', 'prompt_ko.txt');
    if (!fs.existsSync(promptPath)) {
      throw new Error(`프롬프트 파일이 존재하지 않음: ${promptPath}`);
    }

    const rawPrompt = fs.readFileSync(promptPath, 'utf8');
    const name = req.body.name || '사용자';
    const age = req.body.age || '??';
    const prompt = rawPrompt.replace(/\[name\]/g, name).replace(/\[age\]/g, age);

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
      max_tokens: 4096,
    });

    const rawResult = completion.choices?.[0]?.message?.content || '';
    const isComplete = rawResult.includes('<h1') && rawResult.includes('총점') && rawResult.includes('피부');

    if (!isComplete) {
      console.error('⚠️ GPT 응답이 불완전합니다.');
      console.log('📦 GPT 응답 원문:', rawResult);
      return res.status(200).json({
        fullHtml: `<div style="padding:20px;color:#c00;background:#fff0f0;border:1px solid #faa;border-radius:8px;"><h2>⚠️ 분석 실패</h2><p>AI가 이미지를 분석하는 중 문제가 발생했어요. 이미지 품질을 확인하고 다시 시도해주세요.</p></div>`,
        imageUrl: null,
        previewInsights: [],
      });
    }

    const cleanedHtml = rawResult
      .replace(/```(json|html)?[\s\S]*?```/g, '')
      .replace(/^```html/, '')
      .replace(/JSON Output:/g, '')
      .trim();

    res.json({
      fullHtml: cleanedHtml,
      imageUrl,
      previewInsights: [],
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