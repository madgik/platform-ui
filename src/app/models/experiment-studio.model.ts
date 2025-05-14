export interface BubbleData {
  code: string;
  label: string;
  value: number;
  group?: string;
  children?: BubbleData[];
}

export interface HierarchyData {
  label: string;
  children?: BubbleData[];
  value?: number; // Optional, depending on how you process the hierarchy
}
