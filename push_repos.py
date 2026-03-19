import os
import subprocess

def run_git(repo_dir, commit_msg):
    print(f"\n--- Processing Repository: {repo_dir} ---")
    
    if not os.path.isdir(os.path.join(repo_dir, ".git")):
        print(f"Skipping {repo_dir} - Not a git repository.")
        return

    try:
        # Add all
        subprocess.run(["git", "add", "."], cwd=repo_dir, check=True)
        print("Git add successful.")
        
        # Commit
        res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=repo_dir, capture_output=True, text=True)
        if res.returncode == 0:
            print("Git commit successful.")
        elif "nothing to commit" in res.stdout or "nothing added" in res.stdout:
            print("Nothing to commit.")
        else:
            print(f"Git commit output: {res.stdout}")
        
        # Push
        print("Pushing to remote...")
        subprocess.run(["git", "push", "origin", "main"], cwd=repo_dir, check=True)
        print("Git push successful.")
    except Exception as e:
        print(f"Error processing {repo_dir}: {e}")

if __name__ == "__main__":
    base_dir = r"d:\Yuga Yatra\nkc-Test-platform"
    msg = "fix: restore visitor analytics tracking and detailed session attempt logs"
    
    run_git(base_dir, msg)
    
    frontend_dir = os.path.join(base_dir, "frontend")
    run_git(frontend_dir, msg)
    
    backend_dir = os.path.join(base_dir, "backend")
    run_git(backend_dir, msg)
