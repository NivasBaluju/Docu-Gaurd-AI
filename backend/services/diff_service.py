import difflib
import re
from typing import Dict, Any, List

def tokenize_words_and_punctuation(text: str) -> List[str]:
    """
    Splits text into words, whitespace, and punctuation tokens while preserving order.
    """
    if not text:
        return []
    # Tokenize words, punctuation, and whitespace sequences
    return re.findall(r'\w+|[^\w\s]|\s+', text)

def compute_word_diff(original_text: str, revised_text: str) -> Dict[str, Any]:
    """
    Computes a word-level and token-level redline diff between original and revised text.
    
    Returns structured operations:
      - 'equal': unchanged text
      - 'delete': removed original text
      - 'insert': added revised text
      
    Also returns unified diff string and summary statistics.
    """
    orig_tokens = tokenize_words_and_punctuation(original_text or "")
    rev_tokens = tokenize_words_and_punctuation(revised_text or "")

    matcher = difflib.SequenceMatcher(None, orig_tokens, rev_tokens)
    operations = []
    additions_count = 0
    deletions_count = 0
    unchanged_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        orig_chunk = "".join(orig_tokens[i1:i2])
        rev_chunk = "".join(rev_tokens[j1:j2])

        if tag == 'equal':
            if orig_chunk:
                operations.append({
                    "type": "equal",
                    "text": orig_chunk
                })
                # Count non-whitespace words
                unchanged_count += len(re.findall(r'\w+', orig_chunk))
        elif tag == 'delete':
            if orig_chunk:
                operations.append({
                    "type": "delete",
                    "text": orig_chunk
                })
                deletions_count += len(re.findall(r'\w+', orig_chunk))
        elif tag == 'insert':
            if rev_chunk:
                operations.append({
                    "type": "insert",
                    "text": rev_chunk
                })
                additions_count += len(re.findall(r'\w+', rev_chunk))
        elif tag == 'replace':
            if orig_chunk:
                operations.append({
                    "type": "delete",
                    "text": orig_chunk
                })
                deletions_count += len(re.findall(r'\w+', orig_chunk))
            if rev_chunk:
                operations.append({
                    "type": "insert",
                    "text": rev_chunk
                })
                additions_count += len(re.findall(r'\w+', rev_chunk))

    # Generate standard unified diff lines
    orig_lines = (original_text or "").splitlines(keepends=True)
    rev_lines = (revised_text or "").splitlines(keepends=True)
    unified_lines = list(difflib.unified_diff(
        orig_lines,
        rev_lines,
        fromfile='Original Clause',
        tofile='Negotiated Revision',
        lineterm=''
    ))
    unified_diff_str = "\n".join(unified_lines)

    return {
        "operations": operations,
        "summary": {
            "additions": additions_count,
            "deletions": deletions_count,
            "unchanged": unchanged_count
        },
        "unifiedDiff": unified_diff_str
    }
