// server.js
import express from "express";
import cors from "cors";
import ytdl from "ytdl-core";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

// --- Analyze Route ---
app.post("/analyze", async (req, res) => {
  try {
    let { url } = req.body;

    let responseData = null;
    let platform = "unknown";

    // ---------- YouTube ----------
    if (url.includes("youtube.com/shorts/")) {
      const videoId = url.split("/shorts/")[1].split("?")[0];
      url = `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (ytdl.validateURL(url)) {
      platform = "youtube";
      const info = await ytdl.getInfo(url);
      responseData = {
        title: info.videoDetails.title,
        description: info.videoDetails.author.name,
        icon: "https://www.youtube.com/s/desktop/feather.png",
        downloads: [
          {
            label: "MP4 720p",
            url: `/download?url=${encodeURIComponent(url)}&format=mp4`,
            icon: "🎥",
          },
          {
            label: "MP3 Audio",
            url: `/download?url=${encodeURIComponent(url)}&format=mp3`,
            icon: "🎵",
          },
        ],
      };
    }

    // ---------- Instagram ----------
    else if (url.includes("instagram.com")) {
      platform = "instagram";
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $("meta[property='og:title']").attr("content") || "Instagram Post";
      const mediaUrl = $("meta[property='og:video']").attr("content") ||
                       $("meta[property='og:image']").attr("content");

      if (mediaUrl) {
        responseData = {
          title,
          description: "Instagram Media",
          icon: "https://www.instagram.com/static/images/ico/favicon-200.png/ab6eff595bb1.png",
          downloads: [
            {
              label: mediaUrl.endsWith(".mp4") ? "MP4 Video" : "Image",
              url: `/download?url=${encodeURIComponent(mediaUrl)}&format=direct`,
              icon: mediaUrl.endsWith(".mp4") ? "🎥" : "🖼️",
            },
          ],
        };
      }
    }

    // ---------- Pinterest ----------
    else if (url.includes("pinterest.com")) {
      platform = "pinterest";
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $("meta[property='og:title']").attr("content") || "Pinterest Pin";
      const mediaUrl = $("meta[property='og:image']").attr("content");

      if (mediaUrl) {
        responseData = {
          title,
          description: "Pinterest Media",
          icon: "https://s.pinimg.com/webapp/favicon-54a5b2d5.png",
          downloads: [
            {
              label: "Image",
              url: `/download?url=${encodeURIComponent(mediaUrl)}&format=direct`,
              icon: "🖼️",
            },
          ],
        };
      }
    }

    // ---------- Unsupported ----------
    if (!responseData) {
      return res.status(400).json({ error: "Unsupported or invalid URL" });
    }

    res.json({ platform, ...responseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze URL" });
  }
});

// --- Download Route ---
app.get("/download", async (req, res) => {
  try {
    let { url, format } = req.query;

    // --- YouTube ---
    if (ytdl.validateURL(url)) {
      if (format === "mp3") {
        res.header("Content-Disposition", 'attachment; filename="audio.mp3"');
        return ytdl(url, { filter: "audioonly" }).pipe(res);
      } else {
        res.header("Content-Disposition", 'attachment; filename="video.mp4"');
        return ytdl(url, { quality: "highest" }).pipe(res);
      }
    }

    // --- Direct Media (Instagram / Pinterest) ---
    if (format === "direct") {
      const fileExt = url.endsWith(".mp4") ? "mp4" : "jpg";
      res.header("Content-Disposition", `attachment; filename="media.${fileExt}"`);
      const response = await axios.get(url, { responseType: "stream" });
      return response.data.pipe(res);
    }

    res.status(400).json({ error: "Invalid download request" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
