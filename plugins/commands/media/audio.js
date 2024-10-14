import fluent from "fluent-ffmpeg";
import ytdl from "ytdl-core";
import { join } from "path";
import { statSync, createReadStream } from "fs";
import axios from "axios"; // Make sure axios is installed

const _48MB = 48 * 1024 * 1024;

const config = {
  name: "audio",
  aliases: ["yt2mp3", "sing"],
  version: "1.0.3",
  description: "Play music from YouTube",
  usage: "<keyword/url>",
  cooldown: 30,
  credits: "XaviaTeam",
  extra: {
    MAX_SONGS: 6,
  },
};

const langData = {
  en_US: {
    "audio.missingArgument": "Please provide a keyword or URL",
    "audio.noResult": "No results found",
    "audio.invalidUrl": "Invalid URL",
    "audio.invalidIndex": "Invalid index",
    "audio.tooLarge": "Audio is too large, maximum size is 48MB",
    "audio.error": "An error occurred",
  },
  // Add more languages as needed
};

async function playMusic(message, song, getLang) {
  const { title, id } = song;
  message.react("⏳");
  const cachePath = join(global.cachePath, `_ytaudio${Date.now()}.mp3`);

  try {
    let stream = ytdl(id, { quality: "lowestaudio" });

    await new Promise((resolve, reject) => {
      fluent(stream)
        .save(cachePath)
        .on("end", resolve)
        .on("error", (err) => {
          console.error("Fluent-ffmpeg error:", err);
          reject(err);
        });
    });

    const stat = statSync(cachePath);
    if (stat.size > _48MB) {
      message.reply(getLang("audio.tooLarge"));
    } else {
      const audioStream = createReadStream(cachePath);
      await message.reply({
        body: `[ ${title} ]`,
        attachment: audioStream,
      });
    }
    message.react("✅");
  } catch (err) {
    message.react("❌");
    console.error(err);
    message.reply(getLang("audio.error"));
  }

  try {
    if (global.isExists(cachePath)) global.deleteFile(cachePath);
  } catch (err) {
    console.error(err);
  }
}

async function searchByKeyword(keyword, MAX_SONGS) {
  try {
    if (!keyword) return [];
    const { data } = await axios.get(`${global.xva_api.main}/ytsearch`, {
      params: {
        keyword: encodeURIComponent(keyword),
        maxResults: MAX_SONGS,
      },
    });
    if (!data?.result) return [];
    return data.result;
  } catch (err) {
    throw err;
  }
}

async function getVideoInfo(id) {
  try {
    const { data } = await axios.get(`${global.xva_api.main}/ytvideodetails`, {
      params: {
        id: id,
      },
    });
    return data.result[0] || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function onCall({ message, args, extra, getLang }) {
  try {
    if (!args[0]) return message.reply(getLang("audio.missingArgument"));
    let url = args[0];
    if (!url.match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
      let data = await searchByKeyword(args.join(" "), extra.MAX_SONGS);
      if (!data[0]) return message.reply(getLang("audio.noResult"));
      const items = data;
      const songs = [],
        attachments = [];

      for (let i = 0; i < items.length; i++) {
        if (!items[i]) break;
        const id = items[i].id.videoId;
        const info = await getVideoInfo(id);
        if (!info) continue;

        const duration = info.contentDetails.duration;
        songs.push({
          id: id,
          title: info.snippet.title,
          duration: formatDuration(duration),
        });
      }

      if (!songs.length) return message.reply(getLang("audio.noResult"));

      const sendData = await message.reply({
        body: songs
          .map(
            (song, index) => `${index + 1}. ${song.title} (${song.duration})`
          )
          .join("\n\n"),
        attachment: attachments,
      });

      return sendData.addReplyEvent({ callback: chooseSong, songs });
    }

    const id = url.match(
      /(?:http(?:s):\/\/)?(?:www.|m.)?(?:youtu(?:be|.be))?(?:\.com)\/?(?:watch\?v=(?=\w.*))?([\w\.-]+)/
    )?.[1];
    if (!id) return message.reply(getLang("audio.invalidUrl"));
    let info = await getVideoInfo(id);
    if (!info) return message.reply(getLang("audio.noResult"));
    const song = {
      title: info.snippet.title,
      id,
    };

    await playMusic(message, song, getLang);
  } catch (err) {
    console.error(err);
    message.reply(getLang("audio.error"));
  }
}

export default {
  config,
  langData,
  onCall,
};
