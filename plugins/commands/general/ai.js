import axios from 'axios'; // Make sure to install axios if not installed

const config = {
    name: "ai",
    aliases: ["chat", "gpt"],
    description: "Interact with GPT-4 via API",
    usage: "[query]",
    cooldown: 3,
    permissions: [0], // General users can access
    isAbsolute: false,
    isHidden: false,
    credits: "XynnAlmeyda",
};

const langData = {
    "lang_1": {
        "message": "Please provide a prompt to interact with the AI.",
    },
    "lang_2": {
        "message": "SHESHHH.",
    }
};

async function onCall({ message, args, getLang, data, userPermissions, prefix }) {
    if (args.length === 0) {
        // If no arguments (prompt) are provided, send a message back.
        return message.send(getLang("message"));
    }

    const input = args.join(" "); // Combine arguments into a single prompt
    const userId = data.user?.id || 100; // User ID from data or default to 100

    try {
        // Use axios to make the API request
        const { data: responseData } = await axios.post('https://gpt04-api-xynn.vercel.app/chat', {
            message: input,
            uid: userId
        });

        if (responseData && responseData.reply) {
            message.send(responseData.reply); // Send AI's response to the user
        } else {
            message.send("Sorry, I couldn't understand the response from the AI.");
        }
    } catch (error) {
        message.send("An error occurred while trying to reach the AI. Please try again later.");
        console.error("Error while calling AI API:", error);
    }
}

export default {
    config,
    langData,
    onCall
};
