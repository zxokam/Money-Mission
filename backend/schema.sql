-- MoneyMission AI — MySQL 8+ Schema
-- Clean relational design with indexes, foreign keys, and sensible defaults

DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS financial_setups;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS users;

-- ── Users ──────────────────────────────────────────────────

CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    role        VARCHAR(50)   NOT NULL DEFAULT 'user',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Missions ───────────────────────────────────────────────

CREATE TABLE missions (
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT           NULL,
    title                           VARCHAR(255)  NOT NULL,
    sponsor_name                    VARCHAR(255)  NOT NULL,
    participant_name                VARCHAR(255)  NOT NULL,
    reward_amount                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    target_improvement_percentage   DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
    start_date                      DATE          NOT NULL,
    end_date                        DATE          NOT NULL,
    rules                           TEXT          NULL,
    status                          VARCHAR(50)   NOT NULL DEFAULT 'pending',
    verification_method             VARCHAR(50)   NOT NULL DEFAULT 'bank',
    photo_subject                   VARCHAR(255)  NULL,
    photo_frequency                 VARCHAR(50)   NOT NULL DEFAULT 'daily',
    total_photos_required           INT           NOT NULL DEFAULT 0,
    expire_days                     INT           NOT NULL DEFAULT 15,
    created_at                      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_missions_user        (user_id),
    INDEX idx_missions_status      (status),
    INDEX idx_missions_created     (created_at),
    INDEX idx_missions_expire      (created_at, status),

    CONSTRAINT fk_missions_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Financial Setups ───────────────────────────────────────

CREATE TABLE financial_setups (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    mission_id              INT           NOT NULL UNIQUE,
    monthly_income          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fixed_expenses          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subscriptions           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paylater_commitments    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    average_food_per_day    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    transport_cost          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    other_required_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    required_expenses       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    expected_leftover       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    safe_daily_spending     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    baseline_financial_score INT          NOT NULL DEFAULT 60,
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_finsetup_mission (mission_id),

    CONSTRAINT fk_finsetup_mission
        FOREIGN KEY (mission_id) REFERENCES missions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Transactions ───────────────────────────────────────────

CREATE TABLE transactions (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    mission_id        INT            NOT NULL,
    name              VARCHAR(255)   NOT NULL,
    amount            DECIMAL(10,2)  NOT NULL,
    category          VARCHAR(50)    NOT NULL DEFAULT 'Others',
    transaction_date  DATE           NOT NULL,
    receipt_url       VARCHAR(500)   NULL,
    created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tx_mission       (mission_id),
    INDEX idx_tx_date          (transaction_date),
    INDEX idx_tx_category      (category),
    INDEX idx_tx_mission_date  (mission_id, transaction_date),

    CONSTRAINT fk_tx_mission
        FOREIGN KEY (mission_id) REFERENCES missions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Evaluations ────────────────────────────────────────────

CREATE TABLE evaluations (
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    mission_id                      INT            NOT NULL UNIQUE,
    expected_leftover               DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    actual_total_spending           DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    actual_leftover                 DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    improvement_percentage          DECIMAL(6,2)   NOT NULL DEFAULT 0.00,
    target_improvement_percentage   DECIMAL(5,2)   NOT NULL DEFAULT 10.00,
    final_financial_score           INT            NOT NULL DEFAULT 60,
    status                          VARCHAR(50)    NOT NULL DEFAULT 'accepted',
    ai_explanation                  TEXT           NULL,
    reward_unlocked                 TINYINT(1)     NOT NULL DEFAULT 0,
    category_breakdown              JSON           NULL,
    created_at                      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_eval_mission (mission_id),
    INDEX idx_eval_status   (status),

    CONSTRAINT fk_eval_mission
        FOREIGN KEY (mission_id) REFERENCES missions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
