const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const { spawn } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");

class RadioPlayer {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.connection = null;
    this.ffmpeg = null;
    this.running = false;
    this.restarting = false;

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.running) this.restartSoon();
    });

    this.player.on("error", error => {
      console.error("Radio player error:", error.message);
      if (this.running) this.restartSoon();
    });
  }

  async start() {
    if (!this.config.streamUrl) throw new Error("No radio stream URL is configured.");
    if (!this.config.voiceChannelId) throw new Error("No radio voice channel is configured.");

    const channel = await this.client.channels.fetch(this.config.voiceChannelId);
    if (!channel || !channel.isVoiceBased()) {
      throw new Error("Configured radio channel is not a voice channel.");
    }

    this.running = true;

    if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      this.connection.on("error", error => {
        console.error("Voice connection error:", error.message);
      });

      try {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 20000);
      } catch (error) {
        this.connection.destroy();
        this.connection = null;
        throw new Error("Voice connection failed: " + error.message);
      }
    }

    this.connection.subscribe(this.player);
    this.startStream();
    return channel;
  }

  startStream() {
    if (!this.running || !this.config.streamUrl) return;

    if (this.ffmpeg) {
      this.ffmpeg.kill("SIGKILL");
      this.ffmpeg = null;
    }

    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-i", this.config.streamUrl,
      "-vn",
      "-ac", "2",
      "-ar", "48000",
      "-f", "s16le",
      "pipe:1"
    ];

    console.log("Starting radio stream:", this.config.streamUrl);

    this.ffmpeg = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const resource = createAudioResource(this.ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });

    if (resource.volume) resource.volume.setVolume(this.config.volume / 100);

    this.ffmpeg.stderr.on("data", data => {
      const message = data.toString().trim();
      if (message) console.error("FFmpeg:", message);
    });

    this.ffmpeg.on("error", error => {
      console.error("FFmpeg error:", error.message);
      if (this.running) this.restartSoon();
    });

    this.ffmpeg.on("close", code => {
      console.log("FFmpeg exited with code:", code);
      if (this.running) this.restartSoon();
    });

    this.player.play(resource);
  }

  stop() {
    this.running = false;
    this.restarting = false;

    if (this.ffmpeg) {
      this.ffmpeg.kill("SIGKILL");
      this.ffmpeg = null;
    }

    this.player.stop(true);

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }

  async restart() {
    this.stop();
    this.running = true;
    return this.start();
  }

  restartSoon() {
    if (this.restarting || !this.running) return;
    this.restarting = true;

    setTimeout(async () => {
      this.restarting = false;
      if (!this.running) return;

      try {
        if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
          await this.start();
        } else {
          this.startStream();
        }
      } catch (error) {
        console.error("Radio reconnect failed:", error.message);
        this.restartSoon();
      }
    }, 3000);
  }

  setVolume(value) {
    this.config.volume = Math.min(100, Math.max(0, Number(value)));
    this.config.save();
  }

  getStatus() {
    return {
      running: this.running,
      connected: Boolean(
        this.connection &&
        this.connection.state.status === VoiceConnectionStatus.Ready
      ),
      streamConfigured: Boolean(this.config.streamUrl),
      volume: this.config.volume
    };
  }
}

module.exports = RadioPlayer;
