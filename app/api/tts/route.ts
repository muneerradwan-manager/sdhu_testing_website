import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Arabic text-to-speech with natural Syrian neural voices.
 * Most computers have no Arabic voice installed, so the browser's speechSynthesis stays silent;
 * this route returns a real MP3 instead. Results are memoised per text.
 */
const VOICES = { f: "ar-SY-AmanyNeural", m: "ar-SY-LaithNeural" } as const;
const cache = new Map<string, Buffer>();

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function synthesize(text: string, voice: string) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), { rate: "-8%" });
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  } finally {
    tts.close();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim().slice(0, 1500);
  const voice = VOICES[searchParams.get("voice") === "m" ? "m" : "f"];
  if (!text) return new Response("missing text", { status: 400 });

  const key = `${voice}|${text}`;
  let audio = cache.get(key);
  if (!audio) {
    try {
      audio = await synthesize(text, voice);
    } catch {
      return new Response("tts unavailable", { status: 503 });
    }
    if (!audio.length) return new Response("tts unavailable", { status: 503 });
    if (cache.size > 300) cache.clear();
    cache.set(key, audio);
  }

  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
