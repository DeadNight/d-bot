const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const help = 'I support the following commands:'
  + '\n!host start [description] - start hosting'
  + '\n!host up [code] - notify raid is up with optional code'
  + '\n!host end - stop hosting'
  + '\n!host list - list current hosts';

client.on('message', msg => {
  if(msg.content.startsWith('!h')) {
    let cmd = msg.content.split(' ', 3);
    
    if(cmd[0] == '!h' || cmd[0] == '!host') {
      switch(cmd[1]) {
        case undefined:
        case 'h':
        case 'help':
          reply(help, msg);
          break;

        case 's':
        case 'set':
        case 'start':
          handleStart(cmd[2], msg);
          break;

        case 'u':
        case 'up':
          handleUp(cmd[2], msg);
          break;

        case 'e':
        case 'end':
          handleEnd(msg);
          break;

        case 'l':
        case 'list':
          handleList(msg);
          break;

        default:
          reply(`unsupported command, ${help}`, msg);
      }
    }
  }
});

client.login(process.env.token)
 .catch(console.error);

let profile = process.env.profile || 'dev';
let inMemStore = new Map();

function handleStart(description, msg) {
  if(description) {
    inMemStore.set(msg.author.id, description);
    reply(`started hosting ${inMemStore.get(msg.author.id)}`, msg);
  } else {
    reply('set a description with `!host start [description]`', msg);
  }
}

function handleUp(code, msg) {
  if(inMemStore.has(msg.author.id)) {
    let response = `${msg.member.displayName} is now hosting ${inMemStore.get(msg.author.id)}`;

    if(code) {
      response += `\ncode: ${code}`;
    } else {
      response += '\nno code';
    }

    send(response, msg);
  } else {
    reply('not hosting at the moment\nstart hosting with `!host start [description]`', msg);
  }
}

function handleEnd(msg) {
  if(inMemStore.has(msg.author.id)) {
    reply(`stopped hosting ${inMemStore.get(msg.author.id)}`, msg);
    inMemStore.delete(msg.author.id);
  } else {
    reply('not hosting at the moment', msg);
  }
}

function handleList(msg) {
  if(inMemStore.size) {
    let list = 'current raids:';

    inMemStore.forEach((value, key) => {
      list += `\n${msg.guild.members.get(key).displayName} is hosting ${value}`;
    });

    reply(list, msg);
  } else {
    reply('nobody is hosting at the moment', msg);
  }
}

function reply(response, msg) {
  if(profile == 'prod') {
    msg.reply(response);
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n${msg.member.displayName}, ${response}`);
  }
}

function send(response, msg) {
  if(profile == 'prod') {
    msg.channel.reply(response);
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n${response}`);
  }
}
