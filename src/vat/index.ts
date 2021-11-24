export const applyVAT = (value: number, vat: number): number => {
    return value * (100 + vat) / 100
}
