export type ReportType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface SlideData {
  id: string;
  order: number;
  fabricJson: Record<string, any>;
  thumbnail?: string;
}

export interface CanvasReport {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description?: string | null;
  reportType: ReportType;
  slides: SlideData[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type CanvasReportSummary = Omit<CanvasReport, 'slides'>;

export interface CreateCanvasReportPayload {
  name: string;
  projectId: string;
  description?: string;
  reportType?: ReportType;
  slides?: SlideData[];
}

export interface UpdateCanvasReportPayload {
  name?: string;
  description?: string;
  reportType?: ReportType;
  slides?: SlideData[];
}

export interface SelectedObjectProps {
  type: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: string;
  width?: number;
  height?: number;
  rx?: number;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
}
