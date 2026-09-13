/* The portfolio stays focused; village interactions live in this optional window. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const world = window.villageWorld, journal = window.villageJournal;
  if (!world || !journal) return;
  const dialog = $('#village-explore');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let tab = 'people', residentId = '', noteIndex = 0, wasReplaying = false, whisperTimer = 0;
  const noteModes = document.createElement('div');
  noteModes.className = 'note-modes';noteModes.setAttribute('role','group');noteModes.setAttribute('aria-label','Noticeboard mode');
  noteModes.innerHTML = '<button type="button" data-note-mode="write" aria-pressed="true">Write a note</button><button type="button" data-note-mode="read" aria-pressed="false">Read notes <span>0</span></button>';
  $('#village-note-form').before(noteModes);
  function setNoteMode(mode) {$('#explore-notes').dataset.noteMode=mode;$$('[data-note-mode]').filter(e=>e.tagName==='BUTTON').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.noteMode===mode)));}
  $$('button[data-note-mode]').forEach(button=>button.addEventListener('click',()=>setNoteMode(button.dataset.noteMode)));
  setNoteMode('write');
  const date = value => {const d = new Date(value);return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) : 'Today';};
  const treeArt = planted => `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none"><path d="M13 57h38v3H13z" fill="${planted?'#becba4':'#d9dfce'}"/><path d="M30 34h5v23h-5z" fill="${planted?'#8a7552':'#bac2ae'}"/><path d="M22 13h20v6h7v10h5v12H43v7H21v-7H10V29h5V19h7Z" fill="${planted?'#4e704b':'#d9e1ce'}"/><path d="M22 13h16v6H20v10h-5v7h-5v-7h5V19h7Z" fill="${planted?'#8aab6b':'#e7ecdf'}"/>${planted?'<path d="M24 21h4v4h-4zm15 13h4v4h-4zM19 33h3v3h-3z" fill="#e5cd91"/>':''}</svg>`;
  function residentArt(index) {
    const color = ['#a97952','#6e8750','#659183','#9982a2','#b39a63'][index % 5];
    return `<svg viewBox="0 0 80 100" aria-hidden="true" shape-rendering="crispEdges"><path fill="#bdc9a4" d="M13 91h54v4H13z"/><path fill="#514d3c" d="M27 72h10v20H27zm18 0h10v20H45z"/><path fill="${color}" d="M23 43h36v32H23z"/><path fill="#c5a17b" d="M15 48h8v24h-8zm44 0h8v24h-8zM28 19h26v26H28z"/><path fill="#535340" d="M25 17h30v8H25zM25 25h6v10h-6z"/><path fill="#353e2d" d="M35 29h3v3h-3zm11 0h3v3h-3z"/><path fill="#a07e5c" d="M37 38h10v3H37z"/><path fill="#d8c494" d="M21 16h40v5H21zm10-7h21v7H31z"/><path fill="#eadcbd" d="M25 46h4v24h-4z"/></svg>`;
  }
  function syncScope() {
    const info = journal.getInfo();
    $('#journal-scope').textContent = info.storageAvailable ? 'Your village, saved in this browser. Not public.' : 'This session only — browser storage is unavailable.';
    $('#journal-scope').classList.toggle('memory-only', !info.storageAvailable);
    $('#journal-visits').textContent = info.sessionCounted ? `Your visit ${info.visits}` : 'Local journal';
  }
  function renderPeople() {
    const people = world.getVillagers?.() || [];
    if (!people.some(p => p.id === residentId)) residentId = people[0]?.id || '';
    const index = people.findIndex(p => p.id === residentId), person = people[index];
    $('#villager-list').innerHTML = people.map((p,i)=>`<button class="resident-option" data-resident="${escape(p.id)}" aria-pressed="${p.id===residentId}"><span class="resident-mini">${residentArt(i)}</span><span><b>${escape(p.name)}</b><small>${escape(p.role)}</small></span></button>`).join('');
    $$('[data-resident]').forEach(button => button.addEventListener('click', () => {residentId=button.dataset.resident;$('#resident-response').textContent='';renderPeople();$(`[data-resident="${CSS.escape(residentId)}"]`)?.focus({preventScroll:true});}));
    if(person){$('#resident-portrait').innerHTML=residentArt(index);$('#resident-role').textContent=person.role;$('#resident-name').textContent=person.name;$('#resident-bio').textContent=person.bio;}
    const event=world.getEvent?.();
    $('#village-event-title').textContent=event?.active ? event.title : 'The quiet days count, too.';
    $('#village-event-description').textContent=event?.active ? event.description : 'Market mornings, harvest days and snowy surprises arrive on different village days. Try another season from the sun button.';
  }
  function renderGarden() {
    const trees=journal.getTrees();
    $('#tree-plots').innerHTML=Array.from({length:6},(_,plot)=>{const tree=trees.find(t=>t.plot===plot);return `<div class="tree-plot ${tree?'planted':''}" aria-label="${tree?'Tree planted by '+escape(tree.initials):'Empty plot '+(plot+1)}">${treeArt(Boolean(tree))}<span>${tree?escape(tree.initials):String(plot+1).padStart(2,'0')}</span></div>`;}).join('');
    $('#tree-count').textContent=`${trees.length} of 6 spots growing in your grove`;
    $('#plant-tree-button').disabled=trees.length>=6;
    $('#tree-initials').disabled=trees.length>=6;
    if(trees.length>=6) $('#plant-status').textContent='Your grove is full. Six small marks, now part of the scenery.';
  }
  function renderNotes() {
    const notes=journal.getNotes();noteIndex=Math.max(0,Math.min(noteIndex,notes.length-1));
    const card=$('#note-card');card.replaceChildren();
    const note=notes[noteIndex];
    card.classList.toggle('long-note',Boolean(note&&note.message.length>90));
    if(note){
      const text=document.createElement('p');text.textContent=note.message;
      const author=document.createElement('b');author.textContent=note.name;
      const when=document.createElement('span');when.textContent=date(note.createdAt);
      const footer=document.createElement('footer');footer.append(author,when);card.append(text,footer);
    }else{
      const decoration=document.createElement('span');decoration.className='empty-note-mark';decoration.textContent='✳';
      const empty=document.createElement('p');empty.className='empty-note';empty.textContent='A blank little page. Leave the first note in your corner of the village.';card.append(decoration,empty);
    }
    $('#note-count').textContent=notes.length?`${noteIndex+1} / ${notes.length}`:'No notes yet';
    $('button[data-note-mode="read"] span').textContent=notes.length;
    $('#note-prev').disabled=noteIndex===0;$('#note-next').disabled=!notes.length||noteIndex===notes.length-1;
    $('#delete-note').hidden=!notes.length;$('#save-note').disabled=notes.length>=12;
    if(notes.length>=12)$('#note-status').textContent='The board holds 12 notes. Remove one to make room for another.';
  }
  function renderHistory() {
    const history=journal.getHistory(),info=journal.getInfo();
    $('#history-intro').textContent=history.length>1?`Since ${date(info.firstVisit)}, ${history.length} little milestones have become part of this place. Take a moment to see them again.`:'Your story starts here. Plant a tree, change the season or let the village grow to record another moment.';
    const moments=history.length<=4?history:[history[0],...history.slice(-3)];
    $('#history-list').innerHTML=moments.map((moment,i)=>`<div class="history-moment"><span class="history-dot">${String(i+1).padStart(2,'0')}</span><div><b>${escape(moment.label||'A village moment')}</b><p>Day ${escape(moment.day)} · ${escape(moment.season)} · ${moment.trees?.length||0} trees</p></div></div>`).join('');
    $('#history-count').textContent=`${history.length} saved ${history.length===1?'moment':'moments'}`;
    $('#start-village-replay').disabled=history.length<2;
  }
  function setTab(next,focus=false) {
    if(!['people','garden','notes','history'].includes(next))return;
    tab=next;
    $$('[data-explore-tab]').forEach(button=>{const selected=button.dataset.exploreTab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    $$('.explore-page').forEach(page=>{page.hidden=page.id!==`explore-${tab}`;});
    ({people:renderPeople,garden:renderGarden,notes:renderNotes,history:renderHistory})[tab]();
    dialog.scrollTop=0;
    if(focus)$(`#explore-tab-${tab}`).focus({preventScroll:true});
  }
  function open(next='people') {
    world.stopReplay?.();
    $('#world-settings').close();
    syncScope();setTab(next);
    if(!dialog.open)dialog.showModal();
  }
  $('#open-village-journal').addEventListener('click',()=>open('garden'));
  $('#world-status-button').addEventListener('click',()=>open('people'));
  $('#open-settings').addEventListener('click',()=>world.stopReplay?.(),{capture:true});
  document.addEventListener('click',event=>{if(event.target.closest('[data-view]')&&world.getState().replay)world.stopReplay();},{capture:true});
  $('#close-village-explore').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  const settingsEntry=document.createElement('button');settingsEntry.id='settings-village-journal';settingsEntry.className='text-button settings-journal';settingsEntry.textContent='People, trees & notes ↗';settingsEntry.addEventListener('click',()=>open('people'));$('#world-settings').append(settingsEntry);
  $$('[data-explore-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.exploreTab)));
  $('.explore-tabs').addEventListener('keydown',event=>{const tabs=$$('[data-explore-tab]'),index=tabs.indexOf(document.activeElement);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next].dataset.exploreTab,true);});
  $('#greet-resident').addEventListener('click',()=>{const greeting=world.greetVillager?.(residentId);if(greeting)$('#resident-response').textContent=greeting.message;});
  document.addEventListener('worldcharacter',event=>{
    if(document.body.dataset.view!=='home'||$('#world-settings').open)return;
    residentId=event.detail.id;open('people');$('#resident-response').textContent=event.detail.message||'';
  });
  document.addEventListener('worldinteraction', event => {
    const whisper = $('#scene-whisper'), message = event.detail?.message;
    if (!whisper || !message) return;
    clearTimeout(whisperTimer);
    whisper.textContent = message;
    whisper.hidden = false;
    whisper.classList.add('is-visible');
    whisperTimer = setTimeout(() => {
      whisper.classList.remove('is-visible');
      whisperTimer = setTimeout(() => { whisper.hidden = true; }, 180);
    }, 2600);
  });
  $('#plant-tree-form').addEventListener('submit',event=>{
    event.preventDefault();const field=$('#tree-initials'),result=journal.plantTree(field.value);
    if(!result.ok){$('#plant-status').textContent=result.reason||'Please enter 1–3 letters or numbers.';return;}
    field.value='';renderGarden();
    $('#plant-status').textContent=result.persistent?`${result.tree.initials} is now part of the village. Your tree is saved here.`:`${result.tree.initials} is growing for this session. Browser storage is unavailable.`;
  });
  $('#tree-initials').addEventListener('input',()=>{$('#plant-status').textContent='';});
  $('#note-message').addEventListener('input',()=>{$('#note-remaining').textContent=`${$('#note-message').value.length} / 140`;$('#note-status').textContent='';});
  $('#village-note-form').addEventListener('submit',event=>{
    event.preventDefault();const result=journal.addNote($('#note-name').value,$('#note-message').value);
    if(!result.ok){$('#note-status').textContent=result.reason||'Add a name and a short note.';return;}
    const notes=journal.getNotes();noteIndex=notes.findIndex(n=>n.id===result.note.id);$('#note-message').value='';$('#note-remaining').textContent='0 / 140';renderNotes();
    $('#note-status').textContent=result.persistent?'Your note is saved on this board, in this browser.':'Your note is here for this session. Browser storage is unavailable.';
    setNoteMode('read');
  });
  $('#note-prev').addEventListener('click',()=>{noteIndex--;renderNotes();});$('#note-next').addEventListener('click',()=>{noteIndex++;renderNotes();});
  $('#delete-note').addEventListener('click',()=>{const note=journal.getNotes()[noteIndex];if(note&&journal.deleteNote(note.id)){$('#note-status').textContent='Your note has been removed.';renderNotes();if(matchMedia('(max-width:760px)').matches)$('button[data-note-mode="read"]').focus({preventScroll:true});}});
  $('#start-village-replay').addEventListener('click',()=>{
    const history=journal.getHistory();if(history.length<2)return;
    dialog.close();if(document.body.dataset.view!=='home')$('.dock [data-view="home"]').click();
    world.startReplay(history);
    $('#stop-village-replay').focus({preventScroll:true});
  });
  $('#stop-village-replay').addEventListener('click',()=>world.stopReplay());
  document.addEventListener('worldreplay',event=>{
    const detail=event.detail;$('#village-replay-bar').hidden=!detail.active;
    if(detail.active){const snapshot=detail.snapshot||{};$('#replay-caption').textContent=`Day ${snapshot.day||1} · ${snapshot.season||'spring'} · Moment ${(detail.index||0)+1} of ${detail.total}`;$('#replay-progress').max=detail.total;$('#replay-progress').value=(detail.index||0)+1;document.body.dataset.night=String(Boolean(snapshot.sceneNight ?? snapshot.night));}
    else {const live=world.getState();document.body.dataset.night=String(live.sceneNight ?? live.night);if(wasReplaying&&document.activeElement===$('#stop-village-replay'))$('#world-status-button').focus({preventScroll:true});}
    wasReplaying=detail.active;
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&world.getState().replay)world.stopReplay();});
  document.addEventListener('journalchange',()=>{syncScope();if(dialog.open)({people:renderPeople,garden:renderGarden,notes:renderNotes,history:renderHistory})[tab]();});
  document.addEventListener('worldchange',()=>{if(dialog.open&&tab==='people')renderPeople();});
  // Lazy browser loading is enough: the active project is the only mounted screenshot.
  $('#view-about img').loading='lazy';
  syncScope();setTab('people');
})();
