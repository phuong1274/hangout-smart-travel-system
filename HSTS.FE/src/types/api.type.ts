export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedRequest {
  pageIndex?: number;
  pageSize?: number;
  searchTerm?: string;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  errors?: Record<string, string[]>;
}
