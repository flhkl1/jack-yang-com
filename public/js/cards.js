/* Card rendering shared by the three index pages.
 *
 * Each index filters window.ITEMS down to its own type, decides its own order,
 * and hands the list to render() with the card builder that fits that type.
 * The card markup differs per type on purpose — a project wants its repo and
 * stack, a paper wants its authors and venue — but they share .post and its
 * children so the three pages read as one family.
 */
window.Cards = (function() {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatYear(iso) {
    return iso.split('-')[0];
  }

  function pills(items, active) {
    return items.map(function(t) {
      return '<button type="button" class="pill" data-value="' + escapeHtml(t) + '" aria-pressed="' +
        (t === active) + '">' + escapeHtml(t) + '</button>';
    }).join('');
  }

  // An empty link field means "not published yet", so skip it rather than
  // rendering an anchor that goes nowhere.
  // Site-relative pages (a case study) stay in the tab; other sites and
  // hosted PDFs open a new one.
  function links(pairs) {
    var out = pairs.filter(function(p) { return p[1]; }).map(function(p) {
      var external = !/^\//.test(p[1]) || /\.pdf$/i.test(p[1]);
      return '<a class="post-link" href="' + escapeHtml(p[1]) + '"' +
        (external ? ' target="_blank" rel="noopener"' : '') + '>' + escapeHtml(p[0]) + '</a>';
    });
    return out.length ? '<div class="item-links">' + out.join('') + '</div>' : '';
  }

  function chips(list) {
    if (!list || !list.length) return '';
    return '<div class="stack-chips">' + list.map(function(s) {
      return '<span class="chip">' + escapeHtml(s) + '</span>';
    }).join('') + '</div>';
  }

  function head(meta, title, href, external, excerpt) {
    var attrs = external ? ' target="_blank" rel="noopener"' : '';
    return (meta ? '<p class="post-meta">' + escapeHtml(meta) + '</p>' : '') +
      '<h2 class="post-title">' +
        (href ? '<a href="' + escapeHtml(href) + '"' + attrs + '>' + escapeHtml(title) + '</a>' : escapeHtml(title)) +
      '</h2>' +
      (excerpt ? '<p class="post-excerpt">' + escapeHtml(excerpt) + '</p>' : '');
  }

  function writingCard(p) {
    var href = p.url || ('/writing/' + p.slug);
    var isExternal = Boolean(p.url);
    var meta = [formatDate(p.date), p.outlet, p.role].filter(Boolean).join(' · ');

    return '<article class="post">' +
      (p.featured ? '<span class="post-badge">Featured</span>' : '') +
      head(meta, p.title, href, isExternal, p.excerpt) +
      '<a class="post-link" href="' + escapeHtml(href) + '"' +
        (isExternal ? ' target="_blank" rel="noopener"' : '') + '>' +
        (isExternal ? 'Read at ' + escapeHtml(p.outlet || 'source') : 'Read more') + '</a>' +
    '</article>';
  }

  // Work done for an employer carries an `org`; everything else is personal.
  function projectKind(p) {
    return p.org ? 'Work' : 'Personal';
  }

  // A draft case study is reachable by URL for proofreading but not linked.
  function caseStudyHref(p) {
    return p.caseStudy && !p.draft ? '/projects/' + p.slug : '';
  }

  function projectCard(p) {
    // Work links its write-up first, since the demo is only a rebuild of it;
    // personal projects lead with the demo, then the repo.
    var study = caseStudyHref(p);
    var href = p.org ? (study || p.demo || p.repo || '') : (p.demo || p.repo || study || '');
    var meta = [p.org, p.period].filter(Boolean).join(' · ');

    return '<article class="post">' +
      (p.featured ? '<span class="post-badge">Featured</span>' : '') +
      (p.status ? '<span class="status-badge">' + escapeHtml(p.status) + '</span>' : '') +
      head(meta, p.title, href, !/^\//.test(href), p.excerpt) +
      chips(p.stack) +
      (p.note ? '<p class="project-note">' + escapeHtml(p.note) + '</p>' : '') +
      links([['Read more', study], ['Demo', p.demo], ['Repo', p.repo]].concat(p.links || [])) +
    '</article>';
  }

  function researchCard(p) {
    var meta = [formatYear(p.date), p.venue, p.status].filter(Boolean).join(' · ');
    var href = p.arxiv || p.pdf || '';

    return '<article class="post">' +
      head(meta, p.title, href, true, p.excerpt) +
      (p.authors ? '<p class="post-authors">' + escapeHtml(p.authors) + '</p>' : '') +
      links([['PDF', p.pdf], ['arXiv', p.arxiv], ['Code', p.code]]) +
    '</article>';
  }

  function render(el, list, card) {
    if (!list.length) {
      el.innerHTML = '<div class="empty-state">Nothing here yet.</div>';
      return;
    }
    el.innerHTML = list.map(card).join('');
  }

  return {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    pills: pills,
    render: render,
    writingCard: writingCard,
    projectCard: projectCard,
    projectKind: projectKind,
    researchCard: researchCard,
  };
})();
