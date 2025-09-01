import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

const MODEL_NAME = 'gemini-1.5-flash';

async function generateCodeFromImage(
  imageBase64: string,
  prompt: string,
  userInput: string
) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

  const image = {
    inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  };

  const finalPrompt = userInput.trim()
    ? `${prompt}\n\nUser input: ${userInput}`
    : prompt;

  const result = await ai
    .getGenerativeModel({ model: MODEL_NAME })
    .generateContent([finalPrompt, image]);

  const response = result.response.text();

  const regex = /```(?:html)?\s*([\s\S]*?)```/g;
  const match = regex.exec(response);
  const extractedCode = match ? match[1].trim() : '';

  return {
    fullResponse: response,
    code: extractedCode,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { imageBase64, prompt, userInput } = req.body;

  if (!imageBase64 || !prompt) {
    res.status(400).json({ message: 'Missing required parameters' });
    return;
  }

  try {
    const result = await generateCodeFromImage(imageBase64, prompt, userInput);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating code' });
  }
}
