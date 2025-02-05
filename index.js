const input = require("input");
const fs = require("fs");
const chalk = require("chalk");
const figlet = require("figlet");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const groupId = process.env.GROUP_ID;
const message = process.env.MESSAGE;
const delay = parseInt(process.env.DELAY) || 5000;
const interval = parseInt(process.env.INTERVAL) || 10800000;

const sessionsDir = "./sessions";
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function showHeader() {
    console.clear();
    console.log(chalk.cyan(figlet.textSync("Telegram Bot", { horizontalLayout: "fitted" })));
    console.log(chalk.green("=============================="));
    console.log(chalk.yellow("  Multi-Account Telegram Sender"));
    console.log(chalk.green("==============================\n"));
}

async function addAccount() {
    showHeader();
    console.log(chalk.blue("[+] Menambahkan akun baru..."));
    
    let session = new StringSession("");
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

    await client.start({
        phoneNumber: async () => await input.text("Masukkan nomor telepon: "),
        password: async () => await input.text("Masukkan password jika ada: "),
        phoneCode: async () => await input.text("Masukkan kode OTP: "),
        onError: (err) => console.log("Error:", err),
    });

    const user = await client.getMe();
    const sessionName = user.username || user.phone;
    const sessionPath = `${sessionsDir}/${sessionName}.json`;
    
    fs.writeFileSync(sessionPath, client.session.save());
    console.log(chalk.green(`✅ Akun ${sessionName} berhasil disimpan!`));
    await client.disconnect();
    
    await sleep(2000);
    mainMenu();
}

async function sendMessage() {
    showHeader();
    console.log(chalk.blue("[+] Mengirim pesan ke grup setiap 3 jam..."));
    
    async function sendMessages() {
        const sessionFiles = fs.readdirSync(sessionsDir).filter(file => file.endsWith(".json"));
        if (sessionFiles.length === 0) {
            console.log(chalk.red("Tidak ada akun yang tersedia."));
            return;
        }
    
        for (const file of sessionFiles) {
            const sessionPath = `${sessionsDir}/${file}`;
            const session = new StringSession(fs.readFileSync(sessionPath, "utf8"));
            const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
    
            await client.connect();
            const user = await client.getMe();
            console.log(chalk.cyan(`Mengirim pesan dari ${user.username || user.phone}...`));
    
            try {
                await client.sendMessage(groupId, { message });
                console.log(chalk.green(`✅ Pesan berhasil dikirim dari ${user.username || user.phone}`));
            } catch (error) {
                console.error(chalk.red(`❌ Gagal mengirim pesan dari ${user.username || user.phone}:`), error);
            }
    
            await client.disconnect();
            console.log(chalk.yellow(`Menunggu ${delay / 1000} detik sebelum akun berikutnya...`));
            await sleep(delay);
        }
    
        console.log(chalk.green("Selesai mengirim pesan."));
    }
    
    setInterval(sendMessages, interval);
    await sendMessages();
}

async function mainMenu() {
    showHeader();
    console.log(chalk.yellow("1. Tambah Akun"));
    console.log(chalk.yellow("2. Kirim Pesan Tiap 3 Jam"));
    console.log(chalk.yellow("3. Keluar"));
    
    let choice = await input.text(chalk.cyan("Pilih opsi (1/2/3): "));
    if (choice === "1") {
        await addAccount();
    } else if (choice === "2") {
        await sendMessage();
    } else {
        console.log(chalk.red("Keluar dari program."));
        process.exit();
    }
}

mainMenu();
