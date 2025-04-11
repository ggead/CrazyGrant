export default function calculatePrice(amountBNB: bigint, amountToken: bigint) {
  const price = (amountBNB * 10n ** 18n) / amountToken

  if ((amountBNB * 10n ** 18n) / price <= amountToken) {
    return price
  }

  return getPrice(amountBNB, price, amountToken)
}

function getPrice(amountBNB: bigint, price: bigint, amountToken: bigint) {
  while ((amountBNB * 10n ** 18n) / price > amountToken) {
    price += 1n
  }

  return price
}
