exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER NOT NULL PRIMARY KEY,
      subscription_id INTEGER NULL,
      credits DECIMAL(12, 2) NOT NULL DEFAULT 0,
      pp_customer_id TEXT NULL UNIQUE,
      pp_subscription_id TEXT NULL UNIQUE,
      invoice_notes TEXT
    );
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP TABLE IF EXISTS organizations;')
}
