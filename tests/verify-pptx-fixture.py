#!/usr/bin/env python3
"""Verify the reproducible PPTX fixture without PowerPoint-specific Python libraries."""
import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

P = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
EXPECTED = ["设备维护月度复盘", "本月情况", "重点问题", "下月安排", "幕云AI"]


def fail(message: str) -> None:
    raise SystemExit(f"PPTX verification failed: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: verify-pptx-fixture.py <file.pptx>")
    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail(f"file not found: {path}")
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        slides = sorted(
            (name for name in names if name.startswith("ppt/slides/slide") and name.endswith(".xml")),
            key=lambda value: int(value.removeprefix("ppt/slides/slide").removesuffix(".xml")),
        )
        if len(slides) != 4:
            fail(f"expected 4 slides, found {len(slides)}")
        presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
        size = presentation.find(f"{P}sldSz")
        if size is None:
            fail("missing slide size")
        width, height = int(size.attrib["cx"]), int(size.attrib["cy"])
        all_text = []
        out_of_bounds = []
        for slide_name in slides:
            root = ET.fromstring(archive.read(slide_name))
            all_text.extend(node.text or "" for node in root.iter(f"{A}t"))
            for shape in root.iter(f"{P}sp"):
                transform = shape.find(f".//{A}xfrm")
                if transform is None:
                    continue
                offset, extent = transform.find(f"{A}off"), transform.find(f"{A}ext")
                if offset is None or extent is None:
                    continue
                x, y = int(offset.attrib["x"]), int(offset.attrib["y"])
                cx, cy = int(extent.attrib["cx"]), int(extent.attrib["cy"])
                if min(x, y, cx, cy) < 0 or x + cx > width or y + cy > height:
                    out_of_bounds.append({"slide": slide_name, "x": x, "y": y, "cx": cx, "cy": cy})
        joined = "\n".join(all_text)
        compact = "".join(all_text)
        missing = [value for value in EXPECTED if value not in joined and value not in compact]
        if missing:
            fail(f"missing expected text: {missing}")
        if "•" not in joined:
            fail("missing visible editable bullet text")
        if out_of_bounds:
            fail(f"text boxes outside slide bounds: {out_of_bounds}")
        core = archive.read("docProps/core.xml").decode("utf-8")
        if "幕云AI" not in core:
            fail("missing author metadata")
    print(json.dumps({
        "verified": True,
        "file": str(path),
        "slides": len(slides),
        "slide_size_emu": {"width": width, "height": height},
        "expected_text": "present",
        "visible_editable_bullets": "present",
        "text_boxes_in_bounds": True,
        "author_metadata": "present",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
