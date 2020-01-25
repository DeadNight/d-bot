const Discord = require('discord.js');
const client = new Discord.Client();
const { EOL } = require('os');

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
  if(inMemStore[msg.author.id]) {
    msg.reply('already hosting ' + inMemStore[msg.author.id] + '\n'
      + 'stop hosting with !host end');
  } else {
    inMemStore[msg.author.id] = msg.content.substring('!host start '.length);
    msg.reply('started hosting ' + description);
  }
}

function handleUp(msg) {
  if(inMemStore[msg.author.id]) {
    let code = msg.content.substring('!host up '.length);
    let reply = '' + msg.author + ' now hosting ' + inMemStore[msg.author.id];

    if(code.length) {
      msg.channel.send(reply + '\n'
        + 'code: ' + code);
    } else {
      msg.channel.send(reply);
    }
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

