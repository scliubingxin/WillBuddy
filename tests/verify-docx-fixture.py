"""核对生产导出器生成的合成样例；PDF 检查另需 PyMuPDF，不替代逐页看图。"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile
from xml.etree import ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument("docx", type=Path)
parser.add_argument("--pdf", type=Path)
parser.add_argument("--report", type=Path)
args = parser.parse_args()
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(args.docx) as package:
    assert package.testzip() is None, "ZIP 校验失败"
    for name in package.namelist():
        ET.fromstring(package.read(name))
    root = ET.fromstring(package.read("word/document.xml"))
tables = root.findall("w:body/w:tbl", ns)
assert len(tables) == 2, "表格数量错误"
assert [len(t.findall("w:tr", ns)) for t in tables] == [37, 5], "行缺失"
assert [len(t.findall(".//w:tc", ns)) for t in tables] == [148, 10], "单元格缺失"
for table in tables:
    assert table.find("w:tr/w:trPr/w:tblHeader", ns) is not None, "未设置重复表头"
    widths = [int(c.attrib[f"{{{ns['w']}}}w"]) for c in table.findall("w:tblGrid/w:gridCol", ns)]
    assert sum(widths) == 9506, "表格超过既有 A4 正文宽度"
text = "".join(root.itertext())
assert "装配记录 36" in text and "工序 A|B" in text and "零件 <A> & B" in text
assert tables[1].findall("w:tr", ns)[3].find(".//w:br", ns) is not None
report = {"docx_structure": "passed", "data_rows": 36, "tables": 2,
          "docx_sha256": hashlib.sha256(args.docx.read_bytes()).hexdigest(),
          "pdf_text_check": "not_executed", "visual_review": "requires_separate_page_inspection"}
if args.pdf:
    import fitz
    with fitz.open(args.pdf) as pdf:
        pages = [re.sub(r"\s+", "", p.get_text()) for p in pdf]
        all_text = "".join(pages)
        for value in ["幕云AI交接记录复核", "第一行", "第二行", "工序A|B", "全部36条样例记录"]:
            assert value in all_text, f"PDF 缺少文字：{value}"
        for i in range(1, 37):
            assert re.search(rf"装配记录{i}(?!\d)", all_text), f"PDF 缺少第 {i} 条记录"
        for page, content in zip(pdf, pages):
            if "装配记录" in content:
                assert "编号项目复核说明状态" in content, "跨页表头未重复"
            for block in page.get_text("blocks"):
                assert block[0] >= -1 and block[1] >= -1 and block[2] <= page.rect.width+1 and block[3] <= page.rect.height+1, "文字超出页面"
        report.update(pdf_text_check="passed", rendered_pages=len(pdf), pdf_sha256=hashlib.sha256(args.pdf.read_bytes()).hexdigest())
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
