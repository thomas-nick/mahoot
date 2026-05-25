/** Hanko seal characters per manufacturer — stylized 判子 stamps */
export const HANKO_CHARS: Record<string, string> = {
  Discraft: "匠",
  Innova: "新",
  Discmania: "神",
  MVP: "丸",
  "Dynamic Discs": "動",
  DD: "動",
  DGA: "門",
  "Latitude 64": "北",
  Latitude64: "北",
  Prodigy: "才",
  Westside: "西",
  Axiom: "軸",
  Streamline: "流",
  Gateway: "関",
  Kastaplast: "石",
  Infinite: "無",
  ThoughtSpace: "想",
  OTB: "開",
  Mint: "薄",
  Clash: "衝",
};

export function getHankoChar(manufacturer: string): string {
  if (HANKO_CHARS[manufacturer]) return HANKO_CHARS[manufacturer];
  if (manufacturer.length <= 2) return manufacturer;
  return manufacturer.slice(0, 1).toUpperCase();
}

export function getHankoReading(manufacturer: string): string | null {
  const readings: Record<string, string> = {
    Discraft: "shō",
    Innova: "shin",
    Discmania: "jin",
    MVP: "maru",
    DGA: "mon",
    "Latitude 64": "hoku",
    Prodigy: "sai",
  };
  return readings[manufacturer] ?? null;
}
