import office from "../../runtime/vendor/office.cjs";
import { openPackage } from "../../runtime/documents.mjs";
export async function wordFixture() {
  const w = office.word;
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6o30AAAAASUVORK5CYII=",
    "base64",
  );
  const bytes = await w.Packer.toBuffer(
    new w.Document({
      sections: [
        {
          headers: {
            default: new w.Header({ children: [new w.Paragraph("品牌页眉")] }),
          },
          footers: {
            default: new w.Footer({ children: [new w.Paragraph("保留页脚")] }),
          },
          children: [
            new w.Paragraph({
              children: [
                new w.TextRun({
                  text: "季度",
                  bold: true,
                  color: "0078CB",
                  underline: {},
                }),
                new w.TextRun({
                  text: "草案",
                  italics: true,
                  font: "Arial",
                  size: 28,
                }),
              ],
            }),
            new w.Table({
              rows: [
                new w.TableRow({
                  children: [
                    new w.TableCell({
                      children: [new w.Paragraph("预算1000")],
                    }),
                    new w.TableCell({ children: [new w.Paragraph("负责人")] }),
                  ],
                }),
              ],
            }),
            new w.Paragraph({
              children: [
                new w.ImageRun({
                  type: "png",
                  data: image,
                  transformation: { width: 32, height: 32 },
                }),
                new w.TextRun("图片说明"),
              ],
            }),
            new w.Paragraph("只读域"),
            new w.Paragraph("修订正文"),
          ],
        },
      ],
    }),
  );
  const files = openPackage(bytes);
  let xml = Buffer.from(files["word/document.xml"]).toString();
  xml = xml.replace(
    '<w:t xml:space="preserve">只读域</w:t>',
    '<w:fldChar w:fldCharType="begin"/><w:instrText> DATE </w:instrText><w:fldChar w:fldCharType="end"/>',
  );
  xml = xml.replace(
    '<w:t xml:space="preserve">修订正文</w:t>',
    '<w:t xml:space="preserve">修订正文</w:t><w:br/>',
  );
  files["word/document.xml"] = new TextEncoder().encode(xml);
  return Buffer.from(office.zip.zipSync(files));
}
