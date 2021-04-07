CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL PRIMARY KEY,
    customer_id TEXT NULL,
    plan_id INTEGER NULL ,
    credits INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_plan
        FOREIGN KEY(plan_id)
    	REFERENCES plans(id)
    	ON DELETE RESTRICT
);