const shown = new Set();
const queue = [];

export function showToast(message, timeout = 2500) {
    if (shown.has(message)) {
        return;
    }

    shown.add(message);
    queue.push([message, timeout]);
    if (queue.length === 1) {
        dequeueAndShow();
    }
}

function dequeueAndShow() {
    const toast = getToastElement();
    if (toast.classList.contains('shown')) {
        return;
    }

    const messageAndTimeout = queue.pop();
    if (!messageAndTimeout) {
        return;
    }

    const [message, timeout] = messageAndTimeout;
    toast.classList.add('shown');
    toast.innerHTML = message;

    const menuButton = document.querySelector('.menu-button');
    if (message.includes('in menu')) {
        menuButton.classList.add('blink');
    }

    const timeoutId = setTimeout(hide, timeout);

    function hide() {
        toast.onclick = null;
        toast.classList.remove('shown');
        menuButton.classList.remove('blink');
        clearTimeout(timeoutId);
        setTimeout(dequeueAndShow, 1000);
    }

    toast.onclick = hide;
}

function getToastElement() {
    return document.querySelector('.toast');
}
