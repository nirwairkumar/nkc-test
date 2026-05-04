# TestoZa Search Algorithm Documentation

## Overview

TestoZa uses a custom "YouTube-style" multi-keyword ranking algorithm designed to surface tests even when users misremember exact titles or only type in a few scattered keywords. 

Instead of requiring strict, sequential, or exact string matches, the search system tokenizes the user's input string, pulls all possible candidates from the database quickly, and then assigns "match scores" natively in Python based on the importance of where those keywords appeared.

The algorithm runs primarily inside the `get_tests_feed` and `get_user_tests` routes located in `backend/app/routers/tests/read.py`.

---

## How It Works (Step-by-Step)

### 1. Tokenization
When a search query like `"JEE mock test physics"` is received, the input is immediately converted all to lowercase, stripped of weird punctuation, and split into individual word tokens if length allows.
- **Tokens:** `['jee', 'mock', 'test', 'physics']`

### 2. Fast Database Retrieval (The "Giant OR" query)
To avoid loading the whole database into Python memory, the backend constructs a massive ILIKE filter to fetch *candidate tests*. 
It asks PostgreSQL: `"Give me up to 800 tests where ANY of these tokens exist anywhere in the title, description, category, or custom ID."`

```python
giant_or = []
for tok in tokens:
    giant_or.append(f"title.ilike.%{tok}%")
    giant_or.append(f"description.ilike.%{tok}%")
    giant_or.append(f"custom_category.ilike.%{tok}%")
    giant_or.append(f"custom_id.ilike.%{tok}%")

query.or_(",".join(giant_or)).limit(800)
```

### 3. Python-Side Scoring (Ranking)
Once the candidates are fetched, the algorithm loops over every individual test and checks all of its accessible text fields against our tokens. Points are awarded progressively:

| Match Location | Points Awarded per Keyword | Importance / Rationale |
| :--- | :--- | :--- |
| **Title** | `+15` | If a keyword is directly in the title, it is highly likely the exact test they want. |
| **Category** | `+10` | If the keyword hits the broad test category (e.g. Physics), it strongly signals relevance. |
| **Tags** | `+8` | Tags are purposely set by creators to assist search algorithms. Strong matching indicator. |
| **Description** | `+3` | Descriptions might contain passing mentions of terms, so they get points, but lower weight to prevent spam results from outranking exact title matches. |

```python
# Example logic snippet for scoring a single test
for tok in tokens:
    if tok in t_title: score += 15
    elif tok in t_cat: score += 10
    elif any(tok in tag for tag in t_tags): score += 8
    elif tok in t_desc: score += 3
```
*Note: A single token only awards points once for its highest matching tier in a test, but multiple different tokens stack together for huge scores when all match.*

### 4. Sorting and Pagination
Tests are then sorted in descending order by their assigned `_match_score`. 
If two tests have exactly the same score (a tie), they are then sub-sorted dynamically by `created_at` (newest tests win ties).

Finally, standard list slicing (e.g., `tests[start:start+limit]`) handles smooth infinite-scrolling pagination back to the frontend.

---

## Why did we use Python instead of pure SQL/RPC?
While PostgreSQL has built-in Full Text Search (FTS) and RPC functions that can do this, the Python-side implementation offers massive flexibility. It requires no complex database migrations or index refactoring when we want to just tweak ranking scores or add a new match criteria field. Because we pre-filter the fetch limit to strict candidate bounds, the runtime impact of looping Python dicts is nearly invisible.
