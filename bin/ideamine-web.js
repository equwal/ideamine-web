#!/usr/bin/env node
// The dashboard server and the dashboard upload. The ideamine plugin has the same two commands.

const HELP = `ideamine-web: the self-hosted ideamine dashboard

  ideamine-web serve [--port 4332]   the dashboard with a button for each command, at 127.0.0.1
  ideamine-web publish [url|off] [--dir <folder>]
                                     upload the dashboard (index.html, data.json) now; a url also turns
                                     on the upload after each change; --dir writes the files to a folder`;

const [command = 'help', ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  return rest[i].includes('=') ? rest[i].split('=')[1] : rest[i + 1]?.startsWith('--') === false ? rest[i + 1] : true;
};

async function main() {
  switch (command) {
    case 'serve': {
      const serve = await import('../src/serve.js');
      const port = flag('port');
      const { server, url } = await serve.start({
        ...(port ? { port: Number(port) } : {}),
        log: (text) => console.log(serve.logLine(text)),
      });
      server.on('close', () => process.exit(0)); // /ideas-web off
      console.log(serve.logLine(`the dashboard with buttons runs at ${url} (Ctrl+C stops it)`));
      // Only the server role holds the archive, so only it gives ideas to coop agents.
      if (!(await import('ideahook/sync')).enabled()) (await import('ideaboard/coop')).start({ log: (text) => console.log(serve.logLine(text)) });
      break;
    }
    case 'publish': {
      const publish = await import('../src/publish.js');
      if (flag('background')) {
        process.exitCode = (await publish.backgroundPublish()) === 'error' ? 1 : 0;
        break;
      }
      const config = await import('ideahook/config');
      const word = rest.find((a, i) => !a.startsWith('--') && rest[i - 1] !== '--dir');
      if (word === 'off') {
        config.set('publish_url', '');
        console.log(publish.status());
        break;
      }
      if (word) config.set('publish_url', word);
      const dir = flag('dir');
      const out = await publish.publish({ dir: typeof dir === 'string' ? dir : null });
      console.log(`Published ${out.ideas} ideas and ${out.groups} groups to ${out.where}`);
      if (out.note) console.log(out.note);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`ideamine-web: unknown command "${command}". Try: ideamine-web help`);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`ideamine-web: ${e.message}`);
  process.exit(1);
});
