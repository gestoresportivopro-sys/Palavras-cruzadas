import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate-level", async (req, res) => {
    try {
      const { levelId } = req.body;
      
      const puzzleSchema = {
        type: Type.OBJECT,
        properties: {
          letters: { 
            type: Type.STRING, 
            description: "Um conjunto de 5 a 6 letras maiúsculas que serão exibidas no círculo de seleção." 
          },
          words: {
            type: Type.ARRAY,
            description: "Lista de palavras cruzadas oficiais que entram na grade principal.",
            items: {
              type: Type.OBJECT,
              properties: {
                answer: { type: Type.STRING, description: "A palavra em letras maiúsculas (sem acentos ou cedilha)." },
                row: { type: Type.INTEGER, description: "Linha inicial na grade (começando em 0)." },
                col: { type: Type.INTEGER, description: "Coluna inicial na grade (começando em 0)." },
                orientation: { 
                  type: Type.STRING, 
                  enum: ["across", "down"], 
                  description: "Direção da palavra: 'across' (horizontal) ou 'down' (vertical)." 
                }
              },
              required: ["answer", "row", "col", "orientation"],
            }
          },
          dimensions: {
            type: Type.OBJECT,
            description: "Tamanho máximo da grade gerada.",
            properties: {
              rows: { type: Type.INTEGER },
              cols: { type: Type.INTEGER }
            },
            required: ["rows", "cols"]
          }
        },
        required: ["letters", "words", "dimensions"],
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Gere um jogo de palavras cruzadas em português do Brasil de nível intermediário. 
                   As palavras precisam se cruzar perfeitamente na grade compartilhando letras comuns. 
                   Não use acentos, espaços ou caracteres especiais nas respostas. Dificuldade sugerida: Nível ${levelId || 1}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: puzzleSchema,
          temperature: 0.7,
        }
      });

      if (response.text) {
        res.json(JSON.parse(response.text));
      } else {
        throw new Error("Empty response from Gemini API");
      }
    } catch (error) {
      console.error("Erro ao gerar nível com o Gemini:", error);
      res.status(500).json({ error: "Failed to generate level" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
