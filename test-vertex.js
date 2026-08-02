import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'project-c3f351bc-a770-4a18-b41',
  location: 'us-central1',
});

async function testConnection() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Jawab singkat: Vertex AI Lulus.id berhasil terhubung.',
    });

    console.log('✅ BERHASIL:');
    console.log(response.text);
  } catch (error) {
    console.error('❌ MASIH ERROR:');
    console.error(error);
  }
}

testConnection();
