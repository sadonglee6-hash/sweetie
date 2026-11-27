import * as T from 'three';

// Cut the actual placed fruit, including the disconnected components of a fan,
// cluster or diced portion. Dimensions in this plane are radial distance and Y.
export function fruitSection(parts, {x,z,rotation,scale,dx,dz,height,limit}){
  const ca=Math.cos(rotation),sa=Math.sin(rotation),nx=-dz,nz=dx;
  let lo=Infinity,hi=-Infinity;
  for(const {geometry:g} of parts){
    if(!g.boundingBox)g.computeBoundingBox();
    lo=Math.min(lo,g.boundingBox.min.y);hi=Math.max(hi,g.boundingBox.max.y);
  }
  const vertical=Math.min(scale,height*.89/Math.max(.001,hi-lo));
  const nodes=new Map(),edges=new Map();
  function pointKey(s,h){return Math.round(s*24000)+','+Math.round(h*24000);}
  function segment(a,b){
    const ka=pointKey(a[0],a[1]),kb=pointKey(b[0],b[1]);
    if(ka===kb)return;
    const key=ka<kb?ka+';'+kb:kb+';'+ka;
    if(edges.has(key))return;
    edges.set(key,[ka,kb]);
    if(!nodes.has(ka))nodes.set(ka,{p:a,adj:[]});
    if(!nodes.has(kb))nodes.set(kb,{p:b,adj:[]});
    nodes.get(ka).adj.push(key);nodes.get(kb).adj.push(key);
  }
  for(const {geometry:g} of parts){
    const p=g.attributes.position,index=g.index;
    const counts=index?index.count:p.count,dist=new Float32Array(p.count),along=new Float32Array(p.count),yy=new Float32Array(p.count);
    let near=Infinity,far=-Infinity;
    for(let i=0;i<p.count;i++){
      const lx=p.getX(i)*scale,lz=p.getZ(i)*scale;
      const wx=x+ca*lx+sa*lz,wz=z-sa*lx+ca*lz;
      const d=wx*nx+wz*nz+0.000016;
      dist[i]=d;along[i]=wx*dx+wz*dz;yy[i]=(p.getY(i)-lo)*vertical+height*.037;
      near=Math.min(near,d);far=Math.max(far,d);
    }
    if(near>0||far<0)continue;
    for(let i=0;i<counts;i+=3){
      const ids=index?[index.getX(i),index.getX(i+1),index.getX(i+2)]:[i,i+1,i+2],hits=[];
      for(let j=0;j<3;j++){
        const a=ids[j],b=ids[(j+1)%3];if((dist[a]<0)===(dist[b]<0))continue;
        const f=dist[a]/(dist[a]-dist[b]);
        hits.push([along[a]+(along[b]-along[a])*f,yy[a]+(yy[b]-yy[a])*f]);
      }
      if(hits.length===2)segment(hits[0],hits[1]);
    }
  }
  const loops=[],unused=new Set(edges.keys());
  while(unused.size){
    const key=unused.values().next().value,[start,first]=edges.get(key);
    let last=first;const contour=[nodes.get(start).p,nodes.get(last).p];unused.delete(key);
    while(last!==start){
      const next=nodes.get(last).adj.find(e=>unused.has(e));if(!next)break;
      unused.delete(next);const [a,b]=edges.get(next);last=a===last?b:a;
      if(last!==start)contour.push(nodes.get(last).p);
    }
    if(contour.length<3)continue;
    const [a,b]=[contour[0],contour.at(-1)];
    if(last!==start&&Math.hypot(a[0]-b[0],a[1]-b[1])>height*.11)continue;
    // The ends of the knife planes meet at the centre. Clip each section to its
    // own finite face so a centre-crossing berry cannot project into the void.
    let clipped=contour;
    for(const [bound,sign] of [[0,1],[limit,-1]]){
      const next=[];
      for(let j=0;j<clipped.length;j++){
        const u=clipped[j],v=clipped[(j+1)%clipped.length],inside=(u[0]-bound)*sign>=0,other=(v[0]-bound)*sign>=0;
        if(inside)next.push(u);
        if(inside!==other){const f=(bound-u[0])/(v[0]-u[0]);next.push([bound,u[1]+(v[1]-u[1])*f]);}
      }
      clipped=next;
    }
    if(clipped.length<3)continue;
    const path=clipped.map(([s,h])=>new T.Vector2(s,h));
    if(Math.abs(T.ShapeUtils.area(path))>.000017)loops.push(path);
  }
  return loops;
}
export function sectionGeometry(path,{dx,dz,nx,nz,y,surfaceOffset}){
  const min=new T.Vector2(Infinity,Infinity),max=new T.Vector2(-Infinity,-Infinity);
  for(const p of path){min.min(p);max.max(p);}
  const pos=[],uv=[],norm=[],idx=T.ShapeUtils.triangulateShape(path,[]).flat();
  for(const p of path){
    const x=dx*p.x,z=dz*p.x,py=y+p.y;
    pos.push(x+nx*.0020,py+(surfaceOffset?.(py,x,z)||0),z+nz*.0020);
    uv.push(.065+.87*(p.x-min.x)/Math.max(.001,max.x-min.x),.06+.88*(p.y-min.y)/Math.max(.001,max.y-min.y));
    norm.push(nx,0,nz);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);
  return geo;
}
