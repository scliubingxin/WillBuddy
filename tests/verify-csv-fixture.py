"""Inspect LibreOffice-imported CSV files. Never author or modify a workbook.

Run export-csv-fixture.mjs, import both CSVs to XLSX with formula evaluation
enabled, then pass the directory containing fixture.json and both XLSX files.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--report', type=Path)
args = parser.parse_args()
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def read_cells(path):
    with ZipFile(path) as package:
        assert package.testzip() is None, 'Invalid XLSX ZIP'
        shared = []
        if 'xl/sharedStrings.xml' in package.namelist():
            shared = [''.join(node.itertext()) for node in ET.fromstring(package.read('xl/sharedStrings.xml')).findall('s:si', ns)]
        sheet = ET.fromstring(package.read('xl/worksheets/sheet1.xml'))
        cells = {}
        for cell in sheet.findall('.//s:c', ns):
            kind = cell.get('t')
            value = cell.findtext('s:v', '', ns)
            if kind == 's':
                value = shared[int(value)]
            elif kind == 'inlineStr':
                value = ''.join(cell.find('s:is', ns).itertext())
            cells[cell.get('r')] = (kind, value, cell.find('s:f', ns) is not None)
        return cells


root = args.directory
fixture = json.loads((root / 'fixture.json').read_text())
protected = read_cells(root / 'protected.xlsx')
control = read_cells(root / 'control.xlsx')
assert control['A2'][2] and float(control['A2'][1]) == 2, 'Positive control must evaluate =1+1'
assert not any(cell[2] for cell in protected.values()), 'Protected CSV produced an active formula'
with (root / 'protected.csv').open(encoding='utf-8-sig', newline='') as stream:
    expected = list(csv.reader(stream))
assert len(expected) == len(fixture['rows']) + 1
assert len(protected) == len(expected) * 3, 'Unexpected extra or missing cells'
normalized_line_endings = 0
for i, row in enumerate(expected, 1):
    for j, value in enumerate(row):
        kind, actual, formula = protected[f'{chr(65+j)}{i}']
        if j == 2 and i > 1:
            assert kind not in ('s', 'inlineStr') and float(actual) == -12.5, 'Numeric value changed'
        else:
            # Calc may consume the leading text marker. Both are literal string cells.
            assert kind in ('s', 'inlineStr'), f'Expected text at {i}/{j}'
            # Calc normalizes embedded CR/CRLF to LF. CSV byte fidelity is tested separately.
            normalized = value.replace('\r\n', '\n').replace('\r', '\n')
            if normalized != value:
                normalized_line_endings += 1
            assert actual in (normalized, normalized[1:] if normalized.startswith("'") else normalized), f'Text changed at {i}/{j}'
report = {
    'status': 'passed', 'synthetic_records': len(fixture['rows']),
    'protected_cells': fixture['protectedCells'], 'active_formulas_in_protected_import': 0,
    'positive_control_formula_result': 2, 'numeric_cells_preserved': len(fixture['rows']),
    'all_text_cells_compared': True,
    'calc_normalized_line_endings_in_cells': normalized_line_endings,
    'scope': 'actual LibreOffice CSV import; not browser, Microsoft Excel/WPS, or resave/reopen safety',
    'sha256': {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
               for name in ['protected.csv', 'control.csv', 'protected.xlsx', 'control.xlsx']},
}
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
