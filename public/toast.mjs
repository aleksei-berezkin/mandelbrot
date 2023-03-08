export function showToast(message) {
    const toast = document.querySelector('.toast');
    toast.classList.add('shown');
    toast.innerText = message;
    setTimeout(() => toast.classList.remove('shown'), 2500);
}
