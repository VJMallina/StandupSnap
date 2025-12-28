declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  export interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: any;
    pageBreak?: string;
    rowPageBreak?: string;
    tableWidth?: string | number;
    showHead?: string | boolean;
    showFoot?: string | boolean;
    tableLineColor?: any;
    tableLineWidth?: number;
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: any;
    theme?: string;
    didDrawPage?: (data: any) => void;
    didDrawCell?: (data: any) => void;
    willDrawCell?: (data: any) => void | boolean;
    didParseCell?: (data: any) => void;
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}
