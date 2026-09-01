(function(){
  'use strict';
  if(document.getElementById('pageTransition'))return;
  const style=document.createElement('style');
  style.textContent=`
    .page-transition{position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;visibility:hidden}
    .pt-door{position:absolute;top:0;width:50.5%;height:100%;overflow:hidden;background-color:#050b15;background-image:linear-gradient(rgba(70,170,255,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(70,170,255,.11) 1px,transparent 1px),repeating-linear-gradient(135deg,transparent 0 68px,rgba(77,210,255,.04) 69px 71px,transparent 72px 138px),radial-gradient(circle at center,#183755 0,#081221 45%,#030711 100%);background-size:58px 58px,58px 58px,auto,100% 100%;box-shadow:inset 0 0 90px #000,inset 0 0 0 2px #69d9ff0d;transition:transform .46s cubic-bezier(.16,1,.3,1);will-change:transform}
    .pt-left{left:0;transform:translate3d(-101%,0,0);border-right:2px solid #57d8ffbb;box-shadow:inset -24px 0 55px #32cfff24,inset 0 0 90px #000}.pt-right{right:0;transform:translate3d(101%,0,0);border-left:2px solid #57d8ffbb;box-shadow:inset 24px 0 55px #32cfff24,inset 0 0 90px #000}
    .pt-door:after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(74,207,255,.16) 50%,transparent 70%);transform:translateX(-120%)}
    .pt-right:after{transform:translateX(120%)}
    .pt-circuit{position:absolute;z-index:2;width:56%;height:24%;border-style:solid;border-color:#57dcff;border-width:2px 2px 0 0;opacity:.58;filter:drop-shadow(0 0 5px #36d9ff);transform:scaleX(.2);transform-origin:left;transition:transform .3s .16s ease}.pt-circuit:before,.pt-circuit:after{content:"";position:absolute;width:8px;height:8px;border:2px solid #a8f4ff;border-radius:50%;background:#0b2940;box-shadow:0 0 9px #5ee8ff}.pt-circuit:before{left:-4px;bottom:-4px}.pt-circuit:after{right:-5px;top:-5px}.pt-c1{left:9%;top:18%}.pt-c2{right:8%;bottom:17%;transform:scaleX(.2) rotate(180deg);transform-origin:right}.pt-right .pt-c1{transform:scaleX(.2) rotateY(180deg);left:35%}.pt-right .pt-c2{transform:scaleX(.2) rotate(180deg) rotateY(180deg);right:36%}.pt-node{position:absolute;z-index:2;width:9px;height:9px;border-radius:50%;background:#70ecff;box-shadow:0 0 0 5px #70ecff14,0 0 15px #70ecff;animation:ptNode 1s ease-in-out infinite alternate}.pt-n1{left:18%;top:47%}.pt-n2{right:18%;top:62%;animation-delay:.28s}.pt-seam{position:absolute;top:0;bottom:0;z-index:2;width:22px;background:linear-gradient(90deg,#0008,#63e3ff4d 47%,#bdf7ff 50%,#63e3ff4d 53%,#0008);opacity:.8}.pt-left .pt-seam{right:-11px}.pt-right .pt-seam{left:-11px}
    .pt-center{position:absolute;left:50%;top:50%;z-index:4;box-sizing:border-box;width:min(460px,82vw);max-width:calc(100vw - 28px);min-width:0;padding:18px 24px;transform:translate(-50%,-50%) scale(.82);border:1px solid #66dcff73;border-radius:14px;background:#06111ee8;box-shadow:0 0 0 1px #ffffff0d,0 0 45px #34bff04d;opacity:0;text-align:center;color:#e8f7ff;transition:opacity .18s ease,transform .3s cubic-bezier(.16,1,.3,1);backdrop-filter:blur(14px)}
    .pt-kicker{display:block;color:#5ee8ff;font:10px/1 ui-monospace,monospace;letter-spacing:.24em}.pt-name{display:block;width:100%;min-width:0;margin:9px 0 12px;font-size:clamp(15px,4.6vw,25px);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pt-scan{display:block;height:2px;overflow:hidden;border-radius:999px;background:#ffffff17}.pt-scan:after{content:"";display:block;width:42%;height:100%;background:linear-gradient(90deg,transparent,#5ee8ff,#a78bfa,transparent);animation:ptScan .42s linear infinite}
    .page-transition.cover{visibility:visible}.page-transition.cover .pt-left,.page-transition.cover .pt-right{transform:translate3d(0,0,0)}.page-transition.cover .pt-door:after{animation:ptShine .46s ease both}.page-transition.cover .pt-circuit{transform:scaleX(1)}.page-transition.cover .pt-c2{transform:scaleX(1) rotate(180deg)}.page-transition.cover .pt-right .pt-c1{transform:scaleX(1) rotateY(180deg)}.page-transition.cover .pt-right .pt-c2{transform:scaleX(1) rotate(180deg) rotateY(180deg)}.page-transition.cover .pt-center{opacity:1;transform:translate(-50%,-50%) scale(1);transition-delay:.14s}
    body.page-leaving>*:not(.page-transition){transform:scale(.992);filter:blur(4px);opacity:.64;transition:transform .46s cubic-bezier(.16,1,.3,1),filter .38s ease,opacity .38s ease}
    @keyframes ptScan{from{transform:translateX(-110%)}to{transform:translateX(340%)}}@keyframes ptShine{to{transform:translateX(120%)}}@keyframes ptNode{to{opacity:.35;transform:scale(.72)}}
    @media(prefers-reduced-motion:reduce){.pt-door{transition-duration:.16s}.pt-center{transition-duration:.12s}.pt-scan:after{animation:none}}
  `;
  document.head.appendChild(style);
  const overlay=document.createElement('div');
  overlay.id='pageTransition';
  overlay.className='page-transition';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML='<div class="pt-door pt-left"><i class="pt-circuit pt-c1"></i><i class="pt-circuit pt-c2"></i><b class="pt-node pt-n1"></b><b class="pt-node pt-n2"></b><span class="pt-seam"></span></div><div class="pt-door pt-right"><i class="pt-circuit pt-c1"></i><i class="pt-circuit pt-c2"></i><b class="pt-node pt-n1"></b><b class="pt-node pt-n2"></b><span class="pt-seam"></span></div><div class="pt-center"><span class="pt-kicker">DIGITAL GATE / LINKING</span><strong class="pt-name" id="ptName">载入数字空间</strong><i class="pt-scan"></i></div>';
  document.body.appendChild(overlay);
  const name=overlay.querySelector('#ptName');

  try{
    const arrival=sessionStorage.getItem('szr-page-transition');
    if(arrival){name.textContent=arrival;overlay.classList.add('cover');sessionStorage.removeItem('szr-page-transition');requestAnimationFrame(function(){requestAnimationFrame(function(){overlay.classList.remove('cover')})})}
  }catch(_e){}

  document.addEventListener('click',function(e){
    const link=e.target.closest('a[href]');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.hasAttribute('download'))return;
    const raw=link.getAttribute('href');
    if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return;
    const url=new URL(link.href,location.href);
    if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash)return;
    e.preventDefault();
    if(document.body.classList.contains('page-leaving'))return;
    const label=(link.textContent||link.getAttribute('aria-label')||'载入新页面').replace(/\s+/g,' ').trim();
    name.textContent=label.slice(0,42);
    document.body.classList.add('page-leaving');
    overlay.classList.add('cover');
    try{if(url.origin===location.origin)sessionStorage.setItem('szr-page-transition',label.slice(0,42))}catch(_e){}
    setTimeout(function(){location.href=url.href},500);
  });

  addEventListener('pageshow',function(){document.body.classList.remove('page-leaving');overlay.classList.remove('cover')});
})();
