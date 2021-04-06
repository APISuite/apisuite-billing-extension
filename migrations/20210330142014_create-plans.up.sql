CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    credits INTEGER NOT NULL DEFAULT 0,
    periodicity TEXT NOT NULL DEFAULT '1 month'
);