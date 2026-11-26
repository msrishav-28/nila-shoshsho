export function readBearer(req) {
  const header = req.headers.authorization || "";
  if (typeof header !== "string") return null;
  return /^Bearer ([^\s]+)$/.exec(header)?.[1] || null;
}
