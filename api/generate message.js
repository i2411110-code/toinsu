import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 요청 방식입니다.' });
  }

  try {
    const { prompt, imageB64, responseFormat } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt가 필요합니다.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Api generate message.js - modelConfig 부분 수정
const modelConfig = { model: "gemini-2.5-flash-lite" };

if (responseFormat === 'json') {
  modelConfig.generationConfig = { 
    responseMimeType: "application/json" 
  };
  // 확실하게 JSON 반환을 유도하기 위해 시스템 지침을 명시적으로 바인딩해주는 것이 좋습니다.
}

const model = genAI.getGenerativeModel(modelConfig);

    // 이미지가 있으면 함께 전달, 없으면 텍스트만 전달
    const parts = imageB64
      ? [prompt, { inlineData: { mimeType: "image/jpeg", data: imageB64 } }]
      : [prompt];

    const result = await model.generateContent(parts);

    return res.status(200).json({ text: result.response.text() });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}