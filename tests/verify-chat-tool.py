"""Independent workbook reader; run after tests/document-agent.mjs."""
import openpyxl
sheet = openpyxl.load_workbook('outputs/chat-tool-acceptance.xlsx', data_only=False).active
assert list(sheet.values) == [('项目', '金额'), ('轴承', 30), ('配件', 5), ('=1+1', '')]
assert sheet['A4'].data_type == 's'
assert sheet.freeze_panes == 'A2'
assert sheet.auto_filter.ref == 'A1:B4'
print('PASS: independent openpyxl read; Chinese/numeric values, literal formula text, blank cell, frozen header and filter')
