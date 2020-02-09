const Discord = require('discord.js');
const mysql = require('mysql');
const uuidv4 = require('uuid/v4');
const util = require('util');
const minimist = require('minimist');

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

const commands = {
  set: {
    alias: ['s', 'start'],
    help: `**!host set** - set a raid for hosting
__Syntax__
**!host set** *title* *options*
  title is required, and can be up to 50 characters long. this title appears when using the **list** command.
__Options__
  **-a, --account** - which account hosts the raid. can set raids from multiple accounts in parallel. default: main
  **-c, --code** - default code for this raid that will appear when using the **up** command. default: none
  **-d, --description** - a longer description that will appear after the title when using the **up** command
__Examples__
Set a host with default options:
\`!host set Shiny HA Mew\`
Set a host with custom options:
\`!host set Shiny HA Mew -a 3ds -c 1234 -d 3IV, timid nature\``
  },
  up: {
    alias: ['u'],
    help: `**!host up** - notify that a raid is up
__Syntax__
**!host up** *options*
**!host up all** *options*
__Options__
  **-a, --account** - which account hosts the raid. can't set this when using the **up all** command. default: main
  **-c, --code** - custom code for this raid, overriding the default code for the raid
__Examples__
Notify that a raid is up with default options:
\`!host up\`
Notify that a raid is up with custom options:
\`!host up -a 3ds -c 9876\`
Notify that all raids are up with default code:
\`!host up all\`
Notify that all raids are up with custom code:
\`!host up all -c 9876\``
  },
  end: {
    alias: ['e'],
    help: `**!host end** - stop hosting a raid
__Syntax__
**!host end** *options*
**!host end all**
__Options__
  **-a, --account** - which account stops hosting the raid. can't set this when using the **end all** command. default: main
__Examples__
Stop hosting a raid from default account 'main':
\`!host end\`
Stop hosting a raid from a custom account:
\`!host end -a 3ds\`
Stop hosting all raids:
\`!host end all\``
  },
  list: {
    alias: ['l'],
    help: `**!host list** - show a list of currently hosted pokémon
__Syntax__
**!host list**
**!host list** \`@mention\`
**!host list all**
__Examples__
Show a list of your own hosted raids:
\`!host list\`
Show a list of a member's hosted raids:
\`!host list @DeadNight#7922\`
Show a list of all hosted raids:
\`!host list all\``
  },
  help: {
    alias: ['h'],
    help: `I support the following commands:
**!host set** - set a pokémon for hosting
**!host up** - notify that a raid is up
**!host end** - stop hosting
**!host list** - list currently hosted pokémon
**!host help** - show this help again
**!host help** *command* - show help for a specific command`
  }
};

const modCommands = {
  'mod-end': {}
};

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
        
        handleSet(account, title, description, msg);
      }
      break;

    case 'u':
    case 'up':
      handleUp(account, params.join(' '), msg);
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

function handleSet(account, title, description, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${Array.from(arguments)})`);
  }
  
  if(account === 'all') {
    reply('Can\'t host for `all`, please choose a different account name', msg);
    return;
  }
  
  if(account && account.length > 25) {
    reply('Can\'t host with an account longer than 25 characters\nCommand: `!host [account] set {title} -- [description]`', msg);
    return;
  }
  
  if(!title) {
    reply('Can\'t start hosting without a title\nCommand: `!host [account] set {title} -- [description]`', msg);
    return;
  }
  
  let squashedTitle = title.replace(/<:\w+:\d+>/gi, 'E');
  if(title > 255 || squashedTitle.length > 50) {
    reply('Title is longer than 50 characters, it will be split automatically\nTo split manually, please use the command: `!host [account] set {title} -- [description]`', msg);
    
    let numWhitespaces = (squashedTitle.slice(0, 50).match(/\s/g) || []).length;
    let i = (title.match(`^\\S*(?:\\s+\\S+){${numWhitespaces - 1}}`) || [''])[0].length;
    
    description = title.slice(i + 1) + (description || '');
    title = title.slice(0, i);
    
    if((title.match(/```/g) || []).length % 2) {
      title += '```';
    }
    
    if((description.match(/```/g) || []).length % 2) {
      description = '```' + description;
    }
  }
    
  setHostData(msg.member, account || 'main', title, description).then((hostData) => {
    reply(`Started hosting. account: ${account || 'main'}, title: ${title}\ndescription: ${description}`, msg);
  }).catch((err) => {
    let errCode = uuidv4();
    console.error(`[${errCode}] ${err}`);
    reply(`Couldn't save host. account: ${account || 'main'}, title: ${title}\ndescription: ${description}\nError code: ${errCode}\nPlease try again later`, msg);
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
        reply(`You are not hosting at the moment.\nYou can start hosting with the command: \`!host [account] set {title} -- [description]\`.`, msg);
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
        reply(`You are not hosting ${account || 'main'} at the moment\nYou can start hosting with the command \`!host [account] set {title} -- [description]\``, msg);
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
