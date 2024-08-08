import express from "express";
import  { getAllData } from "../controller/performance.js";
const performance = express.Router();

performance.post("/performance", getAllData);

export default performance;
