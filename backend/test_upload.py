import urllib.request
import json

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY3drbnl6bnZuaXhweG9uZm92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAwMDg3MiwiZXhwIjoyMDk0NTc2ODcyfQ.1UC_eQZvjj4sn1x1srbksGiO4HPUa4v0cLoai1Ax3WU"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY3drbnl6bnZuaXhweG9uZm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDA4NzIsImV4cCI6MjA5NDU3Njg3Mn0.pABWghS3BKhCBxbJQdz7u0JZTk8onO_EzZpxoJjHIFc"

BASE = "https://kgcwknyznvnixpxonfov.supabase.co"

# Test: Upload using supabase-js style headers (mimicking the frontend exactly)
print("=== Test 1: Upload with anon key (like frontend) ===")
url = f"{BASE}/storage/v1/object/photos/test-from-script.txt"
data = b"hello world"
req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", f"Bearer {ANON_KEY}")
req.add_header("apikey", ANON_KEY)
req.add_header("Content-Type", "text/plain")
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"Status: {resp.status}")
        print(json.loads(resp.read()))
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")

# Test: Try upload without Content-Type header (Supabase sometimes needs this)
print("\n=== Test 2: Upload with anon key + x-upsert header ===")
url = f"{BASE}/storage/v1/object/photos/test2.txt"
data = b"hello world 2"
req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", f"Bearer {ANON_KEY}")
req.add_header("apikey", ANON_KEY)
req.add_header("x-upsert", "true")
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"Status: {resp.status}")
        print(json.loads(resp.read()))
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")

# Test: Try multipart upload (which is what the supabase JS client does under the hood)
print("\n=== Test 3: Upload with service key (to confirm it works) ===")
url = f"{BASE}/storage/v1/object/photos/test-service.txt"
data = b"hello from service"
req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
req.add_header("apikey", SERVICE_KEY)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"Status: {resp.status}")
        print(json.loads(resp.read()))
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")

# Check if the files are in the bucket now
print("\n=== Files in photos bucket ===")
url = f"{BASE}/storage/v1/object/list/photos"
req = urllib.request.Request(url, data=b'{"prefix":""}', method="POST")
req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
req.add_header("apikey", SERVICE_KEY)
req.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        files = json.loads(resp.read())
        for f in (files if isinstance(files, list) else [files]):
            print(f"  {f['name']} ({f['metadata']['size']} bytes)")
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")
