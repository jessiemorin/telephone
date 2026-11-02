import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const password = await rl.question('Mot de passe Nortel : ');
rl.close();

if (password.length < 16) {
  throw new Error('Choisis au moins 16 caractères.');
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');

console.log('\nAUTH_PASSWORD_HASH=' + salt + ':' + hash);
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex'));
