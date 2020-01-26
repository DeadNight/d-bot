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
        case 'help':
          msg.reply(help);
          break;

        case 'start':
          handleStart(cmd[2], msg);
          break;

        case 'up':
          handleUp(cmd[2], msg);
          break;

        case 'end':
          handleEnd(msg);
          break;

        case 'list':
          handleList(msg);
          break;

        default:
          msg.reply(`unsupported command, ${help}`);
      }
    }
  }
});

client.login(process.env.token)
 .catch(console.error);

let inMemStore = new Map();

function handleStart(description, msg) {
  if(description) {
    inMemStore.set(msg.author.id, description);
    msg.reply(`started hosting ${inMemStore.get(msg.author.id)}`);
  } else {
    msg.reply('set a description with `!host start [description]`');
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

    msg.channel.send(response);
  } else {
    msg.reply('not hosting at the moment\n'
      + 'start hosting with `!host start [description]`');
  }
}

function handleEnd(msg) {
  if(inMemStore.has(msg.author.id)) {
    msg.reply(`stopped hosting ${inMemStore.get(msg.author.id)}`);
    inMemStore.delete(msg.author.id);
  } else {
    msg.reply('not hosting at the moment');
  }
}

function handleList(msg) {
  if(inMemStore.size) {
    let list = 'current raids:';

    inMemStore.forEach((key, value) => {
      list += `\n${msg.guild.members.get(key).displayName} is hosting ${value}`;
    });

    msg.reply(list);
  } else {
    msg.reply('nobody is hosting at the moment');
  }
}

