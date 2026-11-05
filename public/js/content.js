/* Everything the site indexes, as card metadata only.
 *
 * `type` decides which index page an item appears on and how its card renders:
 *
 *   Writing   -> /writing    title and date only.
 *                            `url` links out to the publisher, otherwise the
 *                            piece is hosted here. `noBody: true` lists the
 *                            title unlinked until its body is added.
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
 *   Deep Dive -> /deep-dives  title, excerpt (what I learned, then what I
 *                            built), links ([label, href] pairs). Shown in
 *                            list order.
 *   Book      -> /library    title, author, color; optional ink, read, rating.
 *   Album     -> /library    title, artist, year; optional color, listened, rating.
 *   Research  -> /research   topic, authors, venue, status, pdf, arxiv, code
 *
 * A Writing item with `math: true` renders $…$ TeX in its body with KaTeX.
 *
 * Article bodies are NOT here — a natively hosted piece keeps its body in
 * public/posts/<slug>.md (Markdown; older pieces are <slug>.html), which
 * post.html fetches on demand. Keeping bodies
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
    slug: 'unbox-robotics-thesis',
    type: 'Writing',
    title: 'Unbox Robotics',
    date: '2026-11-03',
    tags: ['Robotics'],
  },
  {
    slug: 'senioritis',
    type: 'Writing',
    title: "Senioritis",
    date: '2021-10-17',
    tags: ['Essays'],
  },
  {
    slug: 'donoho-and-tao',
    type: 'Writing',
    title: "Data Science at the Singularity and Mathematics in the Age of AI",
    date: '2026-08-30',
    tags: ['Essays'],
  },
  {
    slug: 'short-notes-on-research-taste',
    type: 'Writing',
    title: "Short Notes on Research Taste",
    date: '2026-10-29',
    pinned: true,
    tags: ['Essays'],
  },
  {
    slug: 'caring-first',
    type: 'Writing',
    title: "Caring-first",
    date: '2026-08-11',
    tags: ['Essays'],
  },
  {
    slug: 'bouldering',
    type: 'Writing',
    title: "You Can't Analyze Everything",
    date: '2021-07-13',
    tags: ['Essays'],
  },
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
    title: 'Personal Dashboard',
    date: '2026-09-17',
    stack: ['React', 'TypeScript'],
    repo: 'https://github.com/flhkl1/autism',
    demo: '/demos/autism-dashboard/',
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
    note: 'Built for UNBOX Robotics.',
    repo: 'https://github.com/flhkl1/unbox',
    demo: '/demos/robotics-market-intel/',
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

  /* Deep Dives — shown in this order. Each link is a [label, url] pair; a
   * blank url is not rendered, so paste the URL in once it exists. `draft: true`
   * hides an entry until its repo is public; delete the line to show it. */
  {
    slug: 'dd-quantum',
    type: 'Deep Dive',
    title: 'Quantum',
    excerpt: 'Learned about qubits, quantum gates, and Shor’s and Grover’s algorithms. Then built my own quantum computer.',
    links: [['repo', 'https://github.com/flhkl1/quantumcomputer'], ['YouTube', '']],
    draft: true,
  },
  {
    slug: 'dd-mathematics',
    type: 'Deep Dive',
    title: 'Mathematics',
    excerpt: 'Learned about number theory, combinatorics, and formal proofs. Then solved an open Erdős problem.',
    links: [['proof', ''], ['repo', 'https://github.com/flhkl1/erdos']],
    draft: true,
  },
  {
    slug: 'dd-deep-learning',
    type: 'Deep Dive',
    title: 'Deep Learning',
    excerpt: 'Learned about backpropagation, transformers, and how LLMs are trained. Then made an LLM from scratch.',
    links: [['repo', 'https://github.com/flhkl1/deeplearning'], ['YouTube', '']],
    draft: true,
  },
  {
    slug: 'dd-operating-systems',
    type: 'Deep Dive',
    title: 'Operating Systems',
    excerpt: 'Learned about kernels, memory management, and scheduling. Then built an AI-native Linux OS from scratch.',
    links: [['repo', 'https://github.com/flhkl1/ai_os'], ['YouTube', '']],
    draft: true,
  },
  {
    slug: 'dd-networking',
    type: 'Deep Dive',
    title: 'Networking',
    excerpt: 'Learned about packets, routing, and TCP/IP. Then gave my OS its own network stack.',
    links: [['repo', 'https://github.com/flhkl1/ai_os'], ['YouTube', '']],
    draft: true,
  },
  {
    slug: 'dd-neurotech',
    type: 'Deep Dive',
    title: 'Neurotech',
    excerpt: 'Learned about brain waves, EEG hardware, and signal processing. Then controlled my computer telepathically.',
    links: [['repo', 'https://github.com/flhkl1/telepathy'], ['YouTube', '']],
    draft: true,
  },
  {
    slug: 'dd-political-economic-theory',
    type: 'Deep Dive',
    title: 'Political Economic Theory',
    excerpt: 'Learned about markets, central planning, and the socialist calculation debate. Then simulated a country on my laptop, with AI agents and a central planner.',
    links: [['website', ''], ['repo', 'https://github.com/flhkl1/countrysim']],
    draft: true,
  },
  {
    slug: 'dd-mimetic-theory',
    type: 'Deep Dive',
    title: 'Mimetic Theory',
    excerpt: 'Learned about René Girard, mimetic desire, and the scapegoat mechanism. Then watched AI agents invent a religion.',
    links: [['website', ''], ['repo', 'https://github.com/flhkl1/religionsim']],
    draft: true,
  },
  {
    slug: 'dd-game-theory',
    type: 'Deep Dive',
    title: 'Game Theory',
    excerpt: 'Learned about equilibria, bluffing, and how poker bots are built. Then built a poker bot that makes money, with its winnings live on a website.',
    links: [['website', ''], ['repo', 'https://github.com/flhkl1/pokerbot']],
    draft: true,
  },
  {
    slug: 'dd-robotics',
    type: 'Deep Dive',
    title: 'Robotics',
    excerpt: 'Learned about teleoperation, imitation learning, and robot foundation models. Then built a DUM-E for under $300 that does actual tasks.',
    links: [['repo', 'https://github.com/flhkl1/dume'], ['YouTube', '']],
    draft: true,
  },

  /* Library, books — the spines on /library, shown left to right in this order.
   * `color` is the spine colour, taken from the cover; `ink` optionally sets the
   * spine's title colour (an accent from the cover) instead of black or white. Optional: `read` (YYYY-MM-DD), `unread: true` and `rating`
   * (out of 10). The cover is public/library/books/covers/<slug>.jpg and what I
   * thought of it is public/library/books/<slug>.md (Markdown); either can be missing. */
  {
    slug: 'steve-jobs',
    type: 'Book',
    title: 'Steve Jobs',
    author: 'Walter Isaacson',
    color: '#39383d',
    rating: 9,
  },
  {
    slug: 'elon-musk',
    type: 'Book',
    title: 'Elon Musk',
    author: 'Walter Isaacson',
    color: '#0b0b12',
    rating: 8,
  },
  {
    slug: 'einstein',
    type: 'Book',
    title: 'Einstein: His Life and Universe',
    author: 'Walter Isaacson',
    color: '#552319',
    rating: 9,
  },
  {
    slug: 'what-it-takes',
    type: 'Book',
    title: 'What It Takes',
    author: 'Stephen A. Schwarzman',
    color: '#111111',
    rating: 7,
  },
  {
    slug: 'zero-to-one',
    type: 'Book',
    title: 'Zero to One',
    author: 'Peter Thiel',
    color: '#5e92ba',
    rating: 10,
  },
  {
    slug: 'chip-war',
    type: 'Book',
    title: 'Chip War',
    author: 'Chris Miller',
    color: '#9f7c66',
    rating: 6,
  },
  {
    slug: 'principles',
    type: 'Book',
    title: 'Principles',
    author: 'Ray Dalio',
    color: '#1b1c20',
    ink: '#e23b3b',
    rating: 8,
  },
  {
    slug: 'changing-world-order',
    type: 'Book',
    title: 'Principles for Dealing with the Changing World Order',
    author: 'Ray Dalio',
    color: '#231e24',
    ink: '#e8283a',
    rating: 8,
  },
  {
    slug: 'man-and-his-symbols',
    type: 'Book',
    title: 'Man and His Symbols',
    author: 'Carl G. Jung',
    color: '#292315',
    ink: '#e0662b',
    rating: 7,
  },
  {
    slug: 'dune',
    type: 'Book',
    title: 'Dune',
    author: 'Frank Herbert',
    color: '#c9392c',
    rating: 7,
  },
  {
    slug: 'emotional-intelligence',
    type: 'Book',
    title: 'Emotional Intelligence',
    author: 'Daniel Goleman',
    color: '#01005d',
    rating: 9,
  },
  {
    slug: 'leadership',
    type: 'Book',
    title: 'Leadership: Six Studies in World Strategy',
    author: 'Henry Kissinger',
    color: '#f4efe6',
    ink: '#6f8fbf',
    rating: 8,
  },
  {
    slug: 'alchemy-and-mysticism',
    type: 'Book',
    title: 'Alchemy & Mysticism',
    author: 'Alexander Roob',
    color: '#654129',
    ink: '#e9d9b4',
    rating: 6,
  },
  {
    slug: 'shoe-dog',
    type: 'Book',
    title: 'Shoe Dog',
    author: 'Phil Knight',
    color: '#111010',
    ink: '#e8a868',
    rating: 9,
  },
  {
    slug: 'hard-thing-about-hard-things',
    type: 'Book',
    title: 'The Hard Thing About Hard Things',
    author: 'Ben Horowitz',
    color: '#1c1a1a',
    ink: '#e2733a',
    rating: 10,
  },

  /* Library, albums — the square sleeves on /library, in this order. The cover is
   * public/library/albums/covers/<slug>.jpg and the review is
   * public/library/albums/<slug>.md. Optional: `year`, `listened`, `rating`. */
  {
    slug: 'recto-verso',
    type: 'Album',
    title: 'Recto Verso (Édition augmentée)',
    artist: 'Paradis',
    year: 2026,
    rating: 10,
  },
  {
    slug: 'love-deluxe',
    type: 'Album',
    title: 'Love Deluxe',
    artist: 'Sade',
    year: 1992,
    rating: 9,
  },
  {
    slug: 'open-late',
    type: 'Album',
    title: 'Open Late',
    artist: 'Sammy Virji',
    year: 2026,
    rating: 7,
  },
  {
    slug: 'archangel',
    type: 'Album',
    title: 'Archangel',
    artist: 'KETTAMA',
    year: 2025,
    rating: 9,
  },
  {
    slug: 'homework',
    type: 'Album',
    title: 'Homework',
    artist: 'Daft Punk',
    year: 1997,
    rating: 8,
  },
  {
    slug: 'krypt-vol-2',
    type: 'Album',
    title: 'Krypt Vol. 2',
    artist: 'kryptogram',
    year: 2021,
    rating: 8,
  },
  {
    slug: 'guns-and-horses',
    type: 'Album',
    title: 'Guns & Horses',
    artist: 'Indira Paganotto',
    year: 2022,
    rating: 7,
  },
  {
    slug: 'modjo',
    type: 'Album',
    title: 'Modjo (Remastered)',
    artist: 'Modjo',
    year: 2001,
    rating: 7,
  },

  /* Research — reverse chronological.
   * TODO: fill in authors/venue/status and the PDF, arXiv and code links. */
  {
    slug: 'cs180-paper',
    type: 'Research',
    topic: 'Computer Vision',
    title: 'SLAM for Pose Estimation in VLAs',
    date: '2026-12-01',
    authors: '',
    venue: 'UC Berkeley',
    status: 'In progress',
    excerpt: '',
    pdf: '',
    arxiv: '',
    code: '',
  },
  {
    slug: 'cs182-paper',
    type: 'Research',
    topic: 'Deep Learning',
    title: 'In-context Learning via Skills Libraries for VLAs',
    date: '2026-12-01',
    authors: '',
    venue: 'UC Berkeley',
    status: 'In progress',
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
    authors: 'A. G. O. Yeh (PI), Z. Tao, G. C. S. Lin, X. Liu, F. F. Yang, J. Yang',
    venue: 'University of Hong Kong · Strategic Public Policy Research Report',
    status: '',
    excerpt: '',
    pdf: '/papers/hk-gba-economic-cooperation-2021.pdf',
    arxiv: '',
    code: '',
  },
];
