const youtubedl = require("youtube-dl-exec");
const express = require("express");
const app = express();
const port = 3000;
const path = require("path")
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
app.use("/downloads", express.static(path.join(__dirname, "downloads")));
const cors = require("cors");
app.use(cors());

app.use(express.json());
const downloadsPath = path.join(__dirname, "downloads");

if (!fs.existsSync(downloadsPath)) {
  fs.mkdirSync(downloadsPath);

}
function normalizeYouTubeLink(link) {
  return link.includes("shorts/")
    ? link.replace("shorts/", "watch?v=").split("?")[0]
    : link;
}
function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function scheduleFileDeletion(filePath, delayInMs) {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`❌ Failed to delete ${filePath}:`, err);
      } else {
        console.log(`🧹 Auto-deleted ${filePath} .`);
      }
    });
  }, delayInMs);
}

async function dlVid(link, quality) {
  const randomName = generateRandomString(20);
  const ext = quality === "audio" ? "webm" : "mp4";
  const outputPath = path.join("downloads", `${randomName}.${ext}`);

  // Decide format based on quality
  let format;
  switch (quality) {
    case "720p":
      format = "bestvideo[height<=720]+bestaudio/best[height<=720]";
      break;
    case "480p":
      format = "bestvideo[height<=480]+bestaudio/best[height<=480]";
      break;
    case "audio":
      format = "bestaudio";
      break;
    case "best":
    default:
      format = "bestvideo+bestaudio/best";
  }

  try {
    await youtubedl(link, {
      format: format, // set above based on quality
      output: outputPath, // e.g. downloads/abc123.mp4
      mergeOutputFormat: ext, // ensures ffmpeg merges to correct type
      ffmpegLocation: ffmpegPath, // optional: only needed if ffmpeg isn't in PATH
      cookies: path.join(__dirname, "cookies.txt"),
      verbose: true, // optional: useful for debugging
    });

    // Optional: verify the file exists before returning the link
    if (fs.existsSync(outputPath)) {
      return `/downloads/${randomName}.${ext}`;
    } else {
    
      return null;
    }
  } catch (err) {
 console.log(err)
    return null;
  }
}
  
  




app.post("/dl", async (req, res) => {
  const { link, quality } = req.body;
  const videoLink = await dlVid(link, quality); 
  const linkFD = __dirname + videoLink;
  const fullUrl = `${req.protocol}://${req.get("host")}${videoLink}`;
  if (videoLink) {
    scheduleFileDeletion(linkFD, 900000);
    res.json({ fullUrl: fullUrl })
  } else {
    res.json({message: "error"})
  }
});
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// Trust the proxy (important for Render and Heroku)
app.enable('trust proxy');

// Force HTTPS in generated URLs
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

app.listen(port, () => {
  console.log("Server is running on port 3000");
})

