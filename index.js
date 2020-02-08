const Discord = require('discord.js');
const mysql = require('mysql');
const uuidv4 = require('uuid/v4');
const util = require('util');

const client = new Discord.Client();
const dbConnection = mysql.createConnection({
  host: process.env.MYSQL_SERVICE_HOST,
  port: process.env.MYSQL_SERVICE_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: 'utf8mb4'
});

const profile = process.env.profile || 'dev';
const supportedCommands = new Set(['h','help','s','set','start','u','up','e','end','empty','l','list','mod-end','dbtest']);
const modRoles = new Set(['Admin', 'Moderator']);
let cache = new Map();

const help = 'I support the following commands. Parameters in [brackets] are optional, parameters in {braces} are required:'
  + '\n`!host [account] start {title} -- [description]` - start hosting'
  + '\n`!host [account] up [code]` - notify raid is up with optional code'
  + '\n`!host [account] end` - stop hosting'
  + '\n`!host list` - list current hosts';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if(msg.author.bot || !msg.content.startsWith('!h')) {
    return;
  }
  
  let [prefix, cmd, ...params] = msg.content.split(' ');

  if(prefix !== '!h' && prefix !== '!host') {
    return;
  }
  
  if(cmd === 'test') {
    if(profile === 'dev' || profile === 'debug') {
      [cmd, ...params] = params;
    } else {
      return;
    }
  }

  if(!cmd) {
    reply(help, msg);
    return;
  }

  let account;
  if(!supportedCommands.has(cmd)) {
    account = cmd;
    [cmd, ...params] = params;
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
      {
        let title, description;
        let i = params.indexOf('--');
        if(i < 0) {
          title = params.join(' ');
          description = '';
        } else {
          title = params.slice(0, i).join(' ');
          description = params.slice(i + 1).join(' ');
        }
        
        handleStart(account, title, description, msg);
      }
      break;

    case 'u':
    case 'up':
      handleUp(account, params.join(' ');, msg);
      break;

    case 'e':
    case 'end':
    case 'empty':
      handleEnd(account, msg);
      break;

    case 'l':
    case 'list':
      handleList(msg);
      break;

    case 'mod-end':
      {
        let [memberMention] = params;
        handleModEnd(memberMention, msg);
      }
      break;

    case 'dbtest':
      console.log(util.inspect(cache, {depth: Infinity, colors: true}));
      break;

    default:
      reply(`Unsupported command, ${help}`, msg);
  }
});

if(profile === 'prod') {
  dbConnection.connect((err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Connected successfully to db');
      
    client.login(process.env.token).catch((err) => {
      console.error(err);
      dbConnection.end();
    });
  });
} else {
  client.login(process.env.token).catch(console.error);
}

function handleStart(account, title, description, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(account === 'all') {
    reply('Can\'t host for `all`, please choose a different account name', msg);
    return;
  }
  
  if(account && account.length > 25) {
    reply('Can\'t host with an account longer than 25 characters\nCommand: `!host [account] start {title} -- [description]`', msg);
    return;
  }
  
  if(!title) {
    reply('Can\'t start hosting without a title\nCommand: `!host [account] start {title} -- [description]`', msg);
    return;
  }
  
  let titleSquashedEmoji = title.replace(/<:\w+:\d+>/gi, 'E');
  if(title > 255 || titleSquashedEmoji.length > 50) {
    reply('Can\'t host with a title longer than 50 characters\nCommand: `!host [account] start {title} -- [description]`', msg);
    return;
  }
    
  setHostData(msg.member, account || 'main', title, description).then((hostData) => {
    reply(`Started hosting ${account || 'main'}: ${title} ${description}`, msg);
  }).catch((err) => {
    let errCode = uuidv4();
    console.error(`[${errCode}] ${err}`);
    reply(`Couldn't save host ${account || 'main'}: ${title} ${description}\nError code: ${errCode}\nPlease try again later`, msg);
  });
}

function handleUp(account, code, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(account === 'all') {
    getMemberData(msg.member).then((memberData) => {
      if(memberData.hosts.size) {
        let response = `${msg.member.displayName}'s raids are now up`;
        
        memberData.hosts.forEach((hostData, account) => {
          response += `\n${account}: ${hostData.title} ${hostData.desc}`;
        });
        
        response += `\nCode: ${code || 'none'}`;
        send(response, msg);
      } else {
        reply(`You are not hosting at the moment.\nYou can start hosting with the command: \`!host [account] start {title} -- [description]\`.`, msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't get member data.\nError code: ${errCode}.\nPlease try again later.`, msg);
    });
  } else {
    getHostData(msg.member, account || 'main').then((hostData) => {
      if(hostData) {
        send(`${msg.member.displayName}'s raid is now up\n${account || 'main'}: ${hostData.title} ${hostData.desc}\nCode: ${code || 'none'}`, msg);
      } else {
        reply(`You are not hosting ${account || 'main'} at the moment\nYou can start hosting with the command \`!host [account] start {title} -- [description]\``, msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't get host data for ${account || 'main'}\nError code: ${errCode}\nPlease try again later`, msg);
    });
  }
}

function handleEnd(account, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(account === 'all') {
    getMemberData(msg.member).then((memberData) => {
      if(memberData.hosts.size) {
        removeHostData(msg.member).then((count) => {
          reply(`Stopped ${count} active hosts`, msg);
        }).catch((err) => {
          let errCode = uuidv4();
          console.error(`[${errCode}] ${err}`);
          reply(`Couldn't remove host data.\nError code: ${errCode}.\nPlease try again later.`, msg);
        });
      } else {
        reply(`You are not hosting at the moment`, msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't get member data.\nError code: ${errCode}.\nPlease try again later.`, msg);
    });
  } else {
    getHostData(msg.member, account || 'main').then((hostData) => {
      if(hostData) {
        
        removeHostData(msg.member, account || 'main').then(() => {
          reply(`Stopped hosting ${account || 'main'}: ${hostData.title}`, msg);
        }).catch((err) => {
          let errCode = uuidv4();
          console.error(`[${errCode}] ${err}`);
          reply(`Couldn't remove host data for ${account || 'main'}\nError code: ${errCode}\nPlease try again later`, msg);
        });
      } else {
        reply(`You are not hosting for ${account || 'main'} at the moment`, msg);
      }
    }).catch((err) => {
        let errCode = uuidv4();
        console.error(`[${errCode}] ${err}`);
        reply(`Couldn't get host data\nError code: ${errCode}\nPlease try again later`, msg);
    });
  }
}

function handleList(msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(msg.guild.name === '🌽 Land of the Corn 🌽') {
    if(msg.channel.name != 'bot-commands-🤖' && msg.channel.name != 'current-and-upcoming-dens' && msg.channel.name != 'bot-stuff-for-staff') {
      reply(`Please use the list command at ${msg.guild.channels.find(channel => channel.name === 'bot-commands-🤖')}`, msg)
      return;
    }
  }
  
  getGuildData(msg.guild).then((guildData) => {
    let response = '';
    
    guildData.members.forEach((memberData, memberId) => {
      if(memberData.hosts.size) {
        let userTag = msg.guild.members.get(memberId).user.tag;
        response += `\n---\n${userTag} is hosting:`;
        
        memberData.hosts.forEach((hostData, account) => {
          response += `\n${account}: ${hostData.title}`;
        });
      }
    });

    if(response) {
      reply(`Current hosts:${response}`, msg);
    } else {
      reply('There are no active hosts at the moment', msg);
    }
  }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't get guild data\nError code: ${errCode}\nPlease try again later`, msg);
  });
}

function handleModEnd(memberMention, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(!msg.member.roles.find((role) => { return modRoles.has(role.name); })) {
    reply(`Unsupported command, ${help}`, msg);
    return;
  }
  
  if(!msg.mentions.members.size) {
    reply(`Please mention members for whom to end hosts\nCommand: !host mod-end {mention} [mention...]`, msg);
  }
  
  let member = msg.mentions.members.first();
  removeHostData(member).then((count) => {
    reply(`Stopped ${count} active hosts of ${member.displayName}`, msg);
  }).catch((err) => {
    let errCode = uuidv4();
    console.error(`[${errCode}] ${err}`);
    reply(`Couldn't stop active hosts of ${member.displayName}\nError code: ${errCode}\nPlease try again later`, msg);
  });
}

function getGuildData(guild) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    let guildData = cache.get(guild.id);
    if(guildData) {
      resolve(guildData);
      return;
    }
    
    guildData = { members: new Map() };

    if(profile === 'prod') {
      dbConnection.query({
        sql: 'Select `memberId`, `account`, `title`, `desc`, `start` From `hosts` Where `guildId`=?',
        values: [guild.id]
      }, (err, results) => {
        if(err) {
          reject(err);
          return;
        }

        results.forEach((row) => {
          if(!guildData.members.has(row.memberId)) {
            guildData.members.set(row.memberId, { hosts: new Map() });
          }

          guildData.members.get(row.memberId).hosts.set(row.account, { title: row.title, desc: row.desc, start: row.start });
        });

        cache.set(guild.id, guildData);
        resolve(guildData);
      });
    } else {
      cache.set(guild.id, guildData);
      resolve(guildData);
    }
  });
}

function getMemberData(member) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    getGuildData(member.guild).then((guildData) => {
      let memberData = guildData.members.get(member.id);
      if(memberData) {
        resolve(memberData);
        return;
      }
      
      memberData = { hosts: new Map() };
      
      guildData.members.set(member.id, memberData);
      resolve(memberData);
    }).catch((err) => {
      reject(err);
    });
  });
}

function getHostData(member, account) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    getMemberData(member).then((memberData) => {
      resolve(memberData.hosts.get(account));
    }).catch((err) => {
      reject(err);
    });
  });
}

function setHostData(member, account, title, description) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    getMemberData(member).then((memberData) => {
      let hostData = {
        title: title,
        desc: description,
        start: Date.now()
      };
      
      if(process.env.profile === 'prod') {
        dbConnection.query({
          sql: 'Replace Into `hosts` Set `guildId`=?, `memberId`=?, `account`=?, `title`=?, `desc`=?, `start`=?',
          values: [member.guild.id, member.id, account, hostData.title, hostData.desc, hostData.start]
        }, (err, results) => {
          if(err) {
            reject(err);
          } else {
            memberData.hosts.set(account, hostData);
            resolve(results.affectedRows);
          }
        });
      } else {
        memberData.hosts.set(account, hostData);
        resolve(1);
      }
    }).catch((err) => {
      reject(err);
    });
  });
}

function removeHostData(member, account) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    getMemberData(member).then((memberData) => {
      if(process.env.profile === 'prod') {
        let sql = 'Delete From `hosts` Where `guildId`=? And `memberId`=?';
        if(account) {
          sql += ' And `account`=?';
        }

        dbConnection.query({
          sql: sql,
          values: [member.guild.id, member.id, account]
        }, (err, results) => {
          if(err) {
            reject(err);
          } else {
            if(account) {
              memberData.hosts.delete(account);
            } else {
              memberData.hosts.clear();
            }
            
            resolve(results.affectedRows);
          }
        });
      } else {
        if(account) {
          if(memberData.hosts.has(account)) {
            memberData.hosts.delete(account);
            resolve(1);
          } else {
            resolve(0);
          }
        } else {
          let count = memberData.hosts.size;
          memberData.hosts.clear();
          resolve(count);
        }
      }
    }).catch((err) => {
      reject(err);
    });
  });
}

function reply(response, msg) {
  if(profile == 'prod') {
    msg.reply(response).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't send a reply message to Discord\nError code: ${errCode}\nPlease try again later`, msg);
    });
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n@${msg.member.displayName}, ${response}`);
  }
}

function send(response, msg) {
  if(profile === 'prod') {
    msg.channel.send(response).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't send a message to Discord\nError code: ${errCode}\nPlease try again later`, msg);
    });
  } else {
    console.log(`${msg.member.displayName}:\n${msg.content}\nd-bot:\n${response}`);
  }
}
