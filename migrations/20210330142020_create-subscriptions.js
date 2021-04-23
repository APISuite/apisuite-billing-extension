exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT UNIQUE NOT NULL,
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      credits DECIMAL(12, 2) NOT NULL DEFAULT 0,
      periodicity TEXT NOT NULL DEFAULT '1 month'
    );
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP TABLE IF EXISTS subscriptions;')
}
