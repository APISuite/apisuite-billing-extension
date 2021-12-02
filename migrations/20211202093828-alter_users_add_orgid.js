exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE users ADD billing_organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;
  `)
}

exports.down = function(knex) {
  return knex.raw('ALTER TABLE users DROP COLUMN billing_organization_id;')
}
