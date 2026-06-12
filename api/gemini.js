import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 오직 POST 요청만 받도록 보안 설정
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 요청 방식입니다.' });
  }

  // Vercel 환경 변수에 등록할 API 키를 불러옵니다 (코드에 직접 쓰지 않음)
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    // 프론트엔드(report.js)에서 보낸 프롬프트와 이미지 데이터를 받습니다.
    const { prompt, imageB64 } = req.body;
    
    // 제미나이 AI 모델에 텍스트와 이미지를 함께 전달하여 분석을 요청합니다.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        { inlineData: { mimeType: "image/jpeg", data: imageB64 } }
      ],
      config: {
        responseMimeType: "application/json" // AI가 무조건 JSON 형태로만 대답하도록 강제
      }
    });

    // 분석 완료된 데이터를 웹앱으로 안전하게 반환합니다.
    return res.status(200).json({ text: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}