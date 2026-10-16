/**
 * Safely extracts a string ID whether the field is an ObjectId, a populated Mongoose document, or a string.
 */
export function extractEntityId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null) {
    if ("_id" in value && (value as { _id?: unknown })._id) {
      return String((value as { _id?: unknown })._id);
    }
    const str = String(value);
    if (str !== "[object Object]") {
      return str;
    }
  }
  return String(value);
}
