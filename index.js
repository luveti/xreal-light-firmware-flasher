// protocol

const Command = {
    W_CANCEL_ACTIVATION: 0x65,
    R_MCU_APP_FW_VERSION: 0x35, // MCU APP FW version.
    R_AUDIO_APP_FW_VERSION: 0x35, // AUDIO APP FW version.
    R_OV580_APP_FW_VERSION: 0x35, // OV580 APP FW version.
    R_ACTIVATION_TIME: 0x66, // Read activation time
    W_ACTIVATION_TIME: 0x66, // Write activation time
    R_GLASSID: 0x43, // Read Glasses SN
    R_ISNEED_ACTIVATION: 0x65, // Read whether to activate

    W_MCU_SUPER_B_JUMP_TO_A: 0x38, // (Implemented in A)
    W_UPDATE_MCU_SUPER_A_FW_START: 0x39, // (Implemented in A)
    W_MCU_SUPER_A_JUMP_TO_B: 0x52, // (Implemented in A)
    W_UPDATE_DP: 0x58,

    W_BOOT_UPDATE_MODE: 0x1100,
    W_BOOT_UPDATE_CONFIRM: 0x1101,
    W_BOOT_UPDATE_PREPARE: 0x1102,

    W_BOOT_UPDATE_START: 0x1103,
    W_BOOT_UPDATE_TRANSMIT: 0x1104,
    W_BOOT_UPDATE_FINISH: 0x1105,
}

function decodeMessage(data) {
    let result = { command: -1, payload: new Uint8Array() };
    if (data == null || data.length < 1) return result
    result.command = data[4]
    let packetLen = data.lastIndexOf(3) + 1
    if (packetLen < 22) return result
    packetLen = packetLen - 6 - 14 // head, dataType, msgid, timeStamp, crc, endflag
    result.payload = data.slice(6, 6 + packetLen)
    return result
}

const encodeSerialChunk = (() => {
    const crc16Table = [
        0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677,
        57806, 61935, 4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818,
        54205, 50076, 62463, 58334, 9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411,
        34088, 38153, 58862, 62927, 50604, 54669, 13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100,
        46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132, 18628, 22757, 26758, 30887, 2112, 6241,
        10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403, 23285, 19156, 31415,
        27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802, 27814,
        31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200,
        40265, 32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923,
        44858, 40793, 36728, 37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482,
        8419, 20484, 16421, 28742, 24679, 33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689,
        4752, 8947, 13010, 16949, 21012, 25207, 29270, 46570, 42443, 38312, 34185, 62830, 58703, 54572,
        50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413, 42971, 47098, 34713, 38840, 59231,
        63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068, 55628, 51565, 63758,
        59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403, 52093,
        56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931,
        14994, 64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522,
        11395, 7392, 3265, 61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053,
        24180, 11923, 16050, 3793, 7920
    ]

    function computeCRC(buf, len) {
        let crc = 0x0000
        for (let i = 0; i != len; ++i) {
            let t = (crc >> 8) ^ (buf[i] & 0xFF)
            crc = (crc << 8) ^ crc16Table[t]
            crc = '0x' + crc.toString(16).substring(crc.toString(16).length - 4)
            // crc = hex2Decimal(crc)
        }
        return crc
    }

    function decimal2Hex(value) {
        if (value.toString(16).length == 1) {
            return ('0x0' + value.toString(16))
        } else {
            return ('0x' + value.toString(16))
        }
    }

    function hex2Decimal(value) {
        return eval(value).toString(10)
    }

    // TODO remove this nasty global state
    let pn = 1
    return function(payload) {
        let num = 0
        let buff = new Uint8Array(1029)
        buff[num++] = 0x02 // head

        if (pn > 255) pn = 0
        buff[num++] = decimal2Hex(pn) // pn
        buff[num++] = decimal2Hex((~pn) >>> 0) // xpn
        pn++

        if (payload != null && payload.byteLength > 0) {
            for (let i = 0; i < payload.byteLength; i++) {
                buff[num++] = payload[i] // data
            }
        } else {
            buff[num++] = 0x33 // tmp data
        }

        let crc = computeCRC(buff.slice(3, 3 + payload.length), payload.length)
        buff[num++] = (crc >> 8) & 0xff
        buff[num++] = (crc >> 0) & 0xff
        return buff
    }
})()

function encodeSerialEOT() {
    let num = 0
    let buff = new Uint8Array(133)
    buff[num++] = 0x04
    buff[num++] = 0x00
    buff[num++] = 0xFF
    for (let i = 0; i < 128; i++) {
        buff[num++] = 0x00
    }
    buff[num++] = 0x00
    buff[num++] = 0x00
    return buff
}

const encodeMessage = (() => {
    const crc32Table = [
        0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3, 0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
        0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91, 0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE, 0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
        0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC, 0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5, 0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
        0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B, 0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940, 0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
        0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116, 0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F, 0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
        0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D, 0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A, 0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
        0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818, 0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01, 0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
        0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457, 0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C, 0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
        0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2, 0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB, 0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
        0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9, 0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086, 0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
        0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4, 0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD, 0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
        0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683, 0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8, 0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
        0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE, 0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7, 0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
        0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5, 0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252, 0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
        0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60, 0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79, 0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
        0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F, 0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04, 0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
        0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A, 0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713, 0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
        0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21, 0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E, 0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
        0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C, 0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45, 0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
        0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB, 0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0, 0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
        0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6, 0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF, 0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
        0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D
    ];

    function asc2Hex(value) {
        return ('0x' + value.charCodeAt().toString(16))
    }

    function computeCRC(buf, len) {
        let crc = 0xFFFFFFFF
        for (let i = 0; i != len; ++i) {
            let t = (crc ^ buf[i]) & 0xFF
            crc = ((crc >> 8) & 0xFFFFFF) ^ crc32Table[t]
        }
        return ~crc
    }

    function hex2Decimal(value) {
        if (value.toString(16).length == 2) {
            return value.toString(16)
        } else {
            return '0' + value.toString(16)
        }
    }

    return function(command, payload, option) {
        let dataType

        if (command == 102 || command == 53 || command == 52 || command == 72 || command == 97 || command == 101 || command == 67 || command == 88) {
            if (option == 1) {
                dataType = 0x31
            } else {
                dataType = 0x33
            }
        }

        if (command == 56 || command == 57 || command == 82) {
            dataType = 0x40
        }

        let num = 0
        let crc = 0
        let buff = new Uint8Array(64)

        buff[num++] = 0x02 // head
        buff[num++] = 0x3a // break

        buff[num++] = dataType
        buff[num++] = 0x3a // break

        buff[num++] = command // commandId
        buff[num++] = 0x3a // break

        if (payload != null && payload.length > 0) {
            for (let i = 0; i < payload.length; i++) {
                buff[num++] = payload[i]    /*data*/
            }
        } else {
            buff[num++] = 0x33 // tmp data
        }
        buff[num++] = 0x3a // break

        buff[num++] = 0x38 // timeStamp byte 1
        buff[num++] = 0x38 // timeStamp byte 2
        buff[num++] = 0x3a // break

        crc = computeCRC(buff.slice(0, num), num)
        buff[num++] = asc2Hex(hex2Decimal((crc >> 24) & 0xff)[0])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 24) & 0xff)[1])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 16) & 0xff)[0])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 16) & 0xff)[1])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 8) & 0xff)[0])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 8) & 0xff)[1])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 0) & 0xff)[0])
        buff[num++] = asc2Hex(hex2Decimal((crc >> 0) & 0xff)[1])

        buff[num++] = 0x3a // break
        buff[num++] = 0x03 // end

        return buff
    }
})()

// utils

async function selectBinFile() {
    const filePaths = await window.showOpenFilePicker({
        excludeAcceptAllOption: true,
        multiple: false,
        types: [{ description: 'firmware image', accept: { 'bin/*': ['.bin'] } }],
    })
    if (filePaths.length > 0) {
        return filePaths[0].getFile()
    }
    return null
}

function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis))
}

// output functions

function appendButton(message, cb) {
    const el = document.createElement('button')
    el.innerText = message
    el.addEventListener('click', (e) => cb(el))
    document.body.appendChild(el)
    return el
}

function appendText(message) {
    const el = document.createElement('div')
    el.innerText = message
    document.body.appendChild(el)
    return el
}

function removeEl(el) {
    document.body.removeChild(el)
}

// main logic

const callbacks = new Map()

async function connect() {
  const devices = await navigator.hid.requestDevice({
    filters: [{vendorId: 0x0486}, {vendorId: 0x0483}, {vendorId: 0x0482}, {vendorId: 0x3318}]
  })

  for (let device of devices) {
    if (device.productId == 22332 || device.productId == 22336) {
      await device.open()
      device.oninputreport = ({ device, reportId, data }) => {
        let message = decodeMessage(new Uint8Array(data.buffer))
        // if (message.command === 83) return // this gets emitted repeatedly, probably IMU data?
        const cb = callbacks.get(message.command)
        if (!cb) return
        callbacks.delete(message.command)
        cb(message.payload)
      }
      return device
    }
  }
}

async function sendMessage(device, command, payload, option) {
  let cb
  const prom = new Promise((resolve) => cb = resolve)
  callbacks.set(command, cb)
  const data = new Uint8Array(payload)
  const message = encodeMessage(command, data, option)
  device.sendReport(0x00, message)
  return prom
}

// command wrappers

async function getMCUFirmwareVersion(device) {
  return sendMessage(device, Command.R_MCU_APP_FW_VERSION)
}

async function getSerialNumber(device) {
  return sendMessage(device, Command.R_GLASSID)
}

async function upgradeMCUFirmware(port, data, cb) {
    async function read(port, reader) {
        while (port.readable) {
            try {
                while (true) {
                    const { value, done } = await reader.read()
                    if (value) {
                        console.log(`${String.fromCharCode.apply(null, value)}`)
                        return
                    }
                }
            } catch (error) {
            }
        }
    }

    data = new Uint8Array(data)

    const reader = port.readable.getReader()
    const writer = port.writable.getWriter()

    await writer.write(encodeMessage(Command.W_UPDATE_MCU_SUPER_A_FW_START))
    await read(port, reader)

    const chunkSize = 1024
    const len = data.byteLength
    let offset = 0
    while (offset < len) {
        cb(offset, len)
        if ((offset + 1024) > len) {
            let chunk = encodeSerialChunk(data.slice(offset, len))
            // console.log(chunk)
            await writer.write(chunk)
            await read(port, reader)
            break
        }
        let chunk = encodeSerialChunk(data.slice(offset, offset + chunkSize))
        // console.log(chunk)
        await writer.write(chunk)
        await read(port, reader)
        offset += 1024
    }

    await writer.write(encodeSerialEOT()) // first
    await read(port, reader)

    await writer.write(encodeSerialEOT()) // second
    await read(port, reader)

    await writer.write(encodeMessage(Command.W_MCU_SUPER_A_JUMP_TO_B))
    await read(port, reader)
}

(async () => {
    document.title = 'XREAL Light Firmware Flasher'

    if (!navigator.hid) return appendText('HID not supported')
    if (!navigator.serial) return appendText('Serial not supported')

    // NOTE UNCOMMENT THIS WHEN YMODEM BRICKED
    // appendButton('Select firmware', async (el) => {
    //     const binFile = await selectBinFile()
    //     if (!binFile) return appendText('Firmware not selected')

    //     const data = await binFile.arrayBuffer()
    //     if (!data) return appendText('Firmware data not accessible')

    //     removeEl(el)

    //     appendText(`${binFile.name} selected`)

    //     appendButton('Upgrade firmware', async (el) => {
    //         const port = await navigator.serial.requestPort({
    //             filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }]
    //         })
    //         if (!port) return appendText('Serial port not selected')

    //         removeEl(el)

    //         appendText('Opening serial port')
    //         await port.open({ baudRate: 115200 })

    //         appendText('Upgrading MCU firmware...')
    //         await upgradeMCUFirmware(port, data, (offset, len) => {
    //             const percent = Math.floor((offset / len) * 100)
    //             appendText(`Progress: ${offset}/${len} (${percent}%)`)
    //         })
    //         appendText('Upgrade complete!')
    //     })
    // })

    // NOTE COMMENT THIS WHEN YMODEM BRICKED
    appendButton('Connect', async (el) => {
        const device = await connect()
        if (!device) return appendText('Failed to connect to glasses')

        removeEl(el)

        appendText('Connected')
        appendText(`Serial Number: ${String.fromCharCode.apply(null, await getSerialNumber(device))}`)
        appendText(`Firmware Version: ${String.fromCharCode.apply(null, await getMCUFirmwareVersion(device))}`)

        appendButton('Select firmware', async (el) => {
            const binFile = await selectBinFile()
            if (!binFile) return appendText('Firmware not selected')

            const data = await binFile.arrayBuffer()
            if (!data) return appendText('Firmware data not accessible')

            removeEl(el)

            appendText(`${binFile.name} selected`)

            appendButton('Switch to updater firmware', async (el) => {
                removeEl(el)

                appendText('Switching to updater firmware, the the glasses will disconnect momentarily...')

                const response = await sendMessage(device, Command.W_MCU_SUPER_B_JUMP_TO_A)
                appendText(`RESPONSE: ${String.fromCharCode.apply(null, response)}`)

                appendButton('Upgrade firmware', async (el) => {
                    const port = await navigator.serial.requestPort({
                        filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }]
                    })
                    if (!port) return appendText('Serial port not selected')

                    removeEl(el)

                    appendText('Opening serial port')
                    await port.open({ baudRate: 115200 })

                    appendText('Upgrading MCU firmware...')
                    await upgradeMCUFirmware(port, data, (offset, len) => {
                        const percent = Math.floor((offset / len) * 100)
                        appendText(`Progress: ${offset}/${len} (${percent}%)`)
                    })
                    appendText('Upgrade complete!')
                })
            })
        })
    })
})()
