const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"]);

class StationEngine {
  constructor({ musicDir, stationIdDir, announcementDir, volume = 80 }) {
    this.musicDir = musicDir;
    this.stationIdDir = stationIdDir;
    this.announcementDir = announcementDir;
    this.volume = Math.min(100, Math.max(0, Number(volume)));

    this.running = false;
    this.ffmpeg = null;
    this.currentTrack = null;
    this.startedAt = null;
    this.trackStartedAt = null;
    this.listeners = new Set();
    this.playlist = [];
    this.index = 0;
    this.mode = "shuffle";
    this.priorityQueue = [];
    this.restarting = false;

    this.ensureDirectories();

    this.onTrackStart = null;
    this.onTrackEnd = null;
  }

  ensureDirectories() {
    for (const dir of [this.musicDir, this.stationIdDir, this.announcementDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  scanDirectory(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => path.join(dir, entry.name))
      .filter(file => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()));
  }

  refreshPlaylist() {
    const music = this.scanDirectory(this.musicDir);
    const ids = this.scanDirectory(this.stationIdDir);
    const announcements = this.scanDirectory(this.announcementDir);

    this.playlist = [];

    for (const file of music) this.playlist.push({ file, type: "music" });
    for (const file of ids) this.playlist.push({ file, type: "station-id" });
    for (const file of announcements) this.playlist.push({ file, type: "announcement" });

    return this.playlist;
  }

  getTrackName(file) {
    return path.basename(file, path.extname(file));
  }

  chooseNext() {
    if (this.priorityQueue.length) return this.priorityQueue.shift();
    if (!this.playlist.length) return null;

    if (this.mode === "sequential") {
      const item = this.playlist[this.index % this.playlist.length];
      this.index = (this.index + 1) % this.playlist.length;
      return item;
    }

    const next = Math.floor(Math.random() * this.playlist.length);
    this.index = next;
    return this.playlist[next];
  }

  async start() {
    if (this.running) return this.getStatus();

    this.refreshPlaylist();

    if (!this.playlist.length) {
      throw new Error("No station audio found. Add your own audio files to music/, station-ids/, or announcements/.");
    }

    this.running = true;
    this.startedAt = new Date();
    this.playNext();

    return this.getStatus();
  }

  stop() {
    this.running = false;
    this.restarting = false;
    this.currentTrack = null;
    this.trackStartedAt = null;

    if (this.ffmpeg) {
      this.ffmpeg.kill("SIGKILL");
      this.ffmpeg = null;
    }

    for (const response of this.listeners) {
      try {
        response.end();
      } catch {}
    }

    this.listeners.clear();
  }

  restart() {
    this.stop();
    return this.start();
  }

  playNext() {
    if (!this.running) return;

    this.refreshPlaylist();

    if (!this.playlist.length) {
      this.currentTrack = null;
      setTimeout(() => this.playNext(), 5000);
      return;
    }

    const item = this.chooseNext();
    this.currentTrack = {
      title: this.getTrackName(item.file),
      type: item.type,
      file: item.file
    };
    this.trackStartedAt = new Date();

    if (typeof this.onTrackStart === "function") {
      Promise.resolve(this.onTrackStart(this.currentTrack)).catch(error =>
        console.error("Station track-start hook error:", error.message)
      );
    }

    const volume = this.volume / 100;
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-re",
      "-i", item.file,
      "-vn",
      "-af", `volume=${volume}`,
      "-ac", "2",
      "-ar", "48000",
      "-b:a", "128k",
      "-f", "mp3",
      "pipe:1"
    ];

    console.log("Tribulation Radio playing:", this.currentTrack.title);

    this.ffmpeg = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.ffmpeg.stdout.on("data", chunk => {
      for (const response of this.listeners) {
        try {
          response.write(chunk);
        } catch {
          this.listeners.delete(response);
        }
      }
    });

    this.ffmpeg.stderr.on("data", data => {
      const message = data.toString().trim();
      if (message) console.error("Station FFmpeg:", message);
    });

    this.ffmpeg.on("error", error => {
      console.error("Station FFmpeg error:", error.message);
      if (this.running) this.scheduleNext();
    });

    this.ffmpeg.on("close", code => {
      this.ffmpeg = null;
      if (this.onTrackEnd && this.currentTrack) {
        Promise.resolve(this.onTrackEnd(this.currentTrack)).catch(error =>
          console.error("Station track-end hook error:", error.message)
        );
      }

      if (this.running) {
        console.log("Station track finished with code:", code);
        this.scheduleNext();
      }
    });
  }

  scheduleNext() {
    if (this.restarting || !this.running) return;

    this.restarting = true;
    setTimeout(() => {
      this.restarting = false;
      this.playNext();
    }, 750);
  }

  addListener(response) {
    response.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*"
    });

    this.listeners.add(response);

    const remove = () => this.listeners.delete(response);
    response.on("close", remove);
    response.on("error", remove);

    if (!this.running) {
      try {
        response.end();
      } catch {}
      this.listeners.delete(response);
    }
  }


  hasStationIds() {
    return this.scanDirectory(this.stationIdDir).length > 0;
  }

  hasAnnouncements() {
    return this.scanDirectory(this.announcementDir).length > 0;
  }

  queueStationId() {
    const files = this.scanDirectory(this.stationIdDir);
    if (!files.length) return false;
    const file = files[Math.floor(Math.random() * files.length)];
    this.priorityQueue.push({ file, type: "station-id" });
    return true;
  }

  queueAnnouncement() {
    const files = this.scanDirectory(this.announcementDir);
    if (!files.length) return false;
    const file = files[Math.floor(Math.random() * files.length)];
    this.priorityQueue.push({ file, type: "announcement" });
    return true;
  }

  queueFile(file, type = "request") {
    if (!file || !fs.existsSync(file)) return false;
    this.priorityQueue.push({ file, type });
    return true;
  }

  setVolume(value) {
    this.volume = Math.min(100, Math.max(0, Number(value)));
    if (this.running) {
      this.restart();
    }
  }

  getStatus() {
    return {
      running: this.running,
      currentTrack: this.currentTrack
        ? {
            title: this.currentTrack.title,
            type: this.currentTrack.type,
            startedAt: this.trackStartedAt?.toISOString() || null
          }
        : null,
      tracks: this.playlist.length,
      listeners: this.listeners.size,
      volume: this.volume,
      mode: this.mode,
      startedAt: this.startedAt?.toISOString() || null
    };
  }
}

module.exports = StationEngine;
