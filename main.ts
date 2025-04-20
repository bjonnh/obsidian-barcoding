import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Html5Qrcode } from 'html5-qrcode';
import * as QRCode from 'qrcode';

// Declare the OBS_ACT function on the window object
// that's undocumented, and in practice we don't really need that
// and there is barrier code to make sure it is present before we use it

declare global {
	interface Window {
		OBS_ACT?: (params: { action: string, file: string, vault?: string }) => void;
	}
}

interface BarcodingPluginSettings {
	defaultCamera: string;
	scanDelay: number;
}

const DEFAULT_SETTINGS: BarcodingPluginSettings = {
	defaultCamera: 'environment', // 'environment' for back camera, 'user' for front camera
	scanDelay: 500
}

export default class BarcodingPlugin extends Plugin {
	settings: BarcodingPluginSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('scan', 'Scan QR Code', (_: MouseEvent) => {
			new QRCodeScannerModal(this.app, this.settings, this).open();
		});
		ribbonIconEl.addClass('barcoding-plugin-ribbon-class');

		this.addCommand({
			id: 'scan-qr-code',
			name: 'Scan QR Code',
			callback: () => {
				new QRCodeScannerModal(this.app, this.settings, this).open();
			}
		});

		this.registerMarkdownCodeBlockProcessor('qrcode', async (source, el, _) => {
			const content = source.trim();

			if (!content) {
				el.createEl('div', { text: 'Error: No content provided for QR code generation.' });
				return;
			}

			try {
				const qrContainer = el.createDiv({ cls: 'qrcode-container' });

				const canvas = qrContainer.createEl('canvas');

				await QRCode.toCanvas(canvas, content, {
					width: 200,
					margin: 1,
					errorCorrectionLevel: 'M'
				});

				qrContainer.createEl('div', {
					text: content,
					cls: 'qrcode-caption'
				});
			} catch (error) {
				console.error('Error generating QR code:', error);
				el.createEl('div', { text: `Error generating QR code: ${error.message}` });
			}
		});

		this.registerMarkdownCodeBlockProcessor('qrcodelocal', async (source, el, _) => {
			try {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					el.createEl('div', { text: 'Error: No active file found.' });
					return;
				}

				const filePath = activeFile.path;
				const vaultId = this.app.vault.getName();
				// I was going to use this.app.appId to get the vault id but that's different in every install

				const encodedFilePath = encodeURIComponent(filePath);
				const encodedVaultId = encodeURIComponent(vaultId);

				const obsidianUri = `obsidian://open?vault=${encodedVaultId}&file=${encodedFilePath}`;

				const qrContainer = el.createDiv({ cls: 'qrcode-container' });
				const canvas = qrContainer.createEl('canvas');

				await QRCode.toCanvas(canvas, obsidianUri, {
					width: 200,
					margin: 1,
					errorCorrectionLevel: 'M'
				});

				qrContainer.createEl('div', {
					text: obsidianUri,
					cls: 'qrcode-caption'
				});
			} catch (error) {
				console.error('Error generating local QR code:', error);
				el.createEl('div', { text: `Error generating local QR code: ${error.message}` });
			}
		});

		this.addSettingTab(new BarcodingSettingTab(this.app, this));
	}

	onunload() {
		// Don't think we have anything to clean?
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	parseObsidianUri(uri: string): { action: string, file?: string, vault?: string } | null {
		if (!uri.startsWith('obsidian://')) {
			return null;
		}

		this.app.vault
		try {
			const uriWithoutPrefix = uri.substring('obsidian://'.length);

			const parts = uriWithoutPrefix.split('?');
			if (parts.length < 1) {
				return null;
			}

			const action = parts[0];
			const queryString = parts.length > 1 ? parts[1] : '';

			const params: Record<string, string> = {};
			if (queryString) {
				const queryParams = queryString.split('&');
				for (const param of queryParams) {
					const [key, value] = param.split('=');
					if (key && value) {
						params[key] = decodeURIComponent(value);
					}
				}
			}

			return {
				action,
				file: params.file,
				vault: params.vault
			};
		} catch (error) {
			console.error('Error parsing Obsidian URI:', error);
			return null;
		}
	}

	async openNoteByPath(notePath: string) {
		if (notePath.startsWith('obsidian://')) {
			const uri = this.parseObsidianUri(notePath);

			if (uri && uri.action === 'open' && uri.file) {
				if (typeof window.OBS_ACT === 'function') {
					window.OBS_ACT({
						action: 'open',
						file: uri.file,
						vault: uri.vault
					});
					return;
				}

				// If window.OBS_ACT is not available, fall back to the original behavior
				// but use the file parameter from the URI
				// Not sure how to test that so we will wait for the API to break
				notePath = uri.file;
			} else if (notePath.startsWith('obsidian://open?file=')) {
				notePath = notePath.replace('obsidian://open?file=', '');
			}
		}

		if (!notePath.endsWith('.md')) {
			notePath = notePath + '.md';
		}

		const file = this.app.vault.getAbstractFileByPath(notePath);
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(file);
			new Notice(`Opened note: ${file.name}`);
		} else {
			try {
				const newFile = await this.app.vault.create(notePath, '');
				await this.app.workspace.getLeaf().openFile(newFile);
				new Notice(`Created and opened note: ${newFile.name}`);
			} catch (error) {
				console.error('Error creating note:', error);
				new Notice(`Failed to create note: ${notePath}`);
			}
		}
	}
}

class QRCodeScannerModal extends Modal {
	private settings: BarcodingPluginSettings;
	private plugin: BarcodingPlugin;
	private scanner: Html5Qrcode | null = null;
	private scannerContainer: HTMLDivElement;
	private statusText: HTMLDivElement;
	private isScanning: boolean = false;

	constructor(app: App, settings: BarcodingPluginSettings, plugin: BarcodingPlugin) {
		super(app);
		this.settings = settings;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.scannerContainer = contentEl.createDiv();
		this.scannerContainer.id = 'qr-scanner-container';

		this.statusText = contentEl.createDiv({ cls: 'qr-scanner-status' });
		this.statusText.setText('Initializing camera...');

		this.initScanner();
	}

	async initScanner() {
		try {
			this.scanner = new Html5Qrcode('qr-scanner-container');

			const devices = await Html5Qrcode.getCameras();

			if (devices && devices.length > 0) {
				const cameraId = devices[0].id;

				await this.scanner.start(
					cameraId,
					{
						fps: 10,
						qrbox: { width: 250, height: 250 },
						aspectRatio: 1.0,
						facingMode: this.settings.defaultCamera
					},
					this.onScanSuccess.bind(this),
					this.onScanFailure.bind(this)
				);

				this.isScanning = true;
				this.statusText.setText('Scanning for QR codes...');
			} else {
				this.statusText.setText('No cameras found. Please ensure camera access is allowed.');
			}
		} catch (error) {
			console.error('Error initializing scanner:', error);
			this.statusText.setText(`Error: ${error.message || 'Failed to initialize camera'}`);
		}
	}

	onScanSuccess(decodedText: string) {
		if (this.scanner) {
			if (this.isScanning) {
				this.isScanning = false;
				this.scanner.stop().then(() => {
					this.statusText.setText(`QR Code detected: ${decodedText}`);
					this.plugin.openNoteByPath(decodedText);
					this.close();
				}).catch((error: Error) => {
					console.error('Error stopping scanner:', error);
					this.statusText.setText(`QR Code detected: ${decodedText}`);
					this.plugin.openNoteByPath(decodedText);
					this.close();
				});
			} else {
				this.statusText.setText(`QR Code detected: ${decodedText}`);
				this.plugin.openNoteByPath(decodedText);
				this.close();
			}
		}
	}

	onScanFailure(error: string) {
		console.debug('QR code scan error:', error);
	}

	onClose() {
		const { contentEl } = this;

		if (this.scanner) {
			if (this.isScanning) {
				this.isScanning = false;
				this.scanner.stop().catch((error: Error) => {
					console.error('Error stopping scanner:', error);
				}).finally(() => {
					this.scanner = null;
				});
			} else {
				this.scanner = null;
			}
		}

		contentEl.empty();
	}
}

class BarcodingSettingTab extends PluginSettingTab {
	plugin: BarcodingPlugin;

	constructor(app: App, plugin: BarcodingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Barcoding Plugin Settings' });

		new Setting(containerEl)
			.setName('Default Camera')
			.setDesc('Choose which camera to use by default')
			.addDropdown(dropdown => dropdown
				.addOption('environment', 'Back Camera')
				.addOption('user', 'Front Camera')
				.setValue(this.plugin.settings.defaultCamera)
				.onChange(async (value) => {
					this.plugin.settings.defaultCamera = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Scan Delay')
			.setDesc('Delay between scans in milliseconds (lower values may affect performance)')
			.addSlider(slider => slider
				.setLimits(100, 2000, 100)
				.setValue(this.plugin.settings.scanDelay)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.scanDelay = value;
					await this.plugin.saveSettings();
				}));
	}
}
