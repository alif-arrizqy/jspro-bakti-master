const lookup: Record<string, string> = {
  0: "0000",
  1: "0001",
  2: "0010",
  3: "0011",
  4: "0100",
  5: "0101",
  6: "0110",
  7: "0111",
  8: "1000",
  9: "1001",
  a: "1010",
  b: "1011",
  c: "1100",
  d: "1101",
  e: "1110",
  f: "1111",
  A: "1010",
  B: "1011",
  C: "1100",
  D: "1101",
  E: "1110",
  F: "1111",
};

export const hexToBin = (s: string): { bin: string; off: number; on: number } => {
  let bin = "";
  let off = 0;
  for (let i = 0, len = s.length; i < len; i++) {
    bin += lookup[s[i]] ?? "";
  }
  for (let i = 0, len = bin.length; i < len; i++) {
    off += bin[i] === "0" ? 1 : 0;
  }
  return { bin, off, on: 16 - off };
};

