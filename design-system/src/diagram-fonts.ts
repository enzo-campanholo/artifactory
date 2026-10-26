import { fileURLToPath } from "node:url";

const font = (name: string) => fileURLToPath(new URL(`./fonts/${name}.ttf`, import.meta.url));

// D2 measures and embeds static TTFs, so these are Archivo's variable fonts pinned at the frame's
// 88% width, made once from google/fonts' `ofl/archivo` at 95f4904f with fontTools:
// `fonttools varLib.instancer 'Archivo[wdth,wght].ttf' wght=500 wdth=88 -o archivo-88-500.ttf`,
// then the same at 700, and from `Archivo-Italic[wdth,wght].ttf` at 500.
// The frame is never set at 400, so D2's regular is 500 and its semibold is 700.
export const diagramFonts = {
  regular: font("archivo-88-500"),
  italic: font("archivo-88-500-italic"),
  bold: font("archivo-88-700"),
  semibold: font("archivo-88-700"),
};
