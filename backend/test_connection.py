import psycopg2

# Try Supabase connection pooler (Session mode, port 6543)
dsns = [
    "postgresql://postgres.kgcwknyznvnixpxonfov:Zkamilan2233@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.kgcwknyznvnixpxonfov:Zkamilan2233@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:Zkamilan2233@db.kgcwknyznvnixpxonfov.supabase.co:5432/postgres?sslmode=require",
]

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
