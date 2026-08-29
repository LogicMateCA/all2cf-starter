---
module: search
status: local-verified
source: starter
---

# Search and vector module

Purpose: let each copied product choose the least complex search backend that matches its actual data and retrieval problem.

- `none` is the default and adds no product-data index. Product Shell registered-route search remains a separate baseline feature.
- `postgresql` is the preferred first choice for text, filter and relational search; it uses the existing SQL-first database and no materializer Pack.
- `vectorize` is for embedding similarity and RAG. It materializes a server-only Worker helper/test, the `VECTOR_INDEX` Binding and exact environment configuration.
- Development and Production indexes must be different. Dimensions and metric are immutable platform properties and must match the chosen embedding model; changing them means creating a new index, not mutating in place.
- Clients never choose index names, namespaces or authoritative vectors. Product-specific ingestion, metadata indexes, namespaces, access policy, embedding model, chunking and evaluation remain copied-product work.
- Setup's explicit test and `/api/admin/vectorize/test` generate non-product vectors, poll asynchronous mutation visibility, verify the nearest match and delete the test vector.

A disposable live 32-dimension cosine index passed create/upsert/query/delete and left no temporary index behind. Selected types/dry-runs and clean removal passed. Scoped Development provisioning, deployed Binding verification and product retrieval evaluation remain release gates.
