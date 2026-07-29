# Wake Up Support

A small Windows-focused Electron app for sending Wake-on-LAN magic packets to systems on a local network.

## Development

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
npm run dist
```

## Publish

Publishing uses Electron Builder's GitHub publisher configuration from
`package.json`. Releases are published automatically when a version tag is
pushed to GitHub.

```powershell
npm version x.x.x
git push origin master --tags
```

The tag push starts the release workflow, builds the Windows installer, and
publishes a GitHub release for that tag.

## Format

```powershell
npm run format
```

## Test

```powershell
npm run format:check
npm test
```

GitHub Actions runs the same checks on every push and pull request.
