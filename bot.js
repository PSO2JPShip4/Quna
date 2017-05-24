const Commando = require('discord.js-commando');
const path = require('path');
const sqlite = require('sqlite')
const request = require('request');
const fs = require('fs');

if (!fs.existsSync('./config.json')) {
    fs.writeFileSync('./config.json', '{"Token" : "MzE2NjM0ODIwOTA4MTU0ODgw.DAbukA.aRmyUVA4krxutvJ3foftB_JXEzs", "prefix" : "!"}')
    console.log('WARNING: Config file is missing. Please edit "config.json" and re-run the script.')
    process.exit()
}

if (!fs.existsSync('./cache.json')){
    fs.writeFileSync('./cache.json', '{ "time" : "02-19-2017 19:00:00 +0000" }')
}

const config = require('./config.json')

const client = new Commando.Client({
    owner: '290198667460214784',
    commandPrefix: config.prefix
});

client
    // Events
    .on('error', console.error)
    .on('warn', console.warn)
    //.on('debug', console.log)
    .on('ready', () => {
        console.log(`-> Client ready! \n-> Logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`)
        console.log(`-> Servers: ${client.guilds.array().length}`)
    })
    .on('commandError', (cmd, err) => {
        if(err instanceof Commando.FriendlyError) return;
        console.error('Error in command ${cmd.groupID}:${cmd.memberName}', err)
    })

client.registry
    // Custom groups
    .registerGroups([
        ['pso2', 'Phantasy Star Online 2 commmands'],
        ['general', 'General commands'],
        ['card_games', "Card games commands"]
    ])

    // Register default groups, commands and argument types
    .registerDefaults()

    // Register every command in the ./commands/ directory
    .registerCommandsIn(path.join(__dirname, 'commands'))

client.setProvider(
    sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
).catch(console.error);

// EQ alerts system
client.setInterval(function() {
    request('http://pso2.kaze.rip/eq/', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let response = JSON.parse(body);
            let cached = JSON.parse(fs.readFileSync("cache.json"));

            if (response[0]['time'] != cached["time"]){
                client.guilds.forEach(function(guild) {
                    if (client.provider.get(guild, "alerts")){
                        let eqs = []
                        let format = []
                        let settings = client.provider.get(guild, "alerts");

                        if (client.channels.get(settings['channel'])){
                            response[0]['eqs'].forEach(function(item) {
                                if (settings['ships'].includes(item['ship'])){
                                    eqs.push(item);
                                }
                            })

                            if (eqs.length > 0){
                                eqs.forEach(function(eq) {
                                    format.push(`\`\`SHIP ${eq['ship']}:\`\` ${eq['name']}`);
                                });

                                let string = `:arrow_right: **Emergency Quest Notice**\n\n:watch:**IN 40 MINUTES:**\n${format.join('\n')}`
                                if (client.channels.get(settings['channel']).type == "text" && client.channels.get(settings['channel']).permissionsFor(client.user).hasPermission("SEND_MESSAGES")){
                                    client.channels.get(settings['channel']).sendMessage(string).catch(function(err) { console.log(err) });
                                }
                            }
                        }
                    }
                })

                fs.writeFileSync('cache.json', `{ "time" : "${response[0]['time']}" }`, function(err) {
                    if (err) return console.log(err);
                })
            }
        }
    })
}, 50000, client)

client.login(config.token);