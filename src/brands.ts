export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CardId = Brand<string, "CardId">;

export function cardId(value: string): CardId {
  if (value.length === 0) {
    throw new Error("CardId cannot be empty.");
  }
  return value as CardId;
}
