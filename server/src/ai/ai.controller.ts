// src/ai/ai.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AiService } from './ai.service.js';

import { BoardsService } from '../boards/boards.service.js';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { BoardAccessGuard } from '../boards/guards/board-access.guard.js';
import { BoardEditGuard } from '../boards/guards/board-edit.guard.js';
import { EditSelectionDto } from './dto/edit-selection.dto.js';
import { AiGenerateDto } from './dto/ai-generate.dto.js';
import {
  ElementsService,
  type ElementSpec,
} from '../boards/elements.service.js';

const STICKY_COLORS = [
  '#fde68a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#ddd6fe',
  '#fed7aa',
];
const STICKY = 190;
const GAP = 24;

const NODE_SIZE: Record<string, { w: number; h: number }> = {
  rect: { w: 180, h: 72 },
  ellipse: { w: 170, h: 72 },
  diamond: { w: 170, h: 110 },
};
const GAP_X = 60;
const GAP_Y = 80;

const TEXT_FIELD: Record<string, string> = {
  text: 'text',
  sticky: 'text',
  bullet: 'items',
  rect: 'label',
  ellipse: 'label',
  diamond: 'label',
};

@UseGuards(JwtAccessGuard, BoardAccessGuard)
@Controller('boards/:boardId/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly elementsService: ElementsService,
    private readonly boardsService: BoardsService,
  ) {}

  @Post('brainstorm')
  @UseGuards(BoardEditGuard)
  async brainstorm(
    @Param('boardId') boardId: string,
    @Body() dto: AiGenerateDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const count = Math.min(Math.max(dto.count || 6, 1), 12);
    const originX = dto.x ?? 80;
    const originY = dto.y ?? 80;

    const notes = await this.aiService.brainstormNotes(dto.topic, count);
    const cols = Math.ceil(Math.sqrt(notes.length));

    const specs: ElementSpec[] = notes.map((n, i) => ({
      type: 'sticky',
      data: {
        x: originX + (i % cols) * (STICKY + GAP),
        y: originY + Math.floor(i / cols) * (STICKY + GAP),
        w: STICKY,
        h: STICKY,
        fill: STICKY_COLORS[i % STICKY_COLORS.length],
        text: n.text,
        fontSize: 16,
      },
    }));

    const elements = await this.elementsService.persist(
      boardId,
      userId,
      specs,
      socketId,
    );
    return { elements };
  }

  @Post('outline')
  @UseGuards(BoardEditGuard)
  async outline(
    @Param('boardId') boardId: string,
    @Body() dto: AiGenerateDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const count = Math.min(Math.max(dto.count || 6, 1), 12);
    const originX = dto.x ?? 80;
    const originY = dto.y ?? 80;

    const { title, points } = await this.aiService.generateOutline(
      dto.topic,
      count,
    );

    const specs: ElementSpec[] = [
      {
        type: 'text',
        data: {
          x: originX,
          y: originY,
          w: 360,
          text: title,
          fontSize: 28,
          color: '#16161d',
          weight: 700,
        },
      },
      {
        type: 'bullet',
        data: {
          x: originX,
          y: originY + 52,
          w: 360,
          items: points,
          fontSize: 16,
          color: '#16161d',
        },
      },
    ];

    const elements = await this.elementsService.persist(
      boardId,
      userId,
      specs,
      socketId,
    );
    return { elements };
  }

  @Post('diagram')
  @UseGuards(BoardEditGuard)
  async diagram(
    @Param('boardId') boardId: string,
    @Body() dto: AiGenerateDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const count = Math.min(Math.max(dto.count || 8, 2), 12);
    const originX = dto.x ?? 120;
    const originY = dto.y ?? 120;

    const { nodes, edges } = await this.aiService.generateDiagram(
      dto.topic,
      count,
    );
    const specs = this.layoutDiagram(nodes, edges, originX, originY);

    const elements = await this.elementsService.persist(
      boardId,
      userId,
      specs,
      socketId,
    );
    return { elements };
  }

  @Post('chart')
  @UseGuards(BoardEditGuard)
  async chart(
    @Param('boardId') boardId: string,
    @Body() dto: AiGenerateDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const originX = dto.x ?? 120;
    const originY = dto.y ?? 120;

    const spec = await this.aiService.generateChart(dto.topic);

    const [element] = await this.elementsService.persist(
      boardId,
      userId,
      [
        {
          type: 'chart',
          data: { x: originX, y: originY, w: 420, h: 300, ...spec },
        },
      ],
      socketId,
    );

    return { elements: [element] };
  }

  @Post('edit-selection')
  @UseGuards(BoardEditGuard)
  async editSelection(
    @Param('boardId') boardId: string,
    @Body() dto: EditSelectionDto,
    @Headers('x-socket-id') socketId?: string,
  ) {
    const elements = await this.elementsService.findByIds(boardId, dto.ids);
    const editableTypes = [
      'text',
      'sticky',
      'bullet',
      'rect',
      'ellipse',
      'diamond',
      'chart',
    ];
    const relevant = elements.filter((el) => editableTypes.includes(el.type));

    const charts = relevant.filter((el) => el.type === 'chart');
    const editable = relevant.filter(
      (el) => el.type !== 'chart' && this.contentOf(el).trim(),
    );

    if (!editable.length && !charts.length) return { elements: [] };

    const updated: any[] = [];

    if (editable.length) {
      const items = editable.map((el) => ({
        id: el.id,
        content: this.contentOf(el),
      }));
      const edits = await this.aiService.editElements(dto.instruction, items);

      for (const el of editable) {
        const content = edits.get(el.id);
        if (content === undefined) continue;

        const data = { ...el.data };

        if (el.type === 'bullet') {
          data.items = content
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          data[TEXT_FIELD[el.type]] = content;
        }

        updated.push(
          await this.elementsService.update(boardId, el.id, { data }, socketId),
        );
      }
    }

    for (const c of charts) {
      const spec = await this.aiService.editChart(dto.instruction, c.data);
      updated.push(
        await this.elementsService.update(
          boardId,
          c.id,
          { data: { ...c.data, ...spec } },
          socketId,
        ),
      );
    }

    return { elements: updated };
  }

  // শুধু পড়ে, তাই viewer ও ব্যবহার করতে পারবে (BoardEditGuard নেই)
  @Get('summary')
  async summary(@Param('boardId') boardId: string) {
    const board = await this.boardsService.getRawBoard(boardId);
    const notes: string[] = [];

    for (const el of board.elements) {
      if (!['text', 'sticky', 'bullet'].includes(el.type)) continue;
      if (el.type === 'bullet' && Array.isArray(el.data.items)) {
        notes.push(...el.data.items.map(String));
      } else if (el.data.text) {
        notes.push(String(el.data.text));
      }
    }

    const result = await this.aiService.summarizeBoard({
      boardTitle: board.title,
      notes,
    });
    return { summary: result };
  }

  private contentOf(el: { type: string; data: Record<string, any> }): string {
    if (el.type === 'bullet') return (el.data.items || []).join('\n');
    return el.data[TEXT_FIELD[el.type]] || '';
  }

  // AI diagram এর nodes/edges কে canvas এ layout করা — BFS দিয়ে level (depth) বের করে,
  // একই level এর node গুলো পাশাপাশি সাজায় (layered graph drawing এর সহজ ভার্সন)
  private layoutDiagram(
    nodes: {
      id: string;
      label: string;
      shape: 'rect' | 'ellipse' | 'diamond';
    }[],
    edges: { from: string; to: string; label?: string }[],
    originX: number,
    originY: number,
  ): ElementSpec[] {
    const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    for (const e of edges) indeg.set(e.to, (indeg.get(e.to) || 0) + 1);

    const level = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    const queue = nodes
      .filter((n) => (indeg.get(n.id) || 0) === 0)
      .map((n) => n.id);
    if (!queue.length && nodes.length) queue.push(nodes[0].id);

    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const e of edges.filter((e) => e.from === id)) {
        level.set(
          e.to,
          Math.max(level.get(e.to) || 0, (level.get(id) || 0) + 1),
        );
        queue.push(e.to);
      }
    }

    const byLevel: Record<number, typeof nodes> = {};
    for (const n of nodes) {
      const lvl = level.get(n.id) || 0;
      (byLevel[lvl] ||= []).push(n);
    }

    const placed: Record<
      string,
      { x: number; y: number; w: number; h: number }
    > = {};
    for (const [lvl, group] of Object.entries(byLevel)) {
      const y = originY + Number(lvl) * (NODE_SIZE.diamond.h + GAP_Y);
      const rowW = group.reduce(
        (s, n) => s + NODE_SIZE[n.shape].w + GAP_X,
        -GAP_X,
      );
      let cursor = originX + 200 - rowW / 2;
      for (const n of group) {
        const size = NODE_SIZE[n.shape];
        placed[n.id] = { x: cursor, y, w: size.w, h: size.h };
        cursor += size.w + GAP_X;
      }
    }

    const specs: ElementSpec[] = [];

    for (const n of nodes) {
      const p = placed[n.id];
      specs.push({
        type: n.shape,
        data: {
          x: p.x,
          y: p.y,
          w: p.w,
          h: p.h,
          fill:
            n.shape === 'ellipse'
              ? '#ebf6ef'
              : n.shape === 'diamond'
                ? '#fef9c3'
                : '#eef4ff',
          stroke: '#2f8159',
          strokeWidth: 2,
          radius: n.shape === 'rect' ? 12 : 0,
          label: n.label,
        },
      });
    }

    for (const e of edges) {
      const a = placed[e.from];
      const b = placed[e.to];
      const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const start = this.borderPoint(a, bc.x, bc.y);
      const end = this.borderPoint(b, ac.x, ac.y);

      specs.push({
        type: 'arrow',
        data: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          stroke: '#475569',
          strokeWidth: 2,
        },
      });

      if (e.label) {
        specs.push({
          type: 'text',
          data: {
            x: (start.x + end.x) / 2 + 6,
            y: (start.y + end.y) / 2 - 10,
            w: 60,
            text: e.label,
            fontSize: 13,
            color: '#475569',
            weight: 600,
          },
        });
      }
    }

    return specs;
  }

  private borderPoint(
    n: { x: number; y: number; w: number; h: number },
    tx: number,
    ty: number,
  ) {
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const scale =
      1 / Math.max(Math.abs(dx) / (n.w / 2), Math.abs(dy) / (n.h / 2));
    return { x: cx + dx * scale, y: cy + dy * scale };
  }
}
