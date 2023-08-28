# XREAL Light Firmware Flasher

Based on sources of https://ota.xreal.com/en/light-activation.html

## Firmware download
1. Download APK from https://apkpure.com/nebula/ai.nreal.nebula.universal
2. Change file extension from `.apk` to `.zip`
3. Extract desired firmware `.bin` file from `assets/s` directory

## Usage
1. Clone this repo somewhere
2. In Chrome, navigate to file:///REPO_DIRECTORY/xreal-light-firmware-flasher/index.html
3. Follow the prompts
4. Enjoy :)

## On failure
If flashing fails, the glasses will boot straight into flashing mode. [Or can be put into flashing mode by long pressing one of the buttons](https://github.com/badicsalex/ar-drivers-rs/issues/7#issuecomment-1696160569). Then follow the steps below.
1. Open `index.js`
2. Uncomment the code below `// NOTE UNCOMMENT THIS WHEN YMODEM BRICKED`
3. Comment out the code below `// NOTE COMMENT THIS WHEN YMODEM BRICKED`
4. Select firmware button should be shown on reload
