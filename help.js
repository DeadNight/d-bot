const set = `**!host set** - set a raid for hosting
__Syntax__
**!host set** *title* *options*
  title is required, and can be up to 50 characters long. appears when using the **list** and **up** commands.
__Options__
  **-a, --account** - for which account to set this raid. can set raids from multiple accounts in parallel. default: main
  **-c, --code** - default code for this raid. appears when using the **list** and **up** commands. default: none
  **-d, --description** - a longer description for the raid. appears when using the **up** command
__Examples__
Set a host with default options:
\`!host set Shiny HA Mew\`
Set a host with custom options:
\`!host set Shiny HA Mew -a 3ds -c 1234 -d 3IV, timid nature\``;

const up =  `**!host up** - notify that a raid is up
__Syntax__
**!host up** *options*
__Options__
  **-a, --account** - for which account to notify that a raid is up. can't set this when using the *--all* option. default: main
  **-c, --code** - custom code for this raid, overriding the default code for the raid
  **--all** - notift that all active raids are up. can't set this when using the *-a* option
__Examples__
Notify that a raid is up with default options:
\`!host up\`
Notify that a raid is up with custom options:
\`!host up -a 3ds -c 9876\`
Notify that all raids are up with default code:
\`!host up --all\`
Notify that all raids are up with custom code:
\`!host up --all -c 9876\``;
  
const end = `**!host end** - stop hosting a raid
__Syntax__
**!host end** *options*
__Options__
  **-a, --account** - which account stops hosting the raid. can't set this when using the *-all* option. default: main
  **--all** - stop hosting all raids. can't set this when using the *-a* option
__Examples__
Stop hosting a raid from default account 'main':
\`!host end\`
Stop hosting a raid from a custom account:
\`!host end -a 3ds\`
Stop hosting all raids:
\`!host end --all\``;
  
const list = `**!host list** - show a list of currently hosted raids
__Syntax__
**!host list** *options*
__Options__
  **-m, --member** - for which member to show a list of active raids. can't set this when using the *-all* option
  **--all** - show all active raids
__Examples__
Show a list of your own hosted raids:
\`!host list\`
Show a list of a member's hosted raids:
\`!host list -m @member\`
Show a list of all hosted raids:
\`!host list --all\``;
  
const help = `I support the following commands:
**!host set** - set a pokémon for hosting
**!host up** - notify that a raid is up
**!host end** - stop hosting
**!host list** - list currently hosted pokémon
**!host help** - show this help again
**!host help** *command* - show help for a specific command`;

const modEnd = `**!host mod end** - Force end all hosts of a member
__Syntax__
**!host mod end** *@mention*
__Examples__
End all hosts of a troll member:
\`!host mod end @troll\``;
    
const modHelp = `I support the following mod commands:
**!host mod end** - Force end all hosts of a member
**!host mod help** - show this help again
**!host mod help** *command* - show help for a specific mod command`;

module.exports = {
  set: set,
  up: up,
  list: list,
  help: help,
  mod: {
    end: modEnd,
    help: modHelp
  }
};
