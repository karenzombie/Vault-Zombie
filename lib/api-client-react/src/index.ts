export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter, ApiError, getApiErrorDetail } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
