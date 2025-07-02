declare module 'xlsx' {
  export interface WorkBook {
    Sheets: { [name: string]: WorkSheet };
    SheetNames: string[];
  }

  export interface WorkSheet {
    [cell: string]: CellObject | any;
  }

  export interface CellObject {
    v: any;
    t: string;
    f?: string;
    F?: string;
    r?: string;
    h?: string;
    c?: any[];
    z?: any;
    l?: any;
    s?: any;
  }

  export interface WritingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    cellDates?: boolean;
    bookSST?: boolean;
    bookType?: string;
    sheet?: string;
    compression?: boolean;
    Props?: any;
  }

  export function read(data: any, opts?: any): WorkBook;
  export function write(wb: WorkBook, opts?: WritingOptions): any;
  export function writeFile(wb: WorkBook, filename: string, opts?: WritingOptions): void;
  export function writeFileXLSX(wb: WorkBook, filename: string, opts?: WritingOptions): void;
  export function writeFileAsync(
    wb: WorkBook,
    filename: string,
    opts?: WritingOptions,
    cb?: (err: any) => void
  ): void;

  export const utils: {
    sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[];
    json_to_sheet<T = any>(json: T[], opts?: any): WorkSheet;
    aoa_to_sheet(aoa: any[][], opts?: any): WorkSheet;
    sheet_to_csv(worksheet: WorkSheet, opts?: any): string;
    sheet_to_txt(worksheet: WorkSheet, opts?: any): string;
    sheet_to_html(worksheet: WorkSheet, opts?: any): string;
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    book_set_sheet_visibility(wb: WorkBook, sheet: number | string, visibility: number): void;
    cell_add_comment(cell: CellObject, text: string, author?: string): void;
    encode_cell(cell: { c: number; r: number }): string;
    encode_range(range: { s: { c: number; r: number }; e: { c: number; r: number } }): string;
    decode_cell(address: string): { c: number; r: number };
    decode_range(range: string): { s: { c: number; r: number }; e: { c: number; r: number } };
  };

  export const version: string;
}
