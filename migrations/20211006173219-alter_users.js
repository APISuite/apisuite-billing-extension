exports.up = function(knex) {
  return knex.raw(`
    alter table users add invoice_notes TEXT;
  `)
}

exports.down = function(knex) {
  return knex.raw('alter table users drop column invoice_notes;')
}
