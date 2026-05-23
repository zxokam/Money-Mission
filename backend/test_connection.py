import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise RuntimeError("Missing DATABASE_URL environment variable")

dsns = [DATABASE_URL]

for i, dsn in enumerate(dsns):
    print(f"Trying DSN {i+1}: {dsn[:80]}...")
    try:
        conn = psycopg2.connect(dsn)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1")
        print(f"  SUCCESS!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  FAILED: {e}")

print()
print("Done!")
