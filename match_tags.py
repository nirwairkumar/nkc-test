import re
import sys

def match_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    stack = []
    
    # Regex to find <div or </div (ignoring strings/comments would be ideal but simple regex helps first)
    # We use \b to match whole word
    pattern = re.compile(r'<(div\b)|(</div\b)')
    
    for i, line in enumerate(lines):
        line_num = i + 1
        for match in pattern.finditer(line):
            tag = match.group()
            if tag.startswith('</'):
                if not stack:
                    print(f"!!! EXTRA CLOSING TAG at L{line_num}: {line.strip()[:60]}")
                else:
                    stack.pop()
            else:
                # If it's a self-closing div like <div /> it doesn't need a close tag
                # But in JSX <div /> is common. However, let's check for />
                m_str = line[match.start():]
                self_closing_match = re.search(r'^<div[^>]*/>', m_str)
                if self_closing_match:
                    continue
                stack.append(line_num)
    
    if stack:
        print(f"!!! UNCLOSED OPEN TAGS at lines: {stack}")

if __name__ == "__main__":
    match_tags(sys.argv[1])
