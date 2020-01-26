const Discord = require('discord.js');
const client = new Discord.Client();
const { MongoClient } = require('mongodb');

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
    let [prefix, cmd, ...params] = msg.content.split(' ');
    
    if(prefix === '!h' || prefix === '!host') {
      if(cmd === 'test') {
        if(profile === 'dev') {
          cmd = params.splice(0, 1)[0];
        } else {
          return;
        }
      }
      
      switch(cmd) {
        case undefined:
        case 'h':
        case 'help':
          reply(help, msg);
          break;

        case 's':
        case 'set':
        case 'start':
          handleStart(params.join(' '), msg);
          break;

        case 'u':
        case 'up':
          handleUp(params.join(' '), msg);
          break;

        case 'e':
        case 'end':
          handleEnd(msg);
          break;

        case 'l':
        case 'list':
          handleList(msg);
          break;
          
        case 'dbtest':
          MongoClient.connect(`mongodb://${encodeURIComponent(process.env.MONGODB_USER)}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}/?authMechanism=DEFAULT`, function(err, client) {
            if(err) {
              console.error(err);
            } else {
              console.log("Connected successfully to db");
              const db = client.db(process.env.MONGODB_DATABASE);
            }
            
            if(client) {
              client.close();
            }
          });
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
    let key = getKey(msg.member);
    inMemStore.set(key, description);
    reply(`started hosting ${inMemStore.get(key)}`, msg);
  } else {
    reply('set a description with `!host start [description]`', msg);
  }
}

function handleUp(code, msg) {
  let key = getKey(msg.member);
  if(inMemStore.has(key)) {
    let response = `${msg.member.displayName} is now hosting ${inMemStore.get(key)}`;

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
  let key = getKey(msg.member);
  if(inMemStore.has(key)) {
    reply(`stopped hosting ${inMemStore.get(key)}`, msg);
    inMemStore.delete(key);
  } else {
    reply('not hosting at the moment', msg);
  }
}

function handleList(msg) {
  if(inMemStore.size) {
    let list = 'current raids:';

    inMemStore.forEach((description, keyStr) => {
      let key = JSON.parse(keyStr);
      if(msg.guild.id == key.guildId) {
        list += `\n${msg.guild.members.get(key.memberId).displayName} is hosting ${description}`;
      }
    });

    reply(list, msg);
  } else {
    reply('nobody is hosting at the moment', msg);
  }
}

function getKey(member) {
  return JSON.stringify({ guildId: member.guild.id, memberId: member.id });
}

function reply(response, msg) {
  if(profile == 'prod') {
    msg.reply(response);
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n@${msg.member.displayName}, ${response}`);
  }
}

function send(response, msg) {
  if(profile === 'prod') {
    msg.channel.send(response);
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n${response}`);
  }
}
