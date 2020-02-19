const { parseCommand, parseFlags } = require('./parser.js');

describe('regression', () => {
  describe('parseCommand', () => {
    test('test set -a -d', () => {
    let cmd = `!h test set corny rapidash -a 3ds -d \`\`\`asciidoc
rapidash
add the 3ds friend code, IGN: Britany
\`\`\``;

      let expected = [
        {
          prefix: '!h',
          test: 'test',
          cmd: 'set',
          _: 'corny rapidash',
        },
        [
          {
            flagName: '-a',
            flagValue: '3ds'
          },
          {
            flagName: '-d',
            flagValue: '```asciidoc\nrapidash\nadd the 3ds friend code, IGN: Britany\n```'
          }
        ]
      ];
      
      let actual = cleanObject(parseCommand(cmd));

      expect(actual).toEqual(expected);
    });
    
    test('set -a -d', () => {
      let cmd = `!host set Shiny Litwick -a 3ds -d \`\`\`diff
- 🌟Litwick
--- add 3ds friend code, name Levi
\`\`\``;
      
      let expected = [
        {
          prefix: '!host',
          cmd: 'set',
          _: 'Shiny Litwick',
        },
        [
          {
            flagName: '-a',
            flagValue: '3ds'
          },
          {
            flagName: '-d',
            flagValue: `\`\`\`diff
- 🌟Litwick
--- add 3ds friend code, name Levi
\`\`\``
          }
        ]
      ];
      
      let actual = cleanObject(parseCommand(cmd));

      expect(actual).toEqual(expected);
    });
    
    test('set long title', () => {
      let cmd = `!host set \`\`\`Rolling Den 92 - Square Non-HA G-Max Orbeetle's
Notable entrants: 1speed Square Karrablast
Hosting on Lynda-Switch-4752-8741-7021\`\`\`
\`\`\`code will mostly be 2221 or 2211\`\`\``;
      
      let expected = [
        {
          prefix: '!host',
          cmd: 'set',
          _: '\`\`\`Rolling Den 92 - Square Non-HA G-Max\`\`\`',
        },
        [
          {
            flagName: '-d',
            flagValue: `\`\`\`Orbeetle's
Notable entrants: 1speed Square Karrablast
Hosting on Lynda-Switch-4752-8741-7021\`\`\`
\`\`\`code will mostly be 2221 or 2211\`\`\``
          }
        ]
      ];
      
      let actual = cleanObject(parseCommand(cmd));

      expect(actual).toEqual(expected);
    });
  });

  describe('parseFlags', () => {
    test('set -a -d', () => {
      let flags = [
        {
          flagName: '-a',
          flagValue: '3ds'
        },
        {
          flagName: '-d',
          flagValue: '```asciidoc\nrapidash\nadd the 3ds friend code, IGN: Britany\n```'
        }
      ];

      let expected = {
        account: '3ds',
        description: '```asciidoc\nrapidash\nadd the 3ds friend code, IGN: Britany\n```'
      };
      
      let actual = cleanObject(parseFlags(flags, {
        '-a': 'account',
        '--account': 'account',
        '-c': 'code',
        '--code': 'code',
        '-d': 'description',
        '--description': 'description'
      }));

      expect(actual).toEqual(expected);
    });
  });
});

function cleanObject(obj) {
  Object.keys(obj).forEach(key => {
    if(obj[key] === 'undefined')
      delete obj[key]
  });
  return obj;
}
