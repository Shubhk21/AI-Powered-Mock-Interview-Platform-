import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import dotenv from "dotenv";

dotenv.config();


if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath?.path) ffmpeg.setFfprobePath(ffprobePath.path);

const API_KEY = process.env.TWELVELABS_API_KEY;

console.log('TWELVELABS_API_KEY loaded:', process.env.TWELVELABS_API_KEY ? 'YES' : 'NO');

const tl = axios.create({
  baseURL: "https://api.twelvelabs.io/v1.3",
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
  }
});

const sessionIndexes: Record<string, string> = {};

async function fixWebM(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace('.webm', '-fixed.webm');
  
  return new Promise((resolve, reject) => {
    console.log("Fixing WebM metadata...");
    
    ffmpeg(inputPath)
      .outputOptions([
        '-c copy',
        '-avoid_negative_ts make_zero',
        '-fflags +genpts'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log("✅ WebM fixed");
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .run();
  });
}

async function getOrCreateIndex(sessionId: string): Promise<string> {
  if (sessionIndexes[sessionId]) {
    return sessionIndexes[sessionId];
  }

  const indexName = `session-${sessionId}-gen-v2`;

  try {
    console.log("Creating index...");

    const res = await tl.post("/indexes", {
      index_name: indexName,
      models: [
        { model_name: "marengo3.0", model_options: ["visual", "audio"] },
        { model_name: "pegasus1.2", model_options: ["visual", "audio"] }
      ]
    });

    const indexId = res.data._id;
    sessionIndexes[sessionId] = indexId;
    return indexId;

  } catch (err: any) {
    if (err.response?.data?.code === "index_name_already_exists") {
      console.log("Index exists. Fetching...");

      const list = await tl.get("/indexes");
      const indexes = list.data?.data?.items || list.data?.data || list.data;
      const existing = indexes.find((i: any) => i.index_name === indexName);

      sessionIndexes[sessionId] = existing._id;
      return existing._id;
    }

    throw err;
  }
}

async function uploadAsset(filePath: string): Promise<string> {
  const form = new FormData();
  form.append("method", "direct");
  form.append("file", fs.createReadStream(filePath));

  const res = await axios.post(
    "https://api.twelvelabs.io/v1.3/assets",
    form,
    { headers: { ...form.getHeaders(), "x-api-key": API_KEY } }
  );

  return res.data._id;
}

async function waitAssetReady(assetId: string): Promise<void> {
  while (true) {
    const res = await tl.get(`/assets/${assetId}`);
    if (res.data.status === "ready") return;
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function waitUntilIndexed(indexId: string, videoId: string): Promise<void> {
  while (true) {
    const res = await tl.get(`/indexes/${indexId}/indexed-assets`);
    const videos = res.data?.data || res.data?.items || res.data;
    const video = videos.find((v: any) => v._id === videoId);
    if (video?.status === "ready") return;
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function indexAsset(indexId: string, assetId: string): Promise<string> {
  const res = await tl.post(`/indexes/${indexId}/indexed-assets`, { asset_id: assetId });
  return res.data._id;
}

async function analyzeVideo(videoId: string): Promise<any> {
  const res = await tl.post("/analyze", {
    video_id: videoId,
    prompt: `
    If any of the below statements is true strictly return "True" else "False"
    1) Multiple people appears in the video.
    2) A mobile phone or any secondary device is visible.
    `,
    temperature: 0.2,
    stream: false
  });

  return res.data;
}

export async function processVideoChunk(filePath: string, sessionId: string): Promise<boolean> {
  let fixedFile: string | null = null;

  try {
    console.log("Processing video chunk:", sessionId);

    fixedFile = await fixWebM(filePath);
    const indexId = await getOrCreateIndex(sessionId);
    const assetId = await uploadAsset(fixedFile);

    console.log("Asset uploaded:", assetId);

    await waitAssetReady(assetId);
    const videoId = await indexAsset(indexId, assetId);

    console.log("Indexed video:", videoId);

    await waitUntilIndexed(indexId, videoId);
    const analysis = await analyzeVideo(videoId);

    console.log("ANALYSIS RESULT:", analysis);

    fs.unlinkSync(filePath);
    if (fixedFile) fs.unlinkSync(fixedFile);

    return analysis?.text?.includes("True") || false;

  } catch (err: any) {
    console.error("PROCESS ERROR:", err.response?.data || err.message);
    
    if (fixedFile && fs.existsSync(fixedFile)) {
      fs.unlinkSync(fixedFile);
    }

    return false;
  }
}
