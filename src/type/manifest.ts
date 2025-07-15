export interface Author {
  name: string;
  author_url?: string;
}

export interface DownloadItem {
  version: string;
  file_name: string;
}

export interface Manifest {
  item: {
    name: string;
    description: string;
    preview: string[];
    icon: string;
    source_url?: string;
    author: Author[];
  };
  downloads: Record<string, DownloadItem>;
}

export type AppMode = 'manifest' | 'csv';