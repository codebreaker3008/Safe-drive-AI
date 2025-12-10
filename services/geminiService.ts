import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY || '';; // Ensure this is set in environment
const ai = new GoogleGenAI({ apiKey });

export const generateEmergencyReport = async (
  duration: number,
  location: string = "Unknown Highway"
): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot generate AI report.";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      You are an automated vehicle safety system.
      The driver has been unresponsive (eyes closed) for ${duration.toFixed(1)} seconds.
      The vehicle has performed an emergency stop at ${location}.
      
      Generate a concise, professional emergency text message (max 2 sentences) to be sent to emergency services (911/EMS).
      Include the status code 'CRITICAL-DRIVER-UNRESPONSIVE'.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Emergency reported. Driver unresponsive.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating AI report. System Alerting EMS manually.";
  }
};