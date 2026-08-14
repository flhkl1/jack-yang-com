/* Writing index for the Production page.
 *
 * Each post is either:
 *   - external: { url } ...... card links straight out to the publisher
 *   - native:   { body }  ..... full text hosted here, rendered at /production/<slug>
 *
 * To host a piece natively, drop the HTML into `body` and remove `url`.
 */
window.POSTS = [
  {
    slug: 'beyond-survival-xpression',
    title: "Beyond Survival: Berkeley's Post-Pandemic Small-Business Scene and Xpression's Recipe for Resilience",
    date: '2024-04-18',
    tags: ['Reporting'],
    outlet: 'Berkeley Economic Review',
    featured: true,
    excerpt: "As the warm embrace of Spring welcomes us once again, it's hard not to reflect on the stark contrast to four years ago, when the world was under the shadow of COVID-19. While Zoom lessons, mask mandates, and stay-at-home orders feel like distant memories, small businesses in Berkeley continue to bear the scars of the pandemic.",
    url: 'https://econreview.studentorg.berkeley.edu/beyond-survival-berkeleys-post-pandemic-small-business-scene-and-xpressions-recipe-for-resilience/',
  },
  {
    slug: 'energy-bundle-theory',
    title: 'The Energy Bundle Theory: Why Renewable Energy is not the Panacea for Global Inequality',
    date: '2023-04-18',
    tags: ['Economics'],
    outlet: 'Berkeley Economic Review',
    excerpt: "Regarding non-renewable energy, two common beliefs prevail: it's incredibly lucrative and environmentally detrimental. We admire the prosperity brought by oil to the U.S., natural gas to Russia, and coal to the UK, but lament the Deepwater Horizon spill, Flint's water contamination, and deforestation in Appalachia.",
    url: 'https://econreview.studentorg.berkeley.edu/the-energy-bundle-theory-why-renewable-energy-is-not-the-panacea-for-global-inequality/',
  },
  {
    slug: 'split-or-quit',
    title: 'Split or Quit: The Study of Behavioral Economics',
    date: '2023-03-16',
    tags: ['Economics'],
    outlet: 'Berkeley Economic Review',
    role: 'Editor',
    excerpt: "Picture this: you are sitting at a table across from someone you don't know. In your hands, you have 100 dollars that you're free to split between yourself and the person sitting across from you. Of the hundred, how much would you keep?",
    url: 'https://econreview.studentorg.berkeley.edu/split-or-quit-the-study-of-behavioral-economics/',
  },
  {
    slug: 'michael-delacour',
    title: "Michael Delacour, People's Park pioneer, dies at age 85",
    date: '2023-03-14',
    tags: ['Reporting'],
    outlet: 'The Daily Californian',
    excerpt: "Michael Delacour, co-founder of People's Park, died Thursday at the age of 85.",
    url: 'https://www.dailycal.org/archives/michael-delacour-people-s-park-pioneer-dies-at-age-85/article_03020229-a3ef-5be8-b0e6-7152b250c5fe.html',
  },
];
