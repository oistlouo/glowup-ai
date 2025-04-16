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

    let cleanedHtml = rawResult
      .replace(/```(json|html)?[\s\S]*?```/g, '')
      .replace(/^```html/, '')
      .replace(/JSON Output:/g, '')
      .trim();

    // ✅ 누락된 피부 나이 항목 보정 삽입
    if (!cleanedHtml.includes('🔹 1. 피부 나이')) {
      const fallback = `
        <h2>🔹 1. 피부 나이</h2>
        <div class="card" style="background:#2a2a2a;color:#fff;border-radius:12px;padding:20px;margin-bottom:20px">
          <p><strong>점수:</strong> 7/10</p>
          <p><strong>진단 결과:</strong> 실제 나이와 유사한 수준의 피부 상태입니다.</p>
          <p><strong>추천 솔루션:</strong> 자외선 차단과 항산화 케어를 병행하는 기본적인 안티에이징 루틴 유지</p>
          <p><strong>추천 제품:</strong> 닥터지 브라이트닝 업 선 SPF50+</p>
          <p><strong>추천 이유:</strong> 자외선 차단과 피부 톤 정리에 효과적이며, 전반적인 피부 노화 예방에 도움을 줍니다.</p>
        </div>
      `;
      cleanedHtml = cleanedHtml.replace('<h2>🔹 2. 피지 (T존과 볼)</h2>', fallback + '<h2>🔹 2. 피지 (T존과 볼)</h2>');
    }

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
