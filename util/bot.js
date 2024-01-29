import { Client } from "oceanic.js";
import qlient from 'discord.js';
const bot = new Client({
  intents: 32767
});
import { Database } from "st.db";
import Discord from 'discord.js';
import { Intents } from 'discord.js';

import { VoiceConnectionStatus, AudioPlayerStatus, createAudioPlayer, createAudioResource } from "@discordjs/voice";
import axios from "axios";
import { shuruhatik } from "./functions.js";
import fs from "node:fs";
import { createSpinner } from 'nanospinner'
import { Interval } from 'quickinterval';
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello Express app!')
});

app.listen(8080, () => {
  console.log('server started');
});

export default async (debug = false, config, settings, is_replit = (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER)) => {
  let interval_work = false;
  let stop_radio = false;
  const isInteger = num => /^-?[0-9]+$/.test(num + '');
  const radio_channels = new Database("/radio");
  const client = new Client({
    auth: "Bot " + process.env.token,
    rest: { requestTimeout: 60000 },
    gateway: { intents: ["GUILDS", "GUILD_VOICE_STATES"] }
  });
  let ready_first;
  //const spinner = createSpinner('Run a project made by Shuruhatik', { interval: 50 }).start({ "color": "blue" })
  // bot.login(process.env.token)
  var spinner;
  client.connect();

  client.on("ready", async () => {
    if (spinner) spinner.success({ text: `Logged in as \x1B[1m${client.user.username}\u001b[0m (\x1B[4m${client.user.id}\u001b[0m)` });
    if (!ready_first) {
      console.log(`\n\u001b[32;1m` + shuruhatik + `\u001b[0m\u001b[0m\n\n\u001b[1mﻲﺒﻨﻟﺍ ﻰﻠﻋ ةﻼﺻﻭ رﺎﻔﻐﺘﺳﻻﺍ ﺮﺜﻛﻭ ،ﻪﻠﻟﺍ ﺮﻛﺫ َﺲﻨﺗ ﻻ\u001b[0m`);
      console.log(`\n\u001b[32;1m◤\u001b[0m\u001b[0m\u001b[1m https://api.shuruhatik.com/add/${client.user.id} \u001b[32;1m◢\u001b[0m`);
      ready_first = true;
      setInterval(async () => {
      client.editStatus(`idle`, [{ name: await settings.get("status_bot") || "ITS QURAN", type: await settings.get("status_type") || 0 }]);
    }, 30000);
    }
    axios.get("https://radio-quran.com/api/ar").then(async (req) => {
      await fs.writeFileSync('./radio.json', JSON.stringify(req.data, null, 4));
    }).catch(() => { })


    if (await settings.has("radio")) {
      await radio().catch(console.error);
    }
    await client.application.bulkEditGlobalCommands([{
      type: 1,
      name: "radio",
      description: "تشغيل اذاعة القران الكريم",
      options: [
        {
          type: 1,
          name: "start",
          description: "بدا تشغيل اذاعة القران الكريم",
          options: [{
            type: 7,
            name: "voice",
            required: true,
            channelTypes: [2, 13],
            description: "اختار الروم الصوتي للي تبيه"
          },
          {
            type: 3,
            name: "channel",
            required: true,
            channel_types: [2, 13],
            autocomplete: true,
            description: "اختار قناة الاذاعة للي تبيه"
          }]
        }, {
          type: 1,
          name: "stop",
          description: "بدا تشغيل اذاعة القران الكريم",
        }
      ],
      dmPermission: false,
      defaultMemberPermissions: 8
    }]);

  });

  client.on("error", console.log);
  client.on("debug", debug ? (message) => console.log("\n\u001b[32m[DEBUG] " + message + "\u001b[0m") : () => { });
  client.on("interactionCreate", async (interaction) => {
    switch (interaction.type) {
      case 2: {
        if (interaction.data.name === "radio" && interaction.data.options.getSubCommand() == "stop") {
          if (await settings.has("guild_id") && await settings.get("guild_id") != interaction.guild.id) return await interaction.createMessage({
            embeds: [{ color: 0xff3434, title: `:x: فقط سيرفر ذات معرف هذا ${await settings.get("guild_id")} يمكنه استخدام البوت هو فقط` }], flags: 64
          })
          stop_radio = true;
          await settings.delete("radio");
          await interaction.guild.clientMember.edit({ channelID: null }).catch(() => { })
          await interaction.createMessage({
            embeds: [{ color: 0x40ff36, title: `✅ تم إيقاف تشغيل الراديو بنجاح. آمل ألا يكون ذلك بسبب عدم رغبتك في الاستماع إلى الراديو` }]
          })
        }
        if (interaction.data.name === "radio" && interaction.data.options.getSubCommand() == "start") {
          if (await settings.has("guild_id") && await settings.get("guild_id") != interaction.guild.id) return await interaction.createMessage({
            embeds: [{ color: 0xff3434, title: `:x: فقط سيرفر ذات معرف هذا ${await settings.get("guild_id")} يمكنه استخدام البوت هو فقط` }], flags: 64
          })
          let channel = interaction.data.options.getString("channel");
          let voice = interaction.data.options.getChannel("voice");
          stop_radio = false;
          await settings.set("radio", { guild_id: interaction.guild.id, channel, voice, at: Date.now(), by: interaction.user.id });
          await radio(interaction.guild, channel, voice).catch(console.error);
          await settings.set("guild_id", interaction.guild.id);
          await interaction.createMessage({
            embeds: [{ color: 0x40ff36, title: `✅ تم تشغيل الراديو بنجاح جزاكم الله كل خير` }],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    emoji: { name: "📻" },
                    label: "انقر للاستماع إلى الراديو",
                    url: `https://discord.com/channels/${interaction.guildID}/${voice.id}`,
                    style: 5,
                  },
                  {
                    type: 2,
                    label: "لديك مشاكل أو أسئلة ، تواصل مع الدعم الفني",
                    url: "https://discord.gg/its-community-917580196251594815",
                    style: 5,
                  }
                ]
              }
            ]
          });
        }
      };
      case 4: {
        if (interaction.data.options.getFocused() && interaction.data.options.getFocused().name == "channel") {
          try {
            let input = clearRadioChannelText(interaction.data.options.getString("channel"))
            if (isInteger(input) && radio_channels.raw[+input - 1]) {
              await interaction.result([radio_channels.raw[+input - 1]]).catch(() => { })
            } else {
              let search_results = radio_channels.raw.filter(el => clearRadioChannelText(el.name).includes(clearRadioChannelText(input)))
              if (search_results.length >= 25) search_results = search_results.slice(0, 25)
              await interaction.result(search_results).catch(() => { })
            }
          } catch (e) {
            // console.error(e)
          }
        }
      }
    };
  });

  function clearRadioChannelText(text) {
    return `${text}`.replaceAll('\u0610', '')
      .replaceAll('\u0611', '')
      .replaceAll('\u0612', '')
      .replaceAll('\u0613', '')
      .replaceAll('\u0614', '')
      .replaceAll('\u0615', '')
      .replaceAll('\u0616', '')
      .replaceAll('\u0617', '')
      .replaceAll('\u0618', '')
      .replaceAll('\u0619', '')
      .replaceAll('\u061A', '')
      .replaceAll('\u06D6', '')
      .replaceAll('\u06D7', '')
      .replaceAll('\u06D8', '')
      .replaceAll('\u06D9', '')
      .replaceAll('\u06DA', '')
      .replaceAll('\u06DB', '')
      .replaceAll('\u06DC', '')
      .replaceAll('\u06DD', '')
      .replaceAll('\u06DE', '')
      .replaceAll('\u06DF', '')
      .replaceAll('\u06E0', '')
      .replaceAll('\u06E1', '')
      .replaceAll('\u06E2', '')
      .replaceAll('\u06E3', '')
      .replaceAll('\u06E4', '')
      .replaceAll('\u06E5', '')
      .replaceAll('\u06E6', '')
      .replaceAll('\u06E7', '')
      .replaceAll('\u06E8', '')
      .replaceAll('\u06E9', '')
      .replaceAll('\u06EA', '')
      .replaceAll('\u06EB', '')
      .replaceAll('\u06EC', '')
      .replaceAll('\u06ED', '')
      .replaceAll('\u0640', '')
      .replaceAll('\u064B', '')
      .replaceAll('\u064C', '')
      .replaceAll('\u064D', '')
      .replaceAll('\u064E', '')
      .replaceAll('\u064F', '')
      .replaceAll('\u0650', '')
      .replaceAll('\u0651', '')
      .replaceAll('\u0652', '')
      .replaceAll('\u0653', '')
      .replaceAll('\u0654', '')
      .replaceAll('\u0655', '')
      .replaceAll('\u0656', '')
      .replaceAll('\u0657', '')
      .replaceAll('\u0658', '')
      .replaceAll('\u0659', '')
      .replaceAll('\u065A', '')
      .replaceAll('\u065B', '')
      .replaceAll('\u065C', '')
      .replaceAll('\u065D', '')
      .replaceAll('\u065E', '')
      .replaceAll('\u065F', '')
      .replaceAll('\u0670', '')
      .replaceAll('\u0624', '\u0648')
      .replaceAll('\u0629', '\u0647')
      .replaceAll('\u064A', '\u0649')
      .replaceAll('\u0626', '\u0649')
      .replaceAll('\u0622', '\u0627')
      .replaceAll('\u0623', '\u0627')
      .replaceAll('\u0625', '\u0627')
      .replaceAll('اذاعة', '')
      .replaceAll('إذاعة', '')
      .replaceAll('ى', 'ي')
      .trim();
  }

  async function startRadio() {
    if (await settings.has("radio")) {
      let data = await settings.get("radio");
      let voice = data.voice;
      let radio_channel = data.channel;
      let guild = await client.guilds.get(data.guild_id);
      if (guild) {
        await guild.clientMember.edit({ channelID: null }).catch(() => { })
        const voiceConnection = client.joinVoiceChannel({
          channelID: voice.id,
          guildID: guild.id,
          selfDeaf: true,
          selfMute: false,
          voiceAdapterCreator: guild.voiceAdapterCreator
        })
        voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
          if (!stop_radio) voiceConnection.rejoin();
          if (!stop_radio && voice.type == 13) await guild.editUserVoiceState(client.user.id, { channelID: voice.id, suppress: false }).catch(console.error);
        });
        const player = createAudioPlayer();
        voiceConnection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
          console.log("\n\u001b[32;1m▣\u001b[0m\u001b[0m\u001b[1m Started playing");
        });
        player.on(AudioPlayerStatus.Idle, () => {
          console.log("\n\u001b[32;1m▣\u001b[0m\u001b[0m\u001b[1m The player is not playing any audio");
        });
        if (stop_radio) {
          await player.stop();
        } else {
          const audio = createAudioResource(radio_channel);
          await player.play(audio);
        }
        if (voice.type == 13) await guild.editUserVoiceState(client.user.id, { channelID: voice.id, suppress: false }).catch(console.error);
      }
    }
  }

  async function radio() {
    if (await settings.has("radio")) await startRadio();
    if (!interval_work) {
      new Interval(async (int) => {
        console.log(int.elapsedTime, int.startTime)
        if (await settings.has("radio")) {
          interval_work = true
          await startRadio();
        } else {
          console.log("done paused")
          interval_work = false
          int.pause();
        }
      }, 300000).start();
    }
  }


  process.on('unhandledRejection', (reason, p) => {
    console.log('\u001b[38;5;93m[antiCrash] :: Unhandled Rejection/Catch\u001b[0m');
    console.log(reason, p);
  });

  process.on("uncaughtException", (err, origin) => {
    console.log('\u001b[38;5;93m[antiCrash] :: Uncaught Exception/Catch\u001b[0m');
    console.log(err, origin);
  })

  process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log('\u001b[38;5;93m[antiCrash] :: Uncaught Exception/Catch (MONITOR)\u001b[0m');
    console.log(err, origin);
  });

}
