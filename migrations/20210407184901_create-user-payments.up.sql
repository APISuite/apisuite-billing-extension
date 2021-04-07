CREATE TABLE IF NOT EXISTS user_payments (
    user_id INTEGER NOT NULL,
    payment_id TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(user_id, payment_id)
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);