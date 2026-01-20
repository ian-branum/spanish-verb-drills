import { NextResponse } from 'next/server';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { baseQuestions } from './baseQuestions';
import { systemPrompt } from './systemPrompt';
//config({ path: '.env.local' });
config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export type Question = {
  es: string;
  en: string;
  fr: string;
  answer: string;
  tense: string;
  inf: string;
};

//const baseQuestionsList: Question[] = baseQuestions;

export async function GET( request: Request ) {
  const { searchParams } = new URL(request.url);
  const tenses = searchParams.get('tenses');
  const count = searchParams.get('count') || 10;
  const generate = searchParams.get('generate') || false;
  let userPrompt = tenses ? `Generate a total of ${count} questions spread across the ${tenses} tenses` : `Generate ${count} questions spread across all of the tenses`;
  if (generate) {
    const prompt = systemPrompt + "\n\n" + userPrompt;
    console.log(prompt);
    let response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }
    // Parse the JSON string from OpenAI's response
    const parsedQuestions = JSON.parse(content);
    return NextResponse.json(parsedQuestions);
  }

  return NextResponse.json(baseQuestions);
}
