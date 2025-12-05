export interface GooglePayParams {
  upiId: string;
  amount: number;
  name: string;
  note: string;
}

export function generateGooglePayUrl({ upiId, amount, name, note }: GooglePayParams): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });

  return `upi://pay?${params.toString()}`;
}

export function openGooglePay(params: GooglePayParams): void {
  const url = generateGooglePayUrl(params);
  window.location.href = url;
}
