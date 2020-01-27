const Discord = require('discord.js');
const { MongoClient } = require('mongodb');

const client = new Discord.Client();
const dbClient = new MongoClient(`mongodb://${process.env.MONGODB_SERVICE_HOST}:${process.env.MONGODB_SERVICE_PORT}`);

const profile = process.env.profile || 'dev';
const dataModelVersion = 1.0;
let cache = new Map();

const help = 'I support the following commands:'
  + '\n!host start [description] - start hosting'
  + '\n!host up [code] - notify raid is up with optional code'
  + '\n!host end - stop hosting'
  + '\n!host list - list current hosts';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

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
        case 'empty':
          handleEnd(msg);
          break;

        case 'l':
        case 'list':
          handleList(msg);
          break;
          
        case 'dbtest':
          if(profile === 'dev') {
            console.log(JSON.stringify(cache));
          }
          break;

        default:
          reply(`unsupported command, ${help}`, msg);
      }
    }
  }
});

if(profile === 'production') {
  dbClient.connect((err) => {
    if(err) {
      console.error(err);
    } else {
      console.log('Connected successfully to db');
      const db = dbClient.db(process.env.MONGODB_DATABASE);
      
      client.login(process.env.token).catch((err) => {
        console.error(err);
        dbClient.close();
      });
    }
  });
} else {
  client.login(process.env.token).catch(console.error);
}

function handleStart(description, msg) {
  if(description) {
    setHostData('main', description, msg.member);
    reply(`started hosting ${description}`, msg);
  } else {
    reply('set a description with `!host start [description]`', msg);
  }
}

function handleUp(code, msg) {
  let hostData = getHostData('main', msg.member);
  if(hostData) {
    let response = `${msg.member.displayName} is now hosting ${hostData.desc}`;

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
  let hostData = getHostData('main', msg.member);
  if(hostData) {
    reply(`stopped hosting ${hostData.desc}`, msg);
    removeHostData('main', msg.member);
  } else {
    reply('not hosting at the moment', msg);
  }
}

function handleList(msg) {
  let list = [];
  
  let guildData = getGuildData(msg.guild);

  guildData.members.forEach((memberData) => {
    let displayName = msg.guild.members.get(memberData._id).displayName;
    memberData.hosts.forEach((hostData) => {
      list.append(`${displayName} is hosting ${hostData.desc}`);
    });
  });
  
  if(list.length) {
    reply(list.join('\n', msg);
  } else {
    reply('nobody is hosting at the moment', msg);
  }
}

function setHostData(id, description, member) {
  let memberData = getMemberData(member);
  
  memberData.hosts.set(id, {
    _id: id,
    desc: description,
    start: Date.now()
  });
}

function getHostData(id, member) {
  let memberData = getMemberData(member);
  
  return memberData.hosts.get(id);
}

function removeHostData(id, member) {
  let memberData = getMemberData(member);
  let hostData = memberData.hosts.get(id);
  
  if(hostData) {
    memberData.hosts.delete(id);
    return true;
  } else {
    return false;
  }
}

function getGuildData(guild) {
  let guildData = cache.get(member.guild.id);
  if(!guildData) {
    guildData = {
      _id: member.guild.id,
      version: dataModelVersion,
      members: new Map()
    };
    cache.set(member.guild.id, guildData);
  }
  
  return guildData;
}

function getMemberData(member) {
  let guildData = getGuildData(member.guild);
  
  let memberData = guildData.members.get(member.id);
  if(!memberData) {
    memberData = {
      _id: member.id,
      hosts: new Map()
    };
    cache.set(member.id, memberData);
  }
  
  return memberData;
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
