declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2';
  }

  function subsetFont(
    buffer: Buffer | ArrayBuffer,
    text: string,
    options?: SubsetFontOptions
  ): Promise<Buffer>;

  export default subsetFont;
}
