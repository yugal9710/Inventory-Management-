export interface Province {
  name: string;
  nameNp: string;
}

export interface District {
  name: string;
  nameNp: string;
  province: string;
}

export interface LocalLevel {
  sn: number;
  province: string;
  district: string;
  name: string;
  category: string;
  totalWards: number;
  fullTitle: string;
  fullTitleNp?: string;
}

export function getProvinces(): Province[];
export function getDistrictsByProvince(provinceName: string): District[];
export function getLocalLevelsByDistrict(provinceName: string, districtName: string): LocalLevel[];
export function getWardsByLocalLevel(provinceName: string, districtName: string, localLevelName: string): number[];
export function composeNepalAddress(loc: any, lang?: 'en' | 'np'): string;
export function findLocalLevel(nameOrId: string | number): LocalLevel | null;

export const PROVINCE_NAMES_NP: Record<string, string>;
export const DISTRICT_NAMES_NP: Record<string, string>;
export const CATEGORY_NAMES_NP: Record<string, string>;
