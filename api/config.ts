import { handleApi } from "../vercel-api-proxy";

export function GET(request: Request) {
  return handleApi(request);
}
