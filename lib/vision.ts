import type { AiConfig, BuiltMatch, BuiltMatchup, Provider } from './types';

export interface ScaledImage {
  b64: string;
  mime: string;
  preview: string;
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-opus-4-8',
  openai: 'gpt-4o',
};

// 参照実装の EXTRACT_PROMPT をそのまま移植
export const EXTRACT_PROMPT = `あなたはテニスの対抗戦（2チームの団体戦）の手書き対戦表を読み取るアシスタントです。
アップロードされた画像（複数枚の場合あり）から、写っている対抗戦の情報をすべて抽出し、JSONのみを返してください。
チーム数や対抗戦の数は決まっていません。画像に写っているものだけを抽出してください。
規則:
- 各シート上部のタイトル（例「あじさい vs たんぽぽ」）が、その対抗戦の対戦カード（2チーム名）。左側を teams[0]、右側を teams[1]。
- 複数の画像が「同じ2チームの対戦（同じタイトル）」なら、同じ対抗戦の別ページ（例:男子ページと女子ページ）なので1つの対抗戦にまとめる。
- 「異なる対戦カード」（タイトルのチームの組合せが違う）なら、別々の対抗戦として分ける。1枚の画像内に複数のカードがある場合も分ける。
- 「男子」セクションは gender="M"、「女子」は gender="F"。Mで始まる行(M1等)はミックスダブルスで gender="X"。
- S=シングルス(cat="S",各サイド1名)。D=ダブルス(cat="D",各サイド2名)。「-」の左が sideA(teams[0])、右が sideB(teams[1])。
- 名前は書かれているとおり（ひらがな等）。①等の記号も残す。読めない字は推測でよい。noは行番号。
出力JSON（このキー構造を厳守。説明やコードブロックは不要、JSONのみ）:
{"matchups":[{"teams":["左チーム名","右チーム名"],"matches":[{"cat":"S","no":1,"gender":"M","sideA":["名前"],"sideB":["名前"]}]}]}`;

export async function loadImageScaled(file: File): Promise<ScaledImage> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const max = 1600;
  let { width: w, height: h } = img;
  if (Math.max(w, h) > max) {
    const s = max / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const jpeg = c.toDataURL('image/jpeg', 0.85);
  return { b64: jpeg.split(',')[1], mime: 'image/jpeg', preview: jpeg };
}

export function parseJSONLoose(text: string): unknown {
  let t = (text || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e >= 0) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

// プロバイダ別 Vision API 呼び出し（参照実装から移植）
export async function callVision(rawAi: AiConfig, imgs: ScaledImage[]): Promise<unknown> {
  // 貼り付けやリンク経由でキーやモデル名の前後に空白・改行が入ることがある。
  // そのまま送るとGoogleは「認証情報が無い」とみなして401を返すので、送信直前に落とす。
  const ai: AiConfig = { ...rawAi, key: (rawAi.key || '').trim(), model: (rawAi.model || '').trim() };
  if (!ai.key) throw new Error('APIキーが設定されていません');
  if (ai.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${ai.model}:generateContent?key=${encodeURIComponent(ai.key)}`;
    const parts = [
      { text: EXTRACT_PROMPT },
      ...imgs.map((im) => ({ inline_data: { mime_type: im.mime, data: im.b64 } })),
    ];
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    if (!r.ok) throw new Error('Gemini ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    return parseJSONLoose(j.candidates[0].content.parts[0].text);
  }
  if (ai.provider === 'claude') {
    const content = [
      ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.b64 } })),
      { type: 'text', text: EXTRACT_PROMPT },
    ];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ai.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: ai.model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
    });
    if (!r.ok) throw new Error('Claude ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    return parseJSONLoose(j.content[0].text);
  }
  const content = [
    { type: 'text', text: EXTRACT_PROMPT },
    ...imgs.map((im) => ({ type: 'image_url', image_url: { url: `data:${im.mime};base64,${im.b64}` } })),
  ];
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ai.key },
    body: JSON.stringify({ model: ai.model, response_format: { type: 'json_object' }, messages: [{ role: 'user', content }] }),
  });
  if (!r.ok) throw new Error('OpenAI ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return parseJSONLoose(j.choices[0].message.content);
}

/* 抽出JSONを BuiltMatchup[] に整形（複数対抗戦対応、旧 {teams,matches} 形式もフォールバック） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normMatch(m: any, i: number): BuiltMatch {
  return {
    cat: ['S', 'D', 'M'].includes(m.cat) ? m.cat : 'D',
    no: +m.no || i + 1,
    gender: ['M', 'F', 'X'].includes(m.gender) ? m.gender : 'M',
    aNames: (m.sideA || []).map((n: unknown) => (n ?? '').toString().trim()).filter(Boolean),
    bNames: (m.sideB || []).map((n: unknown) => (n ?? '').toString().trim()).filter(Boolean),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFromExtraction(ex: any): BuiltMatchup[] {
  let mus = ex?.matchups;
  if (!Array.isArray(mus)) mus = [{ teams: ex?.teams, matches: ex?.matches }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mus.filter(Boolean).map((mu: any) => ({
    aName: ((mu.teams && mu.teams[0]) || 'チームA').toString().trim(),
    bName: ((mu.teams && mu.teams[1]) || 'チームB').toString().trim(),
    matches: (mu.matches || []).map(normMatch),
  }));
}
