/** Anything the user hands us is reduced to text plus visual assets. */
export type SourceFormat =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'rtf'
  | 'html'
  | 'markdown'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'email'
  | 'text'
  | 'image'
  | 'binary'
  | 'empty';

export interface SourceAsset {
  name: string;
  mime: string;
  /** Inline data URL: keeps generated sites self-contained, no object storage needed. */
  dataUrl: string;
  bytes: number;
}

export interface ExtractedDocument {
  name: string;
  format: SourceFormat;
  text: string;
  pages?: number;
  assets?: SourceAsset[];
  /** Plain-language note about what intake could not do, surfaced to the user. */
  observation?: string;
}

export interface IntakeResult {
  /** Every document's text, merged in upload order with source markers. */
  text: string;
  documents: { name: string; format: SourceFormat; characters: number; observation?: string }[];
  assets: SourceAsset[];
  observations: string[];
}
