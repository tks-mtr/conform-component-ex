import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// ユーザーデータの型定義（元の型定義に合わせて調整してください）
// import { type EmployeeWithDepartment } from "../models/schema"; 
// 型定義ファイルのパスが循環参照等で面倒な場合があるため、必要な型だけここで定義またはanyで受ける手もありますが
// 正しくは元の型を使うべきです。ここでは一旦 interface を定義します。
interface UserForPdf {
  id: string;
  name: string;
  department?: {
    name: string;
  } | null;
}

// フォントキャッシュ用変数（サーバーサイドではプロセス生存期間中保持される可能性があるが、引数で渡す方針に変更）
// let cachedFontBytes: ArrayBuffer | null = null;

export async function generateUserListPdf(users: UserForPdf[], fontBuffer: ArrayBuffer): Promise<Uint8Array> {
  console.time("pdf-generation-internal");
  console.time("pdf-create");
  const pdfDoc = await PDFDocument.create();
  console.timeEnd("pdf-create");
  
  // fontkitの登録
  pdfDoc.registerFontkit(fontkit);

  console.time("font-embed");
  const customFont = await pdfDoc.embedFont(fontBuffer);
  console.timeEnd("font-embed");

  console.time("page-drawing");
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;

  // タイトル
  page.drawText('ユーザー一覧', {
    x: 50,
    y: height - 50,
    size: 20,
    font: customFont,
    color: rgb(0, 0, 0),
  });

  // テーブルヘッダー
  const tableTop = height - 100;
  const colX = [50, 200, 350]; // 各列のX座標

  page.drawText('氏名', { x: colX[0], y: tableTop, size: fontSize, font: customFont });
  page.drawText('所属', { x: colX[1], y: tableTop, size: fontSize, font: customFont });
  page.drawText('ID', { x: colX[2], y: tableTop, size: fontSize, font: customFont });

  // 罫線（ヘッダー下）
  page.drawLine({
    start: { x: 40, y: tableTop - 5 },
    end: { x: width - 40, y: tableTop - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // データ行
  let y = tableTop - 25;
  const rowHeight = 20;

  console.log(`Processing ${users.length} users...`);
  
  for (const user of users) {
    // 改ページ判定
    if (y < 50) {
      const newPage = pdfDoc.addPage();
      y = height - 50; 
      // ヘッダー再描画などのロジックを入れることも可能
    }

    page.drawText(user.name || '', { x: colX[0], y, size: fontSize, font: customFont });
    page.drawText(user.department?.name || '所属なし', { x: colX[1], y, size: fontSize, font: customFont });
    page.drawText(user.id || '', { x: colX[2], y, size: fontSize, font: customFont });

    y -= rowHeight;
  }
  console.timeEnd("page-drawing");

  console.time("pdf-save");
  const pdfBytes = await pdfDoc.save();
  console.timeEnd("pdf-save");
  
  console.timeEnd("pdf-generation-internal");
  return pdfBytes;
}
