/* Everything the site indexes, as card metadata only.
 *
 * `type` decides which index page an item appears on and how its card renders:
 *
 *   Writing   -> /writing    tags[], outlet, role; `url` links out to the
 *                            publisher, otherwise the piece is hosted here
 *   Project   -> /projects   industry, stack[], repo, demo, status,
 *                            period (the year shown, or 'Current'). Shown
 *                            newest first by period, then date.
 *                            Work for an employer also sets org, role and
 *                            period (that is what files it under the Work
 *                            filter), a one-line IP `note`, and `caseStudy:
 *                            true` when public/posts/<slug>.html holds a
 *                            write-up served at /projects/<slug>. `draft:
 *                            true` keeps that write-up unlinked from the card
 *                            while it is being cleared. `links` adds extra
 *                            [label, href] pairs after Read more/Demo/Repo.
 *                            `featured: true` pins a card to the top with a
 *                            badge.
 *   Research  -> /research   topic, authors, venue, status, pdf, arxiv, code
 *
 * Article bodies are NOT here — a natively hosted piece keeps its HTML in
 * public/posts/<slug>.html, which post.html fetches on demand. Keeping bodies
 * out means an index page downloads a few KB instead of every article it lists.
 *
 * Renderers skip any link field that is empty, so leaving one blank is safe.
 *
 * `industry` and `topic` drive the filter pills on their pages. Both are free
 * text derived from the data, so a new value shows up as a new pill by itself.
 */
/* Profile links shown beside an index. Blank means the link is not rendered.
 * TODO: paste your Google Scholar profile URL here once the profile exists. */
window.PROFILES = {
  scholar: '',
};

window.ITEMS = [
  {
    slug: 'beyond-survival-xpression',
    type: 'Writing',
    title: "Beyond Survival: Berkeley's Post-Pandemic Small-Business Scene and Xpression's Recipe for Resilience",
    date: '2024-04-18',
    tags: ['Business'],
    outlet: 'Berkeley Economic Review',
    excerpt: "An 86% turnover rate on Euclid Avenue. A restaurateur who opened in the wreckage explains why he still doesn't count foot traffic.",
  },
  {
    slug: 'energy-bundle-theory',
    type: 'Writing',
    title: 'The Energy Bundle Theory: Why Renewable Energy is not the Panacea for Global Inequality',
    date: '2023-04-18',
    tags: ['Economics'],
    outlet: 'Berkeley Economic Review',
    excerpt: "Rich countries industrialized on coal, then made renewables a condition of the loan. Energy is a consumption bundle, and no single source is optimal for everyone.",
  },
  {
    slug: 'michael-delacour',
    type: 'Writing',
    title: "Michael Delacour, People's Park pioneer, dies at age 85",
    date: '2023-03-14',
    tags: ['Reporting'],
    outlet: 'The Daily Californian',
    excerpt: "A half-century legacy of free speech and community resistance.",
    url: 'https://www.dailycal.org/archives/michael-delacour-people-s-park-pioneer-dies-at-age-85/article_03020229-a3ef-5be8-b0e6-7152b250c5fe.html',
  },

  /* Projects — the page sorts these itself, newest first.
   * TODO: fill in repo/demo/status. Descriptions came from each project's own
   * README and are worth rewriting for a reader who has never seen the code. */

  /* Work — built for an employer, so the original code and data stay with
   * them. Each card links a case study; any demo is a from-scratch rebuild on
   * synthetic or public data. Nothing here may name internal systems or
   * customers. Figures match the resume; confirm each is cleared to publish.
   * TODO: set draft: false on each once its write-up is filled in and cleared. */
  {
    slug: 'vcdr-bench-harness',
    type: 'Project',
    industry: 'Healthcare',
    org: 'UCSF NeuroAI Lab',
    role: 'Evals and Benchmarking',
    period: '2026',
    title: 'vCDR-bench',
    date: '2026-03-01',
    featured: true,
    stack: ['React', 'Express', 'Python', 'OpenAI Realtime', 'Whisper', 'Kokoro'],
    excerpt: 'A benchmark for a voice agent that gives a dementia interview.',
    caseStudy: true,
    repo: '',
    demo: '/demos/vcdr-bench-harness/',
    status: '',
  },
  {
    slug: 'aws-capacity-optimization',
    type: 'Project',
    industry: 'Cloud Infrastructure',
    org: 'AWS Bedrock',
    role: 'SDE / ML Intern',
    period: '2025',
    title: 'Agentic Capacity Optimization',
    date: '2025-05-15',
    stack: ['Python', 'MCP', 'AWS Lambda', 'EventBridge', 'CloudWatch', 'IaC'],
    excerpt: 'An agent that suggests and executes capacity changes.',
    note: 'The demo is a rebuild on simulated data.',
    caseStudy: true,
    repo: '',
    demo: '/demos/aws-capacity-optimization/',
    status: '',
  },

  {
    slug: 'autism-dashboard',
    type: 'Project',
    period: '2026',
    industry: 'Personal Productivity',
    title: 'AUTISM Web App',
    date: '2026-09-17',
    stack: ['React', 'TypeScript'],
    excerpt: 'augmented unified telemetric intelligence serving me',
    repo: 'https://github.com/flhkl1/autism',
    demo: '/demos/autism-dashboard/',
    caseStudy: true,
    status: '',
  },
  {
    slug: 'stealth-robotics-startup',
    type: 'Project',
    period: 'Current',
    industry: 'Robotics',
    title: 'Stealth Robotics Startup',
    date: '2026-10-12',
    stack: [],
    excerpt: 'Debugging for medical and lab robots.',
    repo: '',
    demo: '',
    caseStudy: true,
    status: '',
  },
  {
    slug: 'robotics-market-intel',
    type: 'Project',
    period: '2026',
    industry: 'Robotics',
    title: 'Robotics Market Intel',
    date: '2026-09-12',
    stack: ['Python'],
    excerpt: 'What robotics buyers complain about, from public posts.',
    repo: 'https://github.com/flhkl1/unbox',
    demo: '/demos/robotics-market-intel/',
    caseStudy: true,
    status: '',
  },
  {
    slug: 'ndd-copilot',
    type: 'Project',
    period: '2025',
    industry: 'Healthcare',
    title: 'NDD Copilot',
    date: '2026-05-28',
    stack: ['Python', 'pandas'],
    excerpt: 'Raw patient records in, similar cases and a risk estimate out.',
    repo: 'https://github.com/flhkl1/ndd-copilot',
    demo: '/demos/ndd-copilot/',
    caseStudy: true,
    status: '',
  },
  {
    slug: 'cs180-computer-vision',
    type: 'Project',
    period: '2026',
    industry: 'Computer Vision',
    title: 'CS 180 Computer Vision',
    date: '2026-09-01',
    stack: ['Python'],
    excerpt: 'My computer vision projects, on their own site.',
    repo: '',
    demo: 'https://flhkl1.github.io/',
    status: '',
  },
  {
    slug: 'jack-yang-com',
    type: 'Project',
    period: '2023',
    industry: 'Personal Productivity',
    title: 'jack-yang.com',
    date: '2023-08-14',
    stack: ['Node.js', 'Express', 'Vanilla JS'],
    excerpt: 'This site',
    repo: 'https://github.com/flhkl1/jack-yang-com',
    status: '',
  },

  /* Research — reverse chronological.
   * TODO: fill in authors/venue/status and the PDF, arXiv and code links. */
  {
    slug: 'cs180-paper',
    type: 'Research',
    topic: 'Computer Vision',
    title: 'CS180 Paper',
    date: '2026-12-01',
    authors: '',
    venue: 'UC Berkeley',
    status: 'Forthcoming',
    excerpt: '',
    pdf: '',
    arxiv: '',
    code: '',
  },
  {
    slug: 'cs182-paper',
    type: 'Research',
    topic: 'Deep Learning',
    title: 'CS182 Paper',
    date: '2026-12-01',
    authors: '',
    venue: 'UC Berkeley',
    status: 'Forthcoming',
    excerpt: '',
    pdf: '',
    arxiv: '',
    code: '',
  },
  {
    slug: 'hk-gba-economic-cooperation',
    type: 'Research',
    topic: 'Economic Geography',
    title: 'In Search of New Economic Cooperation Models Between Hong Kong and the Greater Bay Area',
    date: '2021-10-14',
    authors: 'A. G. O. Yeh (PI), Z. Tao, G. C. S. Lin, X. Liu, F. F. Yang · Jack Yang, research assistant',
    venue: 'University of Hong Kong · Strategic Public Policy Research Report',
    status: '',
    excerpt: "Analyzing Hong Kong's changing economic role in the Greater Bay Area.",
    pdf: '/papers/hk-gba-economic-cooperation-2021.pdf',
    arxiv: '',
    code: '',
  },
  {
    slug: 'vcdr-bench',
    type: 'Research',
    topic: 'Clinical AI',
    title: 'A Benchmark for Agent-Administered Clinical Dementia Ratings',
    date: '2026-08-01',
    authors: '',
    venue: 'UCSF NeuroAI Lab',
    status: '',
    excerpt: 'Benchmarking dementia staging',
    pdf: '',
    arxiv: '',
    code: '',
  },
];
