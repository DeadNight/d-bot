const { parseCommand, parseFlags } = require('./parser.js');

describe('regression', () => {
  describe('parseCommand', () => {
    test('should parse correctly', () => {
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
  });

  describe('parseFlags', () => {
    test('should parse correctly', () => {
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
