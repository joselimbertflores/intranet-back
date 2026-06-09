export interface OrganizationalUnitTreeNode {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId: string | null;
  children: OrganizationalUnitTreeNode[];
}
