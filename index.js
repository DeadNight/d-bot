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
const modRoles = new Set(['Admin', 'Moderator']);
let cache = new Map();

const help = {
  set: `**!host set** - set a raid for hosting
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
\`!host set Shiny HA Mew -a 3ds -c 1234 -d 3IV, timid nature\``,
  up:  `**!host up** - notify that a raid is up
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
\`!host up all -c 9876\``,
  end: `**!host end** - stop hosting a raid
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
\`!host end all\``,
  list: `**!host list** - show a list of currently hosted pokémon
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
\`!host list all\``,
  help: `I support the following commands:
**!host set** - set a pokémon for hosting
**!host up** - notify that a raid is up
**!host end** - stop hosting
**!host list** - list currently hosted pokémon
**!host help** - show this help again
**!host help** *command* - show help for a specific command`,
  mod: {
    end: `**!host mod end** - Force end all hosts of a member
__Syntax__
**!host mod end** *@mention*
__Examples__
End all hosts of a troll member:
\`!host mod end @troll\``,
    help: `I support the following mod commands:
**!host mod end** - Force end all hosts of a member
**!host mod help** - show this help again
**!host mod help** *command* - show help for a specific mod command`
  }
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
      cmd = params.shift();
    } else {
      return;
    }
  }
  
  if(cmd === 'mod') {
    if(isMod(msg) || isDev(msg)) {
      cmd = params.shift();
      handleModCommand(cmd, params, msg);
    } else {
      reply(`Unsupported command, ${help.help}`, msg);
    }
  } else if(cmd === 'dev') {
    if(isDev(msg)) {
      cmd = params.shift();
      handleDevCommand(cmd, params, msg);
    } else {
      reply(`Unsupported command, ${help.help}`, msg);
    }
  } else {
    handleCommand(cmd, params, msg);
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

function handleCommand(cmd, params, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  switch(cmd) {
    case undefined:
    case 'h':
    case 'help':
      if(help[params[0]]) {
        reply(help[params[0]], msg);
      } else {
        reply(help.help, msg);
      }
      break;

    case 's':
    case 'set':
    case 'start':
      {
        let [title, options] = parseCommand(params, (options, key, val) => {
          switch(key) {
            case '-a':
            case '--account':
              options.account = val;
              break;

            case '-c':
            case '--code':
              options.code = val;
              break;

            case '-d':
            case '--description':
              options.description = val;
              break;

            default:
              options.unsupported = options.unsupported || [];
              options.unsupported.push(key);
          }
        });
        
        if((options.unsupported || []).length) {
          reply(`Ignoring unsupported options ${options.unsupported.join(' ')}\nFor a list of supported options, type \`!host help set\``, msg);
        }
        
        handleSet(title, options, msg);
      }
      break;

    case 'u':
    case 'up':
      handleUp(account, params.join(' '), msg);
      break;

    case 'e':
    case 'end':
      handleEnd(account, msg);
      break;

    case 'l':
    case 'list':
      handleList(msg);
      break;

    default:
      reply(`Unsupported command, ${help.help}`, msg);
  }
}

function handleModCommand(cmd, params, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  switch(cmd) {
    case undefined:
    case 'h':
    case 'help':
      if(help.mod[params[0]]) {
        reply(help.mod[params[0]], msg);
      } else {
        reply(help.mod.help, msg);
      }
      break;
    
    case 'e':
    case 'end':
      handleModEnd(msg);
      break;

    default:
      reply(`Unsupported mod command, ${help.mod.help}`, msg);
  }
}

function handleDevCommand(cmd, params, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  switch(cmd) {
    case 'dbtest':
      console.log(util.inspect(cache, {depth: Infinity, colors: true}));
      break;

    default:
      reply('Unsupported dev command', msg);
  }
}

function parseCommand(params, setOpt) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments), {depth: 2, colors: true})})`);
  }
  
  let regexp = /^-\w|--(?:[\w-]+)$/;
  let i = params.findIndex((p) => regexp.test(p));
  
  if(i < 0) {
    return [params.join(' '), {}];
    return;
  } else if(i == 0) {
    return ['', {}];
  }

  let text = params.splice(0, i).join(' ');

  let options = {};
  while(params.length) {
    let key = params.shift();
    let i = params.findIndex((p) => regexp.test(p));

    let val;
    if(i < 0) {
      val = params.splice(0).join(' ');
    } else if(i == 0) {
      val = true;
    } else {
      val = params.splice(0, i).join(' ');
    }
    
    setOpt(options, key, val);
  }

  return [text, options];
}

function handleSet(title, options, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
  }
  
  if(!title) {
    reply('can\'t set a raid for hosting without a title\nCommand: **!host set** *title* *options*', msg);
    return;
  }
  
  if(options.account && options.account.length > 25) {
    reply('can\'t host with an account longer than 25 characters, please try again with a shorter account', msg);
    return;
  }
  
  options.account = options.account || 'main';
  options.code = options.code || 'none';
  options.description = options.description || '';
  
  let squashedTitle = title.replace(/<:\w+:\d+>/gi, 'E');
  if(title > 255 || squashedTitle.length > 50) {
    reply('title is longer than 50 characters, it will be split automatically\nTo split manually, please use the -d option: **!host set** *title* -d *description*`', msg);
    
    let numWhitespaces = (squashedTitle.slice(0, 50).match(/\s/g) || []).length;
    let i = (title.match(`^\\S*(?:\\s+\\S+){${numWhitespaces - 1}}`) || [''])[0].length;
    
    options.description = title.slice(i + 1) + (options.description || '');
    title = title.slice(0, i);
    
    if((title.match(/```/g) || []).length % 2) {
      title += '```';
    }
    
    if((options.description.match(/```/g) || []).length % 2) {
      options.description = '```' + options.description;
    }
  }
    
  setHostData(msg.member, options.account, title, options.code, options.description).then((hostData) => {
    reply(`started hosting. account: ${options.account}, title: ${title}\ndefault code: ${options.code}\ndescription: ${options.description}`, msg);
  }).catch((err) => {
    let errCode = uuidv4();
    console.error(`[${errCode}] ${err}`);
    reply(`couldn't save host. account: ${options.account}, title: ${title}\ndefault code: ${options.code}\ndescription: ${options.description}\nError code: ${errCode}\nPlease try again later`, msg);
  });
}

function handleUp(account, code, msg) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
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
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
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
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${msg})`);
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
  msg.member.roles.find((role) => { return modRoles.has(role.name); });
}

function isDev(msg) {
  return msg.author.id == '269937395842023424';
}
