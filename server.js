import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import ytdl from "ytdl-core";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root test
app.get("/", (req, res) => {
  res.send("🚀 Media Grab Backend is Running!");
});

// ✅ Universal analyze endpoint (POST)
app.post("/analyze", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // 🎥 Handle YouTube
    if (ytdl.validateURL(url)) {
      const info = await ytdl.getInfo(url);
      const formats = info.formats.map(f => ({
        quality: f.qualityLabel,
        mimeType: f.mimeType,
        url: f.url
      }));
      return res.json({
        platform: "youtube",
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails.pop()?.url,
        formats
      });
    }

    // 📸 Handle Instagram
    if (url.includes("instagram.com")) {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const $ = cheerio.load(response.data);
      const video = $("meta[property='og:video']").attr("content");
      const image = $("meta[property='og:image']").attr("content");
      return res.json({ platform: "instagram", video, image });
    }

    // 📌 Handle Pinterest
    if (url.includes("pinterest.com")) {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const $ = cheerio.load(response.data);
      const image = $("meta[property='og:image']").attr("content");
      return res.json({ platform: "pinterest", image });
    }

    // ❌ If not supported
    return res.status(400).json({ error: "Unsupported URL" });

  } catch (err) {
    console.error("❌ Error analyzing URL:", err.message);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
