import sys
from PIL import Image, ImageDraw
from pathlib import Path
d, start, end, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
files = sorted(Path(d, "shots").glob("*.png"))[start:end]
W = 640; th = W*900//1440 + 24; cols = 3; rows = (len(files)+cols-1)//cols
s = Image.new("RGB", (cols*W, rows*th), "white"); dr = ImageDraw.Draw(s)
for i,f in enumerate(files):
    im = Image.open(f); im.thumbnail((W, W*900//1440))
    x=(i%cols)*W; y=(i//cols)*th; s.paste(im,(x,y+22)); dr.text((x+4,y+4), f.name, fill="black")
s.save(out, quality=80); print(out, len(files), s.size)
