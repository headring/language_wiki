# JLPT Data Pipeline

This pipeline is a scaffold for turning the `open-anki-jlpt-decks` CSVs into an app-importable JSON pack.

## Source contract

- Upstream files live at `jamsinclair/open-anki-jlpt-decks/src/n5.csv` through `n1.csv`
- Expected columns: `expression`, `reading`, `meaning`, `tags`, `guid`
- `meaning` can contain commas and parenthetical notes, so the parser must preserve the full raw field
- `tags` and `guid` are source metadata only

## Pipeline stages

1. Download raw CSVs
2. Normalize rows to JSON or JSONL
3. Build LLM translation tasks
4. Build LLM example-generation tasks for `N2` through `N1`
5. Merge LLM results back into the normalized records
6. Emit JSON packs for app import

## Suggested execution order

```bash
node jlpt/scripts/fetch-open-anki-csv.mjs --out jlpt/data/raw/open-anki
node jlpt/scripts/normalize-open-anki-csv.mjs --in jlpt/data/raw/open-anki --out jlpt/data/normalized/open-anki
node jlpt/scripts/prepare-llm-jobs.mjs --in jlpt/data/normalized/open-anki --out jlpt/data/tasks
node jlpt/scripts/run-openai-translation.mjs --in jlpt/data/tasks/translation.jobs.jsonl --out jlpt/data/results --dry-run
node jlpt/scripts/run-openai-example.mjs --in jlpt/data/tasks/example.jobs.jsonl --out jlpt/data/results --dry-run
node jlpt/scripts/merge-llm-results.mjs --in jlpt/data/tasks --results jlpt/data/results --out jlpt/data/enriched
node jlpt/scripts/build-json-pack.mjs --in jlpt/data/enriched --out jlpt/data/packs/jlpt.pack.json
```

## Results layout

- `jlpt/data/results/n5.translation.jsonl`
- `jlpt/data/results/n4.translation.jsonl`
- `jlpt/data/results/n3.translation.jsonl`
- `jlpt/data/results/n2.translation.jsonl`
- `jlpt/data/results/n1.translation.jsonl`
- `jlpt/data/results/n2.example.jsonl`
- `jlpt/data/results/n1.example.jsonl`

Each line is one JSON object keyed by `sourceId`.
Missing files are allowed during early scaffolding; the merge step treats them as empty.

## LLM interface

### Translation task input

- `expression`
- `reading`
- `meaningEnRaw`
- `tags`
- `guid`

### Translation task output

- `meaningKoVariants`: preserve all senses, not just a single representative meaning
- `notes`: optional ambiguity or source caveats

### Example task input

- `expression`
- `reading`
- `meaningKoVariants`

### Example task output

- `exampleJp`
- `exampleKo`
- `notes`

## Sample data

- `jlpt/data/sample/tasks/` contains task shape examples
- `jlpt/data/sample/results/` contains placeholder LLM result shape examples
- `jlpt/data/sample/packs/` contains a small pack example for shape review

## Unstable parts

- The upstream repository may add or rename columns
- Some rows may have extra tags or irregular punctuation in `meaning`
- Example generation is intentionally limited to `N2` and `N1`
- The app import pack shape may still change once the SQLite importer is wired up
