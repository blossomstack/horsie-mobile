# Contributing

Thanks for looking. This is the mobile client for [horsie](https://github.com/blossomstack/horsie); the server, the web UI and the CLI live there.

## Getting set up

```bash
npm install
npm run ios      # or: npm run android
```

You need a horsie server to point at. `horsie serve` on your laptop is enough — the iOS simulator can reach the host's `127.0.0.1` directly.

## Before you open a pull request

```bash
npm run typecheck
npm test
npm run lint
```

If you changed anything that reads or writes the API, also run `npm run check:schemas`.

**If you added or removed a dependency, regenerate the lockfile whole** — `rm package-lock.json && npm install` — rather than committing what an incremental `npm install` leaves behind. An incremental install on macOS prunes the optional native packages that only Linux resolves (`@emnapi/*`), and CI's `npm ci` then refuses the lockfile as out of sync. A local `npm ci` will *not* catch this: it resolves for the platform you are on, so it passes on a Mac and fails on the runner.

## Protocol types are generated, not written

Everything under `src/generated/` comes from horsie's `.fl` schemas via fluorite, and everything under `schemas/` is a copy of those files at the ref in `schemas/HORSIE_REF`. Neither is edited by hand — CI regenerates both and fails on a diff.

To move to a newer horsie: change the SHA in `schemas/HORSIE_REF`, then `npm run sync-schemas && npm run generate-types`.

## Where logic goes

`src/core/` holds the parts with no React and no React Native in them — the transcript fold, the graph layout, the hook helpers. Most of it is carried over from horsie's web client so the two cannot drift, and it is where the unit tests are. If a change can live there, it should.

## Licence and the CLA

Contributions are dual-licensed Apache-2.0 OR MIT.

A CLA check runs on every pull request. Comment `I have read the CLA Document and I hereby sign the CLA` once and the bot records your signature on the `cla-signatures` branch — a reviewable commit rather than a row in a service nobody here administers. The document itself lives in [blossomstack/.github](https://github.com/blossomstack/.github/blob/main/CLA.md).
