import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return client;
};

export const getFinancialAdvice = async (transactions: Transaction[], balance: number, pendingBills: number): Promise<string> => {
  try {
    const ai = getClient();
    
    // Summarize data for the prompt to save tokens
    const last10 = transactions.slice(0, 10);
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

    const prompt = `
      Atue como um consultor financeiro especialista para motoristas de aplicativo (Uber/99).
      Dados Atuais:
      - Saldo Líquido Total: R$ ${balance.toFixed(2)}
      - Contas Pendentes Futuras: R$ ${pendingBills.toFixed(2)}
      - Total Ganho: R$ ${income.toFixed(2)}
      - Total Gasto: R$ ${expense.toFixed(2)}
      
      Últimas transações:
      ${JSON.stringify(last10.map(t => ({ d: t.description, v: t.amount, t: t.type, date: t.date })))}

      Forneça 3 conselhos curtos, diretos e motivacionais em português do Brasil (formato markdown, lista com bolinhas) para melhorar o lucro ou gerenciar as contas pendentes. Seja breve.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar conselhos no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com o assistente inteligente.";
  }
};