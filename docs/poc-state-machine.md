# Heritage Readers POC: deterministic lesson state machine

Purpose: the model never chooses a word the child cannot decode. Decodability is computed from the child's state, never judged by the model.

## State (serializable, one object per child)

- `rung`: integer, 1 to 90, Susan's sequence.
- `mastered`: set of phonogram ids (Spalding 70 mapped onto the Hay and Wingo ladder).
- `target`: the one phonogram or pattern being taught at this rung.
- `sight`: set of taught sight words, cumulative by rung (the, a, is, on, to, said...).
- `names`: proper names allowed in passages (child's name plus the corpus cast at this rung).
- `review_due`: map of phonogram id to next review date.
- `band`: A (ages 4 to 6, literacy face), B (7 to 8), C (9 and up).
- `step`: warmup | teach | words | passage | check | close.
- `evidence`: per phonogram, counts of clean reads and the date of the last delayed retest.

## Allowed vocabulary (pure function of state)

- `parse(word)`: grapheme-phoneme segmentation from a fixed lexicon (CMU-derived, hand-tagged with phonogram ids). A word may have several parses.
- `decodable(word)`: true if any parse uses only phonograms in `mastered` plus `target`.
- `allowed(word)`: `decodable(word)` or `word` in `sight` or `word` in `names`.
- `bank[rung]`: every lexicon word with `allowed(word)` true, computed offline per rung, reviewed by the editorial board, frozen.

## Transitions

- `warmup -> teach -> words -> passage -> check -> close`, in that order, no skipping.
- `check` produces a per-word outcome from the child-ASR scorer: correct, substitution, omission, insertion, hesitation.
- Accuracy at or above 95% and no error on `target`: a clean read. Two clean reads plus a delayed retest (7 days or more) at or above 95% marks `target` mastered. `rung` increments. `target` moves to `review_due`.
- Accuracy below 90%: `rung` stays, the error phonograms get a remediation drill, and the next passage is generated from a narrower bank (mastered only, target excluded).
- Items in `review_due` are interleaved into `words` and `passage` on their due date. Review errors re-open the item.
- Warmup always draws from `mastered` only, so every session opens with success.

## The model's role in the POC

- Inputs: `bank[rung]`, `target`, `sight`, `names`, a story spine from the corpus, register rules.
- Output: a passage as JSON, `{"sentences": [{"words": ["Pat", "has", "a", "hat"]}]}`, 4 to 8 sentences for band A.
- Validator: every word must be in `bank[rung]` or `sight` or `names`. One violation rejects the passage. Three rejections fall back to a precomputed decodable passage from the corpus bank. Nothing unvalidated reaches the screen or the printer.
- Constrained generation where the provider supports it: the bank is passed as the enum for every word slot, so the model cannot leave it.
- Tutor speech is spoken, not decoded, so it follows the lexicon and register rules rather than the bank. Any word the tutor puts on screen passes the validator.

## Data

- `lexicon`: word, parses, phonogram tags, frequency (General Service List), age tag.
- `phonograms`: 70 ids with sounds, example words, ladder position, Spalding rule references.
- `sight_by_rung`: cumulative list.
- `corpus_passages`: passages tagged with the highest rung they require, so the fallback is always available.

## Logging

- Every `check` writes per-word outcomes, the mastery update, and the new state. The screen and the print packet render from the same state object. A session can be replayed from the log.
