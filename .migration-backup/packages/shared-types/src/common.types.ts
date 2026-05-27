export type ID = string;
export type Timestamp = string;
export type Currency = "USD" | "EUR" | "GBP" | "SGD" | "MYR" | "PHP" | "THB" | "IDR";
export type Locale = "en" | "es" | "zh" | "id" | "th" | "ms";

export type GeoCoordinate = {
  lat: number;
  lng: number;
};

export type Address = {
  id?: ID;
  label?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: GeoCoordinate;
  notes?: string;
};

export type Money = {
  amount: number;
  currency: Currency;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SortOrder = "asc" | "desc";

export type DateRange = {
  from: Timestamp;
  to: Timestamp;
};

export type Media = {
  id: ID;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video";
  mimeType: string;
  sizeBytes: number;
  altText?: string;
};

export type AuditFields = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
};
