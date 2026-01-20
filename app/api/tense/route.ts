import { NextResponse } from 'next/server';

export type Tense = {
  id: string;
  name: string;
  level: string;
  desc: string;
  endings: {
    ar: string[];
    er: string[];
    ir: string[];
  };
  examples: [string, string][];
};

const tenseKeys = ["pres", "pret", "imp", "fut", "cond", "presperf", "plup", "futperf", "condperf", "subpres", "subimp", "subperf", "subplup"];

export const tenseMap: Record<string, string> = {
  pres: "Presente",
  pret: "Pretérito",
  imp: "Imperfecto",
  fut: "Futuro",
  cond: "Condicional",
  presperf: "Pretérito perfecto",
  plup: "Pluscuamperfecto",
  futperf: "Futuro perfecto",
  condperf: "Condicional perfecto",
  subpres: "Subjuntivo",
  subimp: "Subjuntivo imperfecto",
  subperf: "Subjuntivo perfecto",
  subplup: "Subjuntivo pluscuamperfecto",
};

const tenses: Tense[] = [
  { id: "pres", name: "Presente", level: "A1", desc: "Habits, general truths, current actions.", endings: { ar: ["-o", "-as", "-a", "-amos", "-áis", "-an"], er: ["-o", "-es", "-e", "-emos", "-éis", "-en"], ir: ["-o", "-es", "-e", "-imos", "-ís", "-en"] }, examples: [["Yo hablo español todos los días.", "I speak Spanish every day."], ["Ella come en casa.", "She eats at home."], ["Nosotros vivimos en Madrid.", "We live in Madrid."], ["¿Estudias ahora?", "Are you studying now?"], ["Ellos trabajan mucho.", "They work a lot."]] },
  { id: "pret", name: "Pretérito", level: "A2", desc: "Completed actions in the past.", endings: { ar: ["-é", "-aste", "-ó", "-amos", "-asteis", "-aron"], er: ["-í", "-iste", "-ió", "-imos", "-isteis", "-ieron"], ir: ["-í", "-iste", "-ió", "-imos", "-isteis", "-ieron"] }, examples: [["Ayer compré pan.", "Yesterday I bought bread."], ["Él comió temprano.", "He ate early."], ["Nosotros vivimos allí un año.", "We lived there for a year."], ["¿Llegaste a tiempo?", "Did you arrive on time?"], ["Ellas estudiaron mucho.", "They studied a lot."]] },
  { id: "imp", name: "Imperfecto", level: "A2", desc: "Ongoing/repeated past actions; descriptions.", endings: { ar: ["-aba", "-abas", "-aba", "-ábamos", "-abais", "-aban"], er: ["-ía", "-ías", "-ía", "-íamos", "-íais", "-ían"], ir: ["-ía", "-ías", "-ía", "-íamos", "-íais", "-ían"] }, examples: [["Cuando era niño, jugaba mucho.", "When I was a child, I played a lot."], ["Ella comía en la cafetería.", "She used to eat in the cafeteria."], ["Vivíamos cerca del parque.", "We used to live near the park."], ["¿Qué hacías ayer a las ocho?", "What were you doing yesterday at eight?"], ["Siempre llovía en abril.", "It always rained in April."]] },
  { id: "fut", name: "Futuro", level: "B1", desc: "Future actions; probability.", endings: { ar: ["-aré", "-arás", "-ará", "-aremos", "-aréis", "-arán"], er: ["-eré", "-erás", "-erá", "-eremos", "-eréis", "-erán"], ir: ["-iré", "-irás", "-irá", "-iremos", "-iréis", "-irán"] }, examples: [["Mañana viajaré a Sevilla.", "Tomorrow I will travel to Seville."], ["Ella comerá después.", "She will eat later."], ["Viviremos allí en 2027.", "We will live there in 2027."], ["¿Llegarán a tiempo?", "Will they arrive on time?"], ["Será tarde ya.", "It is probably already late."]] },
  { id: "cond", name: "Condicional", level: "B1", desc: "Polite requests; hypothetical situations.", endings: { ar: ["-aría", "-arías", "-aría", "-aríamos", "-aríais", "-arían"], er: ["-ería", "-erías", "-ería", "-eríamos", "-eríais", "-erían"], ir: ["-iría", "-irías", "-iría", "-iríamos", "-iríais", "-irían"] }, examples: [["Yo viajaría más si tuviera tiempo.", "I would travel more if I had time."], ["¿Podrías ayudarme?", "Could you help me?"], ["Ella comería aquí, pero está cerrado.", "She would eat here, but it's closed."], ["Viviríamos en la costa.", "We would live on the coast."], ["¿Qué harían ustedes?", "What would you do?"]] },
  { id: "presperf", name: "Pretérito perfecto", level: "B1", desc: "Past actions connected to the present.", endings: { ar: ["he -ado", "has -ado", "ha -ado", "hemos -ado", "habéis -ado", "han -ado"], er: ["he -ido", "has -ido", "ha -ido", "hemos -ido", "habéis -ido", "han -ido"], ir: ["he -ido", "has -ido", "ha -ido", "hemos -ido", "habéis -ido", "han -ido"] }, examples: [["He visitado Barcelona.", "I have visited Barcelona."], ["¿Has comido ya?", "Have you eaten yet?"], ["Ellos han vivido aquí mucho tiempo.", "They have lived here a long time."], ["Hemos estudiado bastante.", "We have studied enough."], ["No he trabajado hoy.", "I haven't worked today."]] },
  { id: "plup", name: "Pluscuamperfecto", level: "B2", desc: "Actions completed before another past action.", endings: { ar: ["había -ado", "habías -ado", "había -ado", "habíamos -ado", "habíais -ado", "habían -ado"], er: ["había -ido", "habías -ido", "había -ido", "habíamos -ido", "habíais -ido", "habían -ido"], ir: ["había -ido", "habías -ido", "había -ido", "habíamos -ido", "habíais -ido", "habían -ido"] }, examples: [["Ya había estudiado cuando llegaste.", "I had already studied when you arrived."], ["Ella había comido antes de salir.", "She had eaten before leaving."], ["Habíamos vivido allí dos años.", "We had lived there for two years."], ["¿Habías trabajado en eso?", "Had you worked on that?"], ["Ellos no habían viajado mucho.", "They hadn't traveled much."]] },
  { id: "futperf", name: "Futuro perfecto", level: "B2", desc: "Something that will have happened by a future time.", endings: { ar: ["habré -ado", "habrás -ado", "habrá -ado", "habremos -ado", "habréis -ado", "habrán -ado"], er: ["habré -ido", "habrás -ido", "habrá -ido", "habremos -ido", "habréis -ido", "habrán -ido"], ir: ["habré -ido", "habrás -ido", "habrá -ido", "habremos -ido", "habréis -ido", "habrán -ido"] }, examples: [["Para mañana, habré terminado.", "By tomorrow, I will have finished."], ["¿Habrás comido antes de llegar?", "Will you have eaten before arriving?"], ["Ellos habrán vivido allí diez años.", "They will have lived there ten years."], ["Habremos estudiado suficiente.", "We have studied enough."], ["No habrán salido aún.", "They won't have left yet."]] },
  { id: "condperf", name: "Condicional perfecto", level: "B2", desc: "What would have happened.", endings: { ar: ["habría -ado", "habrías -ado", "habría -ado", "habríamos -ado", "habríais -ado", "habrían -ado"], er: ["habría -ido", "habrías -ido", "habría -ido", "habríamos -ido", "habríais -ido", "habrían -ido"], ir: ["habría -ido", "habrías -ido", "habría -ido", "habríamos -ido", "habríais -ido", "habrían -ido"] }, examples: [["Habría viajado, pero estaba enfermo.", "I would have traveled, but I was sick."], ["¿Habrías comido más?", "Would you have eaten more?"], ["Ellos habrían vivido allí.", "They would have lived there."], ["Habríamos estudiado antes.", "We would have studied earlier."], ["No habría llegado tarde.", "I wouldn't have arrived late."]] },
  { id: "subpres", name: "Subjuntivo", level: "B1", desc: "Wishes, doubts, recommendations in present/future.", endings: { ar: ["-e", "-es", "-e", "-emos", "-éis", "-en"], er: ["-a", "-as", "-a", "-amos", "-áis", "-an"], ir: ["-a", "-as", "-a", "-amos", "-áis", "-an"] }, examples: [["Espero que estudies.", "I hope you study."], ["Es posible que él coma aquí.", "It's possible that he eats here."], ["Quiero que vivamos juntos.", "I want us to live together."], ["Dudo que lleguen tarde.", "I doubt they arrive late."], ["Ojalá tengas tiempo.", "Hopefully you have time."]] },
  { id: "subimp", name: "Subjuntivo imperfecto", level: "B2", desc: "Wishes/doubts in the past; after conditional.", endings: { ar: ["-ara", "-aras", "-ara", "-áramos", "-arais", "-aran"], er: ["-iera", "-ieras", "-iera", "-iéramos", "-ierais", "-ieran"], ir: ["-iera", "-ieras", "-iera", "-iéramos", "-ierais", "-ieran"] }, examples: [["Quería que vinieras.", "I wanted you to come."], ["Si yo tuviera tiempo, estudiara más.", "If I had time, I'd study more."], ["Era importante que él comiera.", "It was important that he eat."], ["Dudaban que viviéramos allí.", "They doubted we lived there."], ["Ojalá lloviera.", "I wish it would rain."]] },
  { id: "subperf", name: "Subjuntivo perfecto", level: "B2", desc: "Subjunctive with completed action linked to present.", endings: { ar: ["haya -ado", "hayas -ado", "haya -ado", "hayamos -ado", "hayáis -ado", "hayan -ado"], er: ["haya -ido", "hayas -ido", "haya -ido", "hayamos -ido", "hayáis -ido", "hayan -ido"], ir: ["haya -ido", "hayas -ido", "haya -ido", "hayamos -ido", "hayáis -ido", "hayan -ido"] }, examples: [["Me alegra que hayas venido.", "I'm glad you have come."], ["Es posible que él haya comido.", "It's possible he has eaten."], ["Dudo que hayan vivido allí.", "I doubt they have lived there."], ["Espero que hayas estudiado.", "I hope you have studied."], ["No creo que haya trabajado mucho.", "I don't think he has worked much."]] },
  { id: "subplup", name: "Subjuntivo pluscuamperfecto", level: "C1", desc: "Subjunctive with completed action prior to a past reference.", endings: { ar: ["hubiera -ado", "hubieras -ado", "hubiera -ado", "hubiéramos -ado", "hubierais -ado", "hubieran -ado"], er: ["hubiera -ido", "hubieras -ido", "hubiera -ido", "hubiéramos -ido", "hubierais -ido", "hubieran -ido"], ir: ["hubiera -ido", "hubieras -ido", "hubiera -ido", "hubiéramos -ido", "hubierais -ido", "hubieran -ido"] }, examples: [["Me alegró que hubieras venido.", "I was glad you had come."], ["Si hubiéramos estudiado, habríamos aprobado.", "If we had studied, we would have passed."], ["Dudaba que él hubiera comido.", "I doubted he had eaten."], ["Ojalá hubieras vivido allí.", "I wish you had lived there."], ["No creían que hubiera trabajado tanto.", "They didn't believe he had worked so much."]] }
];

export async function GET() {
  // This is a stub that returns the static tenses array.
  // Eventually, this could be populated by calls to a large language model.
  return NextResponse.json(tenses);
}
