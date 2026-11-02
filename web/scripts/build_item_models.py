#!/usr/bin/env python3
"""
Bakes every item of the recipe table into the shape the game draws, from the published jars themselves.

Reads downloads/ (the mods, nested jars included) and the Minecraft client jar (for the vanilla parent models), follows
each item the way the client does (items/<id>.json, its model tree, the parent chain, the block's own model when the
item stands for a machine), and writes one small file per distinct shape: web/brand/models/<hash>.json, plus the
textures it needs (t/<hash>.png) and index.json (item id -> shape). Everything is baked to quads, so the page needs one
loader and no knowledge of Minecraft, GeckoLib or OBJ.

A quad is 20 integers: x y z of four corners in 1/64 of a model pixel, then u v of the four corners in 1/4096 of the
texture. Run it after a mod release; the output is committed, because the client jar is not in this repository.

    Update/venv-pillow-11.3.0/bin/python web/scripts/build_item_models.py
"""
import hashlib, io, json, math, os, re, shutil, struct, sys, zipfile
from collections import Counter
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
ROOT = WEB.parent
OUT = WEB / "brand" / "models"
CLIENT = Path.home() / ".gradle/caches/fabric-loom/26.3/minecraft-client.jar"

# The grey the mod multiplies into its warded blocks (ClientHandler.mixWithReinforcedTintIfEnabled, in its default state).
REINFORCED = "999999"
BLADES = {}

def warn(*a):
    print(*a, file=sys.stderr)

# ---------------------------------------------------------------------- files

class Files:
    def __init__(self):
        self.f = {}
    def add_zip(self, z):
        for n in z.namelist():
            if n.endswith(".jar"):
                self.add_zip(zipfile.ZipFile(io.BytesIO(z.read(n))))
            elif (n.startswith("assets/") or (n.startswith("data/") and n.endswith(".json"))) and not n.endswith("/"):
                self.f.setdefault(n, z)
    def read(self, n):
        z = self.f.get(n)
        return z.read(n) if z else None
    def json(self, n):
        b = self.read(n)
        return json.loads(b) if b is not None else None
    def has(self, n):
        return n in self.f

def split(ref, default="minecraft"):
    ns, _, path = ref.rpartition(":")
    return (ns or default), path

def tex_path(ref):
    ns, p = split(ref)
    if p.startswith("textures/"):
        return f"assets/{ns}/{p}"
    return f"assets/{ns}/textures/{p}.png"

# ---------------------------------------------------------------------- textures

class Shape:
    """Quads grouped by material, in model pixels."""
    def __init__(self, double=False):
        self.mats = {}
        self.double = double
    def add(self, tex, tint, verts, uvs):
        key = (tex, tint)
        self.mats.setdefault(key, []).append(([round(c * 64) for v in verts for c in v], [round(c * 4096) for uv in uvs for c in uv]))

# Textures with partly clear pixels: drawn blended, the rest cut out.
GLASS = set()

def load_texture(files, path, seen={}):
    """(hash file name, rgba image) of a texture's first frame, written to the output once."""
    if path in seen:
        return seen[path]
    raw = files.read(path)
    if raw is None:
        seen[path] = None
        return None
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    w, h = img.size
    meta = files.read(path + ".mcmeta")
    if meta is not None and h > w and h % w == 0:
        img = img.crop((0, 0, w, w))
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    name = hashlib.sha256(buf.getvalue()).hexdigest()[:16] + ".png"
    (OUT / "t" / name).write_bytes(buf.getvalue())
    if any(12 < a < 243 for a in img.getchannel("A").getdata()):
        GLASS.add(name)
    seen[path] = (name, img)
    return seen[path]

# ---------------------------------------------------------------------- JSON models

def merged(files, ref):
    """A model and its parents, as the client merges them."""
    textures, elements, chain = {}, None, []
    guard = 0
    while ref and guard < 16:
        guard += 1
        ns, p = split(ref)
        chain.append(f"{ns}:{p}")
        if p.startswith("builtin/"):
            break
        d = files.json(f"assets/{ns}/models/{p}.json")
        if d is None:
            return None
        for k, v in (d.get("textures") or {}).items():
            textures.setdefault(k, v)
        if elements is None and "elements" in d:
            elements = d["elements"]
        ref = d.get("parent")
    return {"textures": textures, "elements": elements, "chain": chain}

def resolve_tex(textures, ref):
    guard = 0
    if isinstance(ref, str) and not ref.startswith("#") and ref in textures:
        ref = "#" + ref
    while isinstance(ref, str) and ref.startswith("#") and guard < 12:
        ref = textures.get(ref[1:])
        guard += 1
    if isinstance(ref, dict):
        ref = ref.get("sprite")
    return ref

def rotate(p, axis, deg, origin, rescale):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    x, y, z = p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]
    if axis == "x":
        y, z = y * c - z * s, y * s + z * c
    elif axis == "y":
        x, z = x * c + z * s, -x * s + z * c
    else:
        x, y = x * c - y * s, x * s + y * c
    if rescale:
        k = 1 / max(abs(c), 1e-6)
        if axis != "x": x *= k
        if axis != "y": y *= k
        if axis != "z": z *= k
    return (x + origin[0], y + origin[1], z + origin[2])

def default_uv(face, a, b):
    x1, y1, z1 = a
    x2, y2, z2 = b
    return {
        "down": [x1, 16 - z2, x2, 16 - z1], "up": [x1, z1, x2, z2], "north": [16 - x2, 16 - y2, 16 - x1, 16 - y1],
        "south": [x1, 16 - y2, x2, 16 - y1], "west": [z1, 16 - y2, z2, 16 - y1], "east": [16 - z2, 16 - y2, 16 - z1, 16 - y1],
    }[face]

def corners(face, a, b):
    x1, y1, z1 = a
    x2, y2, z2 = b
    return {
        "north": [(x2, y2, z1), (x2, y1, z1), (x1, y1, z1), (x1, y2, z1)],
        "south": [(x1, y2, z2), (x1, y1, z2), (x2, y1, z2), (x2, y2, z2)],
        "west": [(x1, y2, z1), (x1, y1, z1), (x1, y1, z2), (x1, y2, z2)],
        "east": [(x2, y2, z2), (x2, y1, z2), (x2, y1, z1), (x2, y2, z1)],
        "up": [(x1, y2, z1), (x1, y2, z2), (x2, y2, z2), (x2, y2, z1)],
        "down": [(x1, y1, z2), (x1, y1, z1), (x2, y1, z1), (x2, y1, z2)],
    }[face]

def bake_elements(files, m, shape, tints, lift=0):
    for e in m["elements"]:
        a, b = tuple(e["from"]), tuple(e["to"])
        rot = e.get("rotation")
        for face, fd in (e.get("faces") or {}).items():
            ref = resolve_tex(m["textures"], fd.get("texture"))
            if not ref:
                continue
            t = load_texture(files, tex_path(ref))
            if not t:
                continue
            u1, v1, u2, v2 = [c / 16 for c in (fd.get("uv") or default_uv(face, a, b))]
            uvs = [(u1, v1), (u1, v2), (u2, v2), (u2, v1)]
            turn = (fd.get("rotation", 0) // 90) % 4
            uvs = uvs[turn:] + uvs[:turn]
            vs = corners(face, a, b)
            if rot:
                axis = rot.get("axis")
                if axis:
                    vs = [rotate(v, axis, rot.get("angle", 0), rot.get("origin", [8, 8, 8]), rot.get("rescale", False)) for v in vs]
                else:
                    for ax in "xyz":
                        if rot.get(ax):
                            vs = [rotate(v, ax, rot[ax], rot.get("origin", [8, 8, 8]), False) for v in vs]
            if lift:
                vs = [(v[0], v[1] + lift, v[2]) for v in vs]
            ti = fd.get("tintindex", fd.get("tint", -1))
            tint = tints[ti] if isinstance(ti, int) and 0 <= ti < len(tints) else None
            shape.add(t[0], tint, vs, uvs)

def bake_flat(files, m, shape, tints):
    """item/generated: the sprite as a plate one pixel thick, with an edge wherever a pixel meets air, as the client bakes it."""
    n = 0
    for i in range(8):
        ref = resolve_tex(m["textures"], m["textures"].get(f"layer{i}"))
        if not ref:
            continue
        t = load_texture(files, tex_path(ref))
        if not t:
            continue
        name, img = t
        tint = tints[i] if i < len(tints) else None
        w, h = img.size
        px = img.load()
        solid = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] > 12
        sx, sy = 16 / w, 16 / h
        z1, z2 = 7.5 - i * 0.002, 8.5 + i * 0.002
        shape.add(name, tint, [(0, 16, z2), (0, 0, z2), (16, 0, z2), (16, 16, z2)], [(0, 0), (0, 1), (1, 1), (1, 0)])
        shape.add(name, tint, [(16, 16, z1), (16, 0, z1), (0, 0, z1), (0, 16, z1)], [(1, 0), (1, 1), (0, 1), (0, 0)])
        for y in range(h):
            for x in range(w):
                if not solid(x, y):
                    continue
                X1, X2, Y2, Y1 = x * sx, (x + 1) * sx, 16 - y * sy, 16 - (y + 1) * sy
                uv = ((x + 0.5) / w, (y + 0.5) / h)
                uvs = [uv] * 4
                if not solid(x, y - 1):
                    shape.add(name, tint, [(X1, Y2, z1), (X1, Y2, z2), (X2, Y2, z2), (X2, Y2, z1)], uvs)
                if not solid(x, y + 1):
                    shape.add(name, tint, [(X1, Y1, z2), (X1, Y1, z1), (X2, Y1, z1), (X2, Y1, z2)], uvs)
                if not solid(x - 1, y):
                    shape.add(name, tint, [(X1, Y2, z1), (X1, Y1, z1), (X1, Y1, z2), (X1, Y2, z2)], uvs)
                if not solid(x + 1, y):
                    shape.add(name, tint, [(X2, Y2, z2), (X2, Y1, z2), (X2, Y1, z1), (X2, Y2, z1)], uvs)
        n += 1
    return n > 0

def is_flat(m):
    return any(c.endswith("builtin/generated") or c.endswith("item/generated") or c.endswith("item/handheld") for c in m["chain"])

# ---------------------------------------------------------------------- GeckoLib

# A gun's file holds the arms that carry it and the rounds it fires; the item is the gun.
# Parts that appear only with an attachment fitted are in it too: the table shows the gun as it comes.
HIDDEN_BONE = re.compile(
    r"^(left|right)(hand|arm)(_pos)?$|^(l|r)hand(_pos)?$|^arm|^bullet|^round|^constraint|^camera|^muzzle_?flash"
    r"|^mag_extended|^oem_stock|_tactical$|^bipod|^ar_stock_adapter|^attachment_adapter|^refit|^positioning|^view$|^ground$|^sight_illuminat",
    re.I,
)

def bake_geo(files, geo, texture, shape):
    t = load_texture(files, texture)
    if not t:
        return False
    name = t[0]
    root = geo["minecraft:geometry"][0]
    desc = root.get("description", {})
    tw, th = desc.get("texture_width", t[1].size[0]), desc.get("texture_height", t[1].size[1])
    bones = {b["name"]: b for b in root.get("bones", [])}

    def chain_of(b):
        out = []
        while b:
            out.append(b)
            b = bones.get(b.get("parent"))
        return out

    def rot_pivot(v, rot, pivot):
        # Game space: x is negated, and rotations about x and y with it. GeckoLib multiplies z, then y, then x onto the
        # pose, so a vertex meets them in the other order.
        o = (-pivot[0], pivot[1], pivot[2])
        if rot[0]: v = rotate(v, "x", -rot[0], o, False)
        if rot[1]: v = rotate(v, "y", -rot[1], o, False)
        if rot[2]: v = rotate(v, "z", rot[2], o, False)
        return v

    for bone in root.get("bones", []):
        ch = chain_of(bone)
        if bone.get("neverRender") or any(HIDDEN_BONE.search(b["name"]) for b in ch):
            continue
        for c in bone.get("cubes", []):
            o, s = c["origin"], c["size"]
            inf = c.get("inflate", 0) or 0
            a = (-(o[0] + s[0]) - inf, o[1] - inf, o[2] - inf)
            b = (-o[0] + inf, o[1] + s[1] + inf, o[2] + s[2] + inf)
            uv = c.get("uv", [0, 0])
            faces = {}
            if isinstance(uv, dict):
                for f, d in uv.items():
                    if "uv" in d:
                        faces[f] = (d["uv"][0], d["uv"][1], d.get("uv_size", [0, 0])[0], d.get("uv_size", [0, 0])[1])
            else:
                u, v = uv
                w, h, d = s
                faces = {"east": (u, v + d, d, h), "north": (u + d, v + d, w, h), "west": (u + d + w, v + d, d, h), "south": (u + 2 * d + w, v + d, w, h), "up": (u + d, v, w, d), "down": (u + d + w, v, w, d)}
                if c.get("mirror", bone.get("mirror")):
                    faces["east"], faces["west"] = faces["west"], faces["east"]
                    faces = {k: ((x + fw, y, -fw, fh)) for k, (x, y, fw, fh) in faces.items()}
            for f, (x, y, fw, fh) in faces.items():
                u1, v1, u2, v2 = x / tw, y / th, (x + fw) / tw, (y + fh) / th
                if f == "down":
                    v1, v2 = v2, v1
                vs = corners(f, a, b)
                if c.get("rotation"):
                    vs = [rot_pivot(p, c["rotation"], c.get("pivot", [0, 0, 0])) for p in vs]
                for bn in ch:
                    if bn.get("rotation"):
                        vs = [rot_pivot(p, bn["rotation"], bn.get("pivot", [0, 0, 0])) for p in vs]
                shape.add(name, None, vs, [(u1, v1), (u1, v2), (u2, v2), (u2, v1)])
    return bool(shape.mats)

def geo_of(files, ns, path):
    """The GeckoLib model of an item or its block, and its texture."""
    if path.startswith("wonder_") and files.has(f"assets/{ns}/oke/{path}.geo.json"):
        return f"assets/{ns}/oke/{path}.geo.json", f"assets/{ns}/textures/wonder/{path[7:]}/uv.png"
    # The rest of that folder: the wind turbines, and the train cars, whose items end in _car.
    oke = re.sub(r"_car$", "", path)
    if files.has(f"assets/{ns}/oke/{oke}.geo.json") and files.has(f"assets/{ns}/textures/oke/{oke}.png"):
        return f"assets/{ns}/oke/{oke}.geo.json", f"assets/{ns}/textures/oke/{oke}.png"
    for kind in ("block", "item", "entity"):
        g = f"assets/{ns}/geckolib/models/{kind}/{path}.geo.json"
        if files.has(g):
            for tk in (f"assets/{ns}/textures/{kind}/{path}.png", f"assets/{ns}/textures/geckolib/{kind}/{path}.png", f"assets/{ns}/geckolib/textures/{kind}/{path}.png"):
                if files.has(tk):
                    return g, tk
            return g, None
    return None, None

# ---------------------------------------------------------------------- OBJ

# A blade's file also holds its inventory badge (item_*) and its broken and effect meshes; the thing itself is these.
BLADE_PARTS = re.compile(r"^(blade|sheath|handle)$")

def bake_obj(files, path, textures, shape, flip_v=True, default=None, raw_tex=False, only=None):
    raw = files.read(path)
    if raw is None:
        return False
    vs, vts = [], []
    tex = default
    if only is not None:
        names = set(re.findall(r"^[og] (\S+)", raw.decode("utf8", "ignore"), re.M))
        only = {n for n in names if only.match(n)} or None
    part = None
    path_of = (lambda t: f"assets/{split(t)[0]}/{split(t)[1]}") if raw_tex else tex_path
    for line in raw.decode("utf8", "ignore").splitlines():
        p = line.split()
        if not p:
            continue
        if p[0] == "v":
            vs.append(tuple(float(c) * 16 for c in p[1:4]))
        elif p[0] == "vt":
            vts.append((float(p[1]), float(p[2])))
        elif p[0] in ("o", "g"):
            part = p[1] if len(p) > 1 else None
        elif p[0] == "usemtl":
            tex = textures.get(p[1]) or next(iter(textures.values()), default)
        elif p[0] == "f":
            if only is not None and part not in only:
                continue
            idx = [q.split("/") for q in p[1:]]
            pts = [(vs[int(i[0]) - 1], vts[int(i[1]) - 1] if len(i) > 1 and i[1] else (0, 0)) for i in idx]
            t = load_texture(files, path_of(tex)) if tex else None
            if not t:
                continue
            for k in range(1, len(pts) - 1, 2):
                q = [pts[0], pts[k], pts[k + 1], pts[min(k + 2, len(pts) - 1)]]
                shape.add(t[0], None, [a for a, _ in q], [(u, 1 - v if flip_v else v) for _, (u, v) in q])
    return bool(shape.mats)

# ---------------------------------------------------------------------- what the game draws in code

def bake_box(shape, name, a, s, u, v, tw, th, move=lambda p: p):
    """One cube of a vanilla ModelPart: its faces laid out on the texture the way the game unfolds them."""
    x1, y1, z1 = a
    w, h, d = s
    x2, y2, z2 = x1 + w, y1 + h, z1 + d
    def uv(face, p):
        dx, dy, dz = p[0] - x1, p[1] - y1, p[2] - z1
        return {
            "north": (u + d + dx, v + d + dy), "east": (u + d + w + dz, v + d + dy), "south": (u + d + w + d + w - dx, v + d + dy),
            "west": (u + d - dz, v + d + dy), "down": (u + d + dx, v + dz), "up": (u + d + w + dx, v + dz),
        }[face]
    for face in ("north", "east", "south", "west", "up", "down"):
        vs = corners(face, (x1, y1, z1), (x2, y2, z2))
        shape.add(name, None, [move(p) for p in vs], [(c[0] / tw, c[1] / th) for c in (uv(face, p) for p in vs)])

def bake_chest(files, tex, shape):
    t = load_texture(files, tex)
    if not t:
        return False
    tw, th = t[1].size
    k = tw / 64
    for a, sz, u, v in (((1, 0, 1), (14, 10, 14), 0, 19), ((1, 9, 1), (14, 5, 14), 0, 0), ((7, 7, 15), (2, 4, 1), 0, 0)):
        bake_box(shape, t[0], a, sz, u, v, tw / k, th / k)
    return True

def bake_shield(files, shape):
    t = load_texture(files, "assets/minecraft/textures/entity/shield/shield_base_nopattern.png")
    if not t:
        return False
    tw, th = t[1].size
    flip = lambda p: (p[0], -p[1], -p[2])
    bake_box(shape, t[0], (-6, -11, -2), (12, 22, 1), 0, 0, tw, th, flip)
    bake_box(shape, t[0], (-1, -3, -1), (2, 6, 6), 26, 0, tw, th, flip)
    return True

def bake_skull(files, tex, shape):
    t = load_texture(files, tex)
    if not t:
        return False
    tw, th = t[1].size
    bake_box(shape, t[0], (-4, -8, -4), (8, 8, 8), 0, 0, tw, th, lambda p: (p[0], -p[1], -p[2]))
    return True

def bake_parts(shape, name, parts, tw, th, move):
    """A Java model: parts of (u, v, box corner, box size, part offset)."""
    for u, v, a, sz, off in parts:
        bake_box(shape, name, (a[0] + off[0], a[1] + off[1], a[2] + off[2]), sz, u, v, tw, th, move)

def bake_watch_eye(files, shape):
    """The camera's model, as the mod's own layer definition builds it."""
    t = load_texture(files, "assets/halia/textures/entity/security_camera/security_camera.png")
    if not t:
        return False
    body = (0, 14, -2)
    bake_parts(shape, t[0], [
        (2, 12, (0, 0, 0), (2, 1, 6), (-1, 13.75, 2.25)), (1, 12, (0, 0, 0), (2, 1, 7), (-1, 14.75, 2.25)), (0, 0, (0, 0, 0), (6, 6, 1), (-3, 13, 7)),
        (0, 25, (-2, 0, -2), (4, 3, 8), body), (10, 40, (-2, 0, 0), (1, 3, 1), (body[0] + 3, body[1], body[2] - 3)),
        (0, 40, (0, 0, 0), (1, 3, 1), (body[0] - 2, body[1], body[2] - 3)), (20, 40, (0, 0, 0), (2, 1, 1), (body[0] - 1, body[1], body[2] - 3)),
    ], *t[1].size, lambda p: (p[0], -p[1], -p[2]))
    return True

def bake_relic_case(files, tex, shape):
    t = load_texture(files, f"assets/halia/textures/entity/display_case/{tex}.png")
    if not t:
        return False
    base, door = (0, 24, 0), (-6, 16, -3)
    bake_parts(shape, t[0], [
        (0, 23, (-6, -3, -8), (12, 1, 5), base), (36, 0, (-6, -13, -8), (1, 10, 5), base), (13, 4, (-5, -13, -8), (10, 10, 1), base),
        (0, 0, (5, -13, -8), (1, 10, 5), base), (0, 16, (-6, -14, -8), (12, 1, 5), base),
        (5, 31, (1, -5, 0), (10, 10, 1), door), (0, 31, (11, -5, 0), (1, 10, 1), door), (28, 31, (0, -5, 0), (1, 10, 1), door),
        (0, 43, (0, -6, 0), (12, 1, 1), door), (0, 46, (0, 5, 0), (12, 1, 1), door), (27, 43, (11, -1.5, 1), (1, 3, 1), door),
    ], 48, 48, lambda p: (p[0], -p[1], -p[2]))
    return True

def bake_quads(files, data, texture, shape):
    """Corners already baked by the mod's renderer: x y z u v, four to a quad, in sixteenths of a block."""
    t = load_texture(files, texture)
    if not t:
        return False
    for i in range(0, len(data) - 19, 20):
        q = data[i:i + 20]
        shape.add(t[0], None, [tuple(q[k:k + 3]) for k in range(0, 20, 5)], [tuple(q[k + 3:k + 5]) for k in range(0, 20, 5)])
    shape.double = True
    return bool(shape.mats)

def blade_profiles(files):
    """Which model and texture each named blade carries, from the recipes that make it."""
    out = {}
    for n in files.f:
        if not n.endswith(".json") or not (n.startswith("data/halia/recipe/") or n.startswith("assets/halia/creative/")):
            continue
        try:
            d = files.json(n)
        except ValueError:
            continue
        result = d.get("result") if isinstance(d, dict) else None
        result = result if isinstance(result, dict) else d
        comp = result.get("components") if isinstance(result, dict) else None
        prof = (comp or {}).get("halia:blade_profile")
        if prof and prof.get("translation_key"):
            cur = out.setdefault(prof["translation_key"], {})
            cur.setdefault("model", prof.get("model"))
            cur.setdefault("texture", prof.get("texture"))
            if not cur["model"]:
                cur["model"] = prof.get("model")
    return out

def bake_dragon_head(files, shape):
    t = load_texture(files, "assets/minecraft/textures/entity/enderdragon/dragon.png")
    if not t:
        return False
    z = (0, 0, 0)
    bake_parts(shape, t[0], [
        (176, 44, (-6, -1, -24), (12, 5, 16), z), (112, 30, (-8, -8, -10), (16, 16, 16), z), (0, 0, (-5, -12, -4), (2, 4, 6), z), (112, 0, (-5, -3, -22), (2, 2, 4), z),
        (0, 0, (3, -12, -4), (2, 4, 6), z), (112, 0, (3, -3, -22), (2, 2, 4), z), (176, 65, (-6, 0, -16), (12, 4, 16), (0, 4, -8)),
    ], *t[1].size, lambda p: (p[0], -p[1], -p[2]))
    return True

def bake_blade(files, profile, shape):
    model = profile.get("model") or "halia:blade/model/blade.obj"
    tex = profile.get("texture") or "halia:blade/model/blade.png"
    ns, p = split(model)
    ns2, q = split(tex)
    return bake_obj(files, f"assets/{ns}/{p}", {}, shape, True, default=f"{ns2}:{q}", raw_tex=True, only=BLADE_PARTS)

def bake_mesh(files, path, texture, shape):
    """OUKA's Blender meshes (OKMS): groups of quads, 8 floats a corner (x y z, u v, normal), positions in blocks."""
    t = load_texture(files, texture)
    raw = files.read(path)
    if not t or raw is None or raw[:4] != b"OKMS":
        return False
    at, groups = 12, struct.unpack_from("<i", raw, 8)[0]
    for _ in range(groups):
        n = struct.unpack_from("<i", raw, at)[0]
        at += 4 + n
        quads = struct.unpack_from("<i", raw, at)[0]
        at += 4
        for _ in range(quads):
            c = [struct.unpack_from("<8f", raw, at + k * 32) for k in range(4)]
            at += 128
            shape.add(t[0], None, [(x * 16, y * 16, z * 16) for x, y, z, *_ in c], [(u, v) for _, _, _, u, v, *_ in c])
    shape.double = True
    return bool(shape.mats)

# ---------------------------------------------------------------------- the client's item tree

def colour(t):
    k = t.get("type", "")
    v = t.get("value", t.get("default"))
    if k.endswith("constant") or k.endswith("dye") or k.endswith("firework") or k.endswith("potion") or k.endswith("custom_model_data") or k.endswith("map_color"):
        if isinstance(v, int):
            return f"{v & 0xffffff:06x}"
    if k.endswith("grass"):
        return "7cbd6b"
    if k == "halia:reinforced":
        return REINFORCED
    return None

def leaves(node, out):
    t = (node.get("type") or "").replace("minecraft:", "")
    if t == "composite":
        for m in node.get("models", []):
            leaves(m, out)
    elif t == "select":
        cases = node.get("cases", [])
        when = lambda c: c.get("when") if isinstance(c.get("when"), list) else [c.get("when")]
        if "display_context" in (node.get("property") or ""):
            # The inventory's picture is a stand-in; the thing itself is what the hand, the ground and the frame show.
            world = next((c for c in cases if "gui" not in when(c)), None)
            leaves(node.get("fallback") or (world or {}).get("model") or (cases[0]["model"] if cases else {}), out)
        else:
            leaves(node.get("fallback") or (cases[0]["model"] if cases else {}), out)
    elif t == "condition":
        leaves(node.get("on_false") or node.get("on_true") or {}, out)
    elif t == "range_dispatch":
        e = node.get("entries") or []
        leaves(node.get("fallback") or (e[0]["model"] if e else {}), out)
    elif t in ("model", "special"):
        out.append(node)
    elif t and t != "empty":
        out.append(node)

def bake_door(files, ns, path, shape, tints):
    """A door is two blocks tall: its own mesh when it has one, else the closed lower half and upper half."""
    obj = f"assets/{ns}/models/door/{path}.obj"
    if files.has(obj) and bake_obj(files, obj, {}, shape, True, default=f"{ns}:block/door/{path}"):
        shape.double = True
        return True
    framed = f"assets/{ns}/models/door/framed_door.obj"
    if files.has(framed) and files.has(f"assets/{ns}/textures/block/door/{path}.png") and bake_obj(files, framed, {}, shape, True, default=f"{ns}:block/door/{path}"):
        shape.double = True
        return True
    for low, up in ((f"{ns}:block/door/{path}_lower_left", f"{ns}:block/door/{path}_upper_left"), (f"{ns}:block/{path}_bottom_left", f"{ns}:block/{path}_top_left")):
        a, b = merged(files, low), merged(files, up)
        if a and b and a["elements"] and b["elements"]:
            bake_elements(files, a, shape, tints)
            bake_elements(files, b, shape, tints, 16)
            return bool(shape.mats)
    bs = files.json(f"assets/{ns}/blockstates/{path}.json")
    picks = {}
    for key, v in ((bs or {}).get("variants") or {}).items():
        if all(w in key for w in ("hinge=left", "open=false")):
            v = v[0] if isinstance(v, list) else v
            for half in ("lower", "upper"):
                if f"half={half}" in key:
                    picks.setdefault(half, v.get("model"))
    a, b = merged(files, picks.get("lower")), merged(files, picks.get("upper"))
    if a and b and a["elements"] and b["elements"]:
        bake_elements(files, a, shape, tints)
        bake_elements(files, b, shape, tints, 16)
        return bool(shape.mats)
    return False

def block_model(files, ns, path):
    bs = files.json(f"assets/{ns}/blockstates/{path}.json")
    first = None
    if bs and "variants" in bs:
        first = next(iter(bs["variants"].values()), None)
    elif bs and "multipart" in bs:
        first = next((p.get("apply") for p in bs["multipart"]), None)
    first = first[0] if isinstance(first, list) else first
    bm = merged(files, first.get("model")) if first else None
    return bm if bm and bm["elements"] else None

def bake_item(files, iid, report):
    ns, path = split(iid)
    variant = None
    m = re.match(r"(.+)\[(.+)\]$", path)
    if m:
        path, variant = m.group(1), m.group(2)
    shape = Shape()
    if path == "halia_blade" and ns == "halia":
        if bake_blade(files, BLADES.get(variant) or {}, shape):
            shape.double = True
            return shape, "model"
    if iid == "halia:ultrafast/bolt_rifle":
        data = json.loads((Path(__file__).parent / "item-models" / "bolt_rifle.quads.json").read_text())
        if bake_quads(files, data, "assets/halia/textures/item/ultrafast/bolt_rifle_model.png", shape):
            return shape, "model"
    d = files.json(f"assets/{ns}/items/{path}.json")
    nodes = []
    if d:
        leaves(d.get("model") or {}, nodes)
    # A machine's item is a flat picture in the inventory; the thing itself is its block.
    if bake_mesh(files, f"assets/{ns}/mesh/{path}.mesh", f"assets/{ns}/textures/mesh/{path}.png", shape):
        return shape, "geo"
    g, tx = geo_of(files, ns, path)
    if g and tx:
        if bake_geo(files, files.json(g), tx, shape):
            return shape, "geo"
    if g:
        report["geo_no_texture"].append(iid)
    flat = None
    for node in nodes:
        t = node.get("type", "")
        if t.endswith("special"):
            inner = node.get("model") or {}
            it = inner.get("type", "")
            if it == "halia:obj":
                nsm, pm = split(inner["model"])
                texs = inner.get("textures") or {}
                if bake_obj(files, f"assets/{nsm}/{pm}", texs, shape, inner.get("flip_v", True)):
                    shape.double = True
                    continue
            if it == "halia:ultrafast/geo":
                raw = files.json(f"assets/{ns}/ultrafast_geo/{inner.get('id')}.json")
                if raw and bake_quads(files, raw, f"assets/{ns}/textures/item/ultrafast/{inner.get('id')}_model.png", shape):
                    continue
            if it == "halia:watch_eye" and bake_watch_eye(files, shape):
                continue
            if it == "halia:relic_case" and bake_relic_case(files, split(inner.get("texture", "halia:normal"))[1], shape):
                continue
            if it == "minecraft:chest":
                tn, tp = split(inner.get("texture", "minecraft:normal"))
                if bake_chest(files, f"assets/{tn}/textures/entity/chest/{tp}.png", shape):
                    continue
            if it == "minecraft:shield" and bake_shield(files, shape):
                continue
            if it == "minecraft:head" and inner.get("kind") == "dragon" and bake_dragon_head(files, shape):
                continue
            if it == "minecraft:head" and inner.get("kind") == "wither_skeleton" and bake_skull(files, "assets/minecraft/textures/entity/skeleton/wither_skeleton.png", shape):
                continue
            report["special:" + it].append(iid)
            base = node.get("base")
            if base:
                bm = merged(files, base)
                if bm and bm["elements"]:
                    bake_elements(files, bm, shape, [])
            continue
        ref = node.get("model")
        if not isinstance(ref, str):
            report["node:" + t].append(iid)
            continue
        tints = [colour(x) for x in node.get("tints") or []]
        mo = merged(files, ref)
        if mo is None:
            report["no_model"].append(f"{iid} {ref}")
            continue
        if mo["elements"] and not is_flat(mo):
            bake_elements(files, mo, shape, tints)
        elif is_flat(mo):
            flat = (mo, tints)
        else:
            report["no_elements"].append(iid)
    if not shape.mats and flat is not None:
        # An item that stands for a block drawn from model files, when the block is not a door (a door's item is its picture in the game).
        if re.search(r"door|hatch|drape", path) and bake_door(files, ns, path, shape, flat[1]):
            return shape, "block"
        if not re.search(r"door|hatch|drape", path):
            bm = block_model(files, ns, path)
            if bm:
                bake_elements(files, bm, shape, flat[1])
                if shape.mats:
                    return shape, "block"
        bake_flat(files, flat[0], shape, flat[1])
        return shape, "flat"
    if not shape.mats:
        # Drawn in code: the block's own model is the nearest thing the files hold.
        for bm in [block_model(files, ns, path)] + [merged(files, f"{ns}:block/{path}/{v}") for v in ("base", "inactive")]:
            if bm and bm["elements"]:
                bake_elements(files, bm, shape, [])
        if shape.mats:
            return shape, "block"
    return shape, "model" if shape.mats else "none"

def write_shape(shape):
    mats = []
    for (tex, tint), quads in sorted(shape.mats.items(), key=lambda kv: str(kv[0])):
        q = []
        for pos, uv in quads:
            q.extend(pos)
            q.extend(uv)
        mats.append({"t": tex, **({"c": tint} if tint else {}), **({"a": 1} if tex in GLASS else {}), "q": q})
    body = json.dumps({**({"d": 1} if shape.double else {}), "m": mats}, separators=(",", ":"))
    name = hashlib.sha256(body.encode()).hexdigest()[:16]
    (OUT / f"{name}.json").write_text(body)
    return name

def main():
    if not CLIENT.exists():
        sys.exit(f"build_item_models: {CLIENT} is missing")
    wiki = json.loads((WEB / ".data" / "wiki.json").read_text())
    files = Files()
    sources = json.loads((ROOT / "data" / "recipes.json").read_text())["sources"]
    dl = ROOT / "downloads"
    pick = {"ouka": f"OUKA_MODs_v{sources['ouka']}+mc26.3.zip", "cherry": f"Cherry_MODs_v{sources['cherry']}+mc26.3.zip", "tsubomi": f"tsubomi-{sources['tsubomi']}.jar", "halia": f"halia-{sources['halia']}.jar"}
    for name in pick.values():
        files.add_zip(zipfile.ZipFile(dl / name))
    files.add_zip(zipfile.ZipFile(CLIENT))
    BLADES.update(blade_profiles(files))
    shutil.rmtree(OUT, ignore_errors=True)
    (OUT / "t").mkdir(parents=True)
    report = {}
    class R(dict):
        def __missing__(self, k):
            self[k] = []
            return self[k]
    report = R()
    index, kinds = {}, Counter()
    for iid in wiki["recipes"]["items"]:
        if iid.startswith("#"):
            continue
        try:
            shape, kind = bake_item(files, iid, report)
        except Exception as e:
            report["error"].append(f"{iid}: {e!r}")
            continue
        kinds[kind] += 1
        if kind == "none":
            report["none"].append(iid)
            continue
        index[iid] = {"f": write_shape(shape), "k": kind}
    (OUT / "index.json").write_text(json.dumps(index, separators=(",", ":"), sort_keys=True))
    size = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"build_item_models: {len(index)} items, {len(list(OUT.glob('*.json'))) - 1} shapes, {len(list((OUT / 't').iterdir()))} textures, {size / 1e6:.1f} MB", dict(kinds))
    for k, v in sorted(report.items(), key=lambda kv: -len(kv[1])):
        print(f"  {k}: {len(v)}  {v[:5]}")

if __name__ == "__main__":
    main()
