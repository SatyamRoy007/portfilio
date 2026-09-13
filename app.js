(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const data = window.portfolioData;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home:'<path d="M3 21V10h3V7h3V4h6v3h3v3h3v11h-7v-7h-4v7Z"/>',
    work:'<path d="M3 9h18v12H3zM8 9V4h8v5M3 14h18M10 14v3h4v-3"/>',
    leaf:'<path d="M20 3c-8 0-16 1-16 9 0 5 5 7 9 4s6-9 7-13ZM4 21 15 10M7 18H3M10 15V9"/>',
    person:'<path d="M8 4h8v8H8zM4 22v-6l4-2h8l4 2v6"/>',
    award:'<path d="m12 2 3 2h4v4l2 3-2 3v4h-4l-3 2-3-2H5v-4l-2-3 2-3V4h4zM8 18v5l4-2 4 2v-5M9 10l2 2 4-4"/>',
    mail:'<path d="M3 5h18v15H3zM3 6l9 7 9-7"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    sun:'<path d="M8 8h8v8H8zM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
    pause:'<path d="M8 4v16M16 4v16"/>',
    play:'<path d="m7 3 13 9L7 21Z"/>',
    left:'<path d="m14 5-7 7 7 7M7 12h14"/>',
    right:'<path d="m10 5 7 7-7 7M17 12H3"/>',
    code:'<path d="m7 6-6 6 6 6M17 6l6 6-6 6M14 3l-4 18"/>',
    camera:'<path d="M3 7h5l2-3h5l2 3h4v14H3zM9 11h7v7H9zM18 10h1"/>',
    video:'<path d="M2 7h13v13H2zM15 11l7-4v13l-7-4M4 2h5v4H4zM10 2h5v4h-5z"/>',
    music:'<path d="M9 18V5l12-3v13M9 9l12-3M3 17h6v5H3zM15 14h6v5h-6z"/>',
    compass:'<path d="M6 2h12l4 4v12l-4 4H6l-4-4V6zM16 7l-3 6-6 3 3-6z"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${icons[name] || icons.home}</svg>`;
  const paintIcons = (root = document) => $$('[data-icon]', root).forEach(e => {e.innerHTML = icon(e.dataset.icon);});
  paintIcons();
  let activeView = 'home', activeProject = 0, activeCase = 'problem', credentialPage = 0;
  const viewNames = ['home', 'work', 'expertise', 'about', 'credentials', 'contact'];
  function showView(name, {focus = true, historyMode = 'push'} = {}) {
    if (!viewNames.includes(name)) name = 'home';
    activeView = name;
    $$('.view').forEach(el => {el.hidden = el.id !== `view-${name}`;});
    document.body.dataset.view = name;
    $$('.dock [data-view]').forEach(el => el.dataset.view === name ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current'));
    const hash = name === 'home' ? '' : `#${name}`;
    if (historyMode && location.hash !== hash) history[historyMode === 'replace' ? 'replaceState' : 'pushState']({}, '', location.pathname + location.search + hash);
    const panel = $(`#view-${name}`); panel.scrollTop = 0;
    if (focus) (name === 'home' ? $('#main') : $('h2', panel)).focus({preventScroll:true});
  }
  $$('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  window.addEventListener('popstate', () => showView(location.hash.slice(1), {historyMode:null}));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#world-settings').open && !$('#village-explore').open && activeView !== 'home') showView('home');
  });
  function tabKeys(group) {
    group.addEventListener('keydown', event => {
      const buttons = $$('[role="tab"]', group);
      const current = buttons.indexOf(document.activeElement);
      if(current < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click(); buttons[next].focus();
    });
  }
  function selectTab(buttons, selected) {
    buttons.forEach(el => {const active = el === selected; el.setAttribute('aria-selected', String(active)); el.tabIndex = active ? 0 : -1;});
  }
  function renderProject() {
    const project = data.projects[activeProject];
    $$('.project-option').forEach((el, i) => i === activeProject ? el.setAttribute('aria-current','true') : el.removeAttribute('aria-current'));
    $('#project-detail').innerHTML = `
      <div class="project-topline"><h3>${esc(project.name)}</h3><span class="tag">${esc(project.category)}</span></div>
      <div class="project-content"><div class="project-visual"><div class="browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>A REAL LOOK AT THE PROJECT</span></div><img src="${esc(project.image)}" alt="${esc(project.imageAlt)}" width="1200" height="833"><div class="project-metric"><b>${esc(project.metric)}</b><span>${esc(project.metricLabel)}</span></div></div><div class="project-information"><p class="project-summary">${esc(project.summary)}</p><div class="tech-tags">${project.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div><div class="case-tabs" role="tablist" aria-label="Case study details">${[['problem','The problem'],['approach','What I built'],['delivered','Delivered']].map(([key,label])=>`<button id="case-tab-${key}" role="tab" data-case="${key}" aria-controls="case-copy" aria-selected="${key === activeCase}" tabindex="${key === activeCase ? 0 : -1}">${label}</button>`).join('')}</div><p id="case-copy" class="case-copy" role="tabpanel" aria-labelledby="case-tab-${activeCase}">${esc(project[activeCase])}</p><div class="project-links"><a class="button primary" href="${esc(project.live)}" target="_blank" rel="noopener">Visit project ↗</a><a class="text-button" href="${esc(project.source)}" target="_blank" rel="noopener">Source code ↗</a></div></div></div><p class="project-note">${esc(project.note)}</p>`;
    const group = $('.case-tabs');
    $$('[data-case]', group).forEach(el => el.addEventListener('click', () => {
      activeCase = el.dataset.case;
      selectTab($$('[role="tab"]',group), el);
      $('#case-copy').textContent = project[activeCase];
      $('#case-copy').setAttribute('aria-labelledby', `case-tab-${activeCase}`);
    }));
    tabKeys(group);
  }
  $('#project-list').innerHTML = data.projects.map((project,i)=>`<button class="project-option" data-project="${i}"${i === 0 ? ' aria-current="true"' : ''}><span class="project-number">0${i+1}</span><span><strong>${esc(project.name)}</strong><small>${esc(project.category)}</small></span><span class="project-arrow" aria-hidden="true">↗</span></button>`).join('');
  $$('.project-option').forEach(el => el.addEventListener('click',()=>{activeProject = Number(el.dataset.project);activeCase = 'problem';renderProject();}));
  renderProject();
  const expertise = {
    development: {icon:'code', headline:'Useful products.<br>Thoughtful engineering.', intro:'From the first screen to the systems behind it, I connect a clear user experience with practical, maintainable code.',services:[['Websites & interfaces','Responsive websites, landing pages and interactive experiences with a clear path to action.'],['Full-stack applications','React interfaces, Node.js APIs, integrations and workflows that solve a specific problem.'],['Creative development','Custom maps, browser experiences and motion that give a digital product its own character.']], tools:['React','TypeScript','JavaScript','Node.js','Python','HTML / CSS','Git']},
    marketing: {icon:'leaf', headline:'Clear stories.<br>Room to grow.', intro:'A good website is the beginning. I connect the message, the audience and the next step with a focused marketing plan.',services:[['Search & discoverability','SEO audits, keyword research, content structure and search-friendly landing pages.'],['Campaigns & conversion','Google Ads and Meta campaign planning, audience research and a clear route from click to enquiry.'],['Content & social strategy','Content pillars, publishing systems and creative storytelling informed by audience response.']],tools:['Google Ads','Meta Ads','WordPress','SEO','Canva','Analytics','Content strategy']}
  };
  function renderExpertise(track) {
    const panel = $('#expertise-body');
    panel.setAttribute('aria-labelledby', `expertise-tab-${track}`);
    if(track === 'results') {
      panel.innerHTML = `<p class="results-intro">Experience beyond the code. These outcomes come from my social media management work, as reported in my résumé.</p><div class="result-grid"><article class="result-card"><b>80%</b><h3>Follower growth</h3><p>Average client follower growth within the first six months, supported by social audits and a data-led strategy.</p></article><article class="result-card"><b>300%</b><h3>More community content</h3><p>Increase in user-generated content for a key client through a national hashtag campaign.</p></article><article class="result-card"><b>40%</b><h3>Less content creation time</h3><p>Reduction in production time through reusable templates and content pillars.</p></article></div><p class="result-source">Self-reported résumé outcomes; not independently audited or attributed to the portfolio projects. <a href="assets/akhil-roy-resume.pdf" target="_blank" rel="noopener">Read the source résumé ↗</a></p>`;
      return;
    }
    const entry = expertise[track];
    panel.innerHTML = `<div class="expertise-layout"><div class="expertise-intro"><span class="expertise-icon">${icon(entry.icon)}</span><p class="lead">${entry.headline}</p><p>${entry.intro}</p></div><div class="service-list">${entry.services.map(([title, description],i)=>`<article class="service-row"><span>0${i+1}</span><div><h3>${title}</h3><p>${description}</p></div></article>`).join('')}</div></div><div class="tool-strip"><span>${track === 'development' ? 'IN THE TOOLKIT' : 'TOOLS & PRACTICE'}</span>${entry.tools.map(t=>`<b>${t}</b>`).join('')}</div>`;
  }
  $$('[data-track]').forEach(el => el.addEventListener('click',()=>{selectTab($$('[data-track]'),el);renderExpertise(el.dataset.track);}));
  selectTab($$('[data-track]'), $('[data-track="development"]'));tabKeys($('#expertise-tabs'));renderExpertise('development');
  const narrow = matchMedia('(max-width:760px)');
  function renderCredentials() {
    const filtered = data.credentials.filter(c => $('#credential-filter').value === 'All' || c.track === $('#credential-filter').value);
    const perPage = narrow.matches ? 2 : 4;
    const pages = Math.ceil(filtered.length / perPage);
    credentialPage = Math.min(credentialPage,pages - 1);
    const start = credentialPage * perPage;
    $('#credential-grid').innerHTML = filtered.slice(start,start + perPage).map(c=>`<article class="credential-card"><div class="issuer-monogram" aria-hidden="true">${esc(c.monogram)}</div><div><span class="credential-issuer">${esc(c.issuer)}</span><h3>${esc(c.title)}</h3><p>${esc(c.kind)} · ${esc(c.date)}</p><a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.linkLabel)} ↗</a></div></article>`).join('');
    $('#credential-count').textContent = `${start + 1}–${Math.min(start+perPage, filtered.length)} of ${filtered.length} credentials`;
    $('#credential-prev').disabled = credentialPage === 0;
    $('#credential-next').disabled = credentialPage >= pages - 1;
  }
  $('#credential-filter').addEventListener('change',()=>{credentialPage = 0;renderCredentials();});
  $('#credential-prev').addEventListener('click',()=>{credentialPage--;renderCredentials();});
  $('#credential-next').addEventListener('click',()=>{credentialPage++;renderCredentials();});
  narrow.addEventListener('change',()=>{credentialPage = 0;renderCredentials();});renderCredentials();
  const form = $('#contact-form');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity()) return;
    const fields = new FormData(form), name = fields.get('name').trim(), email = fields.get('email').trim(), message = fields.get('message').trim();
    if(!name || !message) {const field = !name ? form.elements.name : form.elements.message;field.setCustomValidity('Please add a little more detail.');field.reportValidity();return;}
    const subject = `Project enquiry from ${name}`;
    const body = `Hi Akhil,\n\n${message}\n\nFrom: ${name}\nEmail: ${email}`;
    $('#draft-link').href = `mailto:satyam.roy02@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#draft-result').hidden = false;
    $('#draft-link').focus({preventScroll:true});
  });
  form.addEventListener('input', event=>{event.target.setCustomValidity?.('');$('#draft-result').hidden = true;$('#draft-link').removeAttribute('href');});
  const settings = $('#world-settings');
  function openSettings(){syncWorld();settings.showModal();}
  $('#open-settings').addEventListener('click',openSettings);
  $('#close-settings').addEventListener('click',()=>settings.close());
  settings.addEventListener('click',event=>{if(event.target !== settings) return;const b=settings.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)settings.close();});
  function syncWorld(incoming){
    const state = incoming || window.villageWorld?.getState();if(!state)return;
    document.body.dataset.night = String(state.sceneNight ?? state.night);
    $('#world-season').textContent = state.season[0].toUpperCase() + state.season.slice(1);
    $('#world-day').textContent = `Day ${state.day}`;
    $('#setting-season').value=state.autoSeason ? 'auto' : state.season;$('#setting-weather').value=state.weather;
    for(const key of ['night','paused','effects','sound']) $(`#setting-${key}`).checked=Boolean(state[key]);
    $('#quick-pause').setAttribute('aria-pressed',String(state.paused));
    $('#quick-pause').innerHTML=`${icon(state.paused?'play':'pause')}<span>${state.paused?'Play world':'Pause world'}</span>`;
    $('#resource-wood').textContent=state.wood;$('#resource-people').textContent=state.population;
    $('#resource-stage').textContent = state.stage >= 2 ? 'A new home, a new neighbour. The village keeps growing.' : state.stage === 1 ? 'Storehouse built. The village is gathering 28 wood for a new home.' : 'Woodcutters gather 12 wood to build a storehouse.';
  }
  for(const key of ['season','weather','night','paused','effects','sound']){
    $(`#setting-${key}`).addEventListener('change',event=>{const method = 'set'+key[0].toUpperCase()+key.slice(1);const value=['season','weather'].includes(key)?event.target.value:event.target.checked;window.villageWorld?.[method](value);syncWorld();});
  }
  $('#quick-pause').addEventListener('click',()=>{const world=window.villageWorld;if(world)world.setPaused(!world.getState().paused);});
  document.addEventListener('worldchange', event=>syncWorld(event.detail));syncWorld();
  function updateClock(){$('#india-time').textContent=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date())+' IST';}
  updateClock();setInterval(updateClock,60000);
  showView(location.hash.slice(1)||'home',{focus:false,historyMode:'replace'});
})();
