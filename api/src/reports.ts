import { BadRequestException, Body, Controller, Injectable, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database } from './database';

type ReportInput = {
  requestId?: unknown;
  type?: unknown;
  region?: unknown;
  location?: unknown;
  description?: unknown;
};

const types = new Set(['nao-realizada', 'acumulo', 'fora-horario', 'outro']);
const regions = new Set(['umarizal', 'reduto', 'campina', 'cidadevelha', 'nazare', 'saobras', 'batistacampos', 'jurunas', 'guama']);

@Injectable()
export class ReportsService {
  constructor(private readonly database: Database) {}

  async create(input: ReportInput) {
    const { requestId, type, region, location, description } = input ?? {};
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
        typeof type !== 'string' || !types.has(type) ||
        typeof region !== 'string' || !regions.has(region) ||
        typeof location !== 'string' || location.trim().length < 3 || location.trim().length > 160 ||
        typeof description !== 'string' || description.length > 1000) {
      throw new BadRequestException('Relato inválido');
    }
    const protocol = `PT-${new Date().getUTCFullYear()}-${randomUUID()}`;
    const result = await this.database.query<{ protocol: string; created_at: Date }>(
      `INSERT INTO reports (request_id, protocol, type, region, location, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (request_id) DO UPDATE SET request_id = EXCLUDED.request_id
       RETURNING protocol, created_at`,
      [requestId, protocol, type, region, location.trim(), description.trim()],
    );
    return {
      protocol: result.rows[0].protocol,
      createdAt: result.rows[0].created_at,
      status: 'Recebido pelo projeto',
    };
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() body: ReportInput) {
    return this.reports.create(body);
  }
}
