"""Run with Blender in background mode to rebuild the workshop's ceramic bowl."""
from pathlib import Path
import bpy, math
from math import sin,cos,pi
bpy.ops.wm.read_factory_settings(use_empty=True)
def glaze(name,hexcolor,roughness):
 mat=bpy.data.materials.new(name)
 rgb=[int(hexcolor[i:i+2],16)/255 for i in (0,2,4)]
 mat.diffuse_color=(*rgb,1);mat.use_nodes=True
 surf=mat.node_tree.nodes.get("Principled BSDF");surf.inputs['Base Color'].default_value=(*rgb,1);surf.inputs['Roughness'].default_value=roughness
 if name=="gilt":surf.inputs['Metallic'].default_value=.72
 return mat
ivory=glaze('ivory porcelain','F4D7C0',.29);rose=glaze('rose rim','BC837E',.44);gold=glaze('gilt','AB7943',.31);cream=glaze('cream','EACCB2',.54)
def surface(name,profile,material,sculpt=None):
 verts=[];faces=[];n=112
 for j,(r,z) in enumerate(profile):
  for i in range(n):
   a=2*pi*i/n;rr,zz=sculpt(r,z,a,j) if sculpt else (r,z)
   verts.append((rr*cos(a),rr*sin(a),zz))
   if j:
    k=j*n+i;q=j*n+(i+1)%n;faces.append((k-n,q-n,q,k))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
 for f in mesh.polygons:f.use_smooth=True
 return obj
profile=[(.01,0),(.41,0),(.45,.024),(.46,.071),(.432,.103),(.49,.131),(.64,.17),(.76,.25),(.86,.36),(.91,.47),(.92,.52),(.907,.543),(.88,.546),(.867,.532),(.855,.47),(.808,.359),(.72,.279),(.58,.211),(.42,.18),(.02,.18)]
surface('scalloped porcelain',profile,ivory,lambda r,z,a,j:(r+.013*cos(26*a)*sin(pi*min(1,z/.55))**2,z))
for z,r,m in [(.537,.905,rose),(.523,.922,gold),(.076,.458,rose)]:
 surface(m.name+' trim',[(r-.003,z-.004),(r+.003,z-.004),(r+.005,z),(r+.002,z+.004),(r-.003,z+.004)],m)
surface('whipped cream',[(.862*(1-j/43),.47) for j in range(44)],cream,lambda r,z,a,j:(max(.001,r),z+.085*(1-r/.862)+.037*sin(r*22-a*2)*sin(min(pi/2,r*5))*(.4+.6*r/.862)))
target=Path(__file__).resolve().parent.parent/'public/assets/models/tools/mixing-bowl.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True)

