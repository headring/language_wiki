export function parseArgs(argv) {
  const flags = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      flags._.push(token);
      continue;
    }

    const name = token.slice(2);
    const next = argv[index + 1];

    if (typeof next === "undefined" || next.startsWith("--")) {
      flags[name] = true;
      continue;
    }

    if (flags[name] === undefined) {
      flags[name] = next;
    } else if (Array.isArray(flags[name])) {
      flags[name].push(next);
    } else {
      flags[name] = [flags[name], next];
    }

    index += 1;
  }

  return flags;
}

