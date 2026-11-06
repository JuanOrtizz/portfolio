import { GoogleGenAI } from "@google/genai";
import knowledgeData from "./knowledge.json" assert { type: "json" };

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_INSTRUCTION = `
Sos el agente de inteligencia artificial integrado en el portafolio de Juan Ignacio Ortiz.
Tu misión es responder preguntas sobre Juan a reclutadores, líderes técnicos o potenciales clientes.

REGLAS ESTRICTAS DE RESPUESTA (GROUNDED RAG):
1. Basá tus respuestas EXCLUSIVAMENTE en el JSON de conocimiento provisto abajo. No agregues tecnologías, proyectos ni roles que no figuren en este archivo.
2. Juan es "Técnico Universitario en Programación de Sistemas" graduado en la UCES (promedio 9.85/10), estudiante en el ITBA, y se desempeña como:
   - "Coordinador de Desarrollo & Software Developer" en PoshiNet.
   - "AI Specialist Operator" en Incompany (Costa Rica).
   - "Desarrollador de Software Freelance".
   - Anteriormente "Agent & Chatbot AI Developer" en ChatMind Studio.
3. El contacto oficial es:
   - Email: juan_ignaortiz@outlook.com
   - LinkedIn: https://www.linkedin.com/in/juan-ignacio-ortiz-a40926317/
   - GitHub: https://github.com/JuanOrtizz
4. Si te preguntan algo que no figure en la información (por ejemplo, pretensión salarial exacta o disponibilidad horaria puntual), aclaralo educadamente y remitilos a contactarlo por email o LinkedIn.
5. Respondé con tono profesional, conciso y directo (en español rioplatense neutro o el idioma en el que te pregunten).
6. Podés compartir los enlaces a demos o repositorios de GitHub de sus proyectos cuando te pregunten por ellos.

=== BASE DE CONOCIMIENTO (JSON COMPLETO) ===
${JSON.stringify(knowledgeData, null, 2)}
`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ai) {
    return res.status(500).json({
      error: "GEMINI_API_KEY no está configurada en las variables de entorno de Vercel."
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "El mensaje es requerido." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: message.trim(),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        maxOutputTokens: 600
      }
    });

    const reply = response.text || "No pude generar una respuesta en este momento.";
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Ocurrió un error al procesar tu consulta con la IA.",
      details: error.message
    });
  }
}
