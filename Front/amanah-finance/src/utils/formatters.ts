export const money = (value: number | string) =>
  `${Number(value ?? 0).toLocaleString("en-US")} ج.م`;