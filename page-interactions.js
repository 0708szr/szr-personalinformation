(function(){
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(!fine||reduced)return;
  document.body.classList.add('pointer-fx');
  const surfaceSelector=['.skill-area','.project-card','.highlight-item','.game-card','.ppt-card','.mbti-wrap','.douyin-wrap','.ai-music-card','.cert-carousel','.gallery-card.center','.panel','.step','.card','.brief','.stat','.radar','.browser','.studio'].join(',');
  const magneticSelector=['.btn','.learning-detail-link','.game-portfolio-launch','.mbti-test-btn','.primary','.secondary','.back','.round','.cta','.launch'].join(',');
  function bind(root){
    root.querySelectorAll(surfaceSelector).forEach(el=>{
      if(el.dataset.pointerBound)return;el.dataset.pointerBound='1';el.classList.add('pointer-reactive');
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;el.style.setProperty('--local-x',x+'px');el.style.setProperty('--local-y',y+'px');if(el.matches('.skill-area')){el.style.setProperty('--skill-rx',((r.height/2-y)/r.height*5)+'deg');el.style.setProperty('--skill-ry',((x-r.width/2)/r.width*6)+'deg')}});
      if(el.matches('.skill-area'))el.addEventListener('pointerleave',()=>{el.style.setProperty('--skill-rx','0deg');el.style.setProperty('--skill-ry','0deg')});
    });
    root.querySelectorAll(magneticSelector).forEach(el=>{
      if(el.dataset.magneticBound)return;el.dataset.magneticBound='1';el.classList.add('pointer-magnetic');
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mag-x',((e.clientX-r.left-r.width/2)*.08)+'px');el.style.setProperty('--mag-y',((e.clientY-r.top-r.height/2)*.1)+'px')});
      el.addEventListener('pointerleave',()=>{el.style.setProperty('--mag-x','0px');el.style.setProperty('--mag-y','0px')});
    });
  }
  addEventListener('pointermove',e=>{document.body.style.setProperty('--page-x',e.clientX+'px');document.body.style.setProperty('--page-y',e.clientY+'px')},{passive:true});
  bind(document);
  new MutationObserver(()=>bind(document)).observe(document.body,{childList:true,subtree:true});
})();
