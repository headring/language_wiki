# JLPT Results Directory

Drop generated LLM outputs here before running the merge step.

## File naming

- `n5.translation.jsonl`
- `n4.translation.jsonl`
- `n3.translation.jsonl`
- `n2.translation.jsonl`
- `n1.translation.jsonl`
- `n2.example.jsonl`
- `n1.example.jsonl`

## Line format

Each line must be a JSON object with at least:

- `sourceId`
- `taskId`
- `kind`

Translation rows should include:

- `meaningKoVariants`
- `notes`

Example rows should include:

- `exampleJp`
- `exampleKo`
- `notes`

Missing files are allowed while the pipeline is still scaffolded.

## Stub output contract

The local stub runner writes one JSON object per line with:

- `sourceId`
- `taskId`
- `kind`
- `model`
- `apiBase`

Translation stubs include:

- `meaningKoVariants`
- `notes`

Example stubs include:

- `exampleJp`
- `exampleKo`
- `notes`
