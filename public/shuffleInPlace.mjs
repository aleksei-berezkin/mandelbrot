/**
 * @template T
 * @param a {Array<T>}
 * @return {Array<T>}
 */
export function shuffleInPlace(a) {
    for (let i = 0; i < a.length - 1; i++) {
        const j = i + Math.floor(Math.random() * (a.length - i));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}