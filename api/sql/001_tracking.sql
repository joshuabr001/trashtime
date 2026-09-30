CREATE TABLE IF NOT EXISTS vehicles (
    id text PRIMARY KEY,
    name text NOT NULL,
    region text NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_positions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id text NOT NULL REFERENCES vehicles(id),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_m double precision CHECK (accuracy_m >= 0),
    source text NOT NULL DEFAULT 'tracker' CHECK (source IN ('tracker', 'simulation')),
    recorded_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicle_positions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'tracker';

CREATE INDEX IF NOT EXISTS vehicle_positions_latest_idx
    ON vehicle_positions (vehicle_id, recorded_at DESC, id DESC);

INSERT INTO vehicles (id, name, region) VALUES
    ('ct052', 'Caminhão CT-052', 'Umarizal'),
    ('ct063', 'Caminhão CT-063', 'Reduto'),
    ('ct104', 'Caminhão CT-104', 'Campina'),
    ('ct118', 'Caminhão CT-118', 'Cidade Velha'),
    ('ct090', 'Caminhão CT-090', 'Nazaré'),
    ('ct071', 'Caminhão CT-071', 'São Brás'),
    ('ct076', 'Caminhão CT-076', 'Batista Campos'),
    ('ct085', 'Caminhão CT-085', 'Jurunas'),
    ('ct099', 'Caminhão CT-099', 'Guamá')
ON CONFLICT (id) DO NOTHING;
