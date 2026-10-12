// Build the AUTISM dashboard demo with Bun (no Vite needed).
// Usage, from the autism repo root:  bun <path>/build.ts <out-dir>
// Expects this folder at ./demo/ inside the autism repo (web/frontend/node_modules installed).
import { resolve, dirname } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const here = dirname(new URL(import.meta.url).pathname);
const out = resolve(process.argv[2] ?? "dist-demo");
mkdirSync(out, { recursive: true });

const result = await Bun.build({
  entrypoints: [resolve(here, "demo-main.tsx")],
  outdir: out,
  naming: "app-[hash].js",
  minify: true,
  target: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "stub-plaid",
    setup(b) {
      b.onResolve({ filter: /^react-plaid-link$/ }, () => ({ path: resolve(here, "plaid-stub.js") }));
    },
  }],
});
if (!result.success) { console.error(result.logs); process.exit(1); }
const js = result.outputs.find((o) => o.path.endsWith(".js"))!;
const name = js.path.split("/").pop();

// Reuse the app's own index.html head (fonts, base styles), pointing at the bundle.
let html = readFileSync(resolve(here, "../web/frontend/index.html"), "utf8")
  .replace(/<title>.*<\/title>/, "<title>AUTISM Web App · Demo</title>")
  .replace(/<script type="module" src="[^"]+"><\/script>/, `<script type="module" src="./${name}"></script>`)
  .replace("</head>", '  <meta name="robots" content="noindex">\n  <link rel="icon" type="image/svg+xml" href="/assets/favicon/favicon.svg">\n  </head>');
writeFileSync(resolve(out, "index.html"), html);
console.log("built", name, (js.size / 1024).toFixed(0) + " KB");
