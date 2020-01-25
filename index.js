const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const help = '!host start [description] - start hosting\n'
  + '!host up [code] - notify raid is up with optional code\n'
  + '!host end - stop hosting';

client.on('message', msg => {
  if (msg.content === '!host help') {
    msg.reply(help);
  } else if(msg.content.startsWith('!host start')) {
    handleStart(msg);
  } else if(msg.content.startsWith('!host up')) {
    handleUp(msg);
  } else if(msg.content === '!host end') {
    handleEnd(msg);
  }
});

client.login(process.env.token)
 .catch(console.error);

let inMemStore = {};

function handleStart(msg) {
  if(mag.content.length <= '!host start '.length) {
    msg.reply('set a description with `!host start [description]`');
  } else {
    inMemStore[msg.author.id] = msg.content.substring('!host start '.length);
    msg.reply('started hosting ' + inMemStore[msg.author.id]);
  }
}

function handleUp(msg) {
  if(inMemStore[msg.author.id]) {
    let reply = '' + msg.author + ' now hosting ' + inMemStore[msg.author.id];

    if(msg.content.length > '!host up '.length) {
      reply += '\ncode: ' + msg.content.substring('!host up '.length);
    }

    msg.channel.send(reply);
  } else {
    msg.reply('not hosting at the moment\n'
      + 'start hosting with `!host start [description]`');
  }
}

function handleEnd(msg) {
  if(inMemStore[msg.author.id]) {
    msg.reply('stopped hosting ' + inMemStore[msg.author.id]);
    inMemStore[msg.author.id] = undefined;
  } else {
    msg.reply('not hosting at the moment');
  }
}

