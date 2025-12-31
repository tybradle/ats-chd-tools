-- Glenair Series 80 Catalog Data
CREATE TABLE IF NOT EXISTS glenair_contacts (
    part_number TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'Pin' or 'Socket'
    contact_size TEXT NOT NULL,
    awg_range TEXT,
    mm2_range TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS glenair_arrangements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arrangement TEXT NOT NULL,
    total_contacts INTEGER NOT NULL,
    contact_size TEXT NOT NULL,
    contact_count INTEGER NOT NULL,
    UNIQUE(arrangement, contact_size)
);

CREATE TABLE IF NOT EXISTS glenair_wire_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wire_size TEXT NOT NULL, -- e.g. '22'
    system TEXT NOT NULL, -- 'AWG' or 'MM2'
    contact_size TEXT NOT NULL,
    UNIQUE(wire_size, system, contact_size)
);

CREATE TABLE IF NOT EXISTS glenair_phm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arrangement TEXT NOT NULL,
    shell_size INTEGER NOT NULL,
    dash_number TEXT NOT NULL,
    FOREIGN KEY(arrangement) REFERENCES glenair_arrangements(arrangement)
);
