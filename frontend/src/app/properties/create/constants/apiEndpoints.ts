const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  presignedUrl: () => `${getApiUrl()}/media/presigned-url`,
  geoSearch: (query: string) => `${getApiUrl()}/geo/search?q=${encodeURIComponent(query)}`,
  geoReverse: (lat: number, lon: number) => `${getApiUrl()}/geo/reverse?lat=${lat}&lon=${lon}`,
  properties: () => `${getApiUrl()}/properties`,
} as const;
