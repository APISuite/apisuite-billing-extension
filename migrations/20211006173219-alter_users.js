exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE users ADD invoice_notes TEXT;
  `)
}

exports.down = function(knex) {
  return knex.raw('ALTER TABLE users DROP COLUMN invoice_notes;')
}
