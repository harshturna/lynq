// Country centroids keyed by the country *names* ip-api.com returns, since
// that is what lands in `sessions.country` (see getCountryAndCityFromIp in
// lib/actions.ts — it requests `fields=status,country,city`, no lat/lon).
//
// Resolving from names rather than stored coordinates is deliberate: it means
// the globe lights up on all existing historical data with no migration and
// no backfill.

export type Centroid = {
  /** ISO 3166-1 alpha-2, used to derive the flag emoji */
  code: string;
  lat: number;
  lon: number;
};

export const countryCentroids: Record<string, Centroid> = {
  Afghanistan: { code: "AF", lat: 33.94, lon: 67.71 },
  Albania: { code: "AL", lat: 41.15, lon: 20.17 },
  Algeria: { code: "DZ", lat: 28.03, lon: 1.66 },
  Angola: { code: "AO", lat: -11.2, lon: 17.87 },
  Argentina: { code: "AR", lat: -38.42, lon: -63.62 },
  Armenia: { code: "AM", lat: 40.07, lon: 45.04 },
  Australia: { code: "AU", lat: -25.27, lon: 133.78 },
  Austria: { code: "AT", lat: 47.52, lon: 14.55 },
  Azerbaijan: { code: "AZ", lat: 40.14, lon: 47.58 },
  Bahamas: { code: "BS", lat: 25.03, lon: -77.4 },
  Bahrain: { code: "BH", lat: 26.07, lon: 50.56 },
  Bangladesh: { code: "BD", lat: 23.68, lon: 90.36 },
  Barbados: { code: "BB", lat: 13.19, lon: -59.54 },
  Belarus: { code: "BY", lat: 53.71, lon: 27.95 },
  Belgium: { code: "BE", lat: 50.5, lon: 4.47 },
  Belize: { code: "BZ", lat: 17.19, lon: -88.5 },
  Benin: { code: "BJ", lat: 9.31, lon: 2.32 },
  Bhutan: { code: "BT", lat: 27.51, lon: 90.43 },
  Bolivia: { code: "BO", lat: -16.29, lon: -63.59 },
  "Bosnia and Herzegovina": { code: "BA", lat: 43.92, lon: 17.68 },
  Botswana: { code: "BW", lat: -22.33, lon: 24.68 },
  Brazil: { code: "BR", lat: -14.24, lon: -51.93 },
  Brunei: { code: "BN", lat: 4.54, lon: 114.73 },
  Bulgaria: { code: "BG", lat: 42.73, lon: 25.49 },
  "Burkina Faso": { code: "BF", lat: 12.24, lon: -1.56 },
  Burundi: { code: "BI", lat: -3.37, lon: 29.92 },
  Cambodia: { code: "KH", lat: 12.57, lon: 104.99 },
  Cameroon: { code: "CM", lat: 7.37, lon: 12.35 },
  Canada: { code: "CA", lat: 56.13, lon: -106.35 },
  "Cape Verde": { code: "CV", lat: 16.0, lon: -24.01 },
  "Central African Republic": { code: "CF", lat: 6.61, lon: 20.94 },
  Chad: { code: "TD", lat: 15.45, lon: 18.73 },
  Chile: { code: "CL", lat: -35.68, lon: -71.54 },
  China: { code: "CN", lat: 35.86, lon: 104.2 },
  Colombia: { code: "CO", lat: 4.57, lon: -74.3 },
  "Costa Rica": { code: "CR", lat: 9.75, lon: -83.75 },
  Croatia: { code: "HR", lat: 45.1, lon: 15.2 },
  Cuba: { code: "CU", lat: 21.52, lon: -77.78 },
  Cyprus: { code: "CY", lat: 35.13, lon: 33.43 },
  Czechia: { code: "CZ", lat: 49.82, lon: 15.47 },
  "Democratic Republic of the Congo": { code: "CD", lat: -4.04, lon: 21.76 },
  Denmark: { code: "DK", lat: 56.26, lon: 9.5 },
  Djibouti: { code: "DJ", lat: 11.83, lon: 42.59 },
  "Dominican Republic": { code: "DO", lat: 18.74, lon: -70.16 },
  Ecuador: { code: "EC", lat: -1.83, lon: -78.18 },
  Egypt: { code: "EG", lat: 26.82, lon: 30.8 },
  "El Salvador": { code: "SV", lat: 13.79, lon: -88.9 },
  Estonia: { code: "EE", lat: 58.6, lon: 25.01 },
  Eswatini: { code: "SZ", lat: -26.52, lon: 31.47 },
  Ethiopia: { code: "ET", lat: 9.15, lon: 40.49 },
  Fiji: { code: "FJ", lat: -16.58, lon: 179.41 },
  Finland: { code: "FI", lat: 61.92, lon: 25.75 },
  France: { code: "FR", lat: 46.23, lon: 2.21 },
  Gabon: { code: "GA", lat: -0.8, lon: 11.61 },
  Gambia: { code: "GM", lat: 13.44, lon: -15.31 },
  Georgia: { code: "GE", lat: 42.32, lon: 43.36 },
  Germany: { code: "DE", lat: 51.17, lon: 10.45 },
  Ghana: { code: "GH", lat: 7.95, lon: -1.02 },
  Greece: { code: "GR", lat: 39.07, lon: 21.82 },
  Guatemala: { code: "GT", lat: 15.78, lon: -90.23 },
  Guinea: { code: "GN", lat: 9.95, lon: -9.7 },
  Guyana: { code: "GY", lat: 4.86, lon: -58.93 },
  Haiti: { code: "HT", lat: 18.97, lon: -72.29 },
  Honduras: { code: "HN", lat: 15.2, lon: -86.24 },
  "Hong Kong": { code: "HK", lat: 22.4, lon: 114.11 },
  Hungary: { code: "HU", lat: 47.16, lon: 19.5 },
  Iceland: { code: "IS", lat: 64.96, lon: -19.02 },
  India: { code: "IN", lat: 20.59, lon: 78.96 },
  Indonesia: { code: "ID", lat: -0.79, lon: 113.92 },
  Iran: { code: "IR", lat: 32.43, lon: 53.69 },
  Iraq: { code: "IQ", lat: 33.22, lon: 43.68 },
  Ireland: { code: "IE", lat: 53.41, lon: -8.24 },
  Israel: { code: "IL", lat: 31.05, lon: 34.85 },
  Italy: { code: "IT", lat: 41.87, lon: 12.57 },
  "Ivory Coast": { code: "CI", lat: 7.54, lon: -5.55 },
  Jamaica: { code: "JM", lat: 18.11, lon: -77.3 },
  Japan: { code: "JP", lat: 36.2, lon: 138.25 },
  Jordan: { code: "JO", lat: 30.59, lon: 36.24 },
  Kazakhstan: { code: "KZ", lat: 48.02, lon: 66.92 },
  Kenya: { code: "KE", lat: -0.02, lon: 37.91 },
  Kuwait: { code: "KW", lat: 29.31, lon: 47.48 },
  Kyrgyzstan: { code: "KG", lat: 41.2, lon: 74.77 },
  Laos: { code: "LA", lat: 19.86, lon: 102.5 },
  Latvia: { code: "LV", lat: 56.88, lon: 24.6 },
  Lebanon: { code: "LB", lat: 33.85, lon: 35.86 },
  Libya: { code: "LY", lat: 26.34, lon: 17.23 },
  Lithuania: { code: "LT", lat: 55.17, lon: 23.88 },
  Luxembourg: { code: "LU", lat: 49.82, lon: 6.13 },
  Macao: { code: "MO", lat: 22.2, lon: 113.54 },
  Madagascar: { code: "MG", lat: -18.77, lon: 46.87 },
  Malawi: { code: "MW", lat: -13.25, lon: 34.3 },
  Malaysia: { code: "MY", lat: 4.21, lon: 101.98 },
  Maldives: { code: "MV", lat: 3.2, lon: 73.22 },
  Mali: { code: "ML", lat: 17.57, lon: -4.0 },
  Malta: { code: "MT", lat: 35.94, lon: 14.38 },
  Mauritius: { code: "MU", lat: -20.35, lon: 57.55 },
  Mexico: { code: "MX", lat: 23.63, lon: -102.55 },
  Moldova: { code: "MD", lat: 47.41, lon: 28.37 },
  Mongolia: { code: "MN", lat: 46.86, lon: 103.85 },
  Montenegro: { code: "ME", lat: 42.71, lon: 19.37 },
  Morocco: { code: "MA", lat: 31.79, lon: -7.09 },
  Mozambique: { code: "MZ", lat: -18.67, lon: 35.53 },
  Myanmar: { code: "MM", lat: 21.91, lon: 95.96 },
  Namibia: { code: "NA", lat: -22.96, lon: 18.49 },
  Nepal: { code: "NP", lat: 28.39, lon: 84.12 },
  Netherlands: { code: "NL", lat: 52.13, lon: 5.29 },
  "New Zealand": { code: "NZ", lat: -40.9, lon: 174.89 },
  Nicaragua: { code: "NI", lat: 12.87, lon: -85.21 },
  Niger: { code: "NE", lat: 17.61, lon: 8.08 },
  Nigeria: { code: "NG", lat: 9.08, lon: 8.68 },
  "North Macedonia": { code: "MK", lat: 41.61, lon: 21.75 },
  Norway: { code: "NO", lat: 60.47, lon: 8.47 },
  Oman: { code: "OM", lat: 21.51, lon: 55.92 },
  Pakistan: { code: "PK", lat: 30.38, lon: 69.35 },
  Palestine: { code: "PS", lat: 31.95, lon: 35.23 },
  Panama: { code: "PA", lat: 8.54, lon: -80.78 },
  "Papua New Guinea": { code: "PG", lat: -6.31, lon: 143.96 },
  Paraguay: { code: "PY", lat: -23.44, lon: -58.44 },
  Peru: { code: "PE", lat: -9.19, lon: -75.02 },
  Philippines: { code: "PH", lat: 12.88, lon: 121.77 },
  Poland: { code: "PL", lat: 51.92, lon: 19.15 },
  Portugal: { code: "PT", lat: 39.4, lon: -8.22 },
  "Puerto Rico": { code: "PR", lat: 18.22, lon: -66.59 },
  Qatar: { code: "QA", lat: 25.35, lon: 51.18 },
  "Republic of the Congo": { code: "CG", lat: -0.23, lon: 15.83 },
  Romania: { code: "RO", lat: 45.94, lon: 24.97 },
  Russia: { code: "RU", lat: 61.52, lon: 105.32 },
  Rwanda: { code: "RW", lat: -1.94, lon: 29.87 },
  "Saudi Arabia": { code: "SA", lat: 23.89, lon: 45.08 },
  Senegal: { code: "SN", lat: 14.5, lon: -14.45 },
  Serbia: { code: "RS", lat: 44.02, lon: 21.01 },
  Singapore: { code: "SG", lat: 1.35, lon: 103.82 },
  Slovakia: { code: "SK", lat: 48.67, lon: 19.7 },
  Slovenia: { code: "SI", lat: 46.15, lon: 14.99 },
  Somalia: { code: "SO", lat: 5.15, lon: 46.2 },
  "South Africa": { code: "ZA", lat: -30.56, lon: 22.94 },
  "South Korea": { code: "KR", lat: 35.91, lon: 127.77 },
  "South Sudan": { code: "SS", lat: 6.877, lon: 31.307 },
  Spain: { code: "ES", lat: 40.46, lon: -3.75 },
  "Sri Lanka": { code: "LK", lat: 7.87, lon: 80.77 },
  Sudan: { code: "SD", lat: 12.86, lon: 30.22 },
  Suriname: { code: "SR", lat: 3.92, lon: -56.03 },
  Sweden: { code: "SE", lat: 60.13, lon: 18.64 },
  Switzerland: { code: "CH", lat: 46.82, lon: 8.23 },
  Syria: { code: "SY", lat: 34.8, lon: 38.997 },
  Taiwan: { code: "TW", lat: 23.7, lon: 120.96 },
  Tajikistan: { code: "TJ", lat: 38.86, lon: 71.28 },
  Tanzania: { code: "TZ", lat: -6.37, lon: 34.89 },
  Thailand: { code: "TH", lat: 15.87, lon: 100.99 },
  Togo: { code: "TG", lat: 8.62, lon: 0.82 },
  "Trinidad and Tobago": { code: "TT", lat: 10.69, lon: -61.22 },
  Tunisia: { code: "TN", lat: 33.89, lon: 9.54 },
  Turkey: { code: "TR", lat: 38.96, lon: 35.24 },
  Turkmenistan: { code: "TM", lat: 38.97, lon: 59.56 },
  Uganda: { code: "UG", lat: 1.37, lon: 32.29 },
  Ukraine: { code: "UA", lat: 48.38, lon: 31.17 },
  "United Arab Emirates": { code: "AE", lat: 23.42, lon: 53.85 },
  "United Kingdom": { code: "GB", lat: 55.38, lon: -3.44 },
  "United States": { code: "US", lat: 37.09, lon: -95.71 },
  Uruguay: { code: "UY", lat: -32.52, lon: -55.77 },
  Uzbekistan: { code: "UZ", lat: 41.38, lon: 64.59 },
  Venezuela: { code: "VE", lat: 6.42, lon: -66.59 },
  Vietnam: { code: "VN", lat: 14.06, lon: 108.28 },
  Yemen: { code: "YE", lat: 15.55, lon: 48.52 },
  Zambia: { code: "ZM", lat: -13.13, lon: 27.85 },
  Zimbabwe: { code: "ZW", lat: -19.02, lon: 29.15 },
};

// ip-api and other geo sources disagree on a handful of country names, and the
// naming has drifted over the years. Map the common variants onto our keys so
// historical rows still resolve.
const aliases: Record<string, string> = {
  "United States of America": "United States",
  USA: "United States",
  US: "United States",
  UK: "United Kingdom",
  "Great Britain": "United Kingdom",
  "Russian Federation": "Russia",
  "Czech Republic": "Czechia",
  "Viet Nam": "Vietnam",
  "Korea, Republic of": "South Korea",
  "Republic of Korea": "South Korea",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Congo, The Democratic Republic of the": "Democratic Republic of the Congo",
  Congo: "Republic of the Congo",
  "Macedonia": "North Macedonia",
  "Cabo Verde": "Cape Verde",
  "Türkiye": "Turkey",
  Turkiye: "Turkey",
  "Hong Kong SAR China": "Hong Kong",
  "Macau": "Macao",
  "State of Palestine": "Palestine",
  Swaziland: "Eswatini",
  Burma: "Myanmar",
};

export function lookupCentroid(country: string | null): Centroid | null {
  if (!country || country === "Unknown") return null;
  const direct = countryCentroids[country];
  if (direct) return direct;

  const aliased = aliases[country];
  if (aliased && countryCentroids[aliased]) return countryCentroids[aliased];

  return null;
}

/** ISO 3166-1 alpha-2 -> regional indicator pair, e.g. "US" -> 🇺🇸 */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1a5 + c.charCodeAt(0))
  );
}

export function countryFlag(country: string | null): string {
  const centroid = lookupCentroid(country);
  return centroid ? flagEmoji(centroid.code) : "";
}
