const util = require('util');

const profile = process.env.profile || 'dev';

function parseCommand(text, opts) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments).slice(0, -1), {depth: 2, colors: true})}, ${text})`);
  }
  
  let regexp = /^(?<prefix>!\w+)(?:\s+(?<test>test))?(?:\s+(?<mod>mod))?(?:\s+(?<dev>dev))?(?:\s+(?<cmd>\w+))?(?:(?!\s+-)\s+(?<_>(?:(?!\s+--?\w).)+))?|\s+(?<flagName>-\w|--\w+)(?:\s+(?<flagValue>(?:(?!\s+--?\w).)+))?(?=\s+--?\w|$)/sg;
  
  let matches = text.matchAll(regexp);
  let [...captures] = matches;
  
  let cmd = captures[0].groups;
  let flags = captures.slice(1).map(f => f.groups);
  
  return [cmd, flags];
}

function parseFlags(flags, opts) {
  if(profile === 'debug') {
    console.log(`${arguments.callee.name}(${util.inspect(Array.from(arguments), {depth: 2, colors: true})})`);
  }
  
  let options = {};
  
  for(let flag of flags) {
    if(opts[flag.flagName]) {
      options[opts[flag.flagName]] = flag.flagValue || true;
    } else {
      options.unsupported = options.unsupported || [];
      options.unsupported.push(flag.flagName);
    }
  }
  
  return options;
}

module.exports = {
  parseCommand: parseCommand,
  parseFlags: parseFlags
};
