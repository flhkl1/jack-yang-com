# demos-src

How the static demos under `public/demos/` are built. Nothing in this folder is served.
Each demo is plain files. The site stays build-free, and these scripts only regenerate the files it serves.

| Demo | Served from | Rebuild |
|---|---|---|
| Robotics Market Intel | `public/demos/robotics-market-intel/` | `python robotics-market-intel/snapshot.py public/demos/robotics-market-intel/snapshot <path-to-unbox-repo>` calls the repo's real route functions (via a tiny FastAPI stand-in in `stubs/`) and writes a read-only API snapshot. The dashboard's own `app/static` files are copied over. Only `js/api.js` is replaced. |
| NDD Copilot | `public/demos/ndd-copilot/` | From the ndd-copilot repo root: `python <this>/ndd-copilot/export_ndd.py public/demos/ndd-copilot/pipeline`. It reads the ChromaDB files and the saved random forest directly and checks the flattened forest against scikit-learn. |
| Personal Dashboard | `public/demos/autism-dashboard/` | Copy `autism-dashboard/` to `demo/` in the autism repo, then `bun demo/build.ts <out>`. The unmodified React app is bundled with `mock-api.js`, an in-browser backend with made-up data. `react-plaid-link` is stubbed out. Without Bun, the app's own esbuild does the same job from `web/frontend`: bundle an entry that imports `mock-api.js`, `demo-banner.js` and `src/main.tsx` with `--bundle --minify --format=esm --jsx=automatic --alias:react-plaid-link=<this>/autism-dashboard/plaid-stub.js`, then point `app.html` at the new file. `mock-api.js` also ports the share-link and alert endpoints; `share-route.js` lets a share link open inside the demo. |
| vCDR-bench | `public/demos/vcdr-bench-harness/` | In the bench repo, `node scripts/analyze_cascade_sweep.mjs <sweep-id> --json <analysis.json>` (read-only on its database). Then `python vcdr-bench-harness/export_sweep.py <analysis.json> public/demos/vcdr-bench-harness/sweep --journal <sweep>.journal.jsonl --db <benchmarks.sqlite>` keeps the launch journal as event categories, plus per-run outcomes and per-turn stage timings from one real sweep and drops everything textual. Then `node vcdr-bench-harness/check.mjs <analysis.json>` confirms the page's statistics match the bench's. |
| Customer Profiling Engine | `public/demos/livex-customer-profiling/` | `python livex-customer-profiling/build_demo.py public/demos/livex-customer-profiling/profiles`. This is a clean-room rebuild: fully synthetic data from a fixed seed, with nothing from LiveX AI. |
| Ticketee (capacity agent) | `public/demos/aws-capacity-optimization/` | `node aws-capacity-optimization/build_sim.mjs public/demos/aws-capacity-optimization/sim` writes the two simulated stores and the ticket queue from a fixed seed. This is a clean-room rebuild with nothing from AWS. Then `node aws-capacity-optimization/check.mjs` confirms the served files match the generator and every proposal adds up. |

Don't name output folders `data/`: the site's `.gitignore` drops them, so they would never deploy.
