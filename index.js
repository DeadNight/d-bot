const Discord = require('discord.js');
const mysql = require('mysql');
const uuidv4 = require('uuid/v4');
const util = require('util');
const parser = require('./parser.js');
const help = require('./help.js');

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
const modRoles = new Set(['Admin', 'Moderator']);
let cache = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if(msg.author.bot || !msg.content.startsWith('!h')) {
    return;
  }
  
  let [cmd, flags] = parser.parseCommand(msg.content);  

  if(cmd.prefix !== '!h' && cmd.prefix !== '!host') {
    return;
  }
  
  if(cmd.test) {
    if(profile !== 'dev' && profile !== 'debug') {
      return;
    }
  }
  
  if(cmd.mod) {
    if(isMod(msg) || isDev(msg)) {
      handleModCommand(cmd, flags, msg);
    } else {
      reply('unsupported command\nFor a list of supported commands, type `!host help`', msg);
    }
  } else if(cmd.dev) {
    if(isDev(msg)) {
      handleDevCommand(cmd, flags, msg);
    } else {
      reply('unsupported command\nFor a list of supported commands, type `!host help`', msg);
    }
  } else {
    handleCommand(cmd, flags, msg);
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

function handleCommand(cmd, flags, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  switch(cmd.cmd) {
    case undefined:
    case 'h':
    case 'help':
      if(help[cmd._]) {
        reply(help[cmd._], msg);
      } else {
        reply(help.help, msg);
      }
      break;

    case 's':
    case 'set':
    case 'start':
      {
        let options = parser.parseFlags(flags, {
          '-a': 'account',
          '--account': 'account',
          '-c': 'code',
          '--code': 'code',
          '-d': 'description',
          '--description': 'description'
        });
        
        if((options.unsupported || []).length) {
          reply(`FYI, ignoring unsupported option${options.unsupported.length > 1 ? 's' : ''} ${options.unsupported.join(' ')}`, msg);
        }
        
        handleSet(cmd._, options, msg);
      }
      break;

    case 'u':
    case 'up':
      {
        let options = parser.parseFlags(flags, {
          '-a': 'account',
          '--account': 'account',
          '-c': 'code',
          '--code': 'code',
          '--all': 'all'
        });
        
        if((options.unsupported || []).length) {
          reply(`ignoring unsupported option${options.unsupported.length > 1 ? 's' : ''} ${options.unsupported.join(' ')}\nFor a list of supported options, type \`!host help up\``, msg);
        }
        
        handleUp(options, msg);
      }
      break;

    case 'e':
    case 'end':
    case 'stop':
      {
        let options = parser.parseFlags(flags, {
          '-a': 'account',
          '--account': 'account',
          '--all': 'all'
        });
        
        if((options.unsupported || []).length) {
          reply(`ignoring unsupported option${options.unsupported.length > 1 ? 's' : ''} ${options.unsupported.join(' ')}\nFor a list of supported options, type \`!host help end\``, msg);
        }
        
        handleEnd(options, msg);
      }
      break;

    case 'l':
    case 'list':
      {
        let options = parser.parseFlags(flags, {
          '-m': 'member',
          '--member': 'member',
          '--all': 'all'
        });
        
        if((options.unsupported || []).length) {
          reply(`ignoring unsupported option${options.unsupported.length > 1 ? 's' : ''} ${options.unsupported.join(' ')}\nFor a list of supported options, type \`!host help list\``, msg);
        }
        
        handleList(options, msg);
      }
      break;

    default:
      reply('unsupported command\nFor a list of supported commands, type `!host help`', msg);
  }
}

function handleModCommand(cmd, params, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(!isMod(msg) && !isDev(msg)) {
    return;
  }
  
  switch(cmd.cmd) {
    case undefined:
    case 'h':
    case 'help':
      if(help.mod[cmd._]) {
        reply(help.mod[cmd._], msg);
      } else {
        reply(help.mod.help, msg);
      }
      break;
    
    case 'e':
    case 'end':
      handleModEnd(msg);
      break;

    default:
      reply('unsupported mod command\nFor a list of supported mod commands, type `!host mod help`', msg);
  }
}

function handleDevCommand(cmd, params, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(!isDev(msg)) {
    return;
  }
  
  switch(cmd.cmd) {
    case 'dbtest':
      console.log(util.inspect(cache, {depth: Infinity, colors: true}));
      break;

    default:
      reply('unsupported dev command', msg);
  }
}

function handleSet(title, options, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(!title) {
    reply('can\'t set a raid for hosting without a title, please try again\nFor more info, please type `!host help set`', msg);
    return;
  }
  
  if(options.account && options.account.length > 25) {
    reply('can\'t host with an account name longer than 25 characters, please try again with a shorter account name', msg);
    return;
  }
  
  options.account = options.account || 'main';
  options.code = options.code || 'none';
  options.description = options.description || '';
  
  let newTitle;
  [newTitle, options.description] = Parser.autoSplit(title, options.description, 50, 255);
  
  if(title !== newTitle) {
    reply('title is longer than 50 characters, so it was split automatically\nIf the auto split isn\'t good enough, you may split manually with the -d option\nFor more info, type `!host help set`', msg);
    title = newTitle;
  }
    
  setHostData(msg.member, options.account, title, options.code, options.description).then((hostData) => {
    reply(`started hosting. account: ${options.account}, title: ${title}
default code: ${options.code}
description: ${options.description}`, msg);
  }).catch((err) => {
    let errCode = uuidv4();
    console.error(`[${errCode}] ${err}`);
    reply(`couldn't save host. account: ${options.account}, title: ${title}
default code: ${options.code}
description: ${options.description}
Error code: ${errCode}
Please try again later`, msg);
  });
}

function handleUp(options, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(options.all && options.account) {
    reply('can\'t set both *-a* and *--all*, please try again\nFor more info, please type \`!host help up\`', msg);
    return;
  }
  
  if(options.all) {
    getMemberData(msg.member).then((memberData) => {
      if(memberData.hosts.size) {
        let response = `${msg.member.displayName}'s raids are now up`;
        
        memberData.hosts.forEach((hostData, account) => {
          response += `\n${account}: ${hostData.title} ${hostData.desc}`;
          if(!options.code) {
            response += `\ncode: ${hostData.code || 'none'}`;
          }
        });
        
        if(options.code) {
          response += `\nCode: ${options.code}`;
        }
        send(response, msg);
      } else {
        reply(`you are not hosting any raids at the moment
You can start hosting a raid with the command **!host set**
For more info, please type \`!host help set\``, msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`couldn't get member data
Error code: ${errCode}
Please try again later`, msg);
    });
  } else {
    options.account = options.account || 'main';
    
    getHostData(msg.member, options.account || 'main').then((hostData) => {
      if(hostData) {
        send(`${msg.member.displayName}'s raid is now up
account: ${options.account}
${hostData.title} ${hostData.desc}
Code: ${options.code || hostData.code || 'none'}`, msg);
      } else {
        reply(`you are not hosting a raid from account ${options.account} at the moment
You can start hosting a raid with the command **!host set**
For more info, please type \`!host help set\``, msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`Couldn't get host data for account ${options.account}
Error code: ${errCode}
Please try again later`, msg);
    });
  }
}

function handleEnd(options, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(options.all && options.account) {
    reply('can\'t set both *-a* and *--all*, please try again\nFor more info, please type \`!host help end\`', msg);
    return;
  }
  
  if(options.all) {
    getMemberData(msg.member).then((memberData) => {
      if(memberData.hosts.size) {
        removeHostData(msg.member).then((count) => {
          reply(`stopped hosting ${count} raids`, msg);
        }).catch((err) => {
          let errCode = uuidv4();
          console.error(`[${errCode}] ${err}`);
          reply(`couldn't remove host data
Error code: ${errCode}
Please try again later`, msg);
        });
      } else {
        reply('you are not hosting any raids at the moment', msg);
      }
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`couldn't get member data
Error code: ${errCode}
Please try again later.`, msg);
    });
  } else {
    options.account = options.account || 'main';
    
    getHostData(msg.member, options.account).then((hostData) => {
      if(hostData) {
        
        removeHostData(msg.member, options.account).then(() => {
          reply(`stopped hosting from account ${options.account}`, msg);
        }).catch((err) => {
          let errCode = uuidv4();
          console.error(`[${errCode}] ${err}`);
          reply(`Couldn't remove host data for ${account || 'main'}\nError code: ${errCode}\nPlease try again later`, msg);
        });
      } else {
        reply(`you are not hosting a raid from account ${options.account} at the moment
For a list of your active raids, please type \`!host list\``, msg);
      }
    }).catch((err) => {
        let errCode = uuidv4();
        console.error(`[${errCode}] ${err}`);
        reply(`couldn't get host data
Error code: ${errCode}
Please try again later`, msg);
    });
  }
}

function handleList(options, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(options.member && options.all) {
    reply('can\'t set both *-m* and *--all*, please try again\nFor more info, please type \`!host help list\`', msg);
    return;
  }
  
  if(options.all) {
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
        reply(`couldn't get guild data
Error code: ${errCode}
Please try again later`, msg);
    }); 
  } else {
    let member;
    
    if(options.member) {
      if(!msg.mentions.members.size) {
        reply('*-m* option used but no @mention was found\nPlease try again.\nFor more info, please type `!host help list`', msg)
        return;
      }
      
      member = msg.mentions.members.first();
    } else {
      member = msg.member;
    }
    
    getMemberData(member).then((memberData) => {
      let userTag = msg.guild.members.get(member.id).user.tag;
      
      if(!memberData.hosts.size) {
        reply(`${userTag} is not hosting any raids at the moment`, msg);
        return;
      }
      
      let response = `${userTag} is hosting:`;

      memberData.hosts.forEach((hostData, account) => {
        response += `\n${account}: ${hostData.title}`;
      });

      reply(response, msg);
    }).catch((err) => {
      let errCode = uuidv4();
      console.error(`[${errCode}] ${err}`);
      reply(`couldn't get member data
Error code: ${errCode}
Please try again later`, msg);
    });
  }
}

function handleModEnd(msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(!msg.mentions.members.size) {
    reply(`Please mention members for whom to end hosts\nCommand: !host mod-end {mention} [mention...]`, msg);
    return;
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

function setHostData(member, account, title, code, description) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  return new Promise((resolve, reject) => {
    getMemberData(member).then((memberData) => {
      let hostData = {
        title: title,
        code: code,
        desc: description,
        start: Date.now()
      };
      
      if(process.env.profile === 'prod') {
        dbConnection.query({
          sql: 'Replace Into `hosts` Set `guildId`=?, `memberId`=?, `account`=?, `title`=?, `code`=?, `desc`=?, `start`=?',
          values: [member.guild.id, member.id, account, hostData.title, hostData.code, hostData.desc, hostData.start]
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

function isMod(msg) {
  return msg.member.roles.find((role) => { return modRoles.has(role.name); });
}

function isDev(msg) {
  return msg.author.id == '269937395842023424';
}
