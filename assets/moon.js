(function(){
  'use strict';
  const container=document.getElementById('moonCanvas');
  const welcome=document.getElementById('welcome');
  if(!container||!window.THREE)return;

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,1,3000);
  camera.position.set(0,0,260);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000,1);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.outputEncoding=THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const detailOverlay=document.createElement('div');
  detailOverlay.setAttribute('aria-hidden','true');
  detailOverlay.style.cssText='position:absolute;left:50%;top:50%;z-index:2;border-radius:50%;pointer-events:none;background-image:radial-gradient(circle at 34% 26%,rgba(255,255,255,.2) 0,transparent 24%,transparent 58%,rgba(0,0,0,.42) 88%,rgba(0,0,0,.72) 100%),url("assets/moon-surface.png");background-size:100% 100%,185% 185%;background-repeat:no-repeat;background-blend-mode:soft-light,normal;box-shadow:inset -34px -20px 65px rgba(0,0,0,.42),inset 12px 8px 24px rgba(255,255,255,.14),0 0 2px rgba(255,255,255,.7);filter:brightness(1.42) contrast(1.2) saturate(.15);opacity:.94;will-change:width,height,background-position,transform';
  container.appendChild(detailOverlay);

  const tiltGroup=new THREE.Group();
  tiltGroup.rotation.z=6.68*Math.PI/180;
  scene.add(tiltGroup);
  const spinGroup=new THREE.Group();
  tiltGroup.add(spinGroup);

  const loader=new THREE.TextureLoader();
  const moonMap=loader.load('assets/moon-surface-equirect.jpg');
  moonMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
  moonMap.encoding=THREE.sRGBEncoding;
  moonMap.wrapS=THREE.RepeatWrapping;

  const geometry=new THREE.SphereGeometry(88,96,96);
  const material=new THREE.MeshStandardMaterial({
    map:moonMap,
    bumpMap:moonMap,
    bumpScale:.16,
    roughness:1,
    metalness:0,
    color:0xf1f2f4
  });
  const moon=new THREE.Mesh(geometry,material);
  spinGroup.add(moon);

  scene.add(new THREE.AmbientLight(0xc9d4e8,.38));
  scene.add(new THREE.HemisphereLight(0xd8e4ff,0x313947,.38));
  const key=new THREE.DirectionalLight(0xffffff,1.75);
  key.position.set(-160,80,170);
  scene.add(key);
  const rim=new THREE.DirectionalLight(0x7aa5ff,.42);
  rim.position.set(130,-30,-80);
  scene.add(rim);

  const starCount=520;
  const starGeometry=new THREE.BufferGeometry();
  const positions=new Float32Array(starCount*3);
  for(let i=0;i<starCount;i++){
    const radius=500+Math.random()*800;
    const theta=Math.random()*Math.PI*2;
    const phi=Math.acos(Math.random()*2-1);
    positions[i*3]=radius*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1]=radius*Math.sin(phi)*Math.sin(theta);
    positions[i*3+2]=radius*Math.cos(phi);
  }
  starGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({size:1.1,color:0xffffff,transparent:true,opacity:.62})));

  function getResponsiveZoom(){
    const portraitRatio=innerHeight/Math.max(innerWidth,1);
    if(innerWidth<=760||portraitRatio>1.2){
      const fitted=88*innerHeight/(Math.max(280,innerWidth*.86)*Math.tan(camera.fov*Math.PI/360));
      return Math.max(340,Math.min(680,fitted));
    }
    return 260;
  }

  let dragging=false;
  let previous={x:0,y:0};
  let velocity={x:0,y:.0016};
  let baseZoom=getResponsiveZoom();
  let zoom=baseZoom;
  let targetZoom=baseZoom;

  container.addEventListener('pointerdown',function(e){
    if(welcome.classList.contains('hide'))return;
    dragging=true;
    previous={x:e.clientX,y:e.clientY};
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove',function(e){
    if(!dragging||welcome.classList.contains('hide'))return;
    const dx=e.clientX-previous.x;
    const dy=e.clientY-previous.y;
    spinGroup.rotation.y+=dx*.0045;
    spinGroup.rotation.x=Math.max(-1.25,Math.min(1.25,spinGroup.rotation.x+dy*.0045));
    velocity.y=dx*.0008;
    velocity.x=dy*.0008;
    previous={x:e.clientX,y:e.clientY};
  });
  function release(e){dragging=false;if(e&&container.hasPointerCapture(e.pointerId))container.releasePointerCapture(e.pointerId)}
  container.addEventListener('pointerup',release);
  container.addEventListener('pointercancel',release);
  container.addEventListener('wheel',function(e){
    if(welcome.classList.contains('hide'))return;
    e.preventDefault();
    targetZoom=Math.max(baseZoom*.72,Math.min(baseZoom*1.75,targetZoom+e.deltaY*.22));
  },{passive:false});

  const clock=new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const elapsed=clock.getElapsedTime();
    if(!dragging){
      spinGroup.rotation.y+=.0016+velocity.y;
      spinGroup.rotation.x=Math.max(-1.25,Math.min(1.25,spinGroup.rotation.x+velocity.x));
      velocity.x*=.92;
      velocity.y*=.92;
    }
    scene.rotation.y=Math.sin(elapsed*.08)*.008;
    zoom+=(targetZoom-zoom)*.08;
    camera.position.z=zoom;
    const diameter=88*renderer.domElement.clientHeight/(camera.position.z*Math.tan(camera.fov*Math.PI/360));
    detailOverlay.style.width=diameter+'px';
    detailOverlay.style.height=diameter+'px';
    const texX=50+Math.sin(spinGroup.rotation.y)*22;
    const texY=50+Math.sin(spinGroup.rotation.x)*13;
    detailOverlay.style.backgroundPosition='center,'+texX+'% '+texY+'%';
    detailOverlay.style.transform='translate(-50%,-50%) rotate('+((6.68+spinGroup.rotation.x*2.4))+'deg)';
    renderer.render(scene,camera);
  }
  animate();

  addEventListener('resize',function(){
    const nextBaseZoom=getResponsiveZoom();
    const zoomRatio=nextBaseZoom/baseZoom;
    zoom*=zoomRatio;
    targetZoom*=zoomRatio;
    baseZoom=nextBaseZoom;
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
})();
