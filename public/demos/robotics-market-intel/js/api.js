// Demo build: the dashboard's API client, answered from a static snapshot of the real
// pipeline's output (snapshot/snapshot.json) instead of the FastAPI server. Reads work
// exactly as in the app; anything that would write to the corpus is refused, because
// the corpus is append-only and lives on the machine that runs the harvester.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const READ_ONLY =
  "This is a read-only snapshot. Clone the repo and run `make run` to harvest, tag and edit live.";

let snapshotPromise;
function snapshot() {
  snapshotPromise ??= fetch(new URL("../snapshot/snapshot.json", import.meta.url)).then((response) => {
    if (!response.ok) throw new ApiError(response.status, "Could not load the demo snapshot.");
    return response.json();
  });
  return snapshotPromise;
}

const clone = (value) => structuredClone(value);

function listRecords(records, params) {
  const q = (params.q ?? "").toLowerCase();
  const matches = records.filter((r) =>
    (!params.source_type || r.source_type === params.source_type) &&
    (!params.symptom || r.surface_symptom_guess === params.symptom) &&
    (!params.confidence || r.confidence === params.confidence) &&
    (!q || [r.raw_text, r.title, r.source_url].some((field) => (field ?? "").toLowerCase().includes(q))));
  const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 500);
  const offset = Math.max(Number(params.offset ?? 0), 0);
  return { total: matches.length, items: matches.slice(offset, offset + limit) };
}

async function request(method, path, { params } = {}) {
  if (method !== "GET") throw new ApiError(405, READ_ONLY);
  const snap = await snapshot();
  const query = Object.fromEntries(Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]));

  if (path === "/api/records") return clone(listRecords(snap.records, query));
  const record = path.match(/^\/api\/records\/(.+)$/);
  if (record) {
    const found = snap.records.find((r) => r.id === decodeURIComponent(record[1]));
    if (!found) throw new ApiError(404, "record not found");
    return clone(found);
  }
  if (path === "/api/harvest/runs") return clone(snap[`GET ${path}`].slice(0, Number(query.limit ?? 20)));
  if (path === "/api/vectors" && query.include_inactive === "false") {
    return clone(snap["GET /api/vectors?include_inactive=false"]);
  }

  const key = `GET ${path}`;
  if (!(key in snap)) throw new ApiError(404, `${path} is not part of this demo snapshot.`);
  return clone(snap[key]);
}

export const api = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body = {}) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  del: (path) => request("DELETE", path),
};
