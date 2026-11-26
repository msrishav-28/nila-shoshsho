export function hasMapPoint(user) {
  if (
    user?.location?.lat == null ||
    user?.location?.lon == null ||
    user.location.lat === '' ||
    user.location.lon === ''
  ) {
    return false;
  }
  const lat = Number(user?.location?.lat);
  const lon = Number(user?.location?.lon);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    (lat !== 0 || lon !== 0)
  );
}
