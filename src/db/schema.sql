CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255)       NOT NULL,
  name          VARCHAR(255)       NOT NULL,
  role          VARCHAR(100),
  created_at    TIMESTAMPTZ        DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comunicados (
  id            VARCHAR(10)  PRIMARY KEY,
  read_mode     VARCHAR(10)  NOT NULL DEFAULT 'auto',
  category_id   VARCHAR(50)  NOT NULL,
  urgent        BOOLEAN      DEFAULT FALSE,
  like_base     INT          DEFAULT 0,
  title         VARCHAR(500) NOT NULL,
  body          TEXT[]       NOT NULL DEFAULT '{}',
  author_name   VARCHAR(255),
  author_role   VARCHAR(100),
  date_iso      TIMESTAMPTZ  DEFAULT NOW(),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
