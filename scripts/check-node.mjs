const [major, minor] = process.versions.node.split('.').map(Number);
const supported = major > 22 || (major === 22 && minor >= 13);

if (!supported) {
  console.error(`Daiva requires Node.js 22.13 or newer. Current version: ${process.version}.`);
  console.error(
    'If Node 22 was installed during Phase 1, run: export PATH="$HOME/.local/node-v22/bin:$PATH"',
  );
  process.exit(1);
}
