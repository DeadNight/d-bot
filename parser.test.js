const { parseCommand, parseFlags } = require('./parser.js');

describe('parseCommand', () => {
  test('empty cmd', () => {
    let cmd = '!h';

    let expected = [
      {
        prefix: '!h',
      }
    ];

    let actual = cleanObject(parseCommand(cmd));

    expect(actual).toEqual(expected);
  });
  
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

function cleanObject(obj) {
  Object.keys(obj).forEach(key => {
    if(obj[key] === 'undefined')
      delete obj[key]
  });
  return obj;
}
