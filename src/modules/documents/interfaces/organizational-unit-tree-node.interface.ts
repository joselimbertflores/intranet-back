export interface OrganizationalUnitTreeNode {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  parentId: number | null;
  children: OrganizationalUnitTreeNode[];
}
