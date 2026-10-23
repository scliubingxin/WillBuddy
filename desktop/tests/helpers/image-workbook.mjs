import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
/** ExcelJS4.4 emits editAs on oneCellAnchor (not legal on that element).
 * Normalize only this synthetic test writer output before independent readers.
 * Production import/render never rewrites a user's source archive.
 */
export function normalizeImageFixture(bytes) {
  const files = unzipSync(bytes);
  for (const name of Object.keys(files))
    if (/^xl\/drawings\/[^/]+\.xml$/.test(name))
      files[name] = strToU8(
        strFromU8(files[name]).replace(
          /<xdr:oneCellAnchor editAs="[^"]*">/g,
          "<xdr:oneCellAnchor>",
        ),
      );
  return Buffer.from(zipSync(files));
}
