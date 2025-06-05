const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

// const API_KEY = "AIzaSyCt2SGMnk8XCcI5MaLvRGsgGTbGI0R35gA";
// const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let interval, controller;
const chatHistory = [];
const userData ={ message: "", file: {}};

// Function to convert markdown to HTML
const markdownToHtml = (text) => {
    // Convert bold and italics
    text = text
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")  // Bold: **text**
        .replace(/(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)/g, "<i>$1</i>");  // Italics: *text*

    // Convert bullet points (* item) into a proper <ul> list
    text = text.replace(/(?:\n|^)\* (.*?)(?=\n|$)/g, "<ul><li>$1</li></ul>");

    // Convert numbered lists (1. item) into a proper <ol> list
    text = text.replace(/(?:\n|^)\d+\.\s(.*?)(?=\n|$)/g, "<ol><li>$1</li></ol>");

    // Remove extra new lines between lists
    text = text.replace(/<\/ul>\s*<ul>/g, ""); // Merge consecutive <ul>
    text = text.replace(/<\/ol>\s*<ol>/g, ""); // Merge consecutive <ol>

    return text.replace(/\n/g, "<br>");  // Convert remaining line breaks
};



// Function to create a message element
const createMsgElement = (content, isBot = false, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);

    if (isBot) {
        const avatar = document.createElement("img");
        avatar.src = "gemini.svg";
        avatar.alt = "G";
        avatar.classList.add("avatar");
        div.appendChild(avatar);
    }

    const messageText = document.createElement("p");
    messageText.classList.add("message-text");

    if (!isBot) {
        messageText.textContent = content;
    }

    div.appendChild(messageText);
    return div;
};

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Function to simulate fast typing effect while handling HTML properly
const typeMessage = (element, message, speed = 10) => {
    element.innerHTML = "";
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = message;
    const nodes = Array.from(tempDiv.childNodes);

    let index = 0, charIndex = 0;
    let currentNode = null, textContent = "";

    controller.interval = setInterval(() => { // ✅ Store interval reference
        if (!currentNode) {
            if (index >= nodes.length) {
                clearInterval(controller.interval);
                return;
            }
            currentNode = nodes[index];
            textContent = currentNode.nodeType === Node.TEXT_NODE ? currentNode.textContent : "";
            charIndex = 0;
            if (currentNode.nodeType !== Node.TEXT_NODE) {
                element.appendChild(currentNode.cloneNode(true));
                currentNode = null;
                index++;
            }
        }

        if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
            element.innerHTML += textContent[charIndex];
            charIndex++;

            if (charIndex >= textContent.length) {
                currentNode = null;
                index++;
            }
        }
    }, speed);
};



// Generate AI response
const generateResponse = async (userMessage) => {

    controller = new AbortController(); 
    chatHistory.push({ role: "user", parts: [{ text: userMessage }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest}) => rest)(userData.file)}] : [])]
});

    const loadingMsg = document.querySelector(".bot-message.loading");
    if (!loadingMsg) return;

    try {
        const response = await fetch("/.netlify/functions/geminiProxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        console.log(data);

        const botReplyRaw = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond.";
        const botReplyHtml = markdownToHtml(botReplyRaw);

        loadingMsg.remove();
        scrollToBottom(); // ✅ Scroll after removing "Just a sec..." message

        const botMsgDiv = createMsgElement("", true, "bot-message");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom(); // ✅ Scroll when bot message is added

        const messageText = botMsgDiv.querySelector(".message-text");
        typeMessage(messageText, botReplyHtml, 10);

        chatHistory.push({ role: "model", parts: [{ text: botReplyRaw  } ]});
        console.log(chatHistory);
    } catch (error) {
        console.error(error);
        document.querySelector(".bot-message.loading")?.remove();
        const errorMsgDiv = createMsgElement("Sorry, something went wrong.", true, "bot-message", "error");
        chatsContainer.appendChild(errorMsgDiv);
        scrollToBottom(); // ✅ Scroll when an error message is displayed
    }
    finally{
        userData.file = {};
    }
};

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    const hasFile = userData.file.data;

    if (!userMessage && !hasFile) return; // Prevent sending empty messages

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Create and display user message element
    const userMsgDiv = createMsgElement(userMessage || "[File Attached]", false, "user-message");
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    // If a file is attached, display it
    if (hasFile) {
        if (userData.file.isImage) {
            const img = document.createElement("img");
            img.src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
            img.alt = "Uploaded Image";
            img.classList.add("uploaded-image");
            userMsgDiv.appendChild(img);
        } else {
            const fileLink = document.createElement("a");
            fileLink.href = `data:${userData.file.mime_type};base64,${userData.file.data}`;
            fileLink.download = userData.file.fileName;
            fileLink.textContent = `📄 ${userData.file.fileName}`;
            fileLink.classList.add("file-link");
            userMsgDiv.appendChild(fileLink);
        }
    }

    // Display "Just a sec..." bot message
    const botMsgDiv = createMsgElement("Just a sec...", true, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        generateResponse(userMessage);
    }, 300);
};


fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value="";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };

    }
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
   
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    if (controller) {
        controller.abort(); // ✅ Stop the AI response request
    }
    
    clearInterval(controller.interval); // ✅ Stop ongoing message typing

    const loadingMsg = document.querySelector(".bot-message.loading");
    if (loadingMsg) {
        loadingMsg.remove(); // ✅ Remove "Just a sec..." message
    }

    console.log("Response stopped.");
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    console.log("Chat history cleared.");
    document.body.classList.remove("bot-responding", "chats-active");
});

document.querySelectorAll(".suggestion-items").forEach(item =>{
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

document.addEventListener("click", ({ target }) =>{
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id ==="add-file-btn" || target.id ==="stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

});

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";



// Event listener for form submission
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click",() => fileInput.click());
