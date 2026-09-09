import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyWeather,
  shouldStoreWeatherAlert,
} from "./weatherAlert.js";

test("normal weather is not stored", () => {
  const result = classifyWeather({ temperature: 28, windspeed: 10 });
  assert.equal(result.kind, "update");
  assert.equal(shouldStoreWeatherAlert(result.kind), false);
});

test("heat, cold, and wind are stored", () => {
  assert.equal(classifyWeather({ temperature: 41, windspeed: 0 }).kind, "heat");
  assert.equal(classifyWeather({ temperature: 4, windspeed: 0 }).kind, "cold");
  assert.equal(classifyWeather({ temperature: 20, windspeed: 50 }).kind, "wind");
  assert.equal(shouldStoreWeatherAlert("heat"), true);
  assert.equal(shouldStoreWeatherAlert("cold"), true);
  assert.equal(shouldStoreWeatherAlert("wind"), true);
});
