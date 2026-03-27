import os
import json
import urllib.request
from dotenv import load_dotenv

# Load env variables
load_dotenv('backend/.env')
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Try service key first
if not SUPABASE_KEY:
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

with open('supabase/migrations/20260303_create_posts_tables.sql', 'r') as f:
    sql = f.read()

# Try executing via the API REST endpoint if custom pg function exists, 
# otherwise we really need psycopg2. 
# Let's write a pure psycopg2 script that doesn't import from the backend

script = """
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.environ.get("DATABASE_URL")

if not db_url:
    print("No DATABASE_URL found")
    exit(1)

with open('supabase/migrations/20260303_create_posts_tables.sql', 'r') as f:
    sql = f.read()

print(f"Connecting to: {db_url.split('@')[1]}")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

try:
    print("Executing SQL...")
    cur.execute(sql)
    print("Success: Migration applied!")
except Exception as e:
    print(f"Error executing migration: {e}")
finally:
    cur.close()
    conn.close()
"""
with open('pure_migration.py', 'w') as f:
    f.write(script)
