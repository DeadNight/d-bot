const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const help = '!host start [description] - start hosting\n'
  + '!host up [code] - notify raid is up with optional code\n'
  + '!host end - stop hosting\n'
  + '!host list - list current hosts';

client.on('message', msg => {
  if (msg.content === '!host help') {
    msg.reply(help);
  } else if(msg.content.startsWith('!host start')) {
    handleStart(msg);
  } else if(msg.content.startsWith('!host up')) {
    handleUp(msg);
  } else if(msg.content === '!host end') {
    handleEnd(msg);
  } else if(msg.content === '!host list') {
    handleList(msg);
  }
});

client.login(process.env.token)
 .catch(console.error);

let inMemStore = {};

function handleStart(msg) {
  if(msg.content.length <= '!host start '.length) {
    msg.reply('set a description with `!host start [description]`');
  } else {
    inMemStore[msg.author.id] = msg.content.substring('!host start '.length);
    msg.reply(`started hosting ${inMemStore[msg.author.id]}`);
  }
}

function handleUp(msg) {
  if(inMemStore[msg.author.id]) {
    let response = `${msg.author} is now hosting ${inMemStore[msg.author.id]}`;

    if(msg.content.length > '!host up '.length) {
      response += `\ncode: ${msg.content.substring('!host up '.length)}`;
    }

    msg.channel.send(response);
  } else {
    msg.reply('not hosting at the moment\n'
      + 'start hosting with `!host start [description]`');
  }
}

function handleEnd(msg) {
  if(inMemStore[msg.author.id]) {
    msg.reply(`stopped hosting `${inMemStore[msg.author.id]}`);
    inMemStore[msg.author.id] = undefined;
  } else {
    msg.reply('not hosting at the moment');
  }
}

function handleList(msg) {
  if(Object.keys(inMemStore).length) {
    let list = 'current raids:';

    for (let [key, value] of Object.entries(inMemStore)) {
      list += `\n${key} is hosting ${value}`;
    }

    msg.reply(list);
  } else {
    msg.reply('nobody is hosting at the moment');
  }
}

