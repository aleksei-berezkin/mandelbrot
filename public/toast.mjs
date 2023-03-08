const queue = [];

export function showToast(message, timeout = 2500) {
    queue.push([message, timeout]);
    if (!getToastElement().classList.contains('shown')) {
        dequeueAndShow();
    }
}

function dequeueAndShow() {
    const messageAndTimeout = queue.pop();
    if (!messageAndTimeout) {
        return;
    }

    const [message, timeout] = messageAndTimeout;
    const toast = getToastElement();
    toast.classList.add('shown');
    toast.innerText = message;
    setTimeout(() => {
        toast.classList.remove('shown');
        setTimeout(dequeueAndShow, 1000);
    }, timeout);
}

function getToastElement() {
    return document.querySelector('.toast');
}
