exports.up = async function(knex) {
  const trx = await knex.transaction()
  try {
    await knex.raw('ALTER TABLE transactions ADD organization_id INTEGER;')
    await knex.raw('ALTER TABLE transactions ALTER user_id DROP NOT NULL;')
    await trx.commit()
  } catch (err) {
    await trx.rollback()
  }
}

exports.down = async function(knex) {
  const trx = await knex.transaction()
  try {
    await knex.raw('ALTER TABLE transactions DROP organization_id;')
    await knex.raw('ALTER TABLE transactions ALTER user_id SET NOT NULL;')
    await trx.commit()
  } catch (err) {
    await trx.rollback()
  }
}
