const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const server = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, server);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, server);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, server);
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, server);
    return;
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, server);
    return;
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

async function execute(message, server) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  
  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!server) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    server.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild, song) {
  const server = queue.get(guild.id);
  if (!song) {
    server.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = server.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      server.songs.shift();
      play(guild, server.songs[0]);
    })
    .on("error", error => console.error(error));
  server.textChannel.send(`Start playing: **${song.title}**`);
}

function pause(message, server) {
  if (!server)
    return message.channel.send("There is no song that I could pause!");
  server.connection.dispatcher.pause();
  server.textChannel.send('Music Paused! To continue, use command "!resume"');
}

function resume(message, server) {
  if (!server)
    return message.channel.send("There is no song that I could resume!");
  server.connection.dispatcher.resume();
}

function skip(message, server) {
  if (!server)
    return message.channel.send("There is no song that I could skip!");
  server.connection.dispatcher.end();
}

function stop(message, server) {
  if (!server)
    return message.channel.send("There is no song that I could stop!");
    
  server.songs = [];
  server.connection.dispatcher.end();
}

client.login(token);