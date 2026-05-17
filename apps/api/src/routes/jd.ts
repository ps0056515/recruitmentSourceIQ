import { Router } from "express";
import { parseJdFromText } from "../services/jdParser.js";

export const jdRouter = Router();

jdRouter.post("/parse", async (req, res) => {
  const text = String(req.body?.text ?? "");
  if (!text.trim()) return res.status(400).json({ error: "text_required" });
  const parsed = await parseJdFromText(text);
  res.json({ parsed });
});
