import os
from supabase import create_client, Client

def main():
    # Read environment variables
    # We can load them from the backend .env file
    env_path = r"d:\Yuga Yatra\nkc-Test-platform\backend\.env"
    
    supabase_url = None
    supabase_service_key = None
    
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                supabase_url = line.split("=", 1)[1]
            elif line.startswith("SUPABASE_SERVICE_KEY="):
                supabase_service_key = line.split("=", 1)[1]
                
    print(f"Supabase URL: {supabase_url}")
    if supabase_service_key:
         print("Supabase Service Key Loaded successfully.")
    else:
         print("Failed to load Supabase Service Key.")
         return
         
    # Initialize Supabase client
    supabase: Client = create_client(supabase_url, supabase_service_key)
    
    # List buckets
    print("\n--- Listing Buckets ---")
    try:
        buckets = supabase.storage.list_buckets()
        for bucket in buckets:
            print(f"Bucket: {bucket.name} (Public: {bucket.public})")
            
            # List files in the bucket
            print(f"  Files in {bucket.name}:")
            try:
                # We can search recursively or list the root
                files = supabase.storage.from_(bucket.name).list()
                for file in files:
                    if file.get("id"): # It's a file
                        print(f"    - Name: {file['name']} | Size: {file.get('metadata', {}).get('size', 0)} bytes | Created At: {file.get('created_at')}")
                    else: # It's a folder
                        print(f"    [Folder] - {file['name']}")
                        # List subfolder
                        try:
                            subfiles = supabase.storage.from_(bucket.name).list(file['name'])
                            for subfile in subfiles:
                                print(f"      - {subfile['name']} | Size: {subfile.get('metadata', {}).get('size', 0)} bytes | Created At: {subfile.get('created_at')}")
                        except Exception as e:
                            print(f"      Error listing folder {file['name']}: {e}")
            except Exception as e:
                print(f"    Error listing files: {e}")
    except Exception as e:
        print(f"Error listing buckets: {e}")

if __name__ == "__main__":
    main()
