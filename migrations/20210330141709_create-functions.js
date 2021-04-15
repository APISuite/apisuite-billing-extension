exports.up = function(knex) {
  return knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP FUNCTION IF EXISTS set_updated_at;')
}
