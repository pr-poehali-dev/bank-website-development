-- Создание таблицы пользователей банка
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    birth_date DATE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы заявок на карты
CREATE TABLE IF NOT EXISTS card_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Создание таблицы банковских карт
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_number VARCHAR(19) UNIQUE NOT NULL,
    card_type VARCHAR(20) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    from_card_id INTEGER REFERENCES cards(id),
    to_card_id INTEGER REFERENCES cards(id),
    amount DECIMAL(15, 2) NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_card ON transactions(from_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_card ON transactions(to_card_id);
CREATE INDEX IF NOT EXISTS idx_card_requests_user_id ON card_requests(user_id);

-- Создание админ-аккаунта (пароль: admin123)
INSERT INTO users (phone, birth_date, password_hash, is_admin) 
VALUES ('+79999999999', '1990-01-01', 'admin123hash', TRUE);