import { NextResponse } from 'next/server';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { put, head, BlobNotFoundError } from '@vercel/blob';
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

const INDEX_PATH = 'questionSetIndex.json';
const SETS_PREFIX = 'question-sets/';

const ALL_TENSES = [
  'pres', 'pret', 'imp', 'fut', 'cond', 'presperf', 'plup', 'futperf', 'condperf',
  'subpres', 'subimp', 'subperf', 'subplup',
];

const BLOB_OPTS = { access: 'public' as const, contentType: 'application/json' };

export type Question = {
  es: string;
  en: string;
  fr: string;
  answer: string;
  tense: string;
  inf: string;
};

export type QuestionSet = {
  id: string;
  title: string;
  questions: Question[];
};

export type QuestionSetIndex = {
  sets: { id: string; title: string }[];
};

function genId(): string {
  return crypto.randomUUID();
}

async function getIndex(): Promise<QuestionSetIndex> {
  try {
    const h = await head(INDEX_PATH);
    const res = await fetch(h.url);
    if (!res.ok) return { sets: [] };
    const data = (await res.json()) as QuestionSetIndex;
    return Array.isArray(data.sets) ? data : { sets: [] };
  } catch (e) {
    if (e instanceof BlobNotFoundError) return { sets: [] };
    throw e;
  }
}

async function saveIndex(index: QuestionSetIndex): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(index), {
    ...BLOB_OPTS,
    allowOverwrite: true,
  });
}

async function getSetById(id: string): Promise<QuestionSet[] | null> {
  const path = `${SETS_PREFIX}${id}.json`;
  try {
    const h = await head(path);
    const res = await fetch(h.url);
    if (!res.ok) return null;
    const data = (await res.json()) as QuestionSet[];
    return data;
    //if (Array.isArray(data)) return data;
    //const qs = data?.questions;
    //return Array.isArray(qs) ? qs : null;
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
}

async function saveSet(id: string, title: string, questions: Question[]): Promise<void> {
  const path = `${SETS_PREFIX}${id}.json`;
  await put(path, JSON.stringify({ title, questions }), BLOB_OPTS);
}

async function generateQuestions(title: string, count: number, tenses: string[] | null): Promise<QuestionSet> {
    const userPrompt = tenses
      ? `Generate a total of ${count} questions spread across the ${tenses} tenses`
      : `Generate ${count} questions spread across all of the tenses`;
    const prompt = systemPrompt + '\n\n' + userPrompt;
    console.log(prompt);
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = response.choices[0].message.content;
    if (!content) {
      return { id: '', title: 'Something went wrong generating questions', questions: [] };
    }
    const parsedQuestions = JSON.parse(content) as Question[];
    if (!Array.isArray(parsedQuestions)) {
      return { id: '', title: 'Something went wrong generating questions', questions: [] };
    }

    const setId = genId();
    const questionTenses = parsedQuestions.map((q) => q.tense);

    await saveSet(setId, title, parsedQuestions);
    const index = await getIndex();
    index.sets.push({ id: setId, title });
    await saveIndex(index);

    return { id: setId, title, questions: parsedQuestions };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenses = searchParams.get('tenses')?.split(',') || null;
  const countParam = searchParams.get('count') || '10';
  const count = Math.max(1, parseInt(String(countParam), 10) || 10);
  const generate = searchParams.get('generate') === 'true';
  const title = searchParams.get('title') || `${count} questions`;
  const listIndex = searchParams.get('list') === 'true';
  const id = searchParams.get('id')?.trim() || null;

  if (listIndex) {
    const index = await getIndex();
    return NextResponse.json(index);
  }

  if (id) {
    const set = await getSetById(id);
    return NextResponse.json(set);
  }

  if (generate) { 
    const questionSet = await generateQuestions(title, count, tenses);
    return NextResponse.json(questionSet);
  }

  return NextResponse.json(baseQuestions);
}
