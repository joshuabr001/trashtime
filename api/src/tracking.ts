import { BadRequestException, Controller, Get, Header, Headers, Injectable, Post, Body, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Database } from './database';

type PositionInput = {
  vehicleId?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracyM?: unknown;
  recordedAt?: unknown;
  source?: unknown;
};

@Injectable()
export class TrackingService {
  constructor(private readonly database: Database) {}

  async latest() {
    const result = await this.database.query<{
      id: string; name: string; region: string; latitude: number | null;
      longitude: number | null; accuracy_m: number | null; recorded_at: Date | null;
      source: string | null;
    }>(`
      SELECT v.id, v.name, v.region, p.latitude, p.longitude,
             p.accuracy_m, p.recorded_at, p.source
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, accuracy_m, recorded_at, source
        FROM vehicle_positions
        WHERE vehicle_id = v.id
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      ) p ON true
      ORDER BY v.id
    `);
    const now = Date.now();
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      region: row.region,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyM: row.accuracy_m,
      recordedAt: row.recorded_at,
      source: row.source,
      online: row.recorded_at !== null && now - new Date(row.recorded_at).getTime() <= 5 * 60_000,
    }));
  }

  async record(input: PositionInput) {
    const vehicleId = input?.vehicleId;
    const latitude = input?.latitude;
    const longitude = input?.longitude;
    const accuracyM = input?.accuracyM;
    const recordedAt = input?.recordedAt;
    const source = input?.source ?? 'tracker';
    if (typeof vehicleId !== 'string' || !/^ct\d{3}$/.test(vehicleId) ||
        typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        (accuracyM !== undefined && (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM < 0)) ||
        typeof recordedAt !== 'string' ||
        (source !== 'tracker' && source !== 'simulation')) {
      throw new BadRequestException('Posição inválida');
    }
    const timestamp = new Date(recordedAt);
    const age = Date.now() - timestamp.getTime();
    if (!Number.isFinite(timestamp.getTime()) ||
        age > 24 * 60 * 60_000 || age < -5 * 60_000) {
      throw new BadRequestException('Horário da posição inválido');
    }
    const found = await this.database.query('SELECT 1 FROM vehicles WHERE id = $1', [vehicleId]);
    if (found.rowCount === 0) throw new BadRequestException('Caminhão desconhecido');
    await this.database.query(
      `INSERT INTO vehicle_positions (vehicle_id, latitude, longitude, accuracy_m, recorded_at, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [vehicleId, latitude, longitude, accuracyM ?? null, timestamp, source],
    );
    return { accepted: true };
  }
}

@Controller('vehicles')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  latest() {
    return this.tracking.latest();
  }

  @Post('positions')
  record(@Headers('authorization') authorization: string | undefined, @Body() body: PositionInput) {
    const expected = process.env.INGEST_API_KEY;
    const received = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!expected || !received ||
        Buffer.byteLength(expected) !== Buffer.byteLength(received) ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
      throw new UnauthorizedException();
    }
    return this.tracking.record(body);
  }
}
