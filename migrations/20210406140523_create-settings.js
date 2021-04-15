exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS settings (
      name TEXT PRIMARY KEY,
      value TEXT NULL
    );
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP TABLE IF EXISTS settings;')
}
