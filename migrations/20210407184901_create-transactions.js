exports.up = async function(knex) {
  await knex.raw(`
    CREATE TYPE transaction_type AS ENUM ('topup', 'consent', 'subscription');
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS transactions (
      payment_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      credits INTEGER NOT NULL DEFAULT 0,
      verified BOOLEAN DEFAULT FALSE,
      type transaction_type NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT fk_user
          FOREIGN KEY(user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
    );
  `)

  return knex.raw(`
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  `)
}

exports.down = function(knex) {
  return knex.raw('DROP TABLE IF EXISTS transactions;')
}
