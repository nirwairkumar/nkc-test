import re
import sys

def match_tags_with_lines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    stack = [] # (line_number, line_content)
    
    # Matches <div (start) or </div (end)
    # Ignores self-closing <div />
    # We'll use a more complex regex to handle attributes and self-closing tags
    opening_pattern = re.compile(r'<div\b(?![^>]*/>)[^>]*>', re.IGNORECASE)
    closing_pattern = re.compile(r'</div\b[^>]*>', re.IGNORECASE)
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # We need to process tags in order they appear in the line
        # Find all occurrences of both opening and closing tags
        matches = []
        for m in opening_pattern.finditer(line):
            matches.append((m.start(), 'OPEN', line_num))
        for m in closing_pattern.finditer(line):
            matches.append((m.start(), 'CLOSE', line_num))
        
        matches.sort()
        
        for pos, type, ln in matches:
            if type == 'OPEN':
                stack.append((ln, line.strip()))
            else:
                if stack:
                    stack.pop()
                else:
                    print(f"Excessive closing tag at L{ln}: {line.strip()}")
    
    if stack:
        print("Unclosed opening tags:")
        for ln, content in stack:
            print(f"L{ln}: {content}")
    else:
        print("All tags matched!")

if __name__ == "__main__":
    match_tags_with_lines(sys.argv[1])
