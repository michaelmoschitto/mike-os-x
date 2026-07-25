import { createHash } from 'node:crypto';

const readHiddenInput = (prompt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error('An interactive terminal is required.'));
      return;
    }

    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.off('data', handleData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const handleData = (input: string) => {
      if (input === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('Password hashing cancelled.'));
        return;
      }

      if (input === '\r' || input === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
        return;
      }

      if (input === '\u007f') {
        value = value.slice(0, -1);
        return;
      }

      value += input;
    };

    process.stdin.on('data', handleData);
  });
};

const main = async () => {
  const password = await readHiddenInput('Portfolio password: ');
  if (!password) {
    throw new Error('Password cannot be empty.');
  }

  const digest = createHash('sha256').update(password, 'utf8').digest('hex');
  process.stdout.write(`${digest}\n`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to hash password.';
  console.error(message);
  process.exit(1);
});
