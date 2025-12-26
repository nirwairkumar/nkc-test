import re
from typing import Dict, List, Any

class AnswerKeyExtractor:
    def __init__(self):
        # Patterns to identify Answer Key tables/lists
        # 1. Standard: "1. A", "1 - A", "1) A"
        self.key_pattern = re.compile(r'(?:^|\s)(\d+)\s?[\.\-\)]\s?([A-D])(?:$|\s)', re.IGNORECASE)
        
        # 2. Key Header detection (to prioritize blocks that look like keys)
        self.header_pattern = re.compile(r'(?:Answer\s+Key|Answers|Solution|Ans\.|Correct\s+Option)', re.IGNORECASE)

    def extract_keys(self, elements: List[Dict[str, Any]]) -> Dict[int, str]:
        """
        Scans all text elements to find a localized "Answer Key" section.
        Returns map: { 1: "A", 2: "C" ... }
        """
        answer_map = {}
        
        # Strategy:
        # 1. Identify blocks that likely contain the answer key (contain "Answer Key" or high density of "1. A")
        # 2. Parse those blocks specifically.
        
        potential_blocks = []
        
        for el in elements:
            if el["type"] != "text": continue
            text = el["text"]
            
            # Count matches of "Number -> Letter" pattern
            matches = self.key_pattern.findall(text)
            
            # If header found or multiple key-like patterns found, treat as candidate
            if self.header_pattern.search(text) or len(matches) > 3:
                potential_blocks.append(text)
                
        # Parse candidates
        print(f"AnswerKeyExtractor: Found {len(potential_blocks)} potential key blocks.")
        
        for text in potential_blocks:
            matches = self.key_pattern.findall(text)
            for (num_str, opt_str) in matches:
                try:
                    q_num = int(num_str)
                    answer_map[q_num] = opt_str.upper()
                except:
                    pass

        print(f"AnswerKeyExtractor: Total answers found: {len(answer_map)}")
        return answer_map
