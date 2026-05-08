// 010-1234-5678 → 010-****-5678
// 01012345678   → 010-****-5678
// 가운데 자릿수가 가변(010/011/02 등)이라 항상 앞 3 + **** + 뒤 4 패턴으로 통일.
export function maskPhone(phone) {
  if (!phone) return "-";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
