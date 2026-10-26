---
name: willbuddy-budget-runtime
description: 实际运行Node脚本计算预算并生成XLSX表格
---
读取本包runnableScripts，调用skill_run执行scripts/create-budget.cjs，input为items数组（name/quantity/price）。使用WILLBUDDY_INPUT输入文件、WILLBUDDY_OUTPUT成果目录。必须检查真实status、exitCode、structuredOutput与outputs；成功后调用skill_import_output回收budget.xlsx，再由用户预览导出。不要把读取说明当运行，不自动安装任何依赖。
