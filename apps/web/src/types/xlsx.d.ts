declare module 'xlsx' {
  // Cell value types
  export type CellValue = string | number | boolean | Date | null;

  // Cell types
  export type CellType = 'b' | 'n' | 's' | 'd' | 'e' | 'z';

  // Range reference
  export interface CellAddress {
    c: number;
    r: number;
  }

  export interface Range {
    s: CellAddress;
    e: CellAddress;
  }

  // Comment structure
  export interface Comment {
    a?: string; // author
    t?: string; // text
  }

  // Hyperlink structure
  export interface Hyperlink {
    Target: string;
    Tooltip?: string;
  }

  export interface WorkBook {
    Sheets: { [name: string]: WorkSheet };
    SheetNames: string[];
    Props?: Properties;
    Custprops?: Record<string, unknown>;
    Workbook?: {
      Sheets?: WorkbookSheet[];
      Names?: DefinedName[];
      Views?: WorkbookView[];
      WBProps?: WorkbookProperties;
    };
  }

  export interface WorkSheet {
    [cell: string]: CellObject | SheetMeta | Range | undefined;
    '!ref'?: string;
    '!margins'?: Margins;
    '!cols'?: ColInfo[];
    '!rows'?: RowInfo[];
    '!merges'?: Range[];
    '!protect'?: ProtectInfo;
    '!autofilter'?: AutoFilter;
  }

  export interface CellObject {
    v: CellValue;
    t: CellType;
    f?: string; // formula
    F?: string; // formula range
    r?: string; // rich text
    h?: string; // HTML
    c?: Comment[]; // comments
    z?: string | number; // number format
    l?: Hyperlink; // hyperlink
    s?: CellStyle; // style
    w?: string; // formatted text
  }

  // Style definition
  export interface CellStyle {
    patternType?: string;
    fgColor?: { rgb?: string; theme?: number; tint?: number };
    bgColor?: { rgb?: string; theme?: number; tint?: number };
    font?: Font;
    numFmt?: string | number;
    alignment?: Alignment;
    border?: Border;
  }

  export interface Font {
    name?: string;
    sz?: number;
    color?: { rgb?: string; theme?: number; tint?: number };
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    outline?: boolean;
    shadow?: boolean;
    vertAlign?: 'superscript' | 'subscript';
  }

  export interface Alignment {
    vertical?: 'top' | 'center' | 'bottom' | 'justify' | 'distributed';
    horizontal?:
      | 'left'
      | 'center'
      | 'right'
      | 'fill'
      | 'justify'
      | 'centerContinuous'
      | 'distributed';
    wrapText?: boolean;
    readingOrder?: number;
    textRotation?: number;
    indent?: number;
    shrinkToFit?: boolean;
  }

  export interface Border {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
    diagonal?: BorderStyle;
    diagonalUp?: boolean;
    diagonalDown?: boolean;
  }

  export interface BorderStyle {
    style?:
      | 'thin'
      | 'medium'
      | 'thick'
      | 'dotted'
      | 'hair'
      | 'dashed'
      | 'mediumDashed'
      | 'dashDot'
      | 'mediumDashDot'
      | 'dashDotDot'
      | 'mediumDashDotDot'
      | 'slantDashDot';
    color?: { rgb?: string; theme?: number; tint?: number };
  }

  export interface ColInfo {
    wpx?: number; // width in pixels
    width?: number; // width in characters
    wch?: number; // width in characters
    hidden?: boolean;
    level?: number;
    MDW?: number;
  }

  export interface RowInfo {
    hpx?: number; // height in pixels
    hpt?: number; // height in points
    hidden?: boolean;
    level?: number;
  }

  export interface Margins {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    header?: number;
    footer?: number;
  }

  export interface ProtectInfo {
    selectLockedCells?: boolean;
    selectUnlockedCells?: boolean;
    formatCells?: boolean;
    formatColumns?: boolean;
    formatRows?: boolean;
    insertColumns?: boolean;
    insertRows?: boolean;
    insertHyperlinks?: boolean;
    deleteColumns?: boolean;
    deleteRows?: boolean;
    sort?: boolean;
    autoFilter?: boolean;
    pivotTables?: boolean;
    objects?: boolean;
    scenarios?: boolean;
  }

  export interface AutoFilter {
    ref?: string;
  }

  export interface Properties {
    Title?: string;
    Subject?: string;
    Author?: string;
    Manager?: string;
    Company?: string;
    Category?: string;
    Keywords?: string;
    Comments?: string;
    LastAuthor?: string;
    CreatedDate?: Date;
  }

  export interface WorkbookSheet {
    name: string;
    Hidden?: 0 | 1 | 2;
  }

  export interface DefinedName {
    Name: string;
    Ref: string;
    Sheet?: number;
  }

  export interface WorkbookView {
    RTL?: boolean;
  }

  export interface WorkbookProperties {
    date1904?: boolean;
    filterPrivacy?: boolean;
    CodeName?: string;
  }

  export interface SheetMeta {
    '!ref'?: string;
  }

  // Reading options
  export interface ReadingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    raw?: boolean;
    cellFormula?: boolean;
    cellHTML?: boolean;
    cellNF?: boolean;
    cellStyles?: boolean;
    cellText?: boolean;
    cellDates?: boolean;
    dateNF?: string;
    sheetStubs?: boolean;
    sheetRows?: number;
    bookDeps?: boolean;
    bookFiles?: boolean;
    bookProps?: boolean;
    bookSheets?: boolean;
    bookVBA?: boolean;
    password?: string;
    WTF?: boolean;
    sheets?: string | number | string[] | number[];
    PRN?: boolean;
    xlfn?: boolean;
    FS?: string;
    codepage?: number;
  }

  // Writing options
  export interface WritingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    cellDates?: boolean;
    bookSST?: boolean;
    bookType?:
      | 'xlsx'
      | 'xlsm'
      | 'xlsb'
      | 'xls'
      | 'xla'
      | 'biff8'
      | 'biff5'
      | 'biff2'
      | 'xlml'
      | 'ods'
      | 'fods'
      | 'csv'
      | 'txt'
      | 'sylk'
      | 'html'
      | 'dif'
      | 'rtf'
      | 'prn'
      | 'eth';
    sheet?: string;
    compression?: boolean;
    Props?: Properties;
    themeXLSX?: string;
    ignoreEC?: boolean;
    numbers?: number;
  }

  // JSON to sheet options
  export interface JSON2SheetOpts {
    header?: string[];
    dateNF?: string;
    cellDates?: boolean;
    skipHeader?: boolean;
    origin?: number | string | CellAddress;
  }

  // Sheet to JSON options
  export interface Sheet2JSONOpts {
    header?: 'A' | number | string[];
    range?: number | string | Range;
    blankrows?: boolean;
    defval?: unknown;
    raw?: boolean;
    dateNF?: string;
    rawNumbers?: boolean;
  }

  // Sheet to CSV/TXT options
  export interface Sheet2CSVOpts {
    FS?: string;
    RS?: string;
    dateNF?: string;
    strip?: boolean;
    blankrows?: boolean;
    skipHidden?: boolean;
    forceQuotes?: boolean;
  }

  // Sheet to HTML options
  export interface Sheet2HTMLOpts {
    id?: string;
    editable?: boolean;
    header?: string;
    footer?: string;
  }

  // AOA to sheet options
  export interface AOA2SheetOpts {
    dateNF?: string;
    cellDates?: boolean;
    sheetStubs?: boolean;
    origin?: number | string | CellAddress;
  }

  // Main functions
  export function read(
    data: string | ArrayBuffer | Uint8Array | Buffer,
    opts?: ReadingOptions
  ): WorkBook;
  export function write(
    wb: WorkBook,
    opts?: WritingOptions
  ): string | ArrayBuffer | Blob | Uint8Array;
  export function writeFile(wb: WorkBook, filename: string, opts?: WritingOptions): void;
  export function writeFileXLSX(wb: WorkBook, filename: string, opts?: WritingOptions): void;
  export function writeFileAsync(
    wb: WorkBook,
    filename: string,
    opts?: WritingOptions,
    cb?: (err: Error | null) => void
  ): void;

  export const utils: {
    // Sheet conversion utilities
    sheet_to_json<T = Record<string, CellValue>>(worksheet: WorkSheet, opts?: Sheet2JSONOpts): T[];
    json_to_sheet<T = Record<string, CellValue>>(json: T[], opts?: JSON2SheetOpts): WorkSheet;
    aoa_to_sheet(aoa: CellValue[][], opts?: AOA2SheetOpts): WorkSheet;
    sheet_to_csv(worksheet: WorkSheet, opts?: Sheet2CSVOpts): string;
    sheet_to_txt(worksheet: WorkSheet, opts?: Sheet2CSVOpts): string;
    sheet_to_html(worksheet: WorkSheet, opts?: Sheet2HTMLOpts): string;
    sheet_to_formulae(worksheet: WorkSheet): string[];
    sheet_add_aoa(worksheet: WorkSheet, aoa: CellValue[][], opts?: AOA2SheetOpts): WorkSheet;
    sheet_add_json<T = Record<string, CellValue>>(
      worksheet: WorkSheet,
      json: T[],
      opts?: JSON2SheetOpts
    ): WorkSheet;

    // Workbook utilities
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    book_set_sheet_visibility(wb: WorkBook, sheet: number | string, visibility: 0 | 1 | 2): void;

    // Cell utilities
    cell_add_comment(cell: CellObject, text: string, author?: string): void;
    cell_set_number_format(cell: CellObject, fmt: string | number): CellObject;
    cell_set_hyperlink(cell: CellObject, target: string, tooltip?: string): CellObject;
    cell_set_internal_link(cell: CellObject, target: string, tooltip?: string): CellObject;

    // Address encoding/decoding
    encode_cell(cell: CellAddress): string;
    encode_range(range: Range): string;
    decode_cell(address: string): CellAddress;
    decode_range(range: string): Range;
    format_cell(cell: CellObject, v?: CellValue, opts?: Record<string, unknown>): string;

    // Range utilities
    decode_row(rowstr: string): number;
    encode_row(row: number): string;
    decode_col(colstr: string): number;
    encode_col(col: number): string;
    split_cell(cellstr: string): [string, string];
  };

  export const version: string;
  export const SSF: {
    format(fmt: string | number, val: number | Date, opts?: Record<string, unknown>): string;
    parse_date_code(v: number, opts?: Record<string, unknown>): Date;
    is_date(fmt: string | number): boolean;
  };
}
