const textFields = {
  username: 100,
  role: 20,
  gender: 20,
  bio: 500,
  dob: 10,
};
const nestedFields = {
  location: { address: 500, city: 120, state: 120, country: 120, pincode: 10 },
  governmentId: { idName: 80, idValue: 100 },
  socialLinks: { facebook: 300, instagram: 300 },
};

export function profileError(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Expected a profile object";
  const allowed = new Set([
    ...Object.keys(textFields),
    ...Object.keys(nestedFields),
    "languageSpoken",
    "profileVersion",
  ]);
  if (Object.keys(body).some((field) => !allowed.has(field)))
    return "Unsupported profile field";
  if (
    body.profileVersion !== undefined &&
    (!Number.isSafeInteger(body.profileVersion) || body.profileVersion < 0)
  )
    return "Invalid profile version";
  for (const [field, max] of Object.entries(textFields)) {
    if (
      body[field] !== undefined &&
      (typeof body[field] !== "string" || body[field].length > max)
    )
      return `Invalid ${field}`;
  }
  for (const [field, fields] of Object.entries(nestedFields)) {
    const value = body[field];
    if (value === undefined) continue;
    if (!value || typeof value !== "object" || Array.isArray(value))
      return `Invalid ${field}`;
    for (const [key, max] of Object.entries(fields)) {
      if (
        value[key] !== undefined &&
        (typeof value[key] !== "string" || value[key].length > max)
      )
        return `Invalid ${field}.${key}`;
    }
  }
  const location = body.location;
  if (
    body.governmentId?.idValue !== undefined &&
    !/^[A-Za-z0-9* -]*$/.test(body.governmentId.idValue)
  )
    return "Invalid government identifier";
  for (const [field, max] of [
    ["lat", 90],
    ["lon", 180],
  ]) {
    if (
      location?.[field] !== undefined &&
      (typeof location[field] !== "number" ||
        !Number.isFinite(location[field]) ||
        Math.abs(location[field]) > max)
    ) {
      return "Invalid coordinates";
    }
  }
  if (body.dob !== undefined && body.dob !== "") {
    const date = new Date(body.dob);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(body.dob) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== body.dob ||
      date > new Date()
    )
      return "Invalid date of birth";
  }
  if (
    body.languageSpoken !== undefined &&
    (!Array.isArray(body.languageSpoken) ||
      body.languageSpoken.length > 20 ||
      body.languageSpoken.some(
        (language) => typeof language !== "string" || language.length > 40,
      ))
  )
    return "Invalid languages";
  return null;
}

export function validateProfile(req, res, next) {
  const error = profileError(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  next();
}
