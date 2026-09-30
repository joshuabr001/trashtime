import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatório');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  query<T extends QueryResultRow>(sql: string, values: unknown[] = []) {
    return this.pool.query<T>(sql, values);
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
