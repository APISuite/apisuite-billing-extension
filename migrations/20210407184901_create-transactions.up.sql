CREATE TABLE IF NOT EXISTS transactions (
--    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    payment_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();