import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Eris from 'eris';
import { cloneGuild } from './lib/cloner.js';

// Only allow this user ID to use the bot
const ADMIN_USER_ID = process.env.ADMIN_USER_ID; 

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("HATA: .env.local dosyasında DISCORD_BOT_TOKEN bulunamadı!");
    process.exit(1);
}

const client = new Eris(process.env.DISCORD_BOT_TOKEN, {
    intents: ["guilds"]
});

// Ram memory for user tokens
const userTokens = new Map();

client.on("ready", async () => {
    console.log(`Bot giriş yaptı: ${client.user.username}`);
    
    // Komutları kaydet
    try {
        await client.bulkEditCommands([
            {
                name: "token",
                description: "Klonlama işlemi için User Token'ınızı ayarlayın (Sadece siz görebilirsiniz).",
                type: 1,
                options: [
                    {
                        name: "token",
                        description: "Discord Kullanıcı Token'ınız",
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: "copy",
                description: "Bir sunucuyu klonlayın.",
                type: 1,
                options: [
                    {
                        name: "source",
                        description: "Kopyalanacak Kaynak Sunucu ID'si",
                        type: 3,
                        required: true
                    },
                    {
                        name: "target",
                        description: "Yapıştırılacak Hedef Sunucu ID'si",
                        type: 3,
                        required: true
                    }
                ]
            }
        ]);
        console.log("Slash komutları başarıyla kaydedildi.");
    } catch (err) {
        console.error("Komutlar kaydedilirken hata oluştu:", err);
    }
});

client.on("error", (err) => {
    console.error("Discord Gateway Hatası (Önemsiz olabilir, bot çalışmaya devam ediyor):", err.message);
});

client.on("disconnect", () => {
    console.log("Botun Discord ile bağlantısı koptu, yeniden bağlanmayı deneyecek...");
});


client.on("interactionCreate", async (interaction) => {
    // type 2 is APPLICATION_COMMAND
    if (interaction.type === 2) {
        // Sadece yetkili kişinin kullanmasına izin ver
        // Etkileşimi kullanan kullanıcının ID'si interaction.member.id veya interaction.user.id üzerinden alınabilir.
        const userId = interaction.member ? interaction.member.id : interaction.user.id;
        
        if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
            return interaction.createMessage({
                content: "⛔ Bu botu kullanma yetkiniz bulunmuyor.",
                flags: 64 // Sadece kullanıcıya görünür (Ephemeral)
            });
        }

        if (interaction.data.name === "token") {
            const tokenOption = interaction.data.options.find(o => o.name === "token");
            if (tokenOption) {
                userTokens.set(userId, tokenOption.value);
                return interaction.createMessage({
                    content: "✅ Token'ınız başarıyla kaydedildi! (Sadece bot açık kaldığı sürece bellekte tutulur).",
                    flags: 64 // Sadece kullanıcıya görünür (Ephemeral)
                });
            }
        }

        if (interaction.data.name === "copy") {
            const sourceOption = interaction.data.options.find(o => o.name === "source");
            const targetOption = interaction.data.options.find(o => o.name === "target");

            const userToken = userTokens.get(userId);

            if (!userToken) {
                return interaction.createMessage({
                    content: "⚠️ Önce `/token` komutu ile User Token'ınızı ayarlamalısınız!",
                    flags: 64
                });
            }

            // İşlemin uzun süreceğini Discord'a bildir, böylece "Düşünüyor..." yazar.
            await interaction.defer();

            const config = {
                sourceGuildId: sourceOption.value,
                targetGuildId: targetOption.value,
                resetTargetServer: true, // Varsayılan olarak hedefi temizler
                lang: 'tr'
            };

            let lastProgressMessage = "";

            try {
                await cloneGuild(userToken, config, async (progressData) => {
                    // İlerleme güncellemelerini mesaja yansıt
                    let msg = `⏳ **Durum:** ${progressData.message}`;
                    if (progressData.progress) {
                        msg += ` (%${progressData.progress})`;
                    }
                    if (msg !== lastProgressMessage) {
                        lastProgressMessage = msg;
                        // Mesajı sık sık güncellemek rate limite takılabilir, Eris otomatik yönetir ancak yine de try-catch'e alalım
                        try {
                            await interaction.editOriginalMessage({ content: msg });
                        } catch (e) {
                            // Rate limit vs.
                        }
                    }
                });

                await interaction.editOriginalMessage({
                    content: "🎉 **Klonlama Başarıyla Tamamlandı!**"
                });

            } catch (err) {
                console.error(err);
                try {
                    await interaction.editOriginalMessage({
                        content: `❌ **Hata Oluştu:** ${err.message}`
                    });
                } catch(e) {}
            }
        }
    }
});

client.connect();
