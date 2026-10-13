# Production deploy

## Production server

The production host is `christian@192.168.50.199`.

Caddy serves files from `~/dev/casual-games` at `https://lebaudy.gauchedroite.com/casual-games/`.

The route is in `~/dev/Caddyfile`. Caddy serves static files, so a file upload does not require a restart.

## Deploy

Use Node.js 24 or later to run the tests. The app has no dependencies and no build step.

1. From the project root, run the tests:

   ```sh
   npm test
   ```

2. If the tests pass, copy only the public app files to the production host:

   ```sh
   scp -r index.html styles.css launcher.js manifest.js games.json games christian@192.168.50.199:~/dev/casual-games/
   ```

3. Make sure that the production page and game list respond:

   ```sh
   curl.exe -fI https://lebaudy.gauchedroite.com/casual-games/
   curl.exe -fsS https://lebaudy.gauchedroite.com/casual-games/games.json
   ```

The copy command does not upload tests, planning files, or private folders. It also does not remove old files from the production folder. Remove an old file from the server if the app no longer uses it.
