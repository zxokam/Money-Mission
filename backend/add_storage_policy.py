import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise RuntimeError("Missing DATABASE_URL environment variable")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print('=== EXISTING STORAGE POLICIES ===')
cur.execute("SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND schema_name = 'storage'")
for row in cur.fetchall():
    print(row)

print()
print('=== CREATING INSERT POLICY FOR PHOTOS BUCKET ===')
try:
    cur.execute("""
        CREATE POLICY "Allow public uploads to photos"
        ON storage.objects
        FOR INSERT
        WITH CHECK (bucket_id = 'photos');
    """)
    print('INSERT policy created successfully')
except Exception as e:
    print(f'Error: {e}')

print()
print('=== CREATING SELECT POLICY FOR PHOTOS BUCKET ===')
try:
    cur.execute("""
        CREATE POLICY "Allow public read from photos"
        ON storage.objects
        FOR SELECT
        USING (bucket_id = 'photos');
    """)
    print('SELECT policy created successfully')
except Exception as e:
    print(f'Error: {e}')

print()
print('=== UPDATED STORAGE POLICIES ===')
cur.execute("SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND schema_name = 'storage'")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
print()
print('Done!')
