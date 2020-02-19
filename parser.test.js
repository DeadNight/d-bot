const { parseCommand, parseFlags } = require('./parser.js');

describe('parseCommand', () => {
  test('should parse correctly', () => {
  let cmd = `!h test set corny rapidash -a 3DS -d \`\`\`asciidoc
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
    
    expect(parseCommand(cmd)).toEqual(expected);
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

    expect(parseFlags(flags)).toEqual(expected);
  });
});
