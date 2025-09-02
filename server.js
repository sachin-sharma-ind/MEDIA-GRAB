import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";   // ✅ fixed import
import ytdl from "ytdl-core";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root test
app.get("/", (req, res) => {
  res.send("🚀 Media Grab Backend is Running!");
});

// ✅ YouTube downloader
app.get("/api/youtube", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const info = await ytdl.getInfo(url);
    const formats = info.formats.map(f => ({
      quality: f.qualityLabel,
      mimeType: f.mimeType,
      url: f.url
    }));

    res.json({ title: info.videoDetails.title, formats });
  } catch (err) {
    console.error("YouTube Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Instagram downloader (basic example)
app.get("/api/instagram", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL required" });

    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const video = $("meta[property='og:video']").attr("content");
    const image = $("meta[property='og:image']").attr("content");

    res.json({ video, image });
  } catch (err) {
    console.error("Instagram Error:", err.message);
    res.status(500).json({ error: "Instagram fetch failed" });
  }
});

// ✅ Pinterest downloader (basic)
app.get("/api/pinterest", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL required" });

    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const image = $("meta[property='og:image']").attr("content");

    res.json({ image });
  } catch (err) {
    console.error("Pinterest Error:", err.message);
    res.status(500).json({ error: "Pinterest fetch failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
