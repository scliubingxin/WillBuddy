import path from 'node:path';
export const officeDirectory=process.env.WB_TEST_OFFICE_DIRECTORY||(process.platform==='darwin'&&process.env.WB_TEST_SOFFICE?path.dirname(process.env.WB_TEST_SOFFICE):'/opt/codex/runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/program');
export const officePython=process.env.WB_TEST_PYTHON||'python3';
