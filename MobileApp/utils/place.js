export function hasMapPoint(user) {
  const lat = Number(user?.location?.lat);
  const lon = Number(user?.location?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
}
