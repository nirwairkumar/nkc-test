
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
