import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  sheetImages,
  imageBox,
  rasterInfo,
  resolveImagePart,
} from "../src/preview/spreadsheet-images.js";
const w = new JSDOM("").window,
  parse = (s) => new w.DOMParser().parseFromString(s, "application/xml");
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  P = "http://schemas.openxmlformats.org/package/2006/relationships",
  X = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
  A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const mark = (name, c, r, co = 0, ro = 0) =>
  `<xdr:${name}><xdr:col>${c}</xdr:col><xdr:colOff>${co}</xdr:colOff><xdr:row>${r}</xdr:row><xdr:rowOff>${ro}</xdr:rowOff></xdr:${name}>`;
const pic = `<xdr:pic><xdr:blipFill><a:blip r:embed="img"/></xdr:blipFill></xdr:pic>`;
function fixture(
  anchor = mark("from", 1, 2) + mark("to", 3, 4),
  kind = "twoCellAnchor",
) {
  const sheet = parse(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><drawing r:id="draw"/></worksheet>`,
  );
  const files = {
    "xl/worksheets/_rels/sheet1.xml.rels": `<Relationships xmlns="${P}"><Relationship Id="draw" Type="${R}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
    "xl/drawings/drawing1.xml": `<xdr:wsDr xmlns:xdr="${X}" xmlns:a="${A}" xmlns:r="${R}"><xdr:${kind}>${anchor}${pic}<xdr:clientData/></xdr:${kind}></xdr:wsDr>`,
    "xl/drawings/_rels/drawing1.xml.rels": `<Relationships xmlns="${P}"><Relationship Id="img" Type="${R}/image" Target="../media/image1.png"/></Relationships>`,
    "xl/media/image1.png": png,
    "xl/media/orphan.png": Buffer.from("unused"),
  };
  return {
    files,
    read: (budget) =>
      sheetImages(
        files,
        "xl/worksheets/sheet1.xml",
        sheet,
        (p) => {
          if (!files[p]) throw Error("missing");
          return parse(files[p]);
        },
        budget,
      ),
  };
}
test("only worksheet relationships select media; two-cell pixel placement uses grid boundaries and offsets", () => {
  const { read } = fixture(mark("from", 1, 2, 9525, 19050) + mark("to", 3, 4));
  const { images } = read();
  assert.equal(images.length, 1);
  assert.equal(images[0].part, "xl/media/image1.png");
  assert.deepEqual(
    imageBox(images[0], [0, 70, 140, 210, 280], [0, 20, 40, 60, 80, 100]),
    { left: 71, top: 42, width: 139, height: 38 },
  );
});
test("one-cell and absolute anchors use EMU extents independently of source raster dimensions", () => {
  const a = fixture(
    mark("from", 1, 0) + '<xdr:ext cx="457200" cy="304800"/>',
    "oneCellAnchor",
  ).read().images[0];
  assert.deepEqual(imageBox(a, [0, 0, 70], [0, 20]), {
    left: 0,
    top: 0,
    width: 48,
    height: 32,
  });
  const b = fixture(
    '<xdr:pos x="95250" y="190500"/><xdr:ext cx="457200" cy="304800"/>',
    "absoluteAnchor",
  ).read().images[0];
  assert.deepEqual(imageBox(b, [0, 70], [0, 20]), {
    left: 10,
    top: 20,
    width: 48,
    height: 32,
  });
});
test("relationship normalization supports valid relative and package paths but rejects URLs/escape/ambiguous encoding", () => {
  assert.equal(
    resolveImagePart("xl/drawings/d.xml", "../media/a.png"),
    "xl/media/a.png",
  );
  assert.equal(
    resolveImagePart("xl/drawings/d.xml", "/xl/media/a.png"),
    "xl/media/a.png",
  );
  for (const t of [
    "https://x/a.png",
    "//x/a.png",
    "../../../../a.png",
    "../media/%61.png",
    "../media/a.png?q",
    "../media/a\\b.png",
  ])
    assert.throws(() => resolveImagePart("xl/drawings/d.xml", t));
});
test("external, duplicate, missing and mistyped image relationships fail without reading orphan media", () => {
  for (const change of [
    (s) =>
      s.replace(
        'Target="../media/image1.png"',
        'TargetMode="External" Target="https://x/image.png"',
      ),
    (s) =>
      s.replace(
        "</Relationships>",
        `<Relationship Id="img" Type="${R}/image" Target="../media/image1.png"/></Relationships>`,
      ),
    (s) => s.replace('/image"', '/hyperlink"'),
  ]) {
    const f = fixture();
    f.files["xl/drawings/_rels/drawing1.xml.rels"] = change(
      f.files["xl/drawings/_rels/drawing1.xml.rels"],
    );
    assert.throws(() => f.read());
  }
  const f = fixture();
  delete f.files["xl/media/image1.png"];
  assert.throws(() => f.read());
});
test("raster sniff rejects SVG disguise, malformed JPEG and oversized pixel headers before decoder", () => {
  assert.deepEqual(rasterInfo(png), { width: 1, height: 1, mime: "image/png" });
  for (const b of [Buffer.from('<svg onload="x"/>'), Buffer.alloc(12, 255)])
    assert.throws(() => rasterInfo(b));
  const big = Buffer.from(png);
  big.writeUInt32BE(4097, 16);
  assert.throws(() => rasterInfo(big), /像素/);
});
test("coordinate/count/pixel and geometry boundaries fail closed", () => {
  assert.throws(
    () => fixture(mark("from", 128, 0) + mark("to", 129, 1)).read(),
    /锚点/,
  );
  assert.throws(() => fixture().read({ count: 32, pixels: 0 }), /32/);
  assert.throws(() => fixture().read({ count: 0, pixels: 33554432 }), /像素/);
  assert.throws(
    () =>
      imageBox(
        {
          from: { row: 0, col: 0, colOff: 0, rowOff: 0 },
          to: { row: 0, col: 0, colOff: 0, rowOff: 0 },
        },
        [0, 70],
        [0, 20],
      ),
    /尺寸/,
  );
});
test("unsupported shapes are counted and cropped or rotated pictures explicitly reject instead of silently flattening", () => {
  let f = fixture();
  f.files["xl/drawings/drawing1.xml"] = f.files[
    "xl/drawings/drawing1.xml"
  ].replace(pic, "<xdr:graphicFrame/>");
  assert.deepEqual(f.read(), { images: [], unsupported: 1 });
  for (const transform of [
    '<a:srcRect l="100"/>',
    '<a:xfrm rot="60000"/>',
    '<a:xfrm flipH="1"/>',
  ]) {
    f = fixture();
    f.files["xl/drawings/drawing1.xml"] = f.files[
      "xl/drawings/drawing1.xml"
    ].replace('<a:blip r:embed="img"/>', '<a:blip r:embed="img"/>' + transform);
    assert.throws(() => f.read(), /裁剪/);
  }
});
