import fitz, sys
d = fitz.open(r"D:\Yuga Yatra\nkc-Test-platform\recycle\question paper\allen set 4.pdf")
print("pages", d.page_count)
for p in [8,14,16,17,20,21]:
    pg = d[p-1]
    pg.get_pixmap(dpi=110).save(rf"D:\Yuga Yatra\nkc-Test-platform\videos\shared\paper-pages\p{p:02d}.png")
