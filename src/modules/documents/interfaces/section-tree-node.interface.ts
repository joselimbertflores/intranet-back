export interface SectionTreeNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  isActive: boolean;
  parentId: string | null;
  children: SectionTreeNode[];
}