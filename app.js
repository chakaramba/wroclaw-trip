'use strict';
const films = [
  {id:'grand',title:'The Grand Budapest Hotel',year:2014,accent:'#efb0bb',question:'What becomes of loyalty and tradition when the world that sustained them begins to disappear?',position:'center 43%',mobilePosition:'60% 30%',credit:'Searchlight Pictures',url:'https://www.searchlightpictures.com/thegrandbudapesthotel/'},
  {id:'fox',title:'Fantastic Mr. Fox',year:2009,accent:'#e8b757',question:'Can you build a settled life without giving up the part of yourself that resists it?',position:'center 45%',mobilePosition:'58% 30%',credit:'Searchlight Pictures / The Criterion Collection',url:'https://www.criterion.com/films/28565-fantastic-mr-fox'},
  {id:'lighthouse',title:'The Lighthouse',year:2019,accent:'#e5e2d8',question:'How do you distinguish reality from suspicion when there is no outside perspective?',position:'center 38%',mobilePosition:'60% 28%',credit:'A24 / Fetch Publicity',url:'https://a24films.com/films/the-lighthouse'},
  {id:'whiplash',title:'Whiplash',year:2014,accent:'#e4bd6d',question:'Where does dedication to excellence end and self-destruction begin?',position:'center 38%',mobilePosition:'63% 28%',credit:'Sony Pictures Classics',url:'https://www.sonyclassics.com/film/whiplash/'},
  {id:'kaguya',title:'The Tale of the Princess Kaguya',year:2013,accent:'#e6c5ae',question:'Who gets to decide what a good life should look like?',position:'center 42%',mobilePosition:'57% 30%',credit:'Studio Ghibli',url:'https://www.ghibli.jp/works/kaguyahime/'},
  {id:'sea',title:'Song of the Sea',year:2014,accent:'#a9d6d4',question:'What happens when protecting ourselves from pain means shutting away part of life?',position:'center 45%',mobilePosition:'55% 28%',credit:'Cartoon Saloon; poster via Wikipedia',url:'https://www.cartoonsaloon.ie/song-of-the-sea/'},
  {id:'kubo',title:'Kubo and the Two Strings',year:2016,accent:'#e7a482',question:'How do the stories we inherit shape who we become?',position:'center 42%',mobilePosition:'58% 28%',credit:'LAIKA; poster via Wikipedia',url:'https://www.laikahiddenworlds.com/kubo'}
];
const sceneryFrames = new Set(["grand-1", "grand-3", "fox-3", "kaguya-2", "kubo-1", "kubo-2", "kubo-3"]);
const stillPath = (id, frame) => `assets/${id}-${frame}${sceneryFrames.has(`${id}-${frame}`) ? '-scenery' : ''}.webp`;
const main = document.querySelector('#films');
main.innerHTML = films.map((film,index)=>`<section class="film" id="${film.id}" aria-labelledby="${film.id}-title" style="--accent:${film.accent};--position:${film.position};--mobile-position:${film.mobilePosition}">
  <div class="film-frame"><div class="scene-stack" aria-hidden="true">${[1,2,3].map((frame)=>`<figure class="scene ${frame===1?'is-active':''}"><img ${frame===1?'src':'data-src'}="${stillPath(film.id,frame)}" alt="" ${index===0&&frame===1?'fetchpriority="high"':'loading="lazy"'} decoding="async" width="1600" height="1000"></figure>`).join('')}</div>
  <div class="film-shade" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
  <div class="film-number">${String(index+1).padStart(2,'0')} <span>/</span> 07</div>
  <a class="scroll-down" href="${index===films.length-1?'#top':'#'+films[index+1].id}" aria-label="${index===films.length-1?'Back to beginning':'Next film: '+films[index+1].title}">${index===films.length-1?'↑':'↓'}</a>
  <div class="film-content"><img class="poster" src="assets/${film.id}-poster.webp" alt="${film.title} theatrical poster" width="240" height="360" loading="${index===0?'eager':'lazy'}" decoding="async"><div class="film-copy"><h2 id="${film.id}-title">${film.title}</h2><p class="film-year">${film.year}</p><p class="film-question">${film.question}</p><div class="film-actions"><button class="choose-film" type="button" data-film="${film.id}" aria-pressed="false" aria-label="Choose ${film.title} for Tuesday"><span class="choose-label">This one for Tuesday</span><span class="arrow" aria-hidden="true">↗</span></button><a class="google-search" href="https://www.google.com/search?q=${encodeURIComponent(`${film.title} ${film.year} film`)}" target="_blank" rel="noopener noreferrer" aria-label="Search Google for ${film.title} (${film.year}) (opens a new tab)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><span>Google</span><span class="external-arrow" aria-hidden="true">↗</span></a></div></div></div>
  <span class="film-bottom-note">TUESDAY, 27 OCTOBER</span><div class="film-controls"><span class="slide-caption" aria-hidden="true">STILLS</span><div class="slide-dots" role="group" aria-label="${film.title} background stills">${[1,2,3].map((n)=>`<button class="slide-dot" type="button" data-frame="${n-1}" aria-label="Show still ${n} of ${film.title}" aria-pressed="${n===1}"></button>`).join('')}</div><button class="pause-slides" type="button" aria-label="Pause ${film.title} slideshow" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button></div>
</div></section>`).join('');
const sections=[...document.querySelectorAll('.film')];
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const states=sections.map(()=>({frame:0,paused:reducedMotion.matches,token:0}));
let active=0,timer=null,selected=null,lastFocus=null;
const ratios=new Map();
function loadFrames(index){sections[index].querySelectorAll('img[data-src]').forEach(img=>{img.src=img.dataset.src;delete img.dataset.src;});}
async function setFrame(index,frame){
  const section=sections[index],state=states[index];
  loadFrames(index);
  const token=++state.token;
  const image=section.querySelectorAll('.scene img')[frame];
  try{if(image.decode)await image.decode();}catch{return;}
  if(token!==state.token)return;
  state.frame=frame;
  section.querySelectorAll('.scene').forEach((el,i)=>el.classList.toggle('is-active',i===frame));
  section.querySelectorAll('.slide-dot').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===frame)));
}
function resetTimer(){
  clearInterval(timer);timer=null;
  if(active<0||document.hidden||states[active].paused)return;
  timer=setInterval(()=>setFrame(active,(states[active].frame+1)%3),2500);
}
function updatePause(index){const button=sections[index].querySelector('.pause-slides'),paused=states[index].paused;button.setAttribute('aria-label',`${paused?'Play':'Pause'} ${films[index].title} slideshow`);button.setAttribute('aria-pressed',String(paused));button.firstElementChild.textContent=paused?'▶':'Ⅱ';}
sections.forEach((section,index)=>{
  section.querySelectorAll('.slide-dot').forEach(button=>button.addEventListener('click',()=>{setFrame(index,Number(button.dataset.frame));resetTimer();}));
  section.querySelector('.pause-slides').addEventListener('click',()=>{states[index].paused=!states[index].paused;updatePause(index);resetTimer();});
  section.querySelector('.choose-film').addEventListener('click',()=>choose(films[index]));
  updatePause(index);
});
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{ratios.set(entry.target,entry.intersectionRatio);if(entry.isIntersecting)loadFrames(sections.indexOf(entry.target));});
  let largest=0,next=-1;ratios.forEach((ratio,section)=>{if(ratio>largest){largest=ratio;next=sections.indexOf(section);}});
  if(next!==active){active=next;resetTimer();}
},{threshold:[0,.1,.25,.4,.6,.8,1]});
sections.forEach(section=>observer.observe(section));
document.addEventListener('visibilitychange',resetTimer);
reducedMotion.addEventListener('change',event=>{states.forEach((state,index)=>{state.paused=event.matches;updatePause(index);});resetTimer();});
loadFrames(0);resetTimer();

const ticket=document.querySelector('#ticket-dialog');
const pickBar=document.querySelector('.pick-bar');
const status=document.querySelector('.copy-status');
function reflectChoice(){
  document.querySelectorAll('.choose-film').forEach(button=>{const chosen=selected?.id===button.dataset.film;button.setAttribute('aria-pressed',String(chosen));button.querySelector('.choose-label').textContent=chosen?'Tuesday’s pick':'This one for Tuesday';button.querySelector('.arrow').textContent=chosen?'✓':'↗';});
  pickBar.hidden=!selected;document.body.classList.toggle('has-pick',Boolean(selected));
  if(selected)document.querySelector('#pick-bar-title').textContent=selected.title;
}
function choose(film){selected=film;try{localStorage.setItem('tuesdays-pick-2026-10-27',film.id);}catch{}reflectChoice();showTicket();}
function showTicket(){if(!selected)return;lastFocus=document.activeElement;document.querySelector('#ticket-heading').textContent=selected.title;document.querySelector('.ticket-year').textContent=selected.year;const poster=document.querySelector('.ticket-poster');poster.src=`assets/${selected.id}-poster.webp`;poster.alt=`${selected.title} poster`;document.querySelector('.ticket-question').textContent=selected.question;status.textContent='';ticket.showModal();}
function clearChoice(){selected=null;try{localStorage.removeItem('tuesdays-pick-2026-10-27');}catch{}reflectChoice();}
function closeDialog(dialog){dialog.close();if(lastFocus?.isConnected)lastFocus.focus();}
document.querySelector('#pick-bar-open').addEventListener('click',showTicket);
document.querySelector('.pick-clear').addEventListener('click',clearChoice);
document.querySelector('.keep-looking').addEventListener('click',()=>closeDialog(ticket));
document.querySelector('#copy-choice').addEventListener('click',async()=>{
  if(!selected)return;
  const message=`Tuesday’s pick — 27 October\n${selected.title} (${selected.year})\n\n${selected.question}`;
  try{await navigator.clipboard.writeText(message);status.textContent='Copied. Ready to send whenever you like.';}
  catch{status.textContent='Select and copy your pick below.';let fallback=ticket.querySelector('.copy-fallback');if(!fallback){fallback=document.createElement('textarea');fallback.className='copy-fallback';fallback.setAttribute('aria-label','Tuesday’s pick to copy');fallback.style.cssText='width:100%;min-height:105px;padding:10px;margin-top:10px;background:#f5efdf;color:#25231f;border:1px solid #aaa08d;';ticket.querySelector('.ticket-wrap').append(fallback);}fallback.value=message;fallback.focus();fallback.select();}
});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.dialog-close').addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog);});
});
try{const saved=localStorage.getItem('tuesdays-pick-2026-10-27');selected=films.find(f=>f.id===saved)||null;reflectChoice();}catch{}
