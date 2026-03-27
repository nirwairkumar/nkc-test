import asyncio
import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.core.database import supabase

async def run_migration():
    with open('supabase/migrations/20260303_create_posts_tables.sql', 'r') as f:
        sql = f.read()
    
    try:
        print("Executing migration...")
        # Since supabase-py might not support raw SQL execution directly, we can try using RPC
        # Usually for Supabase python client raw SQL needs to be executed via Postgres directly
        # Let's try to just insert a test row to verify or we might need to use a different approach
        
        # A workaround is to use the Postgres connection string directly with psycopg2
        import psycopg2
        from urllib.parse import urlparse
        
        # Get connection string from .env or construct it
        from dotenv import load_dotenv
        load_dotenv('backend/.env')
        
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            print("DATABASE_URL not found in environment")
            return
            
        print(f"Connecting to database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("Applying schema changes...")
        cur.execute(sql)
        conn.commit()
        
        print("Migration applied successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
