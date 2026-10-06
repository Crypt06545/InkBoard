// src/ai/ai.service.ts
import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenAI | null = null;
  private readonly model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  private getClient(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException(
        'Gemini API key is not configured on the server',
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
    return this.client;
  }

  private extractJson(text: string): any {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.search(/[{[]/);
    if (start === -1) {
      throw new HttpException(
        'AI returned an unexpected response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const end = Math.max(
      candidate.lastIndexOf(']'),
      candidate.lastIndexOf('}'),
    );
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      throw new HttpException(
        'Failed to parse AI response',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async runPrompt(prompt: string): Promise<string> {
    try {
      const response = await this.getClient().models.generateContent({
        model: this.model,
        contents: prompt,
      });
      return response.text ?? '';
    } catch (err: any) {
      if (err instanceof HttpException) throw err;

      const status = err.status || err.statusCode;
      if (status === 429) {
        throw new HttpException(
          'AI quota exceeded. Check your Gemini plan/billing and try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (status === 400 || status === 401 || status === 403) {
        throw new ServiceUnavailableException(
          'AI request rejected - verify your GEMINI_API_KEY is valid.',
        );
      }

      this.logger.error(`Gemini request failed: ${err.message}`);
      throw new BadGatewayException(
        'The AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  async brainstormNotes(topic: string, count = 6) {
    const prompt = `You are a creative facilitator running a brainstorming session.
Generate ${count} distinct, concise ideas for the following prompt.
Prompt: "${topic}"

Each idea should be a short phrase or sentence suitable for a sticky note (max ~12 words).
Respond ONLY with a JSON array of objects: { "text": string }.
No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));
    if (!Array.isArray(json))
      throw new BadGatewayException('AI did not return a list of notes');

    return json
      .map((n: any) => ({
        text: String(n.text || n.idea || n)
          .trim()
          .slice(0, 160),
      }))
      .filter((n) => n.text)
      .slice(0, count);
  }

  async generateOutline(topic: string, count = 6) {
    const prompt = `You are an expert note-taker. Create a structured outline for the topic below.
Topic: "${topic}"

Respond ONLY with JSON: {
  "title": string,
  "points": string[] // ${count} concise bullet points
}
No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));
    return {
      title: String(json.title || topic)
        .trim()
        .slice(0, 120),
      points: (Array.isArray(json.points) ? json.points : [])
        .map((p: any) => String(p).trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, count),
    };
  }

  async generateDiagram(topic: string, maxNodes = 8) {
    const prompt = `You are a systems analyst. Produce a flowchart for the following process.

Return ONLY JSON of this exact shape:
{
  "nodes": [ { "id": string, "label": string (max ~6 words), "shape": "ellipse"|"rect"|"diamond" } ],
  "edges": [ { "from": string (node id), "to": string (node id), "label": string (optional, e.g. "Yes"/"No") } ]
}
Rules:
- Use "ellipse" for the single Start and single End nodes.
- Use "diamond" for decision points (their label should be a yes/no question).
- Use "rect" for actions/process steps.
- Keep it to at most ${maxNodes} nodes. Every edge's from/to MUST reference a node id.
No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));

    const nodes = (Array.isArray(json.nodes) ? json.nodes : [])
      .map((n: any) => ({
        id: String(n.id || '').trim(),
        label: String(n.label || '')
          .trim()
          .slice(0, 60),
        shape: ['ellipse', 'rect', 'diamond'].includes(n.shape)
          ? n.shape
          : 'rect',
      }))
      .filter((n: any) => n.id && n.label)
      .slice(0, maxNodes);

    const ids = new Set(nodes.map((n: any) => n.id));
    const edges = (Array.isArray(json.edges) ? json.edges : [])
      .map((e: any) => ({
        from: String(e.from || '').trim(),
        to: String(e.to || '').trim(),
        label: e.label ? String(e.label).trim().slice(0, 24) : '',
      }))
      .filter((e: any) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

    if (!nodes.length)
      throw new BadGatewayException('AI did not return a diagram');
    return { nodes, edges };
  }

  async generateChart(topic: string) {
    const prompt = `You are a data analyst. Turn the request below into a small chart.
Request: "${topic}"

Return ONLY JSON: {
  "chartType": "bar" | "line" | "pie" | "donut",
  "title": string,
  "data": [ { "label": string, "value": number } ]  // 3 to 8 rows
}
Pick the best chart type: pie/donut for parts-of-a-whole, line for trends over time, bar for comparisons.
If the request has no numbers, invent realistic example values. No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));
    const chartType = ['bar', 'line', 'pie', 'donut'].includes(json.chartType)
      ? json.chartType
      : 'bar';

    const data = (Array.isArray(json.data) ? json.data : [])
      .map((d: any) => ({
        label: String(d.label ?? '')
          .trim()
          .slice(0, 24),
        value: Number(d.value) || 0,
      }))
      .filter((d: any) => d.label)
      .slice(0, 8);

    if (!data.length)
      throw new BadGatewayException('AI did not return chart data');
    return {
      chartType,
      title: String(json.title || topic)
        .trim()
        .slice(0, 60),
      data,
    };
  }

  async editChart(
    instruction: string,
    chart: { chartType?: string; title?: string; data?: any[] },
  ) {
    const prompt = `You are editing a chart. Apply the instruction, keeping existing data unless asked to change it.
Instruction: "${instruction}"
Current chart (JSON): ${JSON.stringify({ chartType: chart.chartType, title: chart.title, data: chart.data })}

Return ONLY updated JSON: {
  "chartType": "bar" | "line" | "pie" | "donut",
  "title": string,
  "data": [ { "label": string, "value": number } ]
}
No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));
    const chartType = ['bar', 'line', 'pie', 'donut'].includes(json.chartType)
      ? json.chartType
      : chart.chartType || 'bar';

    const data = (Array.isArray(json.data) ? json.data : [])
      .map((d: any) => ({
        label: String(d.label ?? '')
          .trim()
          .slice(0, 24),
        value: Number(d.value) || 0,
      }))
      .filter((d: any) => d.label)
      .slice(0, 12);

    return {
      chartType,
      title: String(json.title ?? chart.title ?? '')
        .trim()
        .slice(0, 60),
      data: data.length ? data : chart.data,
    };
  }

  async editElements(
    instruction: string,
    items: { id: string; content: string }[],
  ) {
    const prompt = `You are editing text on a whiteboard. Apply the user's instruction to each item's content.
Instruction: "${instruction}"

Items (JSON): ${JSON.stringify(items.map((i) => ({ id: i.id, content: i.content })))}

Return ONLY a JSON array. For each item return { "id": string, "content": string } with the edited text.
Keep the SAME ids. Preserve newlines where an item already has them (these are bullet lists).
Do not add or remove items. No markdown, no commentary.`;

    const json = this.extractJson(await this.runPrompt(prompt));
    const arr = Array.isArray(json) ? json : [];
    const map = new Map<string, string>();

    for (const r of arr) {
      if (r && r.id != null)
        map.set(String(r.id), String(r.content ?? '').slice(0, 2000));
    }

    return map;
  }

  async summarizeBoard({
    boardTitle,
    notes,
  }: {
    boardTitle: string;
    notes: string[];
  }) {
    const body = notes.length
      ? notes.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : '(the board has no text yet)';

    const prompt = `You are a helpful assistant. Summarize the notes on the whiteboard "${boardTitle}".
Notes on the board:
${body}

Respond ONLY with JSON: {
  "headline": string (one sentence overview),
  "themes": string[] (key themes / groupings),
  "actionItems": string[] (concrete next steps),
  "questions": string[] (open questions worth exploring)
}
No markdown, no commentary.`;

    return this.extractJson(await this.runPrompt(prompt));
  }
}
