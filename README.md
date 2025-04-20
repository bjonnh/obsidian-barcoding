# Obsidian Barcoding Plugin

This plugin allows you to scan QR codes using your device's camera and open the corresponding notes in Obsidian. It also enables you to generate QR codes directly in your notes using code blocks.

## Features

- Scan QR codes using your device's camera (Desktop only)
- Generate QR codes directly in your notes using code blocks
- Automatically open notes based on QR code content
- Automatically create notes if they don't exist (only if not using obsidian URIs)
- Configure camera preferences (front or back camera)
- Adjust scan delay (not sure why but that's here)

The camera scanning does NOT work on Android because the application doesn't have the permissions for that.
To work around it, what I do is make QR codes like this:

```
```qrcode
obsidian://open?file=foo.md
```
```

or do
```
```qrcodelocal
```
```

Which will generate a qrcode with an obsidian link for the current file in the current vault.

And you can use the Android camera that will open Obsidian on the right note.

## Installation

For now it is manual, you can probably use BRAT too. I recomment going with the zip for now.

### From Obsidian Community Plugins (NOT YET)

1. Open Obsidian
2. Go to Settings > Community plugins
3. Turn off Safe mode if it's on
4. Click "Browse" and search for "Barcoding"
5. Install the plugin
6. Enable the plugin after installation

### Manual Installation

1. Download the latest release from the [GitHub releases page](https://github.com/bjonnh/obsidian-barcoding/releases)
2. Extract the downloaded zip file
3. Copy the extracted folder to your vault's plugins folder: `<vault>/.obsidian/plugins/`
4. Enable the plugin in Obsidian's Community Plugins settings

## Usage

### Scanning QR Codes

1. Click the barcode icon in the left ribbon, or
2. Use the command palette (Ctrl/Cmd+P) and search for "Scan QR Code"
3. Grant camera access permission when prompted
4. Point your camera at a QR code
5. The plugin will automatically detect the QR code and open the corresponding note
6. If the note doesn't exist, it will be automatically created

### Creating QR Codes for Notes

#### Using Code Blocks

You can now generate QR codes directly in your notes using code blocks:

```
```qrcode
MyFolder/MyNote.md
```
```

This will generate a QR code that links to the specified note. When scanned with the plugin, it will open that note.

You can also generate a QR code that includes both the vault ID and file path, which is useful for sharing links across different devices or vaults:

```
```qrcodelocal
```
```

This will generate a QR code with the URI: `obsidian://open?vault=<vault_id>&file=<filePath>` where:
- `<vault_id>` is the ID of your current vault
- `<filePath>` is the path of the current file

When scanned, this QR code will open the specific file in the specific vault, even from another device.

#### Using External QR Code Generators

To create a QR code that links to a specific note using external tools:

1. The QR code should contain the path to the note in your vault
2. For example, if you have a note at `MyFolder/MyNote.md`, the QR code can contain either `MyFolder/MyNote.md` or `MyFolder/MyNote` (the .md extension is optional and will be added automatically if missing)
3. You can use any QR code generator to create QR codes with these paths

### Settings

You can configure the plugin in the Settings tab:

1. **Default Camera**: Choose between front and back camera
2. **Scan Delay**: Adjust the delay between scans (lower values may affect performance)

## Permissions

This plugin requires camera access to scan QR codes. The camera is only accessed when you explicitly initiate a scan.

## Troubleshooting

- **Camera not working**: Make sure you've granted camera permissions to Obsidian
- **QR code not detected**: Ensure adequate lighting and that the QR code is clearly visible
- **Note creation failed**: Verify that the path in the QR code is valid and that you have write permissions in your vault

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/bjonnh/obsidian-barcoding/issues) on GitHub.

## Development

### Releasing

This plugin uses GitHub Actions to automatically create release files. When a new tag is pushed to the repository, the workflow will:

1. Build the plugin
2. Create a zip file containing all necessary files (main.js, manifest.json, styles.css, versions.json)
3. Create a GitHub release with the zip file attached

To create a new release:

1. Update the version in package.json
2. Run `npm run version` to update the version in manifest.json and versions.json
3. Commit the changes
4. Create and push a new tag matching the version number (e.g., `git tag v1.0.1 && git push origin v1.0.1`)

The GitHub Actions workflow will automatically create the release.
