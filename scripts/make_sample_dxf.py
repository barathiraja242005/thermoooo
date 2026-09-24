"""
Write a sample DXF (R12, millimetres) of a two-band Ladakhi passive-solar house:
living and bedrooms along the south face, kitchen, store, bath and an entrance airlock
as a north buffer. Used by the studio's "Try a sample DXF" button.

Run: python3 scripts/make_sample_dxf.py
"""
import json
import os

ROOMS = [  # name, x0, y0, x1, y1 in metres (x east, y north)
    ("Living", 0.0, 0.0, 5.2, 4.8),
    ("Main bedroom", 5.2, 0.0, 9.2, 4.8),
    ("Bedroom 2", 9.2, 0.0, 13.2, 4.8),
    ("Kitchen", 0.0, 4.8, 4.4, 8.4),
    ("Store", 4.4, 4.8, 8.2, 8.4),
    ("Bath", 8.2, 4.8, 10.4, 8.4),
    ("Entrance airlock", 10.4, 4.8, 13.2, 8.4),
]


def poly(layer, pts):
    out = ["0", "POLYLINE", "8", layer, "66", "1", "70", "1"]
    for x, y in pts:
        out += ["0", "VERTEX", "8", layer, "10", f"{x * 1000:.1f}", "20", f"{y * 1000:.1f}", "30", "0.0"]
    return out + ["0", "SEQEND"]


def text(layer, x, y, s):
    return ["0", "TEXT", "8", layer, "10", f"{x * 1000:.1f}", "20", f"{y * 1000:.1f}", "30", "0.0", "40", "250", "1", s]


def main():
    ent = poly("WALLS", [(0, 0), (13.2, 0), (13.2, 8.4), (0, 8.4)])
    for name, x0, y0, x1, y1 in ROOMS:
        ent += poly("ROOMS", [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
        ent += text("ROOM_NAMES", (x0 + x1) / 2 - 1.0, (y0 + y1) / 2, name)
    dxf = "\n".join(["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "0", "ENDSEC",
                     "0", "SECTION", "2", "ENTITIES"] + ent + ["0", "ENDSEC", "0", "EOF"]) + "\n"
    here = os.path.dirname(os.path.abspath(__file__))
    for dest in [os.path.join(here, "..", "demo", "assets", "samples"), os.path.join(here, "..", "samples")]:
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, "ladakh_passive_house.dxf"), "w") as f:
            f.write(dxf)
    with open(os.path.join(here, "..", "demo", "assets", "samples", "ladakh_passive_house.dxf.js"), "w") as f:
        f.write("// Same drawing as ladakh_passive_house.dxf, for when the page is opened from disk.\n")
        f.write("window.TB_SAMPLE_DXF = " + json.dumps(dxf) + ";\n")
    print("wrote sample DXF,", len(dxf), "bytes")


if __name__ == "__main__":
    main()
