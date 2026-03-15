import re
import sys

def trace_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    depth = 0
    for i, line in enumerate(lines):
        line_num = i + 1
        # Match only full tags to avoid <dividing or similar
        opens = len(re.findall(r'<div\b', line))
        closes = len(re.findall(r'</div\b', line))
        
        if opens != closes:
            depth += (opens - closes)
            if depth < 0:
                print(f"!!! NEGATIVE DEPTH at line {line_num}")
            print(f"L{line_num:4} | D:{depth:2} | +{opens} -{closes} | {line.strip()[:60]}")

if __name__ == "__main__":
    trace_tags(sys.argv[1])
