"""Quick Blender sample stills: engineering objects on a studio sweep. usage: python samples.py OUTDIR NAME"""
import bpy, math, sys, os
from mathutils import Vector
OUT, NAME = sys.argv[1], sys.argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 24
sc.cycles.use_denoising = True; sc.render.resolution_x = 720; sc.render.resolution_y = 720
sc.view_settings.view_transform = "AgX"
try: sc.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
sc.view_settings.exposure = -0.75
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.86, 0.84, 0.8, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
C = sc.collection

def mat(name, col, metal=0.0, rough=0.5, noise=None, bump=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = col + (1,); p.inputs["Metallic"].default_value = metal; p.inputs["Roughness"].default_value = rough
    if noise:
        tc = nt.nodes.new("ShaderNodeTexCoord"); n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = noise; n.inputs["Detail"].default_value = 10
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        cr = nt.nodes.new("ShaderNodeValToRGB"); nt.links.new(n.outputs["Fac"], cr.inputs["Fac"])
        cr.color_ramp.elements[0].color = tuple(c * 0.75 for c in col) + (1,); cr.color_ramp.elements[1].color = tuple(min(1, c * 1.15) for c in col) + (1,)
        nt.links.new(cr.outputs["Color"], p.inputs["Base Color"])
        if bump:
            b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = bump; nt.links.new(n.outputs["Fac"], b.inputs["Height"]); nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m
STEEL = mat("steel", (0.30, 0.31, 0.33), 1.0, 0.38, noise=40)
REBAR = mat("rebar", (0.23, 0.16, 0.11), 0.85, 0.62, noise=25, bump=0.4)
CONC = mat("concrete", (0.38, 0.37, 0.35), 0.0, 0.85, noise=30, bump=0.35)
CUT = mat("cut", (0.33, 0.32, 0.30), 0.0, 0.9, noise=60, bump=0.2)
ORANGE = mat("orange", (0.85, 0.25, 0.04), 0.0, 0.35)
YELLOW = mat("yellow", (0.95, 0.62, 0.05), 0.0, 0.4)
ALU = mat("alu", (0.75, 0.76, 0.78), 1.0, 0.25)
GLASS = bpy.data.materials.new("vial"); GLASS.use_nodes = True
gp = GLASS.node_tree.nodes["Principled BSDF"]; gp.inputs["Base Color"].default_value = (0.6, 0.95, 0.3, 1); gp.inputs["Transmission Weight"].default_value = 0.9; gp.inputs["Roughness"].default_value = 0.05
SWEEP = mat("sweep", (0.80, 0.78, 0.74), 0.0, 0.9)

def add(o, m, smooth=True):
    o.data.materials.append(m)
    if smooth:
        for f in o.data.polygons: f.use_smooth = True
    return o
def cyl(r, d, loc, rot=(0, 0, 0), m=STEEL, v=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, vertices=v, location=loc, rotation=rot); return add(bpy.context.object, m)
def box(s, loc, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = s
    if bevel: b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 3
    return add(o, m, smooth=False)
def bar(p0, p1, r, m=REBAR, ribs=True):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    o = cyl(r, d.length, (p0 + p1) / 2, m=m, v=16)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    if ribs:  # deformed-bar ribs as rings along the bar
        n = int(d.length / (r * 1.4))
        for i in range(1, n):
            q = p0 + d * (i / n)
            bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=r * 0.16, major_segments=16, minor_segments=6, location=q)
            t = bpy.context.object; t.rotation_euler = o.rotation_euler; add(t, m)
    return o

# studio sweep
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); add(bpy.context.object, SWEEP, False)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 14, 10), rotation=(math.radians(90), 0, 0)); add(bpy.context.object, SWEEP, False)
def area(loc, e, s, col):
    ld = bpy.data.lights.new("l", "AREA"); ld.energy = e; ld.size = s; ld.color = col
    o = bpy.data.objects.new("l", ld); C.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
area((-5, -5, 7), 1600, 5, (1, 0.93, 0.85)); area((6, 3, 4), 900, 5, (0.85, 0.9, 1)); area((3, -7, 2), 260, 7, (1, 1, 1))
camd = bpy.data.cameras.new("c"); camd.lens = 70; cam = bpy.data.objects.new("c", camd); C.objects.link(cam); sc.camera = cam
def look(pos, tgt):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()

if NAME == "ibeam":  # W-section, flange 1.0 wide, depth 1.6, with a cope cut feel
    L = 4.0; d, bf, tf, tw = 1.6, 1.0, 0.12, 0.075
    box((bf, L, tf), (0, 0, tf / 2), STEEL, 0.01); box((bf, L, tf), (0, 0, d - tf / 2), STEEL, 0.01); box((tw, L, d - 2 * tf), (0, 0, d / 2), STEEL)
    look((4.4, -6.6, 3.0), (0, 0.3, 0.75))
elif NAME == "cage":  # column cage: 4 corner bars + ties
    h, a = 3.2, 0.42
    for x in (-a, a):
        for y in (-a, a): bar((x, y, 0.05), (x, y, h), 0.055)
    for k in range(9):
        z = 0.25 + k * 0.36; e = a + 0.06
        e = a + 0.085
        for (p, q) in [((-e, -e, z), (e, -e, z)), ((e, -e, z), (e, e, z)), ((e, e, z), (-e, e, z)), ((-e, e, z), (-e, -e, z))]:
            bar(p, q, 0.028, ribs=False)
        bar((-e, -e, z), (-e + 0.22, -e + 0.22, z - 0.02), 0.028, ribs=False)  # 135 deg hook tail
    box((1.6, 1.6, 0.04), (0, 0, 0.02), CONC)
    look((4.6, -5.8, 3.2), (0, 0, 1.5))
elif NAME == "cylinder":  # 6x12 in test cylinder + split mold
    cyl(0.5, 2.0, (0, 0, 1.0), m=CONC, v=96)
    o = cyl(0.53, 2.0, (1.45, 0.3, 1.0), m=ORANGE, v=96)
    sol = o.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.03
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
    for f in o.data.polygons:
        if abs(f.normal.z) > 0.9 and f.center.z > 0.5: f.select = True
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.delete(type="FACE"); bpy.ops.object.mode_set(mode="OBJECT")
    cyl(0.62, 0.05, (-1.3, -0.2, 0.025), m=STEEL, v=64)
    look((2.2, -7.4, 2.4), (0.05, 0, 0.9))
elif NAME == "footing":  # spread footing cutaway with a bottom mat + column dowels
    box((3.0, 3.0, 0.8), (0, 0, 0.4), CONC); box((1.5, 1.5, 0.8), (0.75, -0.75, 0.42), CUT)
    s = sc.objects[-1]; s.hide_render = True
    # cut: carve a quarter out with boolean
    cutter = box((1.52, 1.52, 1.0), (0.76, -0.76, 0.5), CUT); cutter.hide_render = True
    f = [o for o in sc.objects if o.type == "MESH" and abs(o.location.z - 0.4) < 1e-3][0]
    bo = f.modifiers.new("b", "BOOLEAN"); bo.object = cutter; bo.operation = "DIFFERENCE"
    for i in range(9):
        t = -1.3 + i * 0.325
        bar((-1.35, t, 0.2), (1.35, t, 0.2), 0.04); bar((t, -1.35, 0.28), (t, 1.35, 0.28), 0.04)
    box((0.7, 0.7, 1.4), (0, 0, 1.5), CONC)
    for x in (-0.25, 0.25):
        for y in (-0.25, 0.25): bar((x, y, 0.3), (x, y, 2.6), 0.04)
    look((5.5, -6.5, 4.6), (0, 0, 0.8))
elif NAME == "level":  # spirit level + tape measure
    box((3.2, 0.32, 0.5), (0, 0, 0.25), YELLOW, 0.02)
    v = cyl(0.07, 0.42, (0, -0.17, 0.3), (0, math.radians(90), 0), GLASS, 24)
    box((0.6, 0.34, 0.22), (0, 0, 0.25), ALU)
    box((0.8, 0.34, 0.8), (1.2, -1.2, 0.4), ORANGE, 0.12)
    box((1.8, 0.1, 0.006), (-0.1, -1.2, 0.15), YELLOW)
    look((3.2, -6.2, 2.6), (0.3, -0.5, 0.35))

sc.render.filepath = os.path.join(OUT, NAME + ".png"); bpy.ops.render.render(write_still=True)
