import express from "express";
import { getWeatherForecast } from "../controllers/weather.controller.js";

const router = express.Router();

router.get("/forecast", getWeatherForecast);

export default router;
