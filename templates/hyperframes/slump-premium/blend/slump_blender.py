"""Slump test plate render in Blender 5.3 (bpy), Cycles CPU.

Reads per-frame state exported from the HyperFrames stage (states.json, three.js space,
1 unit = 4 in, Y up) and renders the 3D plate with a transparent film. The drafting
overlay, type and captions stay in HyperFrames and are drawn on top.

usage: python slump_blender.py STATES OUTDIR START END [STEP] [--samples N] [--tex DIR] [--scale S]
"""
import bpy, bmesh, math, json, sys, os
from mathutils import Vector, Euler

args = [a for a in sys.argv[1:]]
opts = {}
for k in ("--samples", "--tex", "--scale"):
    if k in args:
        i = args.index(k); opts[k] = args[i + 1]; del args[i:i + 2]
STATES, OUT, START, END = args[0], args[1], int(args[2]), int(args[3])
STEP = int(args[4]) if len(args) > 4 else 1
SAMPLES = int(opts.get("--samples", 64))
TEX = opts.get("--tex")
SCALE = float(opts.get("--scale", 1.0))
ST = json.load(open(STATES))

U = 0.25; RB, RT, HC = 4 * U, 2 * U, 12 * U
HS = HC - 4 * U
L1, L2 = 2.606 * U, 6.074 * U
W, H = 1080, 1920

def M(x, y, z):  # three.js -> Blender
    return Vector((x, -z, y))

def lerp(a, b, k): return a + (b - a) * k

# ---------------- scene ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
except Exception:
    pass
sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 4; sc.cycles.diffuse_bounces = 3
sc.cycles.sample_clamp_indirect = 6
sc.render.use_persistent_data = True
sc.render.resolution_x = int(W * SCALE); sc.render.resolution_y = int(H * SCALE)
sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "AgX"
try: sc.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
sc.view_settings.exposure = -0.35

world = bpy.data.worlds.new("World"); sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.86, 0.84, 0.80, 1); bg.inputs[1].default_value = 0.35

def node(nt, t, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items():
        if k in n.inputs: n.inputs[k].default_value = v
        else: setattr(n, k, v)
    return n

def principled(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]

def image_tex(nt, path, colorspace="sRGB"):
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(path)
    n.image.colorspace_settings.name = colorspace; return n

# galvanised steel: metallic, spangle cells in roughness and tone
m_galv, nt, p = principled("galvanised")
tc = node(nt, "ShaderNodeTexCoord")
vor = node(nt, "ShaderNodeTexVoronoi", Scale=26.0); nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
ramp = node(nt, "ShaderNodeValToRGB"); nt.links.new(vor.outputs["Color"], ramp.inputs["Fac"])
ramp.color_ramp.elements[0].color = (0.52, 0.54, 0.57, 1); ramp.color_ramp.elements[1].color = (0.66, 0.68, 0.70, 1)
nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
rr_ = node(nt, "ShaderNodeMapRange", **{"From Min": 0.0, "From Max": 1.0, "To Min": 0.22, "To Max": 0.36})
sep = node(nt, "ShaderNodeSeparateColor"); nt.links.new(vor.outputs["Color"], sep.inputs[0]); nt.links.new(sep.outputs[0], rr_.inputs["Value"])
nt.links.new(rr_.outputs["Result"], p.inputs["Roughness"])
p.inputs["Metallic"].default_value = 1.0
if TEX and os.path.exists(os.path.join(TEX, "galvanized.jpg")):
    im = image_tex(nt, os.path.join(TEX, "galvanized.jpg"), "Non-Color")
    nt.links.new(tc.outputs["UV"], im.inputs["Vector"])
    bump = node(nt, "ShaderNodeBump", Strength=0.08); nt.links.new(im.outputs["Color"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])

# fresh concrete: grey paste, coarse aggregate, wet sheen
def concrete_mat(name, cut=False):
    m, nt, p = principled(name)
    tc = node(nt, "ShaderNodeTexCoord")
    noi = node(nt, "ShaderNodeTexNoise", Scale=6.0, Detail=8.0, Roughness=0.6); nt.links.new(tc.outputs["Object"], noi.inputs["Vector"])
    vor = node(nt, "ShaderNodeTexVoronoi", Scale=22.0 if cut else 34.0, Randomness=1.0); nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    # stones where the voronoi distance is small
    st = node(nt, "ShaderNodeMapRange", **{"From Min": 0.18 if cut else 0.12, "From Max": 0.30 if cut else 0.2, "To Min": 1.0, "To Max": 0.0})
    nt.links.new(vor.outputs["Distance"], st.inputs["Value"])
    paste = node(nt, "ShaderNodeValToRGB"); nt.links.new(noi.outputs["Fac"], paste.inputs["Fac"])
    paste.color_ramp.elements[0].color = (0.10, 0.098, 0.092, 1) if not cut else (0.22, 0.21, 0.195, 1)
    paste.color_ramp.elements[1].color = (0.19, 0.185, 0.175, 1) if not cut else (0.32, 0.31, 0.29, 1)
    stone = node(nt, "ShaderNodeValToRGB"); nt.links.new(vor.outputs["Color"], stone.inputs["Fac"])
    stone.color_ramp.elements[0].color = (0.30, 0.26, 0.21, 1); stone.color_ramp.elements[1].color = (0.50, 0.46, 0.40, 1)
    mix = node(nt, "ShaderNodeMix", data_type="RGBA"); nt.links.new(st.outputs["Result"], mix.inputs["Factor"])
    nt.links.new(paste.outputs["Color"], mix.inputs[6]); nt.links.new(stone.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.78 if cut else 0.42
    p.inputs["Specular IOR Level"].default_value = 0.5
    bump = node(nt, "ShaderNodeBump", Strength=0.55 if not cut else 0.15, Distance=0.02)
    add = node(nt, "ShaderNodeMath", operation="ADD"); nt.links.new(noi.outputs["Fac"], add.inputs[0]); nt.links.new(st.outputs["Result"], add.inputs[1])
    nt.links.new(add.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m
m_conc = concrete_mat("fresh_concrete")
m_cut = concrete_mat("concrete_cut", cut=True)

m_line, nt, p = principled("joint"); p.inputs["Base Color"].default_value = (0.08, 0.08, 0.075, 1); p.inputs["Roughness"].default_value = 0.9

m_rod, nt, p = principled("rod"); p.inputs["Base Color"].default_value = (0.62, 0.64, 0.67, 1); p.inputs["Metallic"].default_value = 1; p.inputs["Roughness"].default_value = 0.3

# brushed steel base plate
m_plate, nt, p = principled("plate")
tc = node(nt, "ShaderNodeTexCoord"); mp = node(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.0, 60.0, 1.0)
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
noi = node(nt, "ShaderNodeTexNoise", Scale=8.0, Detail=6.0); nt.links.new(mp.outputs["Vector"], noi.inputs["Vector"])
r2 = node(nt, "ShaderNodeMapRange", **{"To Min": 0.22, "To Max": 0.42}); nt.links.new(noi.outputs["Fac"], r2.inputs["Value"])
nt.links.new(r2.outputs["Result"], p.inputs["Roughness"])
p.inputs["Base Color"].default_value = (0.58, 0.60, 0.62, 1); p.inputs["Metallic"].default_value = 1.0
wet_val = node(nt, "ShaderNodeValue"); wet_val.name = "WET"; wet_val.outputs[0].default_value = 0.0
# a damp disc: lower roughness + darker inside r < 1.7
geo = node(nt, "ShaderNodeNewGeometry"); vl = node(nt, "ShaderNodeVectorMath", operation="LENGTH")
sxy = node(nt, "ShaderNodeVectorMath", operation="MULTIPLY"); sxy.inputs[1].default_value = (1, 1, 0)
nt.links.new(geo.outputs["Position"], sxy.inputs[0]); nt.links.new(sxy.outputs[0], vl.inputs[0])
inside = node(nt, "ShaderNodeMapRange", **{"From Min": 1.75, "From Max": 1.6, "To Min": 0.0, "To Max": 1.0}); nt.links.new(vl.outputs["Value"], inside.inputs["Value"])
wk = node(nt, "ShaderNodeMath", operation="MULTIPLY"); nt.links.new(inside.outputs["Result"], wk.inputs[0]); nt.links.new(wet_val.outputs[0], wk.inputs[1])
rmix = node(nt, "ShaderNodeMix", data_type="FLOAT"); nt.links.new(wk.outputs[0], rmix.inputs["Factor"]); nt.links.new(r2.outputs["Result"], rmix.inputs[2]); rmix.inputs[3].default_value = 0.08
nt.links.new(rmix.outputs[0], p.inputs["Roughness"])
cmix = node(nt, "ShaderNodeMix", data_type="RGBA"); nt.links.new(wk.outputs[0], cmix.inputs["Factor"])
cmix.inputs[6].default_value = (0.58, 0.60, 0.62, 1); cmix.inputs[7].default_value = (0.36, 0.37, 0.39, 1)
nt.links.new(cmix.outputs[2], p.inputs["Base Color"])
WET_NODE = wet_val

# slab: light broom-finished concrete that fades to transparent with distance (the HF ground shows through)
m_slab = bpy.data.materials.new("slab"); m_slab.use_nodes = True; nt = m_slab.node_tree
p = nt.nodes["Principled BSDF"]; out = nt.nodes["Material Output"]
tc = node(nt, "ShaderNodeTexCoord")
if TEX and os.path.exists(os.path.join(TEX, "concrete.jpg")):
    mp = node(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.12, 0.12, 0.12)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    im = image_tex(nt, os.path.join(TEX, "concrete.jpg")); nt.links.new(mp.outputs["Vector"], im.inputs["Vector"])
    hsv = node(nt, "ShaderNodeHueSaturation", Saturation=0.35, Value=1.35); nt.links.new(im.outputs["Color"], hsv.inputs["Color"])
    nt.links.new(hsv.outputs["Color"], p.inputs["Base Color"])
    bump = node(nt, "ShaderNodeBump", Strength=0.25); nt.links.new(im.outputs["Color"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
else:
    mp = node(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = (2.0, 40.0, 2.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    noi = node(nt, "ShaderNodeTexNoise", Scale=3.0, Detail=10.0); nt.links.new(mp.outputs["Vector"], noi.inputs["Vector"])
    cr = node(nt, "ShaderNodeValToRGB"); nt.links.new(noi.outputs["Fac"], cr.inputs["Fac"])
    cr.color_ramp.elements[0].color = (0.62, 0.60, 0.56, 1); cr.color_ramp.elements[1].color = (0.78, 0.76, 0.72, 1)
    nt.links.new(cr.outputs["Color"], p.inputs["Base Color"])
    bump = node(nt, "ShaderNodeBump", Strength=0.2); nt.links.new(noi.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
p.inputs["Roughness"].default_value = 0.92
cam_d = node(nt, "ShaderNodeCameraData")
fade = node(nt, "ShaderNodeMapRange", **{"From Min": 26.0, "From Max": 60.0, "To Min": 0.0, "To Max": 1.0})
nt.links.new(cam_d.outputs["View Distance"], fade.inputs["Value"])
tr = node(nt, "ShaderNodeBsdfTransparent"); ms = node(nt, "ShaderNodeMixShader")
nt.links.new(fade.outputs["Result"], ms.inputs[0]); nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
nt.links.new(ms.outputs[0], out.inputs["Surface"])

coll = sc.collection
def obj_from(name, verts, faces, mat, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    if smooth:
        for f in me.polygons: f.use_smooth = True
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); coll.objects.link(o); return o

def set_mesh(o, verts, faces, smooth=True):
    old = o.data
    me = bpy.data.meshes.new(o.name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    if smooth:
        for f in me.polygons: f.use_smooth = True
    for m in old.materials: me.materials.append(m)
    o.data = me; bpy.data.meshes.remove(old)

# slab + plate
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.06)); slab = bpy.context.object; slab.data.materials.append(m_slab)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.03)); plate = bpy.context.object; plate.scale = (18 * U, 18 * U, 0.06)
plate.data.materials.append(m_plate)
bev = plate.modifiers.new("bev", "BEVEL"); bev.width = 0.012; bev.segments = 2

# ---- cone (group under an empty so the state's transform applies) ----
cone = bpy.data.objects.new("cone", None); coll.objects.link(cone)
def lathe(profile, open_, segs=128):
    w = open_ * math.pi / 2; phi0, phiL = w, 2 * math.pi - 2 * w
    closed = open_ <= 1e-4
    n = segs if closed else segs + 1
    verts, faces = [], []
    for (r, y) in profile:
        for i in range(n):
            a = phi0 + phiL * i / segs
            verts.append(M(r * math.sin(a), y, r * math.cos(a)))
    for j in range(len(profile) - 1):
        for i in range(segs):
            a = j * n + i; b = j * n + (i + 1) % n; c = (j + 1) * n + (i + 1) % n; d = (j + 1) * n + i
            if not closed and i == segs: continue
            faces.append((a, b, c, d))
    return verts, faces
shell = obj_from("cone_shell", *lathe([(RB, 0), (lerp(RB, RT, 0.5), HC / 2), (RT, HC)], 0), m_galv)
shell.parent = cone
sol = shell.modifiers.new("sol", "SOLIDIFY"); sol.thickness = 0.016; sol.offset = 1.0; sol.use_even_offset = True
def torus(name, R, r, y, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=96, minor_segments=12, location=M(0, y, 0))
    o = bpy.context.object; o.data.materials.append(mat); bpy.ops.object.shade_smooth(); o.parent = cone; return o
RIMS = [torus("rim_top", RT + 0.008, 0.028, HC, m_galv), torus("rim_bot", RB + 0.008, 0.032, 0.032, m_galv)]
for s in (-1, 1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=M(s * (RB + 0.28), 0.025, 0)); f = bpy.context.object
    f.scale = (0.62, 0.42, 0.05); f.data.materials.append(m_galv); f.parent = cone
    b = f.modifiers.new("b", "BEVEL"); b.width = 0.01
    # handle: half loop out from the wall at 2/3 height
    yh = HC * 0.66; rh = lerp(RB, RT, 0.66)
    cu = bpy.data.curves.new("handle", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.032; cu.bevel_resolution = 4
    sp = cu.splines.new("POLY"); pts = []
    for k in range(17):
        a = math.pi * k / 16
        pts.append(M(s * (rh - 0.02 + 0.22 * math.sin(a)), yh - 0.2 * math.cos(a), 0))
    sp.points.add(len(pts) - 1)
    for q, v in zip(sp.points, pts): q.co = (v.x, v.y, v.z, 1)
    ho = bpy.data.objects.new("handle", cu); coll.objects.link(ho); ho.parent = cone; cu.materials.append(m_galv)

# ---- concrete ----
import random
def _h(i):
    s = math.sin(i * 127.1 + 311.7) * 43758.5453; return s - math.floor(s)
def vnoise(x, y):
    xi, yi = math.floor(x), math.floor(y); xf, yf = x - xi, y - yi
    hh = lambda a, b: _h(a * 57 + b * 131)
    u = xf * xf * (3 - 2 * xf); v = yf * yf * (3 - 2 * yf)
    return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), u), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), u), v)
def fbm(x, y, o=3):
    a = 0; f = 1; s = 0.5; n = 0
    for _ in range(o): a += s * vnoise(x * f, y * f); n += s; f *= 2.03; s *= 0.5
    return a / n
def frR(y): return lerp(RB, RT, y / HC)
VOL = math.pi * HC / 3 * (RB * RB + RB * RT + RT * RT)
def slumpR(y, Rb): s = y / HS; return 0.58 + (Rb - 0.58) * (1 - s) ** 1.7 - 0.08 * s ** 6
def vol(fn, h, n=200): return sum(math.pi * fn((i + 0.5) / n * h) ** 2 * h / n for i in range(n))
lo, hi = 1.0, 3.0
for _ in range(40):
    m_ = (lo + hi) / 2
    if vol(lambda y: slumpR(y, m_), HS) < VOL: lo = m_
    else: hi = m_
RBS = (lo + hi) / 2

def concrete_geo(h, p, open_):
    NY, NP, CAP = 40, 160, 12
    w = open_ * math.pi / 2; phi0, phiL = w, 2 * math.pi - 2 * w
    closed = open_ <= 1e-4
    n = NP if closed else NP + 1
    Ht = lerp(h, HS, p)
    rows = []
    for j in range(NY + 1):
        s = j / NY; y = s * Ht; rows.append((lerp(frR(s * h), slumpR(s * HS, RBS), p), y, 0))
    r_top, y_top = rows[-1][0], rows[-1][1]
    for j in range(1, CAP + 1):
        k = j / CAP; rows.append((r_top * (1 - k), y_top + (p * 0.06) * math.sin(k * math.pi / 2) * (1 - k * 0.2), 1))
    verts, faces = [], []
    for j, (r, y, cap) in enumerate(rows):
        for i in range(n):
            a = phi0 + phiL * i / NP
            nz = (fbm(math.cos(a) * 1.6 + 10 + y * 1.3, math.sin(a) * 1.6 + y * 1.9) - 0.5) * (0.035 + 0.06 * p) if r > 0.05 else 0
            rr = max(0.0, r + nz)
            yy = y + ((fbm(rr * math.cos(a) * 3, rr * math.sin(a) * 3) - 0.5) * 0.05 if cap else 0)
            verts.append(M(rr * math.sin(a), yy, rr * math.cos(a)))
    for j in range(len(rows) - 1):
        for i in range(NP):
            if not closed and i == NP: continue
            a = j * n + i; b = j * n + (i + 1) % n; c = (j + 1) * n + (i + 1) % n; d = (j + 1) * n + i
            faces.append((a, d, c, b))
    if not closed:  # cap the cut with a flat polygon so the mesh is closed (section faces sit on it)
        pass
    return verts, faces
conc = obj_from("concrete", *concrete_geo(HC, 0, 0), m_conc)

section = []
def build_section(h):
    for o in section: bpy.data.objects.remove(o, do_unlink=True)
    section.clear()
    bands = [(0, min(h, L1)), (L1, min(h, L2)), (L2, min(h, HC))]
    for (y0, y1) in bands:
        if y1 <= y0 + 1e-3: continue
        v = [M(-frR(y0) + 0.004, y0, 0.0005), M(frR(y0) - 0.004, y0, 0.0005), M(frR(y1) - 0.004, y1, 0.0005), M(-frR(y1) + 0.004, y1, 0.0005)]
        section.append(obj_from("sec", v, [(0, 1, 2, 3)], m_cut, smooth=False))
        if y1 < h - 1e-3:
            t = 0.006
            v = [M(-frR(y1), y1 - t, 0.002), M(frR(y1), y1 - t, 0.002), M(frR(y1), y1 + t, 0.002), M(-frR(y1), y1 + t, 0.002)]
            section.append(obj_from("joint", v, [(0, 1, 2, 3)], m_line, smooth=False))

# ---- rod: 5/8 in x 24 in, hemispherical ends; origin at the bottom tip ----
rod = bpy.data.objects.new("rod", None); coll.objects.link(rod)
rr, rl = (5 / 16) * U, 24 * U
bpy.ops.mesh.primitive_cylinder_add(radius=rr, depth=rl, vertices=32, location=(0, 0, rl / 2 + rr)); rc = bpy.context.object
rc.data.materials.append(m_rod); bpy.ops.object.shade_smooth(); rc.parent = rod
for zc in (rr, rl + rr):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=rr, segments=32, ring_count=16, location=(0, 0, zc)); sp_ = bpy.context.object
    sp_.data.materials.append(m_rod); bpy.ops.object.shade_smooth(); sp_.parent = rod

# ---- lights ----
def area(name, loc, energy, size, color):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
    o = bpy.data.objects.new(name, ld); coll.objects.link(o); o.location = loc
    d = Vector((0, 0, 1.2)) - o.location; o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); return o
area("key", M(-6, 11, 7), 2600, 6.0, (1.0, 0.93, 0.84))
area("rim", M(5, 6, -8), 1600, 5.0, (0.85, 0.9, 1.0))
area("fill", M(8, 3, 10), 380, 8.0, (1.0, 0.98, 0.95))

# ---- camera ----
camd = bpy.data.cameras.new("cam"); camd.sensor_fit = "VERTICAL"; camd.lens_unit = "FOV"; camd.clip_end = 200
cam = bpy.data.objects.new("cam", camd); coll.objects.link(cam); sc.camera = cam
camd.shift_y = -50 / 1920

def apply(s):
    c = s["cam"]; pos = M(*c["pos"]); tg = M(*c["target"])
    cam.location = pos; cam.rotation_euler = (tg - pos).to_track_quat("-Z", "Y").to_euler()
    camd.angle_y = math.radians(c["fov"])
    WET_NODE.outputs[0].default_value = s["wetK"]
    openq = round(s["open"] * 40) / 40
    set_mesh(shell, *lathe([(RB, 0), (lerp(RB, RT, 0.5), HC / 2), (RT, HC)], openq))
    for o in RIMS: o.hide_render = s["open"] > 0.02
    cp = s["cone"]["pos"]; cone.location = M(*cp); cone.rotation_euler = (0, -s["cone"]["rotZ"], 0)
    if s["fill"] > 1e-3:
        conc.hide_render = False
        set_mesh(conc, *concrete_geo(s["fill"], s["p"], 1 if s["open"] > 0.98 else 0))
    else:
        conc.hide_render = True
    if s["open"] > 0.98 and s["fill"] > 1e-3: build_section(s["fill"])
    else: build_section(-1)
    r = s["rod"]; vis = r["visible"]
    for ch in rod.children: ch.hide_render = not vis
    rod.location = M(*r["pos"]); rod.rotation_euler = (0, -r["rotZ"], 0)

os.makedirs(OUT, exist_ok=True)
import time
for f in range(START, min(END, len(ST) - 1) + 1, STEP):
    path = os.path.join(OUT, f"f{f:04d}.png")
    if os.path.exists(path): continue
    t0 = time.time(); apply(ST[f]); sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"frame {f} {time.time() - t0:.1f}s", flush=True)
