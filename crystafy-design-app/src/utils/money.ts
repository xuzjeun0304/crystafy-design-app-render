export function cents(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function verifyDesignTotal(total: number, beads: Array<{ unitPrice: number; quantity: number }>): boolean {
  const expected = beads.reduce((sum, bead) => sum + bead.unitPrice * bead.quantity, 0);
  return Math.abs(expected - total) <= 0.02;
}
