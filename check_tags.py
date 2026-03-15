import re
import sys

def check_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple regex to find <div and </div
    # This won't work perfectly for all JSX but usually catches obvious mismatches
    open_tags = re.findall(r'<div', content)
    close_tags = re.findall(r'</div', content)
    
    print(f"Open <div>: {len(open_tags)}")
    print(f"Close </div>: {len(close_tags)}")
    
    # Check braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    print(f"Open braces: {open_braces}")
    print(f"Close braces: {close_braces}")

if __name__ == "__main__":
    check_tags(sys.argv[1])
