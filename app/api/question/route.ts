import { NextResponse } from 'next/server';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { put, head, del, BlobNotFoundError } from '@vercel/blob';
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
  sets: { id: string; title: string; username: string }[];
};

function genId(): string {
  return crypto.randomUUID();
}

async function getIndex(username?: string): Promise<QuestionSetIndex> {
  try {
    const h = await head(INDEX_PATH);
    const res = await fetch(h.url);
    if (!res.ok) return { sets: [] };
    const data = (await res.json()) as QuestionSetIndex;
    const sets = Array.isArray(data.sets) ? data.sets : [];
    if (username) {
      // Only return sets that belong to this username
      // Legacy sets without username field are excluded
      return { sets: sets.filter(s => s.username === username) };
    }
    return { sets };
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

async function getSetById(id: string, username?: string): Promise<Question[] | null> {
  const path = `${SETS_PREFIX}${id}.json`;
  try {
    const h = await head(path);
    const res = await fetch(h.url);
    if (!res.ok) return null;
    const data = (await res.json()) as { title: string; questions: Question[]; username?: string };
    // Verify username matches if both username and data.username are provided
    // If data.username is missing, allow access for backward compatibility
    if (username && data.username && data.username !== username) {
      return null; // User doesn't own this set
    }
    return Array.isArray(data.questions) ? data.questions : null;
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
}

async function saveSet(id: string, title: string, questions: Question[], username: string): Promise<void> {
  const path = `${SETS_PREFIX}${id}.json`;
  await put(path, JSON.stringify({ title, questions, username }), BLOB_OPTS);
}

async function generateQuestions(title: string, count: number, tenses: string[] | null, username: string): Promise<QuestionSet> {
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

    await saveSet(setId, title, parsedQuestions, username);
    const index = await getIndex();
    index.sets.push({ id: setId, title, username });
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
  const username = searchParams.get('username')?.trim() || undefined;

  if (listIndex) {
    const index = await getIndex(username);
    return NextResponse.json(index);
  }

  if (id) {
    const set = await getSetById(id, username);
    return NextResponse.json(set);
  }

  if (generate) {
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    const questionSet = await generateQuestions(title, count, tenses, username);
    return NextResponse.json(questionSet);
  }

  return NextResponse.json(baseQuestions);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim() || null;
  const username = searchParams.get('username')?.trim() || undefined;

  if (!id || !username) {
    return NextResponse.json({ error: 'id and username are required' }, { status: 400 });
  }

  try {
    // Get the full index (without username filter) to update it
    const index = await getIndex();
    const setToDelete = index.sets.find(s => s.id === id && s.username === username);
    
    if (!setToDelete) {
      return NextResponse.json({ error: 'Question set not found or access denied' }, { status: 404 });
    }

    // Delete the file
    const path = `${SETS_PREFIX}${id}.json`;
    try {
      await del(path);
    } catch (e) {
      // If file doesn't exist, continue to remove from index anyway
      if (!(e instanceof BlobNotFoundError)) {
        throw e;
      }
    }

    // Remove from index
    index.sets = index.sets.filter(s => s.id !== id);
    await saveIndex(index);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting question set:', e);
    return NextResponse.json({ error: 'Failed to delete question set' }, { status: 500 });
  }
}
