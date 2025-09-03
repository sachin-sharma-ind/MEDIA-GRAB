import express from "express";
import cors from "cors";
import ytdl from "ytdl-core";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// ✅ Universal analyze endpoint
app.get("/analyze", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Handle YouTube
    if (ytdl.validateURL(url)) {
      const info = await ytdl.getInfo(url);
      const formats = info.formats.map(f => ({
        quality: f.qualityLabel,
        mimeType: f.mimeType,
        url: f.url
      }));
      return res.json({ platform: "youtube", title: info.videoDetails.title, formats });
    }

    // Handle Instagram
    if (url.includes("instagram.com")) {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const $ = cheerio.load(response.data);
      const video = $("meta[property='og:video']").attr("content");
      const image = $("meta[property='og:image']").attr("content");
      return res.json({ platform: "instagram", video, image });
    }

    // Handle Pinterest
    if (url.includes("pinterest.com")) {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const $ = cheerio.load(response.data);
      const image = $("meta[property='og:image']").attr("content");
      return res.json({ platform: "pinterest", image });
    }

    return res.status(400).json({ error: "Unsupported URL" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});


/**
 * Universal analyze route
 */
app.post("/analyze", async (req, res) => {
  const { platform, url } = req.body;

  if (!platform || !url) {
    return res.status(400).json({ error: "Platform and URL are required" });
  }

  try {
    // ✅ YouTube Handler
    if (platform === "youtube") {
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      const info = await ytdl.getInfo(url);
      const formats = info.formats
        .filter(f => f.url && f.qualityLabel)
        .map(f => ({
          icon: "🎬",
          label: f.qualityLabel,
          url: f.url,
        }));

      return res.json({
        icon: "📺",
        title: info.videoDetails.title,
        description: info.videoDetails.description,
        downloads: formats,
      });
    }

    // ✅ Instagram Handler
    if (platform === "instagram") {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const $ = cheerio.load(response.data);
      const video = $("meta[property='og:video']").attr("content");
      const image = $("meta[property='og:image']").attr("content");

      return res.json({
        icon: "📷",
        title: "Instagram Post",
        description: video ? "Video Post" : "Image Post",
        downloads: [
          { icon: video ? "🎥" : "🖼️", label: video ? "Video" : "Image", url: video || image },
        ],
      });
    }

    // ✅ Pinterest Handler
    if (platform === "pinterest") {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const $ = cheerio.load(response.data);
      const image = $("meta[property='og:image']").attr("content");

      return res.json({
        icon: "📌",
        title: "Pinterest Image",
        description: "Pinterest post media",
        downloads: [{ icon: "🖼️", label: "Image", url: image }],
      });
    }

    return res.status(400).json({ error: "Invalid platform" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Failed to fetch media" });
  }
});

// Old routes (optional, for testing)
app.get("/", (req, res) => res.send("✅ MediaGrab backend running!"));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
