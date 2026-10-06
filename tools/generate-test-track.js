const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");

const musicDir = path.join(__dirname, "..", "music");
const output = path.join(musicDir, "Tribulation_Radio_Keep_the_Faith.mp3");

fs.mkdirSync(musicDir, { recursive: true });

if (!ffmpegPath) {
  throw new Error("ffmpeg-static is not available.");
}

const filter = [
  "[0:a]volume=0.16[a]",
  "[1:a]volume=0.11[b]",
  "[2:a]volume=0.10[c]",
  "[3:a]volume=0.07[d]",
  "[4:a]volume=0.05[e]",
  "[5:a]volume=0.04[f]",
  "[a][b][c][d][e][f]amix=inputs=6:duration=longest:normalize=0,volume=1.4[out]"
].join(";");

const args = [
  "-y",
  "-hide_banner",
  "-loglevel", "error",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=220:sample_rate=44100",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=277.18:sample_rate=44100",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=329.63:sample_rate=44100",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=440:sample_rate=44100",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=523.25:sample_rate=44100",
  "-f", "lavfi", "-t", "90",
  "-i", "sine=frequency=659.25:sample_rate=44100",
  "-filter_complex", filter,
  "-map", "[out]",
  "-af", "afade=t=in:st=0:d=2,afade=t=out:st=88:d=2",
  "-ar", "44100",
  "-ac", "2",
  "-b:a", "128k",
  output
];

console.log("Generating original Tribulation Radio test track...");
const result = spawnSync(ffmpegPath, args, { stdio: "inherit" });

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Created:", output);
