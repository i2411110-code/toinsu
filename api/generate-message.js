import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 요청 방식입니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'prompt가 없습니다.' });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 503 과부하 시 fallback 모델로 재시도
  const models = ['gemini-2.5-flash-lite', 'gemini-1.5-flash'];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt]);
      return res.status(200).json({ text: result.response.text() });
    } catch (error) {
      const is503 = error.message && (error.message.includes('503') || error.message.includes('Service Unavailable') || error.message.includes('high demand'));
      if (is503 && modelName !== models[models.length - 1]) {
        console.warn(`${modelName} 과부하 — ${models[models.indexOf(modelName) + 1]}로 재시도`);
        continue;
      }
      return res.status(500).json({ error: error.message });
    }
  }
}