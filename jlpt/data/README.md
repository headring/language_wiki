# JLPT Data Pipeline

This directory holds the reproducible data pipeline for the JLPT app.

## Layout

- `raw/`: downloaded source CSV files from `open-anki-jlpt-decks`
- `normalized/`: CSV rows normalized to JSON/JSONL
- `tasks/`: LLM task payloads for translation and example generation
- `results/`: optional LLM outputs to merge back
- `enriched/`: merged records with Korean meanings and examples
- `packs/`: app-importable JSON packs
- `sample/`: tiny checked-in examples for shape review

## Contract notes

- Source CSV columns are expected to be `expression, reading, meaning, tags, guid`
- `meaning` can contain commas and parenthetical notes
- `tags` and `guid` are source metadata, not app identities
- Example generation is only planned for `N5` through `N3`

