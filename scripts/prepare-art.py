from pathlib import Path
import argparse, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import cv2
parser=argparse.ArgumentParser(description="Slice the eight approved Sweetie PNG sheets without modifying the originals.")
parser.add_argument("originals", type=Path, help="folder containing storefront, interior, workshop, gallery, mia, expressions, poses and ui PNGs")
originals=parser.parse_args().originals
root=Path('public/assets')
ims={n:Image.open(originals/(n+'.png')) for n in ['storefront','interior','workshop','gallery','mia','expressions','poses','ui']}
def save(im,rel,quality=89):
 p=root/(rel+'.webp');p.parent.mkdir(parents=True,exist_ok=True);im.save(p,quality=quality,method=6)
def clean(img):
 rg=np.array(img.convert('RGBA')); a=rg[:,:,3]; count,labels,stats,_=cv2.connectedComponentsWithStats((a>44).astype('uint8'))
 if count>1:
  region=(labels==(1+np.argmax(stats[1:,4]))).astype('uint8');near=cv2.dilate(region,np.ones((5,5),np.uint8));a[:]=np.where(near,np.clip((a.astype(float)-12)*255/238,0,255),0)
 return Image.fromarray(rg)
for n in ['interior','workshop','gallery']:save(ims[n],'scenes/'+('cake-gallery' if n=='gallery' else n))
for kind,cols,rows,nameset in [('expressions',4,2,['smile','welcome','listen','think','surprise','happy','shy','serene']),('poses',3,2,['stand','wave','point','read','present','clap'])]:
 im=ims[kind];w,h=im.size
 sprites=[]
 for i,name in enumerate(nameset):
  x=i%cols;y=i//cols
  tile=clean(im.crop((round(w*x/cols),round(h*y/rows),round(w*(x+1)/cols),round(h*(y+1)/rows))))
  tile=tile.crop(tile.getbbox());sprites.append(tile)
 th=500 if kind=='poses' else 410;tw=345 if kind=='poses' else 440
 for name,tile in zip(nameset,sprites):
  tile=tile.resize((round(tile.width*th/tile.height),th),Image.Resampling.LANCZOS)
  out=Image.new('RGBA',(tw,th+6));out.alpha_composite(tile,((tw-tile.width)//2,3));save(out,'characters/mia/'+kind+'/'+name,93)
im=clean(ims['mia']);im=im.crop(im.getbbox());im.thumbnail((530,1150));save(im,'characters/mia/portraits/mia',94)
ui=ims['ui']
for n,box in {'dialog':(200,4,1764,329),'nameplate':(293,12,675,106),'option':(211,358,920,510),'bell':(45,32,194,582),'bow':(931,329,1353,608),'album':(1360,351,1739,577),'heart':(65,638,185,756),'corner':(892,570,1223,857),'music':(1315,617,1512,813),'sound':(1530,617,1722,813)}.items():
 tile=clean(ui.crop(box));save(tile,'ui/'+n,94)
# Delimit objects in the original perspective, retaining their own illumination.
im=ims['storefront'];w,h=im.size
objects={
 'door':[(1250,345),(1427,327),(1429,772),(1254,783)],
 'chime':[(1412,294),(1425,315),(1447,330),(1447,337),(1441,343),(1437,410),(1430,422),(1423,426),(1419,485),(1412,492),(1404,485),(1411,473),(1411,433),(1392,432),(1392,339),(1382,335),(1383,327),(1398,315)],
 'cat':[(1393,685),(1397,667),(1413,679),(1425,674),(1444,668),(1449,675),(1453,702),(1451,717),(1467,747),(1480,777),(1492,803),(1495,822),(1483,831),(1457,836),(1432,837),(1422,830),(1401,828),(1392,824),(1397,811),(1397,759),(1390,735),(1392,718),(1385,710),(1387,695)],
 'flowers':[(543,443),(568,432),(607,429),(624,447),(657,442),(677,463),(684,488),(672,513),(653,522),(630,548),(595,555),(578,541),(546,537),(524,516),(508,490),(515,461)],
 'ivy':[(1494,0),(1618,0),(1636,41),(1621,84),(1609,105),(1592,150),(1575,172),(1555,189),(1534,166),(1516,146),(1518,128),(1498,113),(1487,81),(1489,51)]}
scene=np.array(im);total=np.zeros((h,w),np.uint8);layers={}
import json
for n,points in objects.items():
 mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon(points,fill=255);mask=mask.filter(ImageFilter.GaussianBlur(.65))
 tile=im.convert('RGBA');tile.putalpha(mask);bx=mask.getbbox();piece=tile.crop(bx)
 save(piece,'scenes/objects/'+n,93);layers[n]=[round(bx[0]/w*100,5),round(bx[1]/h*100,5),round((bx[2]-bx[0])/w*100,5),round((bx[3]-bx[1])/h*100,5)]
 if n in ['chime','cat','flowers','ivy']:total=np.maximum(total,np.asarray(mask))
prepared=cv2.inpaint(scene,cv2.dilate(total,np.ones((3,3),np.uint8)),6,cv2.INPAINT_TELEA)
save(Image.fromarray(prepared),'scenes/storefront');Path('client/layers.json').write_text(json.dumps(layers))
for i,(x,y,ww,hh) in enumerate([(268,215,305,290),(558,218,298,290),(849,218,268,290),(1112,218,306,290)]):
 save(ims['gallery'].crop((x,y,x+ww,y+hh)),'recipes/'+str(i+1))
print(layers)

