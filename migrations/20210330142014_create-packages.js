exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT UNIQUE NOT NULL,
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      credits INTEGER NOT NULL DEFAULT 0
    );
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP TABLE IF EXISTS packages;')
}
