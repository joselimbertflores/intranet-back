export class DirectoryEntryTreeDto {
  id: number;
  name: string;
  internalPhone?: string;
  landlinePhone?: string;
  order: number;
  children: DirectoryEntryTreeDto[];
}
