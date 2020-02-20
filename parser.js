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

function fixCodeBlocks(title, description) {
  let regexp = /\s+```(\w*)\s+/g;
  let replacement = '\n```$1\n';
  
  title = title.replace(regexp, replacement);
  description = description.replace(regexp, replacement);
  
  if((title.match(/```/g) || []).length % 2) {
    title += '```';
  }
  
  if((description.match(/```/g) || []).length % 2) {
    description = '```' + description;
  }
  
  return [title, description];
}

function autoSplit(title, description, softCap, hardCap) {
  let squashedTitle = title.replace(/<:\w+:\d+>/gi, 'E');
  
  if(title > 255 || squashedTitle.length > 50) {
    let numOriginWhitespaces = (title.slice(0, 255).match(/\s/g) || []).length;
    let numSquashedWhitespaces = (squashedTitle.slice(0, 50).match(/\s/g) || []).length;
    let numWhitespaces = Math.min(numOriginWhitespaces, numSquashedWhitespaces);
    
    let i = (title.match(`^\\S*(?:\\s+\\S+){${numWhitespaces - 1}}`) || [''])[0].length;
    
    description = title.slice(i + 1) + (description || '');
    title = title.slice(0, i);
    
    if(/\s+```\s+/.test(description)) {
      description = '';
    }
    
    [title, description] = fixCodeBlocks(title, description)
  }
  
  return [title, description];
}

module.exports = {
  parseCommand: parseCommand,
  parseFlags: parseFlags,
  fixCodeBlocks: fixCodeBlocks,
  autoSplit: autoSplit
};
