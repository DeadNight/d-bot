const parser = require('./parser.js');

describe('parseCommand', () => {
  test('empty cmd', () => {
    let cmd = '!h';

    let expected = [
      {
        prefix: '!h',
      },
      []
    ];

    let actual = parser.parseCommand(cmd);

    expect(actual).toEqual(expected);
  });
  test('empty set', () => {
    let cmd = '!h set';

    let expected = [
      {
        prefix: '!h',
        cmd: 'set'
      },
      []
    ];

    let actual = parser.parseCommand(cmd);

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

    let actual = parser.parseCommand(cmd);

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

    let actual = parser.parseCommand(cmd);

    expect(actual).toEqual(expected);
  });
  
  test('new lines', () => {
    let cmd = `!host set
\`\`\`<✨Polteageist✨>\`\`\`

-d
\`\`\`
+ 11/31/31/31/26/31
< Cursed Body >
\`\`\``;

    let expected = [
      {
        prefix: '!host',
        cmd: 'set',
        _: '\`\`\`<✨Polteageist✨>\`\`\`',
      },
      [
        {
          flagName: '-d',
          flagValue: `\`\`\`
+ 11/31/31/31/26/31
< Cursed Body >
\`\`\``
        }
      ]
    ];

    let actual = parser.parseCommand(cmd);

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

    let actual = parser.parseFlags(flags, {
      '-a': 'account',
      '--account': 'account',
      '-c': 'code',
      '--code': 'code',
      '-d': 'description',
      '--description': 'description'
    });

    expect(actual).toEqual(expected);
  });
});

describe('autoSplit', () => {
  test('split code block', () => {
    let title = `!h start
\`\`\`md
Square
Hawlucha
<Limber>
27/31/31/31/31/26
\`\`\``;
  
  let expected = [
    `!h start
\`\`\`md
Square
Hawlucha
<Limber>
27/31/31/31/31/26`,
    ''
  ];
  
  let actual = parser.autoSplit(title, '', 50, 255);
  
  expect(actual).toEqual(expected);
  });
  
  test('empty partial code block after split', () => {
    let title = `!h start
\`\`\`md
Square
Hawlucha
<Limber>
\`\`\``;
  
  let expected = [title, ''];
  
  let actual = parser.autoSplit(title, '', 50, 255);
  
  expect(actual).toEqual(expected);
  });
  
  test('empty after split', () => {
    let title = '<:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119>';
  
  let expected = [
    '<:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119>',
    '<:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119> <:totolol:669700012900483119>'
  ];
  
  let actual = parser.autoSplit(title, '', 50, 255);
  
  expect(actual).toEqual(expected);
  });
});
