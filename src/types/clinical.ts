export interface CommonTestType {
  id: string;
  name: string;
  category: string;
  default_unit: string | null;
  default_reference_range: string | null;
  description: string | null;
  price: number | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCommonTestTypeInput {
  name: string;
  category?: string;
  default_unit?: string | null;
  default_reference_range?: string | null;
  description?: string | null;
  price?: number | null;
  is_active?: boolean;
}

export interface UpdateCommonTestTypeInput {
  name?: string;
  category?: string;
  default_unit?: string | null;
  default_reference_range?: string | null;
  description?: string | null;
  price?: number | null;
  is_active?: boolean;
}

export const COMMON_TEST_CATEGORIES = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Parasitology',
  'Immunology',
  'Urinalysis',
  'Serology',
  'Toxicology',
  'Endocrinology',
  'General',
] as const;

export type CommonTestCategory = typeof COMMON_TEST_CATEGORIES[number];

