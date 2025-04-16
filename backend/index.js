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

    let attempts = 0;
    let rawResult = '';
    let isComplete = false;

    while (attempts < 3 && !isComplete) {
      attempts++;
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

      rawResult = completion.choices?.[0]?.message?.content || '';

      rawResult = rawResult
        .replace(/```(json|html)?[\s\S]*?```/g, '')
        .replace(/^```html/, '')
        .replace(/JSON Output:/g, '')
        .trim();

      isComplete =
        rawResult.includes('<h1>🌿 종합 피부 분석 리포트</h1>') &&
        rawResult.includes('<h2>🔹 1. 피부 나이</h2>') &&
        rawResult.includes('<h2>🔹 10. 여드름</h2>') &&
        !rawResult.toLowerCase().includes('this html format') &&
        !rawResult.toLowerCase().includes("i'm sorry") &&
        !rawResult.toLowerCase().includes('no analysis');
    }

    if (!isComplete) {
      console.error('❌ GPT 응답 실패: 3회 재시도 후에도 분석 리포트 생성 실패.');
      return res.status(500).json({ error: 'AI 분석 실패: 분석 결과가 유효하지 않습니다.' });
    }

    res.json({
      fullHtml: rawResult,
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
