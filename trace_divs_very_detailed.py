import re
import sys

def trace_divs_very_detailed(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    stack = []
    
    opening_pattern = re.compile(r'<div\b(?![^>]*/>)[^>]*>', re.IGNORECASE)
    closing_pattern = re.compile(r'</div\b[^>]*>', re.IGNORECASE)
    
    for i, line in enumerate(lines):
        line_num = i + 1
        matches = []
        for m in opening_pattern.finditer(line):
            matches.append((m.start(), 'OPEN', line_num))
        for m in closing_pattern.finditer(line):
            matches.append((m.start(), 'CLOSE', line_num))
        
        matches.sort()
        
        for pos, type, ln in matches:
            if type == 'OPEN':
                stack.append(ln)
                print(f"L{ln}: OPEN (stack depth: {len(stack)})")
            else:
                if stack:
                    last_open = stack.pop()
                    print(f"L{ln}: CLOSE matches L{last_open} (stack depth: {len(stack)})")
                else:
                    print(f"L{ln}: EXCESSIVE CLOSE!! -> {line.strip()}")

if __name__ == "__main__":
    trace_divs_very_detailed(sys.argv[1])
