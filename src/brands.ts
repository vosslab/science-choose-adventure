export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CardId = Brand<string, "CardId">;
export type SaveSlotId = Brand<string, "SaveSlotId">;

export function cardId(value: string): CardId {
  if (value.length === 0) {
    throw new Error("CardId cannot be empty.");
  }
  return value as CardId;
}

export function saveSlotId(value: string): SaveSlotId {
  if (value.length === 0) {
    throw new Error("SaveSlotId cannot be empty.");
  }
  return value as SaveSlotId;
}
