export interface Destination {
  id: number;
  name: string;
  englishName?: string;
  code?: string;
  latitude?: number;
  longitude?: number;
  stateId?: number;
  stateName?: string;
  countryId?: string;
  countryName?: string;
}

export interface Country {
  id: string;
  name: string;
  code?: string;
}

export interface State {
  id: number;
  name: string;
  englishName?: string;
  code?: string;
  countryId: string;
}
